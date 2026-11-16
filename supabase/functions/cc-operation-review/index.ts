import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
function reply(status:number,body:Record<string,unknown>){return new Response(JSON.stringify(body),{status,headers});}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers});
  if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!anon||!service)return reply(500,{error:"server_configuration_error"});
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\\s+/i,"");
  if(!token)return reply(401,{error:"missing_bearer_token"});
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await auth.auth.getUser(token);
  if(error||!user)return reply(401,{error:"invalid_session"});
  if(user.app_metadata?.role!=="owner")return reply(403,{error:"owner_approval_required"});
  let body:{request_id?:unknown;decision?:unknown;note?:unknown};
  try{body=await req.json();}catch{return reply(400,{error:"invalid_json"});}
  const id=typeof body.request_id==="string"?body.request_id:"";
  const decision=body.decision;
  const note=typeof body.note==="string"?body.note.trim():"";
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply(400,{error:"invalid_request_id"});
  if(decision!=="approved"&&decision!=="rejected")return reply(400,{error:"invalid_decision"});
  if(note.length>1000)return reply(400,{error:"review_note_too_long"});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:request,error:readError}=await admin.from("cc_operation_requests").select("id,status,operation_type,target_project").eq("id",id).maybeSingle();
  if(readError)return reply(500,{error:"request_lookup_failed"});
  if(!request)return reply(404,{error:"request_not_found"});
  if(request.status!=="pending")return reply(409,{error:"request_already_reviewed",status:request.status});
  const now=new Date().toISOString();
  const {data:updated,error:updateError}=await admin.from("cc_operation_requests").update({status:decision,reviewed_by:user.id,reviewed_at:now,review_note:note||null}).eq("id",id).eq("status","pending").select("id,status,reviewed_at,review_note").maybeSingle();
  if(updateError)return reply(500,{error:"review_update_failed"});
  if(!updated)return reply(409,{error:"request_state_changed"});
  const {error:auditError}=await admin.from("cc_audit_events").insert({actor_user_id:user.id,action:"operation_request_"+decision,target_type:"operation_request",target_id:id,details:{operation_type:request.operation_type,target_project:request.target_project,review_note:note||null}});
  if(auditError)return reply(500,{error:"review_saved_but_audit_failed"});
  return reply(200,{ok:true,request:updated});
});
