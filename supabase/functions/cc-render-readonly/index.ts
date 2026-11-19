import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ORIGIN=Deno.env.get("CC_CONTROL_CENTER_ORIGIN")||"";
const H=(origin:string|null)=>({...((ORIGIN&&origin===ORIGIN)?{"Access-Control-Allow-Origin":ORIGIN}:{}),"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json","Cache-Control":"no-store"});
const reply=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:H(req.headers.get("Origin"))});
const decode=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
async function decrypt(ciphertext:string,iv:string){const master=Deno.env.get("CC_VAULT_MASTER_KEY");if(!master||master.length<32)throw new Error("Vault key unavailable");const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(master));const key=await crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["decrypt"]);return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(iv)},key,decode(ciphertext)));}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return !ORIGIN||origin!==ORIGIN?new Response(null,{status:403,headers:H(origin)}):new Response("ok",{headers:H(origin)});
 if(req.method!=="POST")return reply(req,{error:"POST required"},405);
 if(!ORIGIN||origin!==ORIGIN)return reply(req,{error:"Origin not allowed"},403);
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!service)throw new Error("Supabase config missing");
  const client=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:u,error:ae}=await client.auth.getUser();if(ae||!u.user)return reply(req,{error:"Unauthorized"},401);if(u.user.app_metadata?.role!=="owner")return reply(req,{error:"Owner access required"},403);
  const body=await req.json().catch(()=>null);if(!body||!["services","deploys"].includes(body.action))return reply(req,{error:"Supported actions: services, deploys"},400);
  if(body.action==="deploys"&&(typeof body.serviceId!=="string"||!/^srv-[A-Za-z0-9]+$/.test(body.serviceId)))return reply(req,{error:"Valid serviceId required"},400);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:rows,error}=await admin.from("cc_secret_vault").select("ciphertext,iv").eq("provider","render").eq("secret_name","RENDER_API_KEY").order("updated_at",{ascending:false}).limit(1);
  if(error)throw error;if(!rows?.length)return reply(req,{error:"RENDER_API_KEY is not registered in the encrypted vault."},409);
  const token=await decrypt(rows[0].ciphertext,rows[0].iv);
  const path=body.action==="services"?"/v1/services":`/v1/services/${body.serviceId}/deploys`;
  const response=await fetch("https://api.render.com"+path+(body.action==="services"?"?limit=100":"?limit=10"),{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
  const result=await response.json().catch(()=>null);if(!response.ok){console.error("Render API error",response.status);return reply(req,{error:"Render API request failed. Check token permissions.",status:response.status},502);}
  const arr=Array.isArray(result)?result:(result?.data||[]);
  const items=arr.map((item:any)=>body.action==="services"?{id:item.service?.id||item.id,name:item.service?.name||item.name,type:item.service?.type||item.type,region:item.service?.region||item.region,plan:item.service?.plan||item.plan,suspended:item.service?.suspended??item.suspended,updatedAt:item.service?.updatedAt||item.updatedAt}:{id:item.id,status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt,commit:item.commit?.id||null});
  return reply(req,{provider:"render",mode:"read-only",action:body.action,count:items.length,items});
 }catch(e){console.error("cc-render-readonly",e instanceof Error?e.message:"Unknown");return reply(req,{error:"Render read failed. Check vault setup and token permissions."},500);}
});