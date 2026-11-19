import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ORIGIN=Deno.env.get("CC_CONTROL_CENTER_ORIGIN")||"";
const ACCOUNT_ID="09dcb61da996a69d4a5d0834bcc73ea5";
const headers=(origin:string|null)=>({...((ORIGIN&&origin===ORIGIN)?{"Access-Control-Allow-Origin":ORIGIN}:{}),"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json","Cache-Control":"no-store"});
const reply=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req.headers.get("Origin"))});
const decode=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
async function decrypt(ciphertext:string,iv:string){const master=Deno.env.get("CC_VAULT_MASTER_KEY");if(!master||master.length<32)throw new Error("Vault key unavailable");const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(master));const key=await crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["decrypt"]);return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(iv)},key,decode(ciphertext)));}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS"){if(!ORIGIN||origin!==ORIGIN)return new Response(null,{status:403,headers:headers(origin)});return new Response("ok",{headers:headers(origin)});}
 if(req.method!=="POST")return reply(req,{error:"POST required"},405);
 if(!ORIGIN||origin!==ORIGIN)return reply(req,{error:"Origin not allowed"},403);
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)throw new Error("Supabase configuration unavailable");
  const userClient=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:authError}=await userClient.auth.getUser();
  if(authError||!userData.user)return reply(req,{error:"Unauthorized"},401);
  if(userData.user.app_metadata?.role!=="owner")return reply(req,{error:"Owner access required"},403);
  const body=await req.json().catch(()=>null);
  if(!body||!["zones","workers"].includes(body.action))return reply(req,{error:"Supported actions: zones, workers"},400);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:rows,error}=await admin.from("cc_secret_vault").select("ciphertext,iv").eq("provider","cloudflare").eq("secret_name","CLOUDFLARE_API_TOKEN").order("updated_at",{ascending:false}).limit(1);
  if(error)throw error;if(!rows?.length)return reply(req,{error:"CLOUDFLARE_API_TOKEN is not registered in the encrypted vault."},409);
  const token=await decrypt(rows[0].ciphertext,rows[0].iv);
  const path=body.action==="zones"?"/zones":`/accounts/${ACCOUNT_ID}/workers/scripts`;
  const response=await fetch("https://api.cloudflare.com/client/v4"+path+"?per_page=100",{headers:{Authorization:"Bearer "+token}});
  const result=await response.json();
  if(!response.ok||!result.success){console.error("Cloudflare API error",response.status,result.errors?.map((e:any)=>e.message).join("; "));return reply(req,{error:"Cloudflare API request failed. Check token permissions.",status:response.status},502);}
  const items=(result.result||[]).map((item:any)=>body.action==="zones"?{id:item.id,name:item.name,status:item.status,plan:item.plan?.name,created_on:item.created_on}:{id:item.id,script:item.id,modified_on:item.modified_on,created_on:item.created_on,logpush:item.logpush});
  return reply(req,{provider:"cloudflare",mode:"read-only",action:body.action,count:items.length,items});
 }catch(error){console.error("cc-cloudflare-readonly error",error instanceof Error?error.message:"Unknown error");return reply(req,{error:"Cloudflare read failed. Check vault setup and token permissions."},500);}
});