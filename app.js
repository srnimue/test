const KEY="torihiki-note-v03",old="torihiki-note-v01";let data=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(old)||"[]"),archiveView=false,reorderMode=false,
_orderBackfilled=false;data.forEach((x,i)=>{if(!x.createdAt){x.createdAt=x.updated||new Date(Date.now()-i).toISOString();_orderBackfilled=true}});if(_orderBackfilled)localStorage.setItem(KEY,JSON.stringify(data));
let _manualOrderBackfilled=false;
[...data].sort((a,b)=>(b.createdAt||b.updated||"").localeCompare(a.createdAt||a.updated||"")).forEach((x,i)=>{if(typeof x.order!=="number"){x.order=i;_manualOrderBackfilled=true}});
if(_manualOrderBackfilled)localStorage.setItem(KEY,JSON.stringify(data));$=x=>document.getElementById(x),esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const post=["DM確認中","内容確定","発送待ち","発送済み","到着確認","完了"],meet=["DM確認中","内容確定","受け渡し待ち","完了"],fields=["id","type","delivery","status","name","xid","items","myShip","theirShip","shipping","tracking","meetAt","meetPlace","price","postage","paid","addressExchanged","memo"];function ss(){return $("delivery").value==="手渡し"?meet:post}
function xUser(v){return String(v||"").trim().replace(/^@+/,"").replace(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i,"").split(/[/?#]/)[0]}
function xLink(v){const u=xUser(v);return u?`<a class="x-link" href="https://x.com/${encodeURIComponent(u)}" target="_blank" rel="noopener noreferrer">@${esc(u)}</a>`:""}
function orderedRows(arr){return [...arr].sort((a,b)=>{const ao=typeof a.order==="number"?a.order:Number.MAX_SAFE_INTEGER,bo=typeof b.order==="number"?b.order:Number.MAX_SAFE_INTEGER;return ao-bo||(b.createdAt||b.updated||"").localeCompare(a.createdAt||a.updated||"")})}function statusOptions(keep=true){let v=$("status").value,a=ss();$("status").innerHTML=a.map(x=>`<option>${x}</option>`).join("");if(keep&&a.includes(v))$("status").value=v}function toggle(){let m=$("delivery").value==="手渡し";$("postal").classList.toggle("hide",m);$("meet").classList.toggle("hide",!m);$("address").classList.toggle("hide",m);$("money").classList.toggle("hide",$("type").value==="交換");statusOptions()}function saveData(){localStorage.setItem(KEY,JSON.stringify(data));render()}function render(){let live=data.filter(x=>!x.archived),active=live.filter(x=>x.status!=="完了").length,done=live.filter(x=>x.status==="完了").length;$("stats").innerHTML=archiveView?`<span class="stat"><b>${data.filter(x=>x.archived).length}</b>Archive</span>`:`<span class="stat"><b>${active}</b>進行中</span><span class="stat"><b>${done}</b>完了</span>`;$("archives").textContent=archiveView?"← 戻る":"Archive";$("filter").classList.toggle("hide",archiveView);
$("reorderBtn").classList.toggle("hide",archiveView||!!$("q").value);
$("reorderBtn").textContent=reorderMode?"完了":"並び替え";
document.body.classList.toggle("reorder-mode",reorderMode);let q=$("q").value.toLowerCase(),f=$("filter").value;
let base=q?data:data.filter(x=>archiveView?x.archived:!x.archived);
let rows=base.filter(x=>{
  const hit=!q||[x.name,x.partnerName,x.xid,x.items,x.memo,x.type,x.status,x.meetPlace,x.shipping].join(" ").toLowerCase().includes(q);
  if(!hit)return false;
  if(q)return true;
  return archiveView||f==="all"||(f==="done"?x.status==="完了":x.status!=="完了");
});rows=orderedRows(rows);$("cards").innerHTML=rows.length?rows.map(x=>{let d=x.delivery||"郵送",a=d==="手渡し"?meet:post,details=d==="手渡し"?`${x.meetAt?`<span>日時 ${esc(x.meetAt.replace("T"," "))}</span>`:""}${x.meetPlace?`<span>場所 ${esc(x.meetPlace)}</span>`:""}`:`${x.myShip?`<span>自分発送 ${esc(x.myShip)}</span>`:""}${x.theirShip?`<span>相手発送 ${esc(x.theirShip)}</span>`:""}${x.shipping?`<span>${esc(x.shipping)}</span>`:""}`;return `<article class="card" data-id="${x.id}"><div class="top"><div><span class="badge">${esc(x.type)}</span> <span class="badge">${d==="手渡し"?"🤝 手渡し":"📮 郵送"}</span></div>${x.archived?'<span class="badge">Archive</span>':(reorderMode?`<span class="drag-handle" data-drag-id="${x.id}" aria-label="並び替え">≡</span>`:`<select class="quick" data-id="${x.id}">${a.map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}</select>`)}</div><h3>${esc(x.name||x.partnerName||x.xid||"相手未入力")}</h3><p>${esc(x.items||"取引内容未入力")}</p><div class="meta">${x.xid?`<span>${xLink(x.xid)}</span>`:""}${details}</div></article>`}).join(""):'<div class="card">該当する取引はありません。</div>';document.querySelectorAll(".card[data-id]").forEach(c=>c.onclick=e=>{if(reorderMode||e.target.closest(".quick")||e.target.closest(".x-link")||e.target.closest(".drag-handle"))return;edit(c.dataset.id)});document.querySelectorAll(".quick").forEach(s=>s.onchange=e=>{e.stopPropagation();let x=data.find(v=>v.id===s.dataset.id);x.status=s.value;x.updated=new Date().toISOString();saveData()});
if(reorderMode)initDragHandles();
}function saveVisibleOrder(){
  const ids=[...document.querySelectorAll("#cards .card[data-id]")].map(el=>el.dataset.id);
  if(!ids.length)return;
  const visible=new Set(ids);
  const all=orderedRows(data.filter(x=>!x.archived));
  const slots=all.map((x,i)=>visible.has(x.id)?i:null).filter(i=>i!==null);
  ids.forEach((id,j)=>{const item=data.find(x=>x.id===id);if(item)item.order=slots[j]??j});
  orderedRows(data.filter(x=>!x.archived)).forEach((x,i)=>x.order=i);
  localStorage.setItem(KEY,JSON.stringify(data));
}
function initDragHandles(){
  document.querySelectorAll(".drag-handle").forEach(handle=>{
    handle.onpointerdown=e=>{
      e.preventDefault();e.stopPropagation();
      const card=handle.closest(".card");if(!card)return;
      card.classList.add("dragging");
      try{handle.setPointerCapture(e.pointerId)}catch{}
      const move=ev=>{
        ev.preventDefault();
        const y=ev.clientY;
        const cards=[...document.querySelectorAll("#cards .card[data-id]:not(.dragging)")];
        let placed=false;
        for(const other of cards){const r=other.getBoundingClientRect();if(y<r.top+r.height/2){other.parentNode.insertBefore(card,other);placed=true;break}}
        if(!placed)$("cards").appendChild(card);
      };
      const up=()=>{
        card.classList.remove("dragging");
        handle.removeEventListener("pointermove",move);
        handle.removeEventListener("pointerup",up);
        handle.removeEventListener("pointercancel",up);
        saveVisibleOrder();
      };
      handle.addEventListener("pointermove",move,{passive:false});
      handle.addEventListener("pointerup",up);
      handle.addEventListener("pointercancel",up);
    };
  });
}
function fresh(){document.querySelector("form").reset();$("id").value="";$("delivery").value="郵送";statusOptions(false);$("title").textContent="新しい取引";$("del").classList.add("hide");$("arc").classList.add("hide");toggle();$("dlg").showModal()}function edit(id){let x=data.find(v=>v.id===id);document.querySelector("form").reset();$("delivery").value=x.delivery||"郵送";statusOptions(false);fields.forEach(k=>{if(!$(k))return;let v=k==="name"?(x.name||x.partnerName||""):x[k];if($(k).type==="checkbox")$(k).checked=!!v;else $(k).value=v||""});toggle();if(ss().includes(x.status))$("status").value=x.status;$("title").textContent="取引を編集";$("del").classList.remove("hide");$("arc").classList.remove("hide");$("arc").textContent=x.archived?"Archiveから戻す":"Archiveへ";$("dlg").showModal()}$("closeDlg").onclick=()=>$("dlg").close();$("new").onclick=fresh;$("delivery").onchange=toggle;$("type").onchange=toggle;$("save").onclick=()=>{let o={};fields.forEach(k=>o[k]=$(k).type==="checkbox"?$(k).checked:$(k).value.trim());o.id=o.id||crypto.randomUUID();let now=new Date().toISOString();o.updated=now;let i=data.findIndex(x=>x.id===o.id);o.createdAt=i>=0?(data[i].createdAt||data[i].updated||now):now;if(i>=0){o.archived=!!data[i].archived;o.order=typeof data[i].order==="number"?data[i].order:0}else{o.order=Math.max(-1,...data.filter(x=>!x.archived).map(x=>typeof x.order==="number"?x.order:-1))+1}i>=0?data[i]=o:data.push(o);saveData();$("dlg").close()};$("arc").onclick=()=>{let x=data.find(v=>v.id===$("id").value);const was=x.archived;x.archived=!x.archived;x.updated=new Date().toISOString();if(was&&!x.archived)x.order=Math.max(-1,...data.filter(v=>!v.archived&&v.id!==x.id).map(v=>typeof v.order==="number"?v.order:-1))+1;saveData();$("dlg").close()};$("del").onclick=()=>{let id=$("id").value;if(confirm("この取引を削除しますか？")){data=data.filter(x=>x.id!==id);saveData();$("dlg").close()}};$("reorderBtn").onclick=()=>{reorderMode=!reorderMode;if(!reorderMode)saveVisibleOrder();render()};
$("archives").onclick=()=>{reorderMode=false;archiveView=!archiveView;render()};
$("q").oninput=()=>{if($("q").value)reorderMode=false;render()};
$("filter").onchange=()=>{reorderMode=false;render()};$("export").onclick=()=>{let b=new Blob([JSON.stringify({app:"torihiki-note",version:3,trades:data},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="torihiki-note.json";a.click()};$("import").onchange=async e=>{try{let o=JSON.parse(await e.target.files[0].text()),a=Array.isArray(o)?o:o.trades;if(!Array.isArray(a))throw 0;if(confirm(`${a.length}件のデータで置き換えますか？`)){data=a;saveData()}}catch{alert("読み込めないファイルです。")}e.target.value=""};render();