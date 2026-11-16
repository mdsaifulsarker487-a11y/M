import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers:cors});}
type Probe={url:string;headers:Record<string,string>;method?:"GET"|"POST";body?:string};
function providerProbe(provider:string):{configured:boolean;build:()=>Probe;label:string}{
 const env=(key:string)=>Deno.env.get(key)||"";
 switch(provider){
  case "github": return {configured:!!env("CC_GITHUB_TOKEN"),label:"GitHub",build:()=>({url:"https://api.github.com/user",headers:{Authorization:`Bearer ${env("CC_GITHUB_TOKEN")}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"}})};
  case "gitlab": return {configured:!!env("CC_GITLAB_TOKEN"),label:"GitLab",build:()=>({url:"https://gitlab.com/api/v4/user",headers:{"PRIVATE-TOKEN":env("CC_GITLAB_TOKEN")}})};
  case "vercel": return {configured:!!env("CC_VERCEL_TOKEN"),label:"Vercel",build:()=>({url:"https://api.vercel.com/v2/user",headers:{Authorization:`Bearer ${env("CC_VERCEL_TOKEN")}`}})};
  case "cloudflare": return {configured:!!env("CC_CLOUDFLARE_TOKEN"),label:"Cloudflare",build:()=>({url:"https://api.cloudflare.com/client/v4/user/tokens/verify",headers:{Authorization:`Bearer ${env("CC_CLOUDFLARE_TOKEN")}`}})};
  case "netlify": return {configured:!!env("CC_NETLIFY_TOKEN"),label:"Netlify",build:()=>({url:"https://api.netlify.com/api/v1/user",headers:{Authorization:`Bearer ${env("CC_NETLIFY_TOKEN")}`}})};
  case "render": return {configured:!!env("CC_RENDER_API_KEY"),label:"Render",build:()=>({url:"https://api.render.com/v1/owners?limit=1",headers:{Authorization:`Bearer ${env("CC_RENDER_API_KEY")}`}})};
  case "railway": return {configured:!!env("CC_RAILWAY_API_TOKEN"),label:"Railway",build:()=>({url:"https://backboard.railway.com/graphql/v2",method:"POST",headers:{Authorization:`Bearer ${env("CC_RAILWAY_API_TOKEN")}`,"Content-Type":"application/json"},body:JSON.stringify({query:"query { me { id name } }"})})};
  case "cloudinary": return {configured:!!env("CC_CLOUDINARY_CLOUD_NAME")&&!!env("CC_CLOUDINARY_API_KEY")&&!!env("CC_CLOUDINARY_API_SECRET"),label:"Cloudinary",build:()=>({url:`https://api.cloudinary.com/v1_1/${env("CC_CLOUDINARY_CLOUD_NAME")}/resources?max_results=1`,headers:{Authorization:"Basic "+btoa(env("CC_CLOUDINARY_API_KEY")+":"+env("CC_CLOUDINARY_API_SECRET"))}})};
  case "google_cloud_secret_manager": return {configured:!!env("CC_GCP_ACCESS_TOKEN")&&!!env("CC_GCP_PROJECT_ID"),label:"Google Cloud Secret Manager",build:()=>({url:`https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(env("CC_GCP_PROJECT_ID"))}/secrets?pageSize=1`,headers:{Authorization:`Bearer ${env("CC_GCP_ACCESS_TOKEN")}`}})};
  default:return {configured:false,label:provider,build:()=>({url:"",headers:{}})};
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!anon||!service)return reply(500,{error:"server_configuration_error"});
 const jwt=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return reply(401,{error:"missing_bearer_token"});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(jwt);
 if(authError||!user)return reply(401,{error:"invalid_session"});
 const role=user.app_metadata?.role;if(role!=="owner"&&role!=="admin")return reply(403,{error:"insufficient_role"});
 let body:{provider?:unknown};try{body=await req.json();}catch{return reply(400,{error:"invalid_json"});}
 const provider=typeof body.provider==="string"?body.provider.trim().toLowerCase():"";
 if(!/^[a-z0-9_\-]{2,80}$/.test(provider))return reply(400,{error:"invalid_provider"});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:catalog,error:catalogError}=await admin.from("cc_provider_catalog").select("provider,display_name").eq("provider",provider).maybeSingle();
 if(catalogError)return reply(500,{error:"catalog_lookup_failed"});if(!catalog)return reply(404,{error:"provider_not_found"});
 let status:"healthy"|"unhealthy"|"not_configured"|"error"="not_configured",httpStatus:number|null=null,latency:number|null=null;
 let message="Provider credentials are not configured; no connection was attempted.";
 const started=Date.now();
 try{
  if(provider==="supabase"){
   const response=await fetch(`${url}/auth/v1/health`,{headers:{apikey:anon},signal:AbortSignal.timeout(10000)});
   httpStatus=response.status;await response.body?.cancel();status=response.ok?"healthy":"unhealthy";
   message=response.ok?"Supabase Auth health endpoint responded successfully.":"Supabase Auth health endpoint returned a non-success status.";
  }else{
   const probe=providerProbe(provider);
   if(probe.configured){
    const cfg=probe.build();
    const response=await fetch(cfg.url,{method:cfg.method||"GET",headers:cfg.headers,body:cfg.body,signal:AbortSignal.timeout(12000)});
    httpStatus=response.status;await response.body?.cancel();status=response.ok?"healthy":"unhealthy";
    message=response.ok?`${probe.label} read-only identity/API probe succeeded.`:`${probe.label} API returned a non-success status; check token validity and minimum scopes.`;
   }else{
    const required:Record<string,string>={github:"CC_GITHUB_TOKEN",gitlab:"CC_GITLAB_TOKEN",vercel:"CC_VERCEL_TOKEN",cloudflare:"CC_CLOUDFLARE_TOKEN",netlify:"CC_NETLIFY_TOKEN",render:"CC_RENDER_API_KEY",railway:"CC_RAILWAY_API_TOKEN",cloudinary:"CC_CLOUDINARY_CLOUD_NAME + CC_CLOUDINARY_API_KEY + CC_CLOUDINARY_API_SECRET",google_cloud_secret_manager:"CC_GCP_ACCESS_TOKEN + CC_GCP_PROJECT_ID"};
    message=required[provider]?`Missing server-side secret(s): ${required[provider]}. Configure them in Supabase Edge Function Secrets; never in browser code, SQL or GitHub.`:"No safe probe is registered for this provider.";
   }
  }
 }catch{status="error";message="Provider health probe failed or timed out; check provider availability and credentials.";}
 if(status!=="not_configured")latency=Date.now()-started;
 const {error:writeError}=await admin.from("cc_provider_health_checks").insert({provider,checked_by:user.id,status,http_status:httpStatus,latency_ms:latency,message});
 if(writeError)return reply(500,{error:"health_result_write_failed"});
 return reply(200,{provider,display_name:catalog.display_name,status,http_status:httpStatus,latency_ms:latency,message,checked_at:new Date().toISOString()});
});
