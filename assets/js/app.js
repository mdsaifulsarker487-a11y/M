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

function renderAll() {
  renderCards("projectCards",currentProjects.slice(0,6));
  renderCards("allProjects",currentProjects);
  renderCards("providers",currentProviders.map(p=>({...p,description:p.secret_reference?"Vault reference configured (value hidden).":"Connection metadata only. No secret values are stored here.",tags:[p.provider||"Provider",p.secret_reference?"Vault reference":"No vault reference"]})),"provider");
  updateStats();
  renderAuditEvents();
  renderAccessSummary();
  renderMonitoring();
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
    renderAll();
    return;
  }
  const [projectResult,providerResult,auditResult,catalogResult,healthResult]=await Promise.all([
    supabase.from("cc_projects").select("id,name,slug,description,lifecycle_status,updated_at").order("name"),
    supabase.from("cc_provider_connections").select("id,provider,display_name,status,secret_reference,updated_at").order("display_name"),
    supabase.from("cc_audit_events").select("id,action,target_type,target_id,created_at").order("created_at",{ascending:false}).limit(10),
    supabase.from("cc_provider_catalog").select("provider,display_name,category,auth_method,minimum_scopes,capabilities,docs_url,connection_strategy").order("display_name"),
    supabase.from("cc_provider_health_checks").select("provider,status,http_status,latency_ms,message,checked_at").order("checked_at",{ascending:false}).limit(30)
  ]);
  if(projectResult.error || providerResult.error || auditResult.error || catalogResult.error || healthResult.error) {
    console.error("Control Center data load failed",projectResult.error||providerResult.error||auditResult.error||catalogResult.error||healthResult.error);
    dataMode="restricted";
    currentProjects=demoProjects;
    currentProviders=demoProviders;
    currentAuditEvents=[];
    currentCatalog=[];
    renderAll();
    const pill=document.querySelector(".topright .pill"); if(pill)pill.textContent="● Database access error";
    return;
  }
  currentProjects=projectResult.data||[];
  currentProviders=(providerResult.data||[]).map(p=>({...p,name:p.display_name||p.provider}));
  currentAuditEvents=auditResult.data||[];
  currentCatalog=catalogResult.data||[];
  currentHealthChecks=healthResult.data||[];
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
