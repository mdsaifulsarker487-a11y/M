import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigin=Deno.env.get("CC_CONTROL_CENTER_ORIGIN")||"";
const headers=(origin:string|null)=>({...((allowedOrigin&&origin===allowedOrigin)?{"Access-Control-Allow-Origin":allowedOrigin}:{}),"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json","Cache-Control":"no-store"});
const reply=(req:Request,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req.headers.get("Origin"))});
const decode=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
async function decryptSecret(ciphertext:string,iv:string){const master=Deno.env.get("CC_VAULT_MASTER_KEY");if(!master||master.length<32)throw new Error("Vault key unavailable");const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(master));const key=await crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["decrypt"]);return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(iv)},key,decode(ciphertext)));}
const queries:any={
 projects:`query { me { projects { edges { node { id name createdAt updatedAt } } } } }`,
 services:`query($projectId:String!){ project(id:$projectId){ id name services { edges { node { id name createdAt updatedAt } } } environments { edges { node { id name } } } } }`,
 deployments:`query($projectId:String!,$environmentId:String!){ deployments(input:{projectId:$projectId,environmentId:$environmentId}){ edges { node { id status createdAt updatedAt url } } } }`
};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS"){if(!allowedOrigin||origin!==allowedOrigin)return new Response(null,{status:403,headers:headers(origin)});return new Response("ok",{headers:headers(origin)});}
 if(req.method!=="POST")return reply(req,{error:"POST required"},405);
 if(!allowedOrigin||origin!==allowedOrigin)return reply(req,{error:"Origin not allowed"},403);
 try{
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)throw new Error("Supabase configuration unavailable");
  const userClient=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")||""}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:authError}=await userClient.auth.getUser();
  if(authError||!userData.user)return reply(req,{error:"Unauthorized"},401);
  if(userData.user.app_metadata?.role!=="owner")return reply(req,{error:"Owner access required"},403);
  const body=await req.json().catch(()=>null);
  if(!body||!Object.hasOwn(queries,body.action))return reply(req,{error:"Supported actions: projects, services, deployments"},400);
  const projectId=typeof body.project_id==="string"?body.project_id.trim():"";
  const environmentId=typeof body.environment_id==="string"?body.environment_id.trim():"";
  if(body.action!=="projects"&&!/^[0-9a-f-]{36}$/i.test(projectId))return reply(req,{error:"Valid Railway project ID required"},400);
  if(body.action==="deployments"&&!/^[0-9a-f-]{36}$/i.test(environmentId))return reply(req,{error:"Valid Railway environment ID required"},400);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:rows,error}=await admin.from("cc_secret_vault").select("ciphertext,iv").eq("provider","railway").eq("secret_name","CC_RAILWAY_API_TOKEN").order("updated_at",{ascending:false}).limit(1);
  if(error)throw error;if(!rows?.length)return reply(req,{error:"CC_RAILWAY_API_TOKEN is not registered in the encrypted vault."},409);
  const token=await decryptSecret(rows[0].ciphertext,rows[0].iv);
  const variables:any=body.action==="projects"?{}:body.action==="services"?{projectId}:{projectId,environmentId};
  const response=await fetch("https://backboard.railway.app/graphql/v2",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({query:queries[body.action],variables})});
  if(!response.ok){console.error("Railway API error",response.status);return reply(req,{error:"Railway API request failed",status:response.status},502);}
  const result=await response.json();
  if(result.errors?.length){console.error("Railway GraphQL rejected request",result.errors.map((e:any)=>e.message).join("; ").slice(0,300));return reply(req,{error:"Railway GraphQL request failed. Verify token permissions and API schema."},502);}
  let data:any;
  if(body.action==="projects")data=(result.data?.me?.projects?.edges||[]).map((e:any)=>e.node);
  else if(body.action==="services"){const p=result.data?.project;if(!p)return reply(req,{error:"Railway project not found or inaccessible"},404);data={project:{id:p.id,name:p.name},services:(p.services?.edges||[]).map((e:any)=>e.node),environments:(p.environments?.edges||[]).map((e:any)=>e.node)};}
  else data=(result.data?.deployments?.edges||[]).map((e:any)=>e.node);
  return reply(req,{provider:"railway",mode:"read-only",action:body.action,count:Array.isArray(data)?data.length:undefined,...(Array.isArray(data)?{items:data}:{...data})});
 }catch(error){console.error("cc-railway-readonly error",error instanceof Error?error.message:"Unknown error");return reply(req,{error:"Railway read failed. Check vault setup and provider token."},500);}
});