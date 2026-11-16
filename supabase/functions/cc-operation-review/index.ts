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
  const {data,error:reviewError}=await admin.rpc("cc_review_operation_request",{
    p_request_id:id,
    p_decision:decision,
    p_reviewer_id:user.id,
    p_note:note||null
  });
  if(reviewError){
    const message=reviewError.message||"";
    if(message.includes("request_not_found"))return reply(404,{error:"request_not_found"});
    if(message.includes("request_already_reviewed")||reviewError.code==="40001")return reply(409,{error:"request_already_reviewed"});
    console.error("Atomic operation review failed:",message);
    return reply(500,{error:"review_transaction_failed"});
  }
  return reply(200,{ok:true,request:data});
});
