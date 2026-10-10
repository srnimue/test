const KEY="torihiki-note-v01";
let data=JSON.parse(localStorage.getItem(KEY)||"[]");
const $=id=>document.getElementById(id);
const fields=["id","type","delivery","status","partnerName","xid","items","myShip","theirShip","shipping","tracking","meetAt","meetPlace","price","postage","addressExchanged","paid","memo"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function persist(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function render(){
 const q=$("search").value.toLowerCase(), f=$("filter").value;
 const active=data.filter(x=>x.status!=="完了").length, done=data.filter(x=>x.status==="完了").length, att=data.filter(x=>x.status==="要対応").length;
 $("summary").innerHTML=`<div class="stat"><b>${active}</b><span>進行中</span></div><div class="stat"><b>${done}</b><span>完了</span></div><div class="stat"><b>${att}</b><span>要対応</span></div>`;
 let rows=data.filter(x=>{
  if(f==="active"&&x.status==="完了")return false;if(f==="done"&&x.status!=="完了")return false;if(f==="attention"&&x.status!=="要対応")return false;
  return !q||[x.partnerName,x.xid,x.items,x.memo,x.type,x.status].join(" ").toLowerCase().includes(q)
 }).sort((a,b)=>(b.updated||"").localeCompare(a.updated||""));
 $("empty").classList.toggle("hidden",rows.length>0);
 const statuses=["DM確認中","内容確定","発送待ち","発送済み","到着確認","完了","要対応"];
 $("cards").innerHTML=rows.map(x=>{
   const delivery=x.delivery||"郵送";
   const detail=delivery==="手渡し"
     ? `${x.meetAt?`<span>日時 ${esc(x.meetAt.replace("T"," "))}</span>`:""}${x.meetPlace?`<span>場所 ${esc(x.meetPlace)}</span>`:""}`
     : `${x.myShip?`<span>自分発送 ${esc(x.myShip)}</span>`:""}${x.theirShip?`<span>相手発送 ${esc(x.theirShip)}</span>`:""}${x.shipping?`<span>${esc(x.shipping)}</span>`:""}`;
   return `<article class="card" data-id="${esc(x.id)}"><div class="card-top"><div><span class="badge">${esc(x.type)}</span> <span class="badge">${delivery==="手渡し"?"🤝 手渡し":"📮 郵送"}</span></div><select class="quick-status ${x.status==="要対応"?"attn":x.status==="完了"?"done":""}" data-status-id="${esc(x.id)}">${statuses.map(s=>`<option ${s===x.status?"selected":""}>${s}</option>`).join("")}</select></div><h3>${esc(x.partnerName||x.xid||"相手未入力")}</h3><p>${esc(x.items||"取引内容未入力")}</p><div class="meta">${x.xid?`<span>${esc(x.xid)}</span>`:""}${detail}<span>更新 ${esc((x.updated||"").slice(0,10))}</span></div></article>`
 }).join("");
 document.querySelectorAll(".card").forEach(el=>el.onclick=e=>{if(!e.target.closest(".quick-status"))openEdit(el.dataset.id)});
 document.querySelectorAll(".quick-status").forEach(sel=>sel.onchange=e=>{e.stopPropagation();const x=data.find(v=>v.id===sel.dataset.statusId);if(x){x.status=sel.value;x.updated=new Date().toISOString();persist()}});
}
function openNew(){
 $("form").reset();$("id").value="";$("dialogTitle").textContent="新しい取引";$("deleteBtn").classList.add("hidden");$("editor").showModal()
}
function openEdit(id){
 const x=data.find(v=>v.id===id);if(!x)return;
 $("form").reset();fields.forEach(k=>{if(!$(k))return;if($(k).type==="checkbox")$(k).checked=!!x[k];else $(k).value=x[k]??""});
 $("dialogTitle").textContent="取引を編集";$("deleteBtn").classList.remove("hidden");toggleDelivery();$("editor").showModal()
}
function toggleDelivery(){
 const hand=$("delivery").value==="手渡し";
 $("postalFields").classList.toggle("hidden",hand);
 $("meetFields").classList.toggle("hidden",!hand);
}
$("delivery").onchange=toggleDelivery;
$("newBtn").onclick=()=>{openNew();toggleDelivery()};
$("saveBtn").onclick=()=>{
 const obj={};fields.forEach(k=>{if(!$(k))return;obj[k]=$(k).type==="checkbox"?$(k).checked:$(k).value.trim()});
 obj.id=obj.id||crypto.randomUUID();obj.updated=new Date().toISOString();
 const i=data.findIndex(x=>x.id===obj.id);if(i>=0)data[i]=obj;else data.push(obj);
 persist();$("editor").close()
};
$("deleteBtn").onclick=()=>{const id=$("id").value;if(id&&confirm("この取引を削除しますか？")){data=data.filter(x=>x.id!==id);persist();$("editor").close()}};
$("search").oninput=render;$("filter").onchange=render;
$("exportBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({app:"torihiki-note",version:1,exportedAt:new Date().toISOString(),trades:data},null,2)],{type:"application/json"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`torihiki-note_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)
};
$("importFile").onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{const obj=JSON.parse(await file.text());const incoming=Array.isArray(obj)?obj:obj.trades;if(!Array.isArray(incoming))throw 0;
 if(confirm(`書き出しデータ ${incoming.length}件で現在のデータを置き換えますか？`)){data=incoming;persist()}}catch{alert("読み込めないファイルです。")}e.target.value=""
};
render();