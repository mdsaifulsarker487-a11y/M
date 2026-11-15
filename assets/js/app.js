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
let dataMode = "demo";

function safeText(value) { return String(value ?? ""); }
function makeCard({name,description,slug,status,tags=[]},kind="project") {
  const article=document.createElement("article"); article.className="project";
  const top=document.createElement("div"); top.className="projecttop";
  const icon=document.createElement("div"); icon.className="picon"; icon.textContent=safeText((name||"??").split(/\\s+/).map(x=>x[0]).join("").slice(0,2)).toUpperCase();
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
  if(stats[0]){stats[0].querySelector(".statnum").textContent=String(currentProjects.length);stats[0].querySelector(".statnote").textContent=dataMode==="live"?"Live database records":"Preview inventory · sign in for live data";}
  if(stats[1]){const connected=currentProviders.filter(p=>["connected","active"].includes(String(p.status).toLowerCase())).length;stats[1].querySelector(".statnum").innerHTML=connected+' <small>live</small>';stats[1].querySelector(".statnote").textContent=dataMode==="live"?"Provider metadata from database":"No live provider data loaded";}
  const pill=document.querySelector(".topright .pill");
  if(pill) pill.textContent=dataMode==="live"?"● Live database":"● Demo workspace";
  const projectPill=document.querySelector("#projects .toolbar .pill");
  if(projectPill) projectPill.textContent=`${currentProjects.length} registered · ${dataMode==="live"?"live database":"preview inventory"}`;
}
function renderAll() {
  renderCards("projectCards",currentProjects.slice(0,6));
  renderCards("allProjects",currentProjects);
  renderCards("providers",currentProviders.map(p=>({...p,description:p.secret_reference?"Vault reference configured (value hidden).":"Connection metadata only. No secret values are stored here.",tags:[p.provider||"Provider",p.secret_reference?"Vault reference":"No vault reference"]})),"provider");
  updateStats();
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
  if(!user || !["owner","admin"].includes(role)) {
    dataMode="demo";
    currentProjects=demoProjects;
    currentProviders=demoProviders;
    renderAll();
    return;
  }
  const [projectResult,providerResult]=await Promise.all([
    supabase.from("cc_projects").select("id,name,slug,description,lifecycle_status,updated_at").order("name"),
    supabase.from("cc_provider_connections").select("id,provider,display_name,status,secret_reference,updated_at").order("display_name")
  ]);
  if(projectResult.error || providerResult.error) {
    console.error("Control Center data load failed",projectResult.error||providerResult.error);
    dataMode="restricted";
    const pill=document.querySelector(".topright .pill"); if(pill)pill.textContent="● Database access error";
    return;
  }
  currentProjects=projectResult.data||[];
  currentProviders=(providerResult.data||[]).map(p=>({...p,name:p.display_name||p.provider}));
  dataMode="live";
  renderAll();
}
window.addEventListener("dolfish:auth",event=>loadLiveData(event.detail));
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
