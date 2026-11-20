/* ===================== JavaScript ===================== */
// ---- Data layer: students[] and records{ "YYYY-MM-DD": { studentId: "P"|"A"|"L" } }
const KEY = "attendance-app-v1";
let db = { students: [], records: {} };

function load(){
  try{ const raw = localStorage.getItem(KEY); if(raw) db = JSON.parse(raw); }catch(e){}
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){}
}

// ---- Helpers
const $ = id => document.getElementById(id);
const todayStr = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LABEL = { P:"Present", A:"Absent", L:"Late" };

function toast(msg){
  const t=$("toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove("show"),2000);
}
function confirmBox(msg, onYes){
  $("modalMsg").textContent = msg; $("modalBg").classList.add("show");
  $("modalYes").onclick = () => { $("modalBg").classList.remove("show"); onYes(); };
  $("modalNo").onclick = () => $("modalBg").classList.remove("show");
}
function classes(){ return [...new Set(db.students.map(s=>s.cls))].sort(); }
function fillClassSelect(sel, withAll){
  const cur = sel.value;
  sel.innerHTML = (withAll ? '<option value="">All classes</option>' : '') +
    classes().map(c=>`<option>${esc(c)}</option>`).join("");
  if([...sel.options].some(o=>o.value===cur)) sel.value = cur;
}

// ---- Stats calculation (percent counts Present + Late as attended)
function statsFor(studentId, from, to){
  let p=0,l=0,a=0;
  for(const [date,rec] of Object.entries(db.records)){
    if(from && date<from) continue;
    if(to && date>to) continue;
    const s = rec[studentId];
    if(s==="P")p++; else if(s==="L")l++; else if(s==="A")a++;
  }
  const days=p+l+a;
  return { p,l,a,days, pct: days ? Math.round((p+l)/days*100) : null };
}
function pctPill(pct){
  if(pct===null) return '<span class="pill">–</span>';
  const c = pct>=85?"good":pct>=75?"warn":"low";
  return `<span class="pill ${c}">${pct}%</span>`;
}
function pctBar(pct){
  if(pct===null) return "";
  const col = pct>=85?"var(--ok)":pct>=75?"var(--late)":"var(--bad)";
  return `<div class="bar"><i style="width:${pct}%;background:${col}"></i></div>`;
}

// ---- Tabs
function showTab(name){
  document.querySelectorAll("main > section").forEach(s=>s.classList.add("hidden"));
  $("tab-"+name).classList.remove("hidden");
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active", b.dataset.tab===name));
  render(name);
}
$("nav").addEventListener("click", e=>{ if(e.target.dataset.tab) showTab(e.target.dataset.tab); });

function render(tab){
  if(tab==="dashboard") renderDashboard();
  if(tab==="students") renderStudents();
  if(tab==="mark") renderMark();
  if(tab==="reports") renderReports();
}

// ---- Dashboard
function renderDashboard(){
  const dates = Object.keys(db.records).sort();
  const last = dates[dates.length-1];
  let todayPct = "–";
  if(db.records[todayStr()]){
    const v = Object.values(db.records[todayStr()]);
    todayPct = Math.round(v.filter(x=>x!=="A").length / v.length * 100) + "%";
  }
  const all = db.students.map(s=>statsFor(s.id)).filter(x=>x.days);
  const overall = all.length ? Math.round(all.reduce((t,x)=>t+x.pct,0)/all.length)+"%" : "–";
  $("stats").innerHTML = [
    [db.students.length,"Students"],
    [classes().length,"Classes"],
    [dates.length,"Days recorded"],
    [todayPct,"Today's attendance"],
    [overall,"Overall average"]
  ].map(([n,l])=>`<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");

  const low = db.students.map(s=>({s,...statsFor(s.id)})).filter(x=>x.pct!==null && x.pct<75).sort((a,b)=>a.pct-b.pct);
  $("lowList").innerHTML = low.length
    ? `<table><tbody>${low.map(x=>`<tr><td>${esc(x.s.name)}</td><td>${esc(x.s.cls)}</td><td>${pctPill(x.pct)}</td></tr>`).join("")}</tbody></table>`
    : '<div class="empty">Nobody is below 75%.</div>';
}

// ---- Students
$("studentForm").addEventListener("submit", e=>{
  e.preventDefault();
  const roll=$("sRoll").value.trim(), name=$("sName").value.trim(), cls=$("sClass").value.trim();
  if(!roll||!name||!cls) return;
  if(db.students.some(s=>s.roll===roll && s.cls===cls)){ toast("That roll number already exists in this class"); return; }
  db.students.push({ id:uid(), roll, name, cls });
  save(); e.target.reset(); renderStudents(); toast("Student added");
});
function renderStudents(){
  const list = [...db.students].sort((a,b)=>a.cls.localeCompare(b.cls)||a.roll.localeCompare(b.roll,undefined,{numeric:true}));
  $("studentRows").innerHTML = list.length ? list.map(s=>`
    <tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td>
    <td style="text-align:right"><button class="btn small danger" data-del="${s.id}">Remove</button></td></tr>`).join("")
    : '<tr><td colspan="4" class="empty">No students yet. Add one above or load demo data from the Dashboard.</td></tr>';
}
$("studentRows").addEventListener("click", e=>{
  const id = e.target.dataset.del; if(!id) return;
  const s = db.students.find(x=>x.id===id);
  confirmBox(`Remove ${s.name} and all their attendance records?`, ()=>{
    db.students = db.students.filter(x=>x.id!==id);
    Object.values(db.records).forEach(r=>delete r[id]);
    save(); renderStudents(); toast("Student removed");
  });
});

// ---- Mark attendance
let draft = {}; // studentId -> status for the date/class on screen
function markStudents(){
  return db.students.filter(s=>s.cls===$("mClass").value)
    .sort((a,b)=>a.roll.localeCompare(b.roll,undefined,{numeric:true}));
}
function renderMark(){
  if(!$("mDate").value) $("mDate").value = todayStr();
  fillClassSelect($("mClass"), false);
  loadDraft();
}
function loadDraft(){
  const saved = db.records[$("mDate").value] || {};
  draft = {};
  markStudents().forEach(s=>{ draft[s.id] = saved[s.id] || "P"; });
  drawMark();
}
function drawMark(){
  const list = markStudents();
  $("markRows").innerHTML = list.length ? list.map(s=>`
    <tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td>
    <td><div class="seg" data-id="${s.id}">
      ${["P","A","L"].map(k=>`<button class="${k.toLowerCase()} ${draft[s.id]===k?"on":""}" data-s="${k}">${LABEL[k]}</button>`).join("")}
    </div></td></tr>`).join("")
    : '<tr><td colspan="3" class="empty">Add students first.</td></tr>';
  const v = Object.values(draft);
  $("markSummary").textContent = v.length
    ? `${v.filter(x=>x==="P").length} present · ${v.filter(x=>x==="L").length} late · ${v.filter(x=>x==="A").length} absent`
    : "";
}
$("markRows").addEventListener("click", e=>{
  const b = e.target.closest("button[data-s]"); if(!b) return;
  draft[b.parentElement.dataset.id] = b.dataset.s; drawMark();
});
$("mDate").addEventListener("change", loadDraft);
$("mClass").addEventListener("change", loadDraft);
$("allPresent").onclick = () => { Object.keys(draft).forEach(k=>draft[k]="P"); drawMark(); };
$("allAbsent").onclick  = () => { Object.keys(draft).forEach(k=>draft[k]="A"); drawMark(); };
$("saveAtt").onclick = () => {
  const date = $("mDate").value;
  if(!date){ toast("Pick a date"); return; }
  if(!Object.keys(draft).length){ toast("No students to save"); return; }
  db.records[date] = Object.assign(db.records[date] || {}, draft);
  save(); toast("Attendance saved for " + date);
};

// ---- Reports
function renderReports(){
  fillClassSelect($("rClass"), true);
  const dates = Object.keys(db.records).sort();
  if(!$("rFrom").value) $("rFrom").value = dates[0] || todayStr();
  if(!$("rTo").value) $("rTo").value = dates[dates.length-1] || todayStr();
  drawReport();
  const cur = $("hStudent").value;
  $("hStudent").innerHTML = db.students.map(s=>`<option value="${s.id}">${esc(s.name)} (${esc(s.cls)}-${esc(s.roll)})</option>`).join("");
  if(db.students.some(s=>s.id===cur)) $("hStudent").value = cur;
  drawHistory();
}
function reportRows(){
  const cls=$("rClass").value, from=$("rFrom").value, to=$("rTo").value;
  return db.students.filter(s=>!cls||s.cls===cls)
    .sort((a,b)=>a.cls.localeCompare(b.cls)||a.roll.localeCompare(b.roll,undefined,{numeric:true}))
    .map(s=>({s,...statsFor(s.id,from,to)}));
}
function drawReport(){
  const rows = reportRows();
  $("reportRows").innerHTML = rows.length ? rows.map(r=>`
    <tr><td>${esc(r.s.roll)}</td><td>${esc(r.s.name)}</td><td>${r.p}</td><td>${r.l}</td><td>${r.a}</td><td>${r.days}</td>
    <td>${pctPill(r.pct)}</td><td>${pctBar(r.pct)}</td></tr>`).join("")
    : '<tr><td colspan="8" class="empty">No data.</td></tr>';
}
function drawHistory(){
  const id = $("hStudent").value;
  const dates = Object.keys(db.records).filter(d=>db.records[d][id]).sort().reverse();
  $("historyRows").innerHTML = dates.length ? dates.map(d=>{
    const st = db.records[d][id], cls = st==="P"?"good":st==="L"?"warn":"low";
    return `<tr><td>${d}</td><td><span class="pill ${cls}">${LABEL[st]}</span></td></tr>`;
  }).join("") : '<tr><td colspan="2" class="empty">No records.</td></tr>';
}
["rFrom","rTo","rClass"].forEach(id=>$(id).addEventListener("change", drawReport));
$("hStudent").addEventListener("change", drawHistory);

$("csvBtn").onclick = () => {
  const q = v => '"' + String(v).replace(/"/g,'""') + '"';
  const lines = [["Roll","Name","Class","Present","Late","Absent","Days","Percent"].join(",")];
  reportRows().forEach(r=>lines.push([q(r.s.roll),q(r.s.name),q(r.s.cls),r.p,r.l,r.a,r.days,r.pct===null?"":r.pct].join(",")));
  $("csvText").value = lines.join("\n");
  $("csvBox").classList.remove("hidden");
};
$("copyCsv").onclick = async () => {
  try{ await navigator.clipboard.writeText($("csvText").value); toast("Copied"); }
  catch(e){ $("csvText").select(); toast("Press Ctrl+C to copy"); }
};

// ---- Demo / reset
$("demoBtn").onclick = () => {
  const names = ["Aarav Sharma","Diya Patel","Rohan Mehta","Ananya Iyer","Kabir Singh","Isha Nair","Vihaan Gupta","Meera Reddy"];
  db = { students:[], records:{} };
  names.forEach((n,i)=>db.students.push({ id:uid()+i, roll:String(i+1), name:n, cls:"10-A" }));
  for(let d=14; d>=1; d--){
    const dt = new Date(); dt.setDate(dt.getDate()-d);
    if([0,6].includes(dt.getDay())) continue;
    dt.setMinutes(dt.getMinutes()-dt.getTimezoneOffset());
    const rec = {};
    db.students.forEach((s,i)=>{
      const r = Math.random(), absentBias = i===3 ? .45 : .1;
      rec[s.id] = r<absentBias ? "A" : r<absentBias+.07 ? "L" : "P";
    });
    db.records[dt.toISOString().slice(0,10)] = rec;
  }
  save(); renderDashboard(); toast("Demo data loaded");
};
$("resetBtn").onclick = () => confirmBox("Delete ALL students and attendance records?", ()=>{
  db = { students:[], records:{} }; save(); renderDashboard(); toast("All data deleted");
});

// ---- Start
load();
showTab("dashboard");
