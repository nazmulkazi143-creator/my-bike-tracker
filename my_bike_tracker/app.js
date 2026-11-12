const DB_NAME='myBikeTrackerDB', DB_VERSION=1, STORE='appdata';
let db, state={cycles:[],incomes:[]}, currentPage='home', editingIncomeId=null;
const $=id=>document.getElementById(id);
const money=n=>'৳'+Number(n||0).toLocaleString('en-BD',{maximumFractionDigits:2});
const dateISO=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'}):'—';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function dbGet(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get('state');r.onsuccess=()=>resolve(r.result||{cycles:[],incomes:[]});r.onerror=()=>reject(r.error)})}
function dbSet(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(state,'state');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function activeCycle(){return state.cycles.find(c=>c.status==='active')}
function cycleIncome(id){return state.incomes.filter(i=>i.cycleId===id).reduce((s,i)=>s+Number(i.amount),0)}
function cycleNet(c){return cycleIncome(c.id)-Number(c.amount)}
function monthKey(d){return (d||'').slice(0,7)}
function monthData(key){const inc=state.incomes.filter(i=>monthKey(i.date)===key).reduce((s,i)=>s+Number(i.amount),0);const fuel=state.cycles.filter(c=>monthKey(c.date)===key).reduce((s,c)=>s+Number(c.amount),0);return {inc,fuel,net:inc-fuel}}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function save(){await dbSet();render()}
function render(){
 const today=dateISO(),m=monthKey(today),a=activeCycle(),md=monthData(m);
 $('todayLabel').textContent=fmtDate(today);
 $('cycleName').textContent=a?`Fuel Cycle #${String(state.cycles.indexOf(a)+1).padStart(2,'0')}`:'কোনো Active Cycle নেই';
 $('cycleStatus').textContent=a?'চলমান':'শুরু হয়নি';
 $('cycleIncome').textContent=money(a?cycleIncome(a.id):0);
 $('cycleFuel').textContent=money(a?a.amount:0);
 $('cycleNet').textContent=money(a?cycleNet(a):0);
 $('cycleStart').textContent=a?fmtDate(a.date):'—';
 $('cycleHint').textContent=a?'পরবর্তীবার তেল ভরলে এই Cycle সম্পন্ন হবে।':'প্রথমে তেল ভরে একটি নতুন Fuel Cycle শুরু করুন।';
 const income=a?cycleIncome(a.id):0, fuel=a?Number(a.amount):0;
 $('incomeProgress').style.width=(income+fuel>0?Math.max(3,Math.min(100,income/(income+fuel)*100)):0)+'%';
 $('monthIncome').textContent=money(md.inc);$('monthFuel').textContent=money(md.fuel);$('monthNet').textContent=money(md.net);$('totalCycles').textContent=state.cycles.length.toLocaleString('bn-BD');
 const recent=[...state.incomes].sort((x,y)=>(y.createdAt||'').localeCompare(x.createdAt||'')).slice(0,4);
 $('recentIncome').innerHTML=recent.length?recent.map(i=>`<div class="transaction"><div class="transaction-main"><div class="transaction-icon">↗</div><div><b>${esc(i.source||'Ride Sharing')}</b><small>${fmtDate(i.date)} · ${esc(i.note||'Fuel Cycle income')}</small></div></div><div class="transaction-amount">+${money(i.amount)}</div></div>`).join(''):'<div class="empty">এখনো কোনো ইনকাম এন্ট্রি নেই।</div>';
 renderCycles();renderHistory();renderReports();
}
function renderCycles(){
 const list=[...state.cycles].sort((a,b)=>b.date.localeCompare(a.date));
 $('cycleList').innerHTML=list.length?list.map(c=>{const idx=state.cycles.indexOf(c)+1,inc=cycleIncome(c.id);return `<article class="cycle-card"><div class="cycle-card-top"><h3>Fuel Cycle #${String(idx).padStart(2,'0')}</h3><span class="cycle-badge ${c.status==='active'?'':'closed'}">${c.status==='active'?'চলমান':'সম্পন্ন'}</span></div><p>তেল ভরার তারিখ: ${fmtDate(c.date)}${c.liters?` · ${c.liters} লিটার`:''}</p><div class="cycle-numbers"><div><small>তেল খরচ</small><b>${money(c.amount)}</b></div><div><small>মোট ইনকাম</small><b>${money(inc)}</b></div><div><small>অবশিষ্ট আয়</small><b style="color:${inc-Number(c.amount)>=0?'#159d66':'#d94b55'}">${money(inc-Number(c.amount))}</b></div></div><div class="cycle-card-actions"><button class="mini-btn" onclick="viewCycle('${c.id}')">বিস্তারিত</button>${c.status==='active'?`<button class="mini-btn" onclick="editFuel('${c.id}')">তথ্য সম্পাদনা</button>`:''}</div></article>`}).join(''):'<div class="empty">এখনো কোনো Fuel Cycle তৈরি হয়নি।</div>';
}
function renderHistory(){
 const q=($('historySearch')?.value||'').toLowerCase(),filter=$('historyFilter');
 if(filter){const val=filter.value;const opts=['<option value="all">সব Cycle</option>',...state.cycles.map((c,i)=>`<option value="${c.id}">Cycle #${i+1}</option>`)];filter.innerHTML=opts.join('');filter.value=val}
 const arr=[...state.incomes].filter(i=>(filter?.value==='all'||!filter?.value||i.cycleId===filter.value)&&(`${i.date} ${i.note||''} ${i.source||''}`).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
 $('historyList').innerHTML=arr.length?arr.map(i=>{const c=state.cycles.find(c=>c.id===i.cycleId),n=state.cycles.indexOf(c)+1;return `<article class="cycle-card income-record"><div class="cycle-card-top"><h3>${money(i.amount)}</h3><span class="cycle-badge">Cycle #${n}</span></div><p>${fmtDate(i.date)} · ${esc(i.source||'Ride Sharing')} · ${esc(i.note||'কোনো বিবরণ নেই')}</p><div class="record-actions"><button class="mini-btn" onclick="editIncome('${i.id}')">Edit</button><button class="mini-btn delete-btn" onclick="deleteIncome('${i.id}')">Delete</button></div></article>`}).join(''):'<div class="empty">কোনো ইনকাম পাওয়া যায়নি।</div>';
}
function renderReports(){
 const inc=state.incomes.reduce((s,i)=>s+Number(i.amount),0),fuel=state.cycles.reduce((s,c)=>s+Number(c.amount),0);
 $('reportSummary').innerHTML=[['সর্বমোট ইনকাম',inc],['সর্বমোট তেল খরচ',fuel],['অবশিষ্ট আয়',inc-fuel],['মোট Fuel Cycle',state.cycles.length]].map(([l,v])=>`<div class="report-box"><small>${l}</small><b>${typeof v==='number'&&l!=='মোট Fuel Cycle'?money(v):Number(v).toLocaleString('bn-BD')}</b></div>`).join('');
 const cs=[...state.cycles].slice(-6),max=Math.max(1,...cs.map(c=>cycleIncome(c.id)));
 $('cycleChart').innerHTML=cs.length?cs.map((c)=>{const idx=state.cycles.indexOf(c)+1,v=cycleIncome(c.id);return `<div class="bar-item"><b>${money(v)}</b><div class="bar" style="height:${Math.max(3,v/max*85)}px"></div><small>#${idx}</small></div>`}).join(''):'<div class="empty">রিপোর্টের জন্য ডাটা নেই।</div>';
 const months={};[...state.incomes.map(i=>i.date),...state.cycles.map(c=>c.date)].forEach(d=>{const k=monthKey(d);if(k)months[k]=monthData(k)});
 $('monthlyRows').innerHTML=Object.keys(months).sort().reverse().map(k=>`<div class="month-row"><span>${new Date(k+'-01').toLocaleDateString('bn-BD',{month:'long',year:'numeric'})}</span><b>${money(months[k].net)}</b></div>`).join('')||'<div class="empty">কোনো মাসিক ডাটা নেই।</div>';
}
function showPage(page){
 currentPage=page;document.querySelector('.app-shell').classList.toggle('hidden',page!=='home');
 document.querySelectorAll('.page-view').forEach(p=>p.classList.add('hidden'));
 if(page!=='home')$('page-'+page).classList.remove('hidden');
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 if(page==='history')renderHistory();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)showPage(b.dataset.page)});
function field(label,name,type='text',value='',placeholder='',required=true,extra=''){return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${placeholder}" ${required?'required':''} ${extra}></div>`}
function selectField(label,name,opts,value){return `<div class="field"><label>${label}</label><select name="${name}">${opts.map(o=>`<option ${o[0]===value?'selected':''} value="${o[0]}">${o[1]}</option>`).join('')}</select></div>`}
function openModal(type,record=null){
 editingIncomeId=type==='income'&&record?record.id:null;
 $('modalBackdrop').classList.remove('hidden');$('formFields').innerHTML='';
 const f=$('formFields');
 if(type==='income'){
  $('modalEyebrow').textContent=record?'EDIT INCOME':'DAILY INCOME';$('modalTitle').textContent=record?'ইনকাম সম্পাদনা':'ইনকাম যোগ করুন';
  f.innerHTML=field('তারিখ','date','date',record?.date||dateISO())+field('ইনকামের পরিমাণ (টাকা)','amount','number',record?.amount||'','যেমন: ৭০০',true,'min="0.01" step="0.01"')+selectField('ইনকামের উৎস','source',[['Ride Sharing','Ride Sharing'],['Other','অন্যান্য']],record?.source||'Ride Sharing')+field('বিবরণ (ঐচ্ছিক)','note','text',record?.note||'','যেমন: Uber / Pathao / অন্যান্য',false);
  $('submitEntry').textContent=record?'আপডেট করুন':'ইনকাম সংরক্ষণ';
 }else{
  $('modalEyebrow').textContent=record?'EDIT FUEL PURCHASE':'NEW FUEL CYCLE';$('modalTitle').textContent=record?'তেলের তথ্য সম্পাদনা':'নতুন তেল ভরুন';
  f.innerHTML=field('তেল ভরার তারিখ','date','date',record?.date||dateISO())+field('মোট তেলের খরচ (টাকা)','amount','number',record?.amount||'','যেমন: ৫০০',true,'min="0.01" step="0.01"')+field('তেলের পরিমাণ (লিটার) — ঐচ্ছিক','liters','number',record?.liters||'','যেমন: ৪.৫',false,'min="0.01" step="0.01"')+field('ওডোমিটার রিডিং (KM) — ঐচ্ছিক','odo','number',record?.odo||'','যেমন: ২৫৬০০',false,'min="0" step="0.1"')+field('নোট — ঐচ্ছিক','note','text',record?.note||'','',false);
  $('submitEntry').textContent=record?'আপডেট করুন':'Fuel Cycle শুরু করুন';
 }
 $('entryForm').dataset.type=type;$('entryForm').dataset.recordId=record?.id||'';
}
function closeModal(){$('modalBackdrop').classList.add('hidden')}
$('addIncomeBtn').onclick=()=>{if(!activeCycle()){toast('আগে তেল ভরে Fuel Cycle শুরু করুন');openModal('fuel')}else openModal('income')};
$('newFuelBtn').onclick=()=>openModal('fuel');
$('closeModal').onclick=$('cancelModal').onclick=closeModal;
$('entryForm').onsubmit=async e=>{
 e.preventDefault();const fd=new FormData(e.target),type=e.target.dataset.type,recordId=e.target.dataset.recordId;
 const date=fd.get('date'),amount=Number(fd.get('amount'));if(!date||!Number.isFinite(amount)||amount<=0){toast('সঠিক তারিখ ও টাকার পরিমাণ দিন');return}
 if(type==='income'){
  let c=activeCycle();if(!c){toast('আগে Fuel Cycle শুরু করুন');return}
  const obj={id:recordId||uid(),cycleId:recordId?state.incomes.find(i=>i.id===recordId)?.cycleId:c.id,date,amount,source:fd.get('source'),note:fd.get('note'),createdAt:new Date().toISOString()};
  if(recordId)state.incomes=state.incomes.map(i=>i.id===recordId?{...i,...obj}:i);else state.incomes.push(obj);
  toast(recordId?'ইনকাম আপডেট হয়েছে':'ইনকাম যোগ হয়েছে');
 }else{
  const old=recordId?state.cycles.find(c=>c.id===recordId):null;
  if(old){Object.assign(old,{date,amount,liters:Number(fd.get('liters'))||null,odo:Number(fd.get('odo'))||null,note:fd.get('note')}) ;toast('তেলের তথ্য আপডেট হয়েছে')}
  else{
   const a=activeCycle();
   if(a){const previousIncome=cycleIncome(a.id);const ok=confirm(`নতুন Fuel Cycle শুরু করলে আগের Cycle বন্ধ হবে।\\n\\nআগের Cycle-এর ইনকাম: ${money(previousIncome)}\\nতেলের খরচ: ${money(a.amount)}\\nঅবশিষ্ট আয়: ${money(previousIncome-a.amount)}\\n\\nচালিয়ে যাবেন?`);if(!ok)return;a.status='completed';a.closedAt=new Date().toISOString()}
   state.cycles.push({id:uid(),date,amount,liters:Number(fd.get('liters'))||null,odo:Number(fd.get('odo'))||null,note:fd.get('note'),status:'active',createdAt:new Date().toISOString()});toast('নতুন Fuel Cycle শুরু হয়েছে');
  }
 }
 closeModal();await save();
};
window.editIncome=id=>{const i=state.incomes.find(x=>x.id===id);if(i)openModal('income',i)};
window.deleteIncome=async id=>{if(!confirm('এই ইনকাম এন্ট্রি মুছে ফেলবেন?'))return;state.incomes=state.incomes.filter(i=>i.id!==id);await save();toast('এন্ট্রি মুছে ফেলা হয়েছে')};
window.editFuel=id=>{const c=state.cycles.find(x=>x.id===id);if(c)openModal('fuel',c)};
window.viewCycle=id=>{const c=state.cycles.find(x=>x.id===id),n=state.cycles.indexOf(c)+1,items=state.incomes.filter(i=>i.cycleId===id);alert(`Fuel Cycle #${n}\\nতারিখ: ${fmtDate(c.date)}\\nতেল খরচ: ${money(c.amount)}\\nমোট ইনকাম: ${money(cycleIncome(id))}\\nঅবশিষ্ট আয়: ${money(cycleNet(c))}\\nইনকাম এন্ট্রি: ${items.length}টি\\n\\n${items.map(i=>fmtDate(i.date)+' — '+money(i.amount)).join('\\n')||'কোনো ইনকাম নেই'}`)};
$('historySearch').oninput=renderHistory;$('historyFilter').onchange=renderHistory;
$('backupBtn').onclick=()=>download('my-bike-tracker-backup.json',JSON.stringify({...state,exportedAt:new Date().toISOString(),version:1},null,2),'application/json');
$('csvBtn').onclick=()=>{const rows=[['Date','Cycle ID','Source','Amount BDT','Note'],...state.incomes.map(i=>[i.date,i.cycleId,i.source,i.amount,i.note||''])];download('my-bike-tracker-income.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv;charset=utf-8')};
function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);toast('ফাইল ডাউনলোড শুরু হয়েছে')}
$('restoreInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.cycles)||!Array.isArray(data.incomes))throw Error();if(!confirm('বর্তমান ডাটার পরিবর্তে Backup-এর ডাটা Restore করবেন?'))return;state={cycles:data.cycles,incomes:data.incomes};await save();toast('Backup Restore সম্পন্ন হয়েছে')}catch{alert('এই Backup ফাইলটি সঠিক নয়।')}e.target.value=''};
$('resetBtn').onclick=async()=>{if(!confirm('সতর্কতা: সব Fuel Cycle ও Income ডাটা স্থায়ীভাবে মুছে যাবে। আগে Backup নিয়েছেন?'))return;if(!confirm('নিশ্চিত? এই কাজ ফিরিয়ে আনা যাবে না।'))return;state={cycles:[],incomes:[]};await save();toast('সব ডাটা মুছে ফেলা হয়েছে')};
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('mbtTheme',document.body.classList.contains('dark')?'dark':'light')};
if(localStorage.getItem('mbtTheme')==='dark')document.body.classList.add('dark');
(async()=>{try{db=await openDB();state=await dbGet();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){console.error(e);alert('ডাটা স্টোরেজ চালু করা যায়নি। Chrome-এ আবার চেষ্টা করুন।')}})();
