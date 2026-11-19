const demoProjects = [
  {name:"LearnX AI",slug:"learnx-ai",description:"AI-powered learning and education platform.",lifecycle_status:"planned"},
  {name:"Japan Next",slug:"japan-next",description:"Japan-focused learning, information and membership experience.",lifecycle_status:"planned"},
  {name:"ARKHE",slug:"arkhe",description:"Research, knowledge and innovation platform.",lifecycle_status:"planned"},
  {name:"DOLFish Browser",slug:"dolfish-browser",description:"Search and browsing experience with a long-term independent search vision.",lifecycle_status:"planned"},
  {name:"DOLFish Agent",slug:"dolfish-agent",description:"Multi-model intelligence and autonomous task execution platform.",lifecycle_status:"planned"},
  {name:"My Space",slug:"my-space",description:"Personal digital space and productivity experience.",lifecycle_status:"planned"}
];
const demoProviders = ["GitHub","GitLab","Vercel","Render","Railway","Netlify","Cloudflare","Supabase","Cloudinary","Google Cloud Secret Manager"].map(name=>({display_name:name,provider:name.toLowerCase().replaceAll(" ","-"),status:"pending",secret_reference:null}));
let currentProjects = demoProjects;
let currentProviders = demoProviders;
let currentAuditEvents = [];
let currentCatalog = [];
let currentHealthChecks = [];
let currentOperationRequests = [];
let currentApiIntegrations = [];\nlet currentVaultItems = [];
let dataMode = "demo";
let currentUser = null;
let currentRole = null;

function safeText(value) { return String(value ?? ""); }
function makeCard({name,description,slug,status,tags=[]},kind="project") {
  const article=document.createElement("article"); article.className="project";
  const top=document.createElement("div"); top.className="projecttop";
  const icon=document.createElement("div"); icon.className="picon"; icon.textContent=safeText((name||"??").split(/\s+/).map(x=>x[0]).join("").slice(0,2)).toUpperCase();
  const titleWrap=document.createElement("div"); const h=document.createElement("h3"); h.textContent=safeText(name);
  const small=document.createElement("small"); small.textContent=kind==="project"?"DOLFish ecosystem":"Provider integration";
  titleWrap.append(h,small);
  const badge=document.createElement("span"); badge.className="status"; badge.textContent=safeText(status||"Pending");
  top.append(icon,titleWrap,badge); article.append(top);
  const p=document.createElement("p"); p.textContent=safeText(description || (kind==="provider" ? "Connection metadata only. No secret values are stored here." : ""));
  article.append(p);
  const tagWrap=document.createElement("div"); tagWrap.className="tags";
  (tags.length?tags:[slug||"Inventory"]).forEach(t=>{const span=document.createElement("span");span.className="tag";span.textContent=safeText(t);tagWrap.append(span);});
  article.append(tagWrap); return article;
}
function renderCards(target,list,kind="project") {
  const el=document.getElementById(target); if(!el)return; el.replaceChildren();
  list.forEach(item=>el.append(makeCard(item,kind)));
  if(!list.length){const p=document.createElement("p");p.className="emptyhint";p.textContent="No records found.";el.append(p);}
}
function updateStats() {
  const stats=document.querySelectorAll("#overview .stat");
  if(stats[0]){stats[0].querySelector(".statnum").textContent=String(currentProjects.length);stats[0].querySelector(".statnote").textContent=dataMode==="live"?"Live database records":dataMode==="restricted"?"Authenticated · role not approved":"Preview inventory · sign in for live data";}
  if(stats[1]){const connected=currentProviders.filter(p=>["connected","active"].includes(String(p.status).toLowerCase())).length;stats[1].querySelector(".statnum").innerHTML=connected+' <small>live</small>';stats[1].querySelector(".statnote").textContent=dataMode==="live"?"Provider metadata from database":dataMode==="restricted"?"Role approval required":"No live provider data loaded";}
  const pill=document.querySelector(".topright .pill");
  if(pill) pill.textContent=dataMode==="live"?"● Live database":dataMode==="restricted"?"● Access restricted":"● Demo workspace";
  const projectPill=document.querySelector("#projects .toolbar .pill");
  if(projectPill) projectPill.textContent=`${currentProjects.length} registered · ${dataMode==="live"?"live database":"preview inventory"}`;
}
function renderAccessSummary() {
  const el = document.getElementById("accessSummary");
  if (!el) return;
  el.replaceChildren();
  const signedIn = Boolean(currentUser);
  const privileged = ["owner", "admin"].includes(currentRole);
  const title = document.createElement("strong");
  title.textContent = privileged ? `Access level: ${currentRole.toUpperCase()}` : signedIn ? "Access level: NOT ASSIGNED" : "Access level: SIGNED OUT";
  const detail = document.createElement("p");
  detail.className = "emptyhint";
  detail.textContent = privileged
    ? (currentRole === "owner" ? "Owner access is active. You can review ecosystem data; provider changes remain owner-only under database policies." : "Administrator access is active. Provider metadata changes remain restricted to the owner.")
    : signedIn ? "Your account is authenticated, but no trusted owner/admin role is assigned. Live records remain blocked by database security policies."
    : "Sign in with an approved account to access live Control Center records.";
  const badge = document.createElement("span");
  badge.className = "status";
  badge.textContent = privileged ? "AUTHORIZED" : "RESTRICTED";
  el.append(title, badge, detail);
}

function renderIntegrationCatalog() {
  const body=document.getElementById("integrationCatalog");
  if(!body)return;
  body.replaceChildren();
  if(dataMode!=="live" || !currentCatalog.length) {
    const row=document.createElement("tr"),cell=document.createElement("td");
    cell.colSpan=7;cell.textContent=dataMode==="live"?"No provider catalog records found.":"Sign in with an approved owner/admin account to view the integration registry.";
    row.append(cell);body.append(row);return;
  }
  currentCatalog.forEach(item=>{
    const row=document.createElement("tr");
    const values=[
      item.display_name,
      String(item.category||"").replaceAll("_"," "),
      item.auth_method,
      (item.minimum_scopes||[]).join(", "),
      (item.capabilities||[]).join(" · ")
    ];
    values.forEach(value=>{const td=document.createElement("td");td.textContent=safeText(value);row.append(td);});
    const docs=document.createElement("td");
    if(item.docs_url){const a=document.createElement("a");a.href=item.docs_url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Provider docs ↗";a.className="catalog-link";docs.append(a);}else docs.textContent="—";
    row.append(docs);
    const health=document.createElement("td");
    const latest=currentHealthChecks.find(check=>check.provider===item.provider);
    const status=document.createElement("span");
    status.className="health-status "+(latest?.status||"unknown");
    status.textContent=latest?.status||"Not checked";
    health.append(status);
    const checkButton=document.createElement("button");
    checkButton.className="check-provider";
    checkButton.type="button";
    checkButton.textContent="Check";
    checkButton.addEventListener("click",async()=>{
      const client=window.dolfishSupabase;
      if(!client){status.textContent="Auth unavailable";return;}
      checkButton.disabled=true;checkButton.textContent="Checking…";
      try{
        const {data,error}=await client.functions.invoke("cc-provider-health",{body:{provider:item.provider}});
        if(error)throw error;
        status.textContent=data.status+(data.latency_ms!==null?" · "+data.latency_ms+"ms":"");
        status.className="health-status "+data.status;
        const idx=currentHealthChecks.findIndex(check=>check.provider===item.provider);
        const next={provider:item.provider,status:data.status,latency_ms:data.latency_ms,checked_at:data.checked_at,message:data.message};
        if(idx>=0)currentHealthChecks[idx]=next;else currentHealthChecks.unshift(next);
      }catch(error){status.textContent="Check failed";status.className="health-status error";console.error("Provider health check failed",error);}
      finally{checkButton.disabled=false;checkButton.textContent="Check";}
    });
    health.append(checkButton);row.append(health);body.append(row);
  });
}



function renderOperationRequests(){
 const body=document.getElementById("operationRequests");if(!body)return;body.replaceChildren();
 if(dataMode!=="live"){const p=document.createElement("p");p.className="emptyhint";p.textContent="Approved owner/admin access is required to view operation requests.";body.append(p);return;}
 if(!currentOperationRequests.length){const p=document.createElement("p");p.className="emptyhint";p.textContent="No operation requests yet. Create a request above; no production action will run automatically.";body.append(p);return;}
 currentOperationRequests.forEach(item=>{
  const row=document.createElement("div");row.className="rowitem";
  const info=document.createElement("div");
  const title=document.createElement("strong");title.textContent=item.operation_type.replaceAll("_"," ")+" · "+item.target_project;
  const detail=document.createElement("small");detail.textContent=item.rationale+" · "+new Date(item.created_at).toLocaleString();
  info.append(title,detail);
  const controls=document.createElement("div");controls.className="operation-controls";
  const badge=document.createElement("span");badge.className="health-status "+(item.status==="pending"?"not_configured":item.status);badge.textContent=item.status;controls.append(badge);
  if(currentRole==="owner"&&item.status==="pending"){
   for(const decision of ["approved","rejected"]){
    const btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent=decision==="approved"?"Approve":"Reject";
    btn.addEventListener("click",async()=>{
     btn.disabled=true;btn.textContent="Saving…";
     try{
      const {data,error}=await window.dolfishSupabase.functions.invoke("cc-operation-review",{body:{request_id:item.id,decision,note:"Reviewed in Control Center"}});
      if(error)throw error;if(!data?.ok)throw new Error(data?.error||"Review failed");
      await loadLiveData({user:currentUser,role:currentRole,supabase:window.dolfishSupabase});
     }catch(err){console.error("Operation review failed",err);btn.disabled=false;btn.textContent=decision==="approved"?"Approve":"Reject";}
    });controls.append(btn);
   }
  }
  row.append(info,controls);body.append(row);
 });
}

function renderMonitoring() {
  const summary=document.getElementById("monitoringSummary");
  const body=document.getElementById("monitoringHistory");
  const note=document.getElementById("monitoringNote");
  if(!summary||!body||!note)return;
  summary.replaceChildren();body.replaceChildren();
  if(dataMode!=="live"){
    note.textContent=dataMode==="restricted"?"Your account does not have an approved monitoring role.":"Sign in with an approved owner/admin account to load real provider health history.";
    const p=document.createElement("p");p.className="emptyhint";p.textContent="No live telemetry is shown while access is unavailable.";body.append(p);return;
  }
  note.textContent="Provider health history from the database. These checks are point-in-time probes, not continuous uptime monitoring.";
  const latestByProvider=new Map();
  currentHealthChecks.forEach(check=>{if(!latestByProvider.has(check.provider))latestByProvider.set(check.provider,check);});
  const statuses=[["Healthy","healthy"],["Unhealthy","unhealthy"],["Not configured","not_configured"],["Errors","error"]];
  statuses.forEach(([label,key])=>{
    const card=document.createElement("div");card.className="stat monitor-stat";
    const head=document.createElement("div");head.className="stathead";head.textContent=label;
    const value=document.createElement("div");value.className="statnum";value.textContent=String([...latestByProvider.values()].filter(x=>x.status===key).length);
    const sub=document.createElement("div");sub.className="statnote";sub.textContent="Latest provider checks";
    card.append(head,value,sub);summary.append(card);
  });
  const checks=[...currentHealthChecks].sort((a,b)=>new Date(b.checked_at)-new Date(a.checked_at)).slice(0,20);
  if(!checks.length){const p=document.createElement("p");p.className="emptyhint";p.textContent="No health checks recorded yet. Open Infrastructure and run a provider Check after owner access is enabled.";body.append(p);return;}
  checks.forEach(check=>{
    const row=document.createElement("div");row.className="rowitem monitor-row";
    const info=document.createElement("div");
    const title=document.createElement("strong");title.textContent=check.provider;
    const detail=document.createElement("small");
    const parts=[check.checked_at?new Date(check.checked_at).toLocaleString():"Time unavailable",check.http_status?("HTTP "+check.http_status):"",check.latency_ms!==null&&check.latency_ms!==undefined?(check.latency_ms+" ms"):"",check.message||""].filter(Boolean);
    detail.textContent=parts.join(" · ");info.append(title,detail);
    const badge=document.createElement("span");badge.className="health-status "+check.status;badge.textContent=check.status;
    row.append(info,badge);body.append(row);
  });
}

function renderApiManager(){
 const select=document.getElementById("apiProject");const tbody=document.getElementById("apiIntegrationRows");const status=document.getElementById("apiRegistryStatus");if(!select||!tbody)return;
 select.replaceChildren();currentProjects.forEach(project=>{const option=document.createElement("option");option.value=project.id||project.slug;option.textContent=project.name;select.append(option);});tbody.replaceChildren();
 if(dataMode!=="live"){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=6;cell.textContent="Preview only. Sign in with approved owner/admin access to save and load integrations.";row.append(cell);tbody.append(row);if(status)status.textContent="PREVIEW";return;}
 if(!currentApiIntegrations.length){const row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=6;cell.textContent="No integrations registered yet.";row.append(cell);tbody.append(row);}
 currentApiIntegrations.forEach(item=>{const row=document.createElement("tr");const project=currentProjects.find(p=>p.id===item.project_id);[item.display_name,project?.name||"Unknown project",item.provider,item.environment_scope,item.secret_reference||"Not configured",item.status].forEach(v=>{const td=document.createElement("td");td.textContent=safeText(v);row.append(td);});tbody.append(row);});if(status)status.textContent="LIVE REGISTRY";
}
function renderVault(){
 const project=document.getElementById("vaultProject"),body=document.getElementById("vaultRows");if(!project||!body)return;
 project.replaceChildren();currentProjects.forEach(p=>{const o=document.createElement("option");o.value=p.id||"";o.textContent=p.name;project.append(o);});
 body.replaceChildren();
 if(dataMode!=="live"||currentRole!=="owner"){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="Owner sign-in required to access the encrypted vault.";tr.append(td);body.append(tr);return;}
 if(!currentVaultItems.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="No secrets stored yet.";tr.append(td);body.append(tr);return;}
 currentVaultItems.forEach(item=>{const tr=document.createElement("tr");[item.secret_name,item.project_name||currentProjects.find(p=>p.id===item.project_id)?.name||"Project",item.provider,item.environment_scope,item.masked_hint||"Hidden",item.updated_at?new Date(item.updated_at).toLocaleString():"—"].forEach(v=>{const td=document.createElement("td");td.textContent=safeText(v);tr.append(td);});const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent="Delete";btn.addEventListener("click",()=>deleteVaultItem(item.id));td.append(btn);tr.append(td);body.append(tr);});
}
async function loadVault(){
 const message=document.getElementById("vaultMessage");
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase){currentVaultItems=[];renderVault();return;}
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-secret-vault",{body:{action:"list"}});
 if(error){if(message)message.textContent="Vault list unavailable. Check owner access and function deployment.";currentVaultItems=[];}else currentVaultItems=data?.items||[];
 renderVault();
}
async function deleteVaultItem(id){
 if(!currentUser||currentRole!=="owner"||!window.dolfishSupabase||!confirm("Delete this encrypted secret permanently?"))return;
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-secret-vault",{body:{action:"delete",id}});
 const message=document.getElementById("vaultMessage");
 if(error||!data?.ok){message.textContent="Delete failed. Check vault configuration.";return;}
 message.textContent="Encrypted secret deleted.";await loadVault();
}
function renderAll() {
  renderCards("projectCards",currentProjects.slice(0,6));
  renderApiManager();\n  renderVault();
  renderCards("allProjects",currentProjects);
  renderCards("providers",currentProviders.map(p=>({...p,description:p.secret_reference?"Vault reference configured (value hidden).":"Connection metadata only. No secret values are stored here.",tags:[p.provider||"Provider",p.secret_reference?"Vault reference":"No vault reference"]})),"provider");
  updateStats();
  renderAuditEvents();
  renderAccessSummary();
  renderMonitoring();
  renderOperationRequests();
}
function renderAuditEvents() {
  const el = document.getElementById("auditEvents");
  if (!el) return;
  el.replaceChildren();
  if (dataMode !== "live") {
    const p = document.createElement("p");
    p.className = "emptyhint";
    p.textContent = "Sign in with an authorized owner/admin account to view recorded audit events.";
    el.append(p);
    return;
  }
  if (!currentAuditEvents.length) {
    const p = document.createElement("p");
    p.className = "emptyhint";
    p.textContent = "No audit events have been recorded yet.";
    el.append(p);
    return;
  }
  currentAuditEvents.forEach(event => {
    const row = document.createElement("div");
    row.className = "rowitem";
    const info = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = safeText(event.action || "System event");
    const small = document.createElement("small");
    const target = [event.target_type, event.target_id].filter(Boolean).join(" · ");
    const when = event.created_at ? new Date(event.created_at).toLocaleString() : "Time unavailable";
    small.textContent = [target, when].filter(Boolean).join(" — ");
    info.append(strong, small);
    const tag = document.createElement("span");
    tag.className = "demo";
    tag.textContent = "AUDIT";
    row.append(info, tag);
    el.append(row);
  });
}
renderAll();

document.querySelectorAll(".nav[data-view]").forEach(a=>a.addEventListener("click",()=>showView(a.dataset.view)));
window.showView=function(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav").forEach(a=>a.classList.toggle("active",a.dataset.view===id));
  const crumb=document.getElementById("crumbpage"); if(crumb)crumb.textContent=id[0].toUpperCase()+id.slice(1);
  window.scrollTo({top:0,behavior:"smooth"});
};
const search=document.getElementById("projectSearch");
if(search)search.addEventListener("input",e=>renderCards("allProjects",currentProjects.filter(p=>(p.name+" "+p.description+" "+p.slug).toLowerCase().includes(e.target.value.toLowerCase()))));
let bn=false;
const lang=document.getElementById("lang");
if(lang)lang.addEventListener("click",()=>{bn=!bn;document.documentElement.lang=bn?"bn":"en";lang.textContent=bn?"English":"বাংলা";document.querySelectorAll("[data-en]").forEach(el=>el.textContent=bn?el.dataset.bn:el.dataset.en);});

async function loadLiveData({user,role,supabase}) {
  currentUser = user || null;
  currentRole = role || null;
  if(!user || !["owner","admin"].includes(role)) {
    dataMode = user ? "restricted" : "demo";
    currentProjects=demoProjects;
    currentProviders=demoProviders;
    currentAuditEvents=[];
    currentCatalog=[];
    currentHealthChecks=[];
    currentOperationRequests=[];
    currentApiIntegrations=[];
    renderAll();
    return;
  }
  const [projectResult,providerResult,auditResult,catalogResult,healthResult,operationResult,apiResult]=await Promise.all([
    supabase.from("cc_projects").select("id,name,slug,description,lifecycle_status,updated_at").order("name"),
    supabase.from("cc_provider_connections").select("id,provider,display_name,status,secret_reference,updated_at").order("display_name"),
    supabase.from("cc_audit_events").select("id,action,target_type,target_id,created_at").order("created_at",{ascending:false}).limit(10),
    supabase.from("cc_provider_catalog").select("provider,display_name,category,auth_method,minimum_scopes,capabilities,docs_url,connection_strategy").order("display_name"),
    supabase.from("cc_provider_health_checks").select("provider,status,http_status,latency_ms,message,checked_at").order("checked_at",{ascending:false}).limit(30),
    supabase.from("cc_operation_requests").select("id,requested_by,operation_type,target_project,rationale,status,reviewed_at,review_note,created_at").order("created_at",{ascending:false}).limit(30),
    supabase.from("cc_api_integrations").select("id,project_id,provider,display_name,secret_reference,masked_hint,environment_scope,status,documentation_url,notes,created_at").order("created_at",{ascending:false})
  ]);
  if(projectResult.error || providerResult.error || auditResult.error || catalogResult.error || healthResult.error || operationResult.error || apiResult.error) {
    console.error("Control Center data load failed",projectResult.error||providerResult.error||auditResult.error||catalogResult.error||healthResult.error||operationResult.error);
    dataMode="restricted";
    currentProjects=demoProjects;
    currentProviders=demoProviders;
    currentAuditEvents=[];
    currentCatalog=[];
    currentHealthChecks=[];
    currentOperationRequests=[];
    currentApiIntegrations=[];
    renderAll();
    const pill=document.querySelector(".topright .pill"); if(pill)pill.textContent="● Database access error";
    return;
  }
  currentProjects=projectResult.data||[];
  currentProviders=(providerResult.data||[]).map(p=>({...p,name:p.display_name||p.provider}));
  currentAuditEvents=auditResult.data||[];
  currentCatalog=catalogResult.data||[];
  currentHealthChecks=healthResult.data||[];
  currentOperationRequests=operationResult.data||[];
  currentApiIntegrations=apiResult.data||[];
  dataMode="live";
  renderAll();
}
window.addEventListener("dolfish:auth",event=>loadLiveData(event.detail));
const refreshMonitoring=document.getElementById("refreshMonitoring");
if(refreshMonitoring)refreshMonitoring.addEventListener("click",async()=>{
  if(!currentUser||!["owner","admin"].includes(currentRole)||!window.dolfishSupabase)return;
  refreshMonitoring.disabled=true;refreshMonitoring.textContent="Refreshing…";
  try{await loadLiveData({user:currentUser,role:currentRole,supabase:window.dolfishSupabase});}
  finally{refreshMonitoring.disabled=false;refreshMonitoring.textContent="Refresh data";}
});
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

const apiIntegrationForm=document.getElementById("apiIntegrationForm");
if(apiIntegrationForm)apiIntegrationForm.addEventListener("submit",async event=>{
 event.preventDefault();const message=document.getElementById("apiFormMessage");
 if(dataMode!=="live"||currentRole!=="owner"||!currentUser||!window.dolfishSupabase){message.textContent="Owner sign-in is required. Preview mode cannot save records.";return;}
 const submit=apiIntegrationForm.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="Saving…";
 try{const payload={project_id:document.getElementById("apiProject").value,provider:document.getElementById("apiProvider").value.toLowerCase().replaceAll(" ","-"),display_name:document.getElementById("apiName").value.trim(),environment_scope:document.getElementById("apiEnvironment").value,secret_reference:document.getElementById("apiSecretRef").value.trim()||null,masked_hint:document.getElementById("apiMaskedHint").value.trim()||null,documentation_url:document.getElementById("apiDocs").value.trim()||null,notes:document.getElementById("apiNotes").value.trim()||null,created_by:currentUser.id,status:"not_configured"};
 const {error}=await window.dolfishSupabase.from("cc_api_integrations").insert(payload);if(error)throw error;message.textContent="Metadata saved. Secret value was not entered or stored.";apiIntegrationForm.reset();await loadLiveData({user:currentUser,role:currentRole,supabase:window.dolfishSupabase});
 }catch(error){console.error("API integration save failed",error);message.textContent="Save failed. Check permissions and project selection.";}finally{submit.disabled=false;submit.textContent="Save integration metadata";}
});
const vaultForm=document.getElementById("vaultForm");
if(vaultForm)vaultForm.addEventListener("submit",async event=>{
 event.preventDefault();const message=document.getElementById("vaultMessage"),value=document.getElementById("vaultSecretValue"),button=vaultForm.querySelector('button[type="submit"]');
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase){message.textContent="Owner sign-in is required. Preview mode cannot save secrets.";return;}
 if(!value.value){message.textContent="Enter a secret value.";return;}
 button.disabled=true;button.textContent="Encrypting…";
 try{
  const payload={action:"set",project_id:document.getElementById("vaultProject").value,provider:document.getElementById("vaultProvider").value.toLowerCase().replaceAll(" ","-"),integration_name:document.getElementById("vaultIntegration").value.trim(),environment_scope:document.getElementById("vaultEnvironment").value,secret_name:document.getElementById("vaultSecretName").value.trim(),secret_value:value.value,masked_hint:document.getElementById("vaultHint").value.trim()||null};
  const {data,error}=await window.dolfishSupabase.functions.invoke("cc-secret-vault",{body:payload});
  value.value="";
  if(error||!data?.ok)throw error||new Error("Vault rejected the request");
  vaultForm.reset();message.textContent="Secret encrypted and stored. Plaintext was not returned.";await loadVault();
 }catch(error){console.error("Vault save failed",error);message.textContent="Save failed. Confirm CC_VAULT_MASTER_KEY is configured in Supabase Edge Function secrets.";}
 finally{value.value="";button.disabled=false;button.textContent="Encrypt & save secret";}
});
const refreshVault=document.getElementById("refreshVault");if(refreshVault)refreshVault.addEventListener("click",loadVault);
\nconst operationForm=document.getElementById("operationRequestForm");
if(operationForm)operationForm.addEventListener("submit",async event=>{
 event.preventDefault();
 if(dataMode!=="live"||!currentUser||!["owner","admin"].includes(currentRole)||!window.dolfishSupabase)return;
 const submit=operationForm.querySelector('button[type="submit"]');
 const type=document.getElementById("operationType").value;
 const target=document.getElementById("operationTarget").value.trim();
 const rationale=document.getElementById("operationRationale").value.trim();
 if(rationale.length<10){document.getElementById("operationFormMessage").textContent="Please provide at least 10 characters of rationale.";return;}
 submit.disabled=true;submit.textContent="Submitting…";
 try{
  const {data:created,error}=await window.dolfishSupabase.from("cc_operation_requests").insert({requested_by:currentUser.id,operation_type:type,target_project:target,rationale,status:"pending"}).select("id").single();
  if(error)throw error;
  let auditSaved=true;
  try{
   const {error:auditError}=await window.dolfishSupabase.functions.invoke("cc-audit-write",{body:{action:"operation_request_created",target_type:"operation_request",target_id:created.id,details:{operation_type:type,target_project:target}}});
   if(auditError)auditSaved=false;
  }catch{auditSaved=false;}
  operationForm.reset();
  document.getElementById("operationFormMessage").textContent=auditSaved?"Request submitted and audit event recorded. No production action has been executed.":"Request submitted, but the audit event could not be confirmed. Notify the owner before proceeding.";
  await loadLiveData({user:currentUser,role:currentRole,supabase:window.dolfishSupabase});
 }catch(err){console.error("Operation request failed",err);document.getElementById("operationFormMessage").textContent="Request failed. Check access and required fields.";}
 finally{submit.disabled=false;submit.textContent="Submit for approval";}
});

async function vercelEnvCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-vercel-env",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Vercel request failed");return data;
}
async function loadVercelEnv(){
 const project=document.getElementById("vercelEnvProject").value.trim(),message=document.getElementById("vercelEnvMessage"),body=document.getElementById("vercelEnvRows");
 if(!project){message.textContent="Enter the Vercel project ID first.";return;}message.textContent="Loading…";body.replaceChildren();
 try{const data=await vercelEnvCall({action:"env_list",project_id:project});
 if(!data.items?.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="No environment variables found.";tr.append(td);body.append(tr);}
 (data.items||[]).forEach(item=>{const tr=document.createElement("tr");[item.key,item.type,(item.target||[]).join(", "),item.updatedAt?new Date(item.updatedAt).toLocaleString():"—"].forEach(v=>{const td=document.createElement("td");td.textContent=safeText(v);tr.append(td);});
 const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent="Delete";btn.addEventListener("click",async()=>{if(!confirm("Delete Vercel variable "+item.key+"?"))return;btn.disabled=true;try{await vercelEnvCall({action:"env_delete",project_id:project,id:item.id});await loadVercelEnv();}catch(e){message.textContent=e.message;btn.disabled=false;}});td.append(btn);tr.append(td);body.append(tr);});
 message.textContent="Loaded "+data.count+" variable records. Values are never returned.";
 }catch(e){message.textContent=e.message;const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Could not load variables. Check token scopes and setup.";tr.append(td);body.append(tr);}
}
const vercelRefresh=document.getElementById("vercelEnvRefresh");if(vercelRefresh)vercelRefresh.addEventListener("click",loadVercelEnv);
const vercelForm=document.getElementById("vercelEnvForm");
async function saveVercelEnv(action){
 const message=document.getElementById("vercelEnvMessage"),value=document.getElementById("vercelEnvValue"),button=vercelForm.querySelector('button[type="submit"]'),targets=[...document.getElementById("vercelEnvTargets").selectedOptions].map(o=>o.value);
 if(!targets.length){message.textContent="Select at least one target.";return;}if(!value.value){message.textContent="Enter a value.";return;}
 button.disabled=true;message.textContent="Sending securely…";
 try{await vercelEnvCall({action,project_id:document.getElementById("vercelEnvProject").value.trim(),key:document.getElementById("vercelEnvKey").value.trim(),value:value.value,target:targets});value.value="";message.textContent=action==="env_update"?"Update request completed.":"Variable created.";await loadVercelEnv();}
 catch(e){message.textContent=e.message;}finally{value.value="";button.disabled=false;}
}
if(vercelForm)vercelForm.addEventListener("submit",e=>{e.preventDefault();saveVercelEnv("env_create");});
const vercelUpdate=document.getElementById("vercelEnvUpdate");if(vercelUpdate)vercelUpdate.addEventListener("click",()=>saveVercelEnv("env_update"));


async function vercelDeployCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-vercel-deploy",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Redeployment request failed");return data;
}
const vercelDeployForm=document.getElementById("vercelDeployForm");
if(vercelDeployForm)vercelDeployForm.addEventListener("submit",async event=>{
 event.preventDefault();
 const message=document.getElementById("vercelDeployMessage"),button=vercelDeployForm.querySelector('button[type="submit"]');
 const deploymentId=document.getElementById("vercelDeploymentId").value.trim();
 const confirmProduction=document.getElementById("vercelProductionConfirm").checked;
 if(!/^dpl_[A-Za-z0-9]+$/.test(deploymentId)){message.textContent="Enter a valid Vercel deployment ID.";return;}
 if(!confirm("Verify this deployment and start a new Vercel build? Production targets require the separate checkbox."))return;
 button.disabled=true;button.textContent="Verifying…";message.textContent="Checking deployment ownership and target…";
 try{
  const result=await vercelDeployCall({deployment_id:deploymentId,confirm_production:confirmProduction});
  message.textContent="Redeployment started · "+(result.deployment?.state||"QUEUED")+" · "+(result.deployment?.url||result.deployment?.id||"Deployment ID pending")+(result.audit_recorded?" · audit recorded":" · audit write needs review");
  vercelDeployForm.reset();
 }catch(error){message.textContent=error.message||"Redeployment failed. Check owner access and Vercel token.";}
 finally{button.disabled=false;button.textContent="Verify & start redeployment";}
});


async function netlifyCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-netlify-readonly",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Netlify request failed");return data;
}
const netlifyMessage=document.getElementById("netlifyMessage");
const netlifySiteRows=document.getElementById("netlifySiteRows"),netlifyDeployRows=document.getElementById("netlifyDeployRows");
const safeCell=(value)=>{const td=document.createElement("td");td.textContent=value==null?"—":String(value);return td;};
async function loadNetlifyDeploys(siteId){
 netlifyDeployRows.replaceChildren();netlifyMessage.textContent="Loading recent deployments…";
 try{const data=await netlifyCall({action:"deploys",site_id:siteId});
 if(!data.deploys?.length){const tr=document.createElement("tr"),td=safeCell("No deployments found.");td.colSpan=5;tr.append(td);netlifyDeployRows.append(tr);}
 (data.deploys||[]).forEach(d=>{const tr=document.createElement("tr");[d.state,d.context,d.branch,d.commit_ref?String(d.commit_ref).slice(0,10):"—",d.deploy_url||"—"].forEach(v=>tr.append(safeCell(v)));netlifyDeployRows.append(tr);});
 netlifyMessage.textContent="Loaded "+data.count+" recent deployment records.";
 }catch(e){netlifyMessage.textContent=e.message;}
}
async function loadNetlifySites(){
 netlifyMessage.textContent="Loading Netlify sites…";netlifySiteRows.replaceChildren();
 try{const data=await netlifyCall({action:"sites"});
 (data.sites||[]).forEach(s=>{const tr=document.createElement("tr");[s.name,s.url,s.branch,s.published_state].forEach(v=>tr.append(safeCell(v)));
 const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent="Deploys";btn.addEventListener("click",()=>loadNetlifyDeploys(s.id));td.append(btn);tr.append(td);netlifySiteRows.append(tr);});
 netlifyMessage.textContent="Loaded "+data.count+" Netlify sites. Select Deploys for history.";
 }catch(e){netlifyMessage.textContent=e.message;const tr=document.createElement("tr"),td=safeCell("Could not load sites. Check owner access and token.");td.colSpan=5;tr.append(td);netlifySiteRows.append(tr);}
}
const netlifyLoad=document.getElementById("netlifySitesLoad");if(netlifyLoad)netlifyLoad.addEventListener("click",loadNetlifySites);

async function railwayCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-railway-readonly",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Railway request failed");return data;
}
const railwayMessage=document.getElementById("railwayMessage"),railwayProjectRows=document.getElementById("railwayProjectRows"),railwayServiceRows=document.getElementById("railwayServiceRows"),railwayDeployRows=document.getElementById("railwayDeployRows");
function railwayCell(value){const td=document.createElement("td");td.textContent=value==null?"—":String(value);return td;}
async function loadRailwayDeployments(projectId,environmentId){
 railwayDeployRows.replaceChildren();railwayMessage.textContent="Loading deployments…";
 try{const data=await railwayCall({action:"deployments",project_id:projectId,environment_id:environmentId});
 if(!data.items?.length){const tr=document.createElement("tr"),td=railwayCell("No deployments found.");td.colSpan=4;tr.append(td);railwayDeployRows.append(tr);}
 (data.items||[]).forEach(d=>{const tr=document.createElement("tr");[d.status,d.createdAt?new Date(d.createdAt).toLocaleString():"—",d.updatedAt?new Date(d.updatedAt).toLocaleString():"—",d.url||"—"].forEach(v=>tr.append(railwayCell(v)));railwayDeployRows.append(tr);});
 railwayMessage.textContent="Loaded "+data.count+" deployment records.";
 }catch(e){railwayMessage.textContent=e.message;}
}
async function loadRailwayServices(projectId){
 railwayServiceRows.replaceChildren();railwayDeployRows.replaceChildren();railwayMessage.textContent="Loading services and environments…";
 try{const data=await railwayCall({action:"services",project_id:projectId});
 (data.services||[]).forEach(s=>{(data.environments||[]).forEach(env=>{const tr=document.createElement("tr");tr.append(railwayCell(s.name),railwayCell(env.name));const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent="Deployments";btn.addEventListener("click",()=>loadRailwayDeployments(projectId,env.id));td.append(btn);tr.append(td);railwayServiceRows.append(tr);});});
 if(!data.services?.length){const tr=document.createElement("tr"),td=railwayCell("No services in this project.");td.colSpan=3;tr.append(td);railwayServiceRows.append(tr);}
 railwayMessage.textContent="Loaded "+(data.services||[]).length+" services and "+(data.environments||[]).length+" environments.";
 }catch(e){railwayMessage.textContent=e.message;}
}
async function loadRailwayProjects(){
 railwayMessage.textContent="Loading Railway projects…";railwayProjectRows.replaceChildren();
 try{const data=await railwayCall({action:"projects"});
 (data.items||[]).forEach(p=>{const tr=document.createElement("tr");tr.append(railwayCell(p.name),railwayCell(p.createdAt?new Date(p.createdAt).toLocaleDateString():"—"),railwayCell(p.updatedAt?new Date(p.updatedAt).toLocaleDateString():"—"));const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.className="check-provider";btn.textContent="Services";btn.addEventListener("click",()=>loadRailwayServices(p.id));td.append(btn);tr.append(td);railwayProjectRows.append(tr);});
 if(!data.items?.length){const tr=document.createElement("tr"),td=railwayCell("No Railway projects found. Create a project in Railway first.");td.colSpan=4;tr.append(td);railwayProjectRows.append(tr);}
 railwayMessage.textContent="Loaded "+data.count+" Railway projects.";
 }catch(e){railwayMessage.textContent=e.message;const tr=document.createElement("tr"),td=railwayCell("Could not load projects. Check owner access and token.");td.colSpan=4;tr.append(td);railwayProjectRows.append(tr);}
}
const railwayLoad=document.getElementById("railwayProjectsLoad");if(railwayLoad)railwayLoad.addEventListener("click",loadRailwayProjects);

async function cloudflareCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-cloudflare-readonly",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Cloudflare request failed");return data;
}
const cloudflareMessage=document.getElementById("cloudflareMessage"),cloudflareZoneRows=document.getElementById("cloudflareZoneRows"),cloudflareWorkerRows=document.getElementById("cloudflareWorkerRows");
function cloudflareCell(value){const td=document.createElement("td");td.textContent=value==null?"—":String(value);return td;}
async function loadCloudflare(action){
 const body=action==="zones"?cloudflareZoneRows:cloudflareWorkerRows;body.replaceChildren();cloudflareMessage.textContent="Loading Cloudflare "+action+"…";
 try{const data=await cloudflareCall({action});
 (data.items||[]).forEach(item=>{const tr=document.createElement("tr");const values=action==="zones"?[item.name,item.status,item.plan]:[item.script,item.created_on?new Date(item.created_on).toLocaleString():"—",item.modified_on?new Date(item.modified_on).toLocaleString():"—"];values.forEach(v=>tr.append(cloudflareCell(v)));body.append(tr);});
 if(!data.items?.length){const tr=document.createElement("tr"),td=cloudflareCell("No "+action+" found.");td.colSpan=3;tr.append(td);body.append(tr);}
 cloudflareMessage.textContent="Loaded "+data.count+" Cloudflare "+action+".";
 }catch(e){cloudflareMessage.textContent=e.message;const tr=document.createElement("tr"),td=cloudflareCell("Could not load data. Check owner access and token permissions.");td.colSpan=3;tr.append(td);body.append(tr);}
}
const cloudflareZonesLoad=document.getElementById("cloudflareZonesLoad");if(cloudflareZonesLoad)cloudflareZonesLoad.addEventListener("click",()=>loadCloudflare("zones"));
const cloudflareWorkersLoad=document.getElementById("cloudflareWorkersLoad");if(cloudflareWorkersLoad)cloudflareWorkersLoad.addEventListener("click",()=>loadCloudflare("workers"));

async function renderCall(payload){
 if(dataMode!=="live"||currentRole!=="owner"||!window.dolfishSupabase)throw new Error("Owner sign-in required.");
 const {data,error}=await window.dolfishSupabase.functions.invoke("cc-render-readonly",{body:payload});
 if(error||data?.error)throw new Error(data?.error||error?.message||"Render request failed");return data;
}
const renderMessage=document.getElementById("renderMessage"),renderServiceRows=document.getElementById("renderServiceRows"),renderDeployRows=document.getElementById("renderDeployRows");
function renderCell(value){const td=document.createElement("td");td.textContent=value==null?"—":String(value);return td;}
async function loadRender(action){
 const body=action==="services"?renderServiceRows:renderDeployRows;body.replaceChildren();renderMessage.textContent="Loading Render "+action+"…";
 try{const payload={action};if(action==="deploys")payload.serviceId=document.getElementById("renderServiceId").value.trim();
 const data=await renderCall(payload);(data.items||[]).forEach(item=>{const tr=document.createElement("tr");const values=action==="services"?[item.name,item.type,item.region,item.plan,item.suspended?"Suspended":"Active"]:[item.id,item.status,item.createdAt?new Date(item.createdAt).toLocaleString():"—",item.updatedAt?new Date(item.updatedAt).toLocaleString():"—"];values.forEach(v=>tr.append(renderCell(v)));body.append(tr);});
 if(!data.items?.length){const tr=document.createElement("tr"),td=renderCell("No "+action+" found.");td.colSpan=action==="services"?5:4;tr.append(td);body.append(tr);}
 renderMessage.textContent="Loaded "+data.count+" Render "+action+".";
 }catch(e){renderMessage.textContent=e.message;const tr=document.createElement("tr"),td=renderCell("Could not load. Check owner access, vault token and permissions.");td.colSpan=action==="services"?5:4;tr.append(td);body.append(tr);}
}
const renderServicesLoad=document.getElementById("renderServicesLoad");if(renderServicesLoad)renderServicesLoad.addEventListener("click",()=>loadRender("services"));
const renderDeploysLoad=document.getElementById("renderDeploysLoad");if(renderDeploysLoad)renderDeploysLoad.addEventListener("click",()=>loadRender("deploys"));
