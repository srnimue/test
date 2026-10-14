const KEY="torihiki-note-v03";
const OLD_KEY="torihiki-note-v01";
const IMPORT_BACKUP_KEY="torihiki-note-v03-pre-import-backup";

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const post=["DM確認中","内容確定","発送待ち","発送済み","到着確認","完了"];
const meet=["DM確認中","内容確定","受け渡し待ち","完了"];
const fields=["id","type","delivery","status","name","xid","items","myShip","theirShip","shipping","tracking","meetAt","meetPlace","price","postage","paid","addressExchanged","memo"];

let archiveView=false;
let reorderMode=false;

function safeString(v,max=10000){
  return String(v??"").slice(0,max);
}
function validIso(v){
  const s=safeString(v,64);
  return s && !Number.isNaN(Date.parse(s)) ? s : "";
}
function makeId(raw,used){
  let id=safeString(raw,120).trim();
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(id) || used.has(id)){
    do{id=crypto.randomUUID()}while(used.has(id));
  }
  used.add(id);
  return id;
}
function normalizeStatus(status,delivery){
  const list=delivery==="手渡し"?meet:post;
  const legacy={
    "梱包":"発送待ち",
    "発送":"発送済み",
    "受取":"到着確認"
  };
  const candidate=legacy[status]||status;
  if(list.includes(candidate))return candidate;
  return list.includes("内容確定")?"内容確定":list[0];
}
function normalizeData(raw){
  if(!Array.isArray(raw))return [];
  const usedIds=new Set();
  const now=Date.now();

  const normalized=raw.filter(v=>v&&typeof v==="object"&&!Array.isArray(v)).map((x,i)=>{
    const delivery=x.delivery==="手渡し"?"手渡し":"郵送";
    const createdAt=validIso(x.createdAt)||validIso(x.updated)||new Date(now-i*1000).toISOString();
    const updated=validIso(x.updated)||createdAt;
    const order=Number.isFinite(Number(x.order))?Number(x.order):null;

    return {
      id:makeId(x.id,usedIds),
      type:safeString(x.type||"交換",30),
      delivery,
      status:normalizeStatus(safeString(x.status,30),delivery),
      name:safeString(x.name||x.partnerName,120),
      xid:safeString(x.xid,200),
      items:safeString(x.items,10000),
      myShip:safeString(x.myShip,32),
      theirShip:safeString(x.theirShip,32),
      shipping:safeString(x.shipping,120),
      tracking:safeString(x.tracking,200),
      meetAt:safeString(x.meetAt,40),
      meetPlace:safeString(x.meetPlace,240),
      price:safeString(x.price,40),
      postage:safeString(x.postage,40),
      paid:!!x.paid,
      addressExchanged:!!x.addressExchanged,
      memo:safeString(x.memo,20000),
      archived:!!x.archived,
      createdAt,
      updated,
      order
    };
  });

  // Existing manual order takes priority. Records without order fall back to
  // newest-first. Then compact to unique integer slots to remove old duplicates.
  normalized.sort((a,b)=>{
    const ao=a.order,bo=b.order;
    if(ao!==null&&bo!==null&&ao!==bo)return ao-bo;
    if(ao!==null&&bo===null)return -1;
    if(ao===null&&bo!==null)return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  normalized.forEach((x,i)=>x.order=i);
  return normalized;
}
function readStoredArray(){
  const candidates=[KEY,OLD_KEY];
  for(const key of candidates){
    const raw=localStorage.getItem(key);
    if(!raw)continue;
    try{
      const parsed=JSON.parse(raw);
      if(Array.isArray(parsed))return parsed;
    }catch(e){
      // Keep a copy of the broken raw data for possible recovery, but do not crash.
      try{localStorage.setItem(`${key}-corrupt-backup`,raw)}catch(_){}
    }
  }
  return [];
}

let data=normalizeData(readStoredArray());
localStorage.setItem(KEY,JSON.stringify(data));

function ss(){return $("delivery").value==="手渡し"?meet:post}
function xUser(v){
  return String(v??"").trim().replace(/^@+/,"").replace(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i,"").split(/[/?#]/)[0];
}
function xLink(v){
  const u=xUser(v);
  return u?`<a class="x-link" href="https://x.com/${encodeURIComponent(u)}" target="_blank" rel="noopener noreferrer">@${esc(u)}</a>`:"";
}
function orderedRows(arr){
  return [...arr].sort((a,b)=>a.order-b.order || b.createdAt.localeCompare(a.createdAt));
}
function statusOptions(keep=true){
  const previous=$("status").value;
  const list=ss();
  $("status").innerHTML=list.map(x=>`<option>${x}</option>`).join("");
  if(!keep)return;
  if(list.includes(previous)){
    $("status").value=previous;
  }else{
    $("status").value=list.includes("内容確定")?"内容確定":list[0];
  }
}
function toggle(){
  const hand=$("delivery").value==="手渡し";
  const exchange=$("type").value==="交換";
  $("postal").classList.toggle("hide",hand);
  $("meet").classList.toggle("hide",!hand);
  $("address").classList.toggle("hide",hand);
  $("money").classList.toggle("hide",exchange);
  const postageLabel=$("postage")?.closest("label");
  if(postageLabel)postageLabel.classList.toggle("hide",hand);
  statusOptions(true);
}
function saveData(){
  localStorage.setItem(KEY,JSON.stringify(data));
  render();
}
function render(){
  const live=data.filter(x=>!x.archived);
  const active=live.filter(x=>x.status!=="完了").length;
  const done=live.filter(x=>x.status==="完了").length;

  $("stats").innerHTML=archiveView
    ? `<span class="stat"><b>${data.filter(x=>x.archived).length}</b>Archive</span>`
    : `<span class="stat"><b>${active}</b>進行中</span><span class="stat"><b>${done}</b>完了</span>`;

  $("archives").textContent=archiveView?"← 戻る":"Archive";
  $("filter").classList.toggle("hide",archiveView);
  $("reorderBtn").classList.toggle("hide",archiveView||!!$("q").value);

  const completedCount=data.filter(x=>!x.archived&&x.status==="完了").length;
  const canBulkArchive=!archiveView&&!$("q").value&&completedCount>0&&["done","all"].includes($("filter").value);
  $("bulkArchive").classList.toggle("hide",!canBulkArchive);
  $("bulkArchive").textContent=`完了分をArchive (${completedCount})`;

  $("reorderBtn").textContent=reorderMode?"完了":"並び替え";
  document.body.classList.toggle("reorder-mode",reorderMode);

  const q=$("q").value.toLowerCase();
  const f=$("filter").value;
  const base=q?data:data.filter(x=>archiveView?x.archived:!x.archived);
  let rows=base.filter(x=>{
    const hit=!q||[x.name,x.xid,x.items,x.memo,x.type,x.status,x.meetPlace,x.shipping].join(" ").toLowerCase().includes(q);
    if(!hit)return false;
    if(q)return true;
    return archiveView||f==="all"||(f==="done"?x.status==="完了":x.status!=="完了");
  });
  rows=orderedRows(rows);

  $("cards").innerHTML=rows.length?rows.map(x=>{
    const d=x.delivery||"郵送";
    const list=d==="手渡し"?meet:post;
    const details=d==="手渡し"
      ? `${x.meetAt?dateMeta("日時",x.meetAt,x.status,"meet"):`<span class="unset">日時 未設定</span>`}${x.meetPlace?`<span>場所 ${esc(x.meetPlace)}</span>`:""}`
      : `${x.myShip?dateMeta("自分発送",x.myShip,x.status,"myShip"):`<span class="unset">自分発送 未設定</span>`}${x.theirShip?dateMeta("相手発送",x.theirShip,x.status,"theirShip"):`<span class="unset">相手発送 未設定</span>`}`;

    const idAttr=esc(x.id);
    return `<article class="card" data-id="${idAttr}">
      <div class="top">
        <div>
          <span class="badge">${esc(x.type)}</span>
          <span class="badge">${d==="手渡し"?"🤝 手渡し":"📮 郵送"}</span>
          ${d==="郵送"&&x.addressExchanged?`<span class="status-mini" title="住所交換済">🏠</span>`:""}
          ${x.type!=="交換"&&x.paid?`<span class="status-mini" title="支払い済">💰</span>`:""}
        </div>
        ${x.archived
          ? '<span class="badge">Archive</span>'
          : (reorderMode
            ? `<span class="move-buttons"><button type="button" class="move-btn move-up" data-move-id="${idAttr}" aria-label="上へ">↑</button><button type="button" class="move-btn move-down" data-move-id="${idAttr}" aria-label="下へ">↓</button></span>`
            : `<select class="quick" data-id="${idAttr}">${list.map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}</select>`)}
      </div>
      <h3>${esc(x.name||x.xid||"相手未入力")}</h3>
      <p>${esc(x.items||"取引内容未入力")}</p>
      <div class="meta">${x.xid?`<span>${xLink(x.xid)}</span>`:""}${details}</div>
    </article>`;
  }).join("") : '<div class="card">該当する取引はありません。</div>';

  document.querySelectorAll(".card[data-id]").forEach(c=>{
    c.onclick=e=>{
      if(reorderMode||e.target.closest(".quick")||e.target.closest(".x-link")||e.target.closest(".move-buttons"))return;
      edit(c.dataset.id);
    };
  });
  document.querySelectorAll(".quick").forEach(s=>{
    s.onchange=e=>{
      e.stopPropagation();
      const x=data.find(v=>v.id===s.dataset.id);
      if(!x)return;
      x.status=s.value;
      x.updated=new Date().toISOString();
      saveData();
    };
  });
  if(reorderMode)initMoveButtons();
}

function saveVisibleOrder(){
  const items=[...document.querySelectorAll("#cards .card[data-id]")]
    .map(el=>data.find(x=>x.id===el.dataset.id))
    .filter(Boolean);
  if(!items.length)return;

  // Reuse only the slots these visible items already occupied.
  // Hidden items keep their order, so filtering cannot create duplicate order values.
  const slots=items.map(x=>x.order).sort((a,b)=>a-b);
  items.forEach((x,i)=>x.order=slots[i]);
  localStorage.setItem(KEY,JSON.stringify(data));
}
function moveOne(id,dir){
  const rows=[...document.querySelectorAll("#cards .card[data-id]")];
  const current=rows.findIndex(el=>el.dataset.id===id);
  const target=current+dir;
  if(current<0||target<0||target>=rows.length)return;
  const card=rows[current],other=rows[target];
  if(dir<0)other.parentNode.insertBefore(card,other);
  else other.parentNode.insertBefore(other,card);
  saveVisibleOrder();
  render();
}
function initMoveButtons(){
  const cards=[...document.querySelectorAll("#cards .card[data-id]")];
  cards.forEach((card,i)=>{
    const up=card.querySelector(".move-up");
    const down=card.querySelector(".move-down");
    if(up){
      up.disabled=i===0;
      up.onclick=e=>{e.preventDefault();e.stopPropagation();moveOne(card.dataset.id,-1)};
    }
    if(down){
      down.disabled=i===cards.length-1;
      down.onclick=e=>{e.preventDefault();e.stopPropagation();moveOne(card.dataset.id,1)};
    }
  });
}
function formatRegistered(iso){
  if(!iso)return "";
  const d=new Date(iso);
  if(Number.isNaN(d.getTime()))return "";
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}
function localDateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateMeta(label,raw,status,kind="generic"){
  if(!raw)return "";
  const key=String(raw).slice(0,10);
  const today=new Date();
  const tomorrow=new Date(today);
  tomorrow.setDate(today.getDate()+1);
  const todayKey=localDateKey(today);
  const tomorrowKey=localDateKey(tomorrow);

  let cls="",note="";
  if(key===todayKey){
    cls="date-soon date-today"; note="今日";
  }else if(key===tomorrowKey){
    cls="date-soon date-tomorrow"; note="明日";
  }else if(key<todayKey){
    const resolved=
      kind==="theirShip" ? ["到着確認","完了"].includes(status) :
      kind==="myShip" ? ["発送済み","到着確認","完了"].includes(status) :
      kind==="meet" ? status==="完了" :
      status==="完了";
    if(!resolved){cls="date-soon date-past";note="日付確認"}
  }
  return `<span${cls?` class="${cls}"`:""}>${esc(label)} ${esc(raw)}${note?`<span class="date-note">${note}</span>`:""}</span>`;
}
function fresh(){
  document.querySelector("form").reset();
  $("id").value="";
  $("delivery").value="郵送";
  statusOptions(false);
  $("title").textContent="新しい取引";
  $("registeredAt").textContent="";
  $("registeredAt").classList.add("hide");
  $("del").classList.add("hide");
  $("arc").classList.add("hide");
  toggle();
  $("dlg").showModal();
}
function edit(id){
  const x=data.find(v=>v.id===id);
  if(!x)return;
  document.querySelector("form").reset();
  $("delivery").value=x.delivery||"郵送";
  statusOptions(false);
  fields.forEach(k=>{
    if(!$(k))return;
    const v=x[k];
    if($(k).type==="checkbox")$(k).checked=!!v;
    else $(k).value=v??"";
  });
  toggle();
  if(ss().includes(x.status))$("status").value=x.status;
  $("title").textContent="取引を編集";
  $("registeredAt").textContent=`登録日 ${formatRegistered(x.createdAt||x.updated)} ／ 最終更新日 ${formatRegistered(x.updated||x.createdAt)}`;
  $("registeredAt").classList.remove("hide");
  $("del").classList.remove("hide");
  $("arc").classList.remove("hide");
  $("arc").textContent=x.archived?"Archiveから戻す":"Archiveへ";
  $("dlg").showModal();
}

$("closeDlg").onclick=()=>$("dlg").close();
$("helpBtn").onclick=()=>$("helpDlg").showModal();
$("closeHelp").onclick=()=>$("helpDlg").close();
$("new").onclick=fresh;
$("delivery").onchange=toggle;
$("type").onchange=toggle;
document.querySelectorAll(".ship-chip").forEach(btn=>{
  btn.onclick=()=>{$("shipping").value=btn.dataset.ship||""};
});

$("save").onclick=()=>{
  const o={};
  fields.forEach(k=>o[k]=$(k).type==="checkbox"?$(k).checked:$(k).value.trim());

  const now=new Date().toISOString();
  const i=data.findIndex(x=>x.id===o.id);

  if(i>=0){
    o.id=data[i].id;
    o.createdAt=data[i].createdAt||data[i].updated||now;
    o.updated=now;
    o.archived=!!data[i].archived;
    o.order=data[i].order;
    data[i]=normalizeData([o])[0];
    // normalizeData([o]) compacts order to 0, so restore the existing slot.
    data[i].order=o.order;
  }else{
    o.id=crypto.randomUUID();
    o.createdAt=now;
    o.updated=now;
    o.archived=false;
    const orders=data.filter(x=>!x.archived).map(x=>x.order);
    o.order=orders.length?Math.min(...orders)-1:0; // newest registration appears at top
    const normalized=normalizeData([o])[0];
    normalized.order=o.order;
    data.push(normalized);
  }
  saveData();
  $("dlg").close();
};

$("arc").onclick=()=>{
  const x=data.find(v=>v.id===$("id").value);
  if(!x)return;
  const was=x.archived;
  x.archived=!x.archived;
  x.updated=new Date().toISOString();
  if(was&&!x.archived){
    const orders=data.filter(v=>!v.archived&&v.id!==x.id).map(v=>v.order);
    x.order=orders.length?Math.max(...orders)+1:0;
  }
  saveData();
  $("dlg").close();
};
$("del").onclick=()=>{
  const id=$("id").value;
  if(id&&confirm("この取引を削除しますか？")){
    data=data.filter(x=>x.id!==id);
    saveData();
    $("dlg").close();
  }
};
$("bulkArchive").onclick=()=>{
  const targets=data.filter(x=>!x.archived&&x.status==="完了");
  if(!targets.length)return;
  if(!confirm(`完了している${targets.length}件をArchiveへ移動しますか？`))return;
  const now=new Date().toISOString();
  targets.forEach(x=>{x.archived=true;x.updated=now});
  saveData();
};
$("reorderBtn").onclick=()=>{
  reorderMode=!reorderMode;
  if(!reorderMode)saveVisibleOrder();
  render();
};
$("archives").onclick=()=>{
  reorderMode=false;
  archiveView=!archiveView;
  render();
};
$("q").oninput=()=>{
  if($("q").value)reorderMode=false;
  render();
};
$("filter").onchange=()=>{
  reorderMode=false;
  render();
};

$("export").onclick=()=>{
  const blob=new Blob([JSON.stringify({app:"torihiki-note",version:4,trades:data},null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="torihiki-note.json";
  a.click();
  URL.revokeObjectURL(a.href);
};

$("import").onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file){
    e.target.value="";
    return;
  }
  try{
    const parsed=JSON.parse(await file.text());
    const incoming=Array.isArray(parsed)?parsed:parsed?.trades;
    if(!Array.isArray(incoming))throw new Error("invalid format");

    const normalized=normalizeData(incoming);
    if(!confirm(`${normalized.length}件のデータで現在のデータを置き換えますか？`)){
      e.target.value="";
      return;
    }

    // Keep the current dataset in a separate browser key before replacement.
    localStorage.setItem(IMPORT_BACKUP_KEY,JSON.stringify({
      savedAt:new Date().toISOString(),
      trades:data
    }));
    data=normalized;
    localStorage.setItem(KEY,JSON.stringify(data));
    render();
  }catch(err){
    alert("読み込めないファイルです。");
  }
  e.target.value="";
};

render();
