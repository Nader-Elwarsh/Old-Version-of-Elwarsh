/* app-route-followup.js — خط السير اليومي ومتابعة العملاء. */
// يحدّث أي عرض لخط السير موجود فعليًا في الصفحة الحالية: صفحة خط السير
// المستقلة (route.html) و/أو ودجت "خط سير اليوم" داخل صفحة الأوامر —
// كل دالة بترجع بهدوء لو مافيش عنصرها في الصفحة.
function refreshRouteViews(){
  if(typeof renderRoute==="function")renderRoute();
  if(typeof renderRequests==="function")renderRequests();
}
function toggleVisited(i){let a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;let today=dayKeyLocal(new Date());if(r.visitedAt&&dayKeyLocal(r.visitedAt)===today)r.visitedAt=null;else r.visitedAt=new Date().toISOString();put(K.r,a);refreshRouteViews()}
function setRouteContactStatus(i,status){
  const a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;
  r.contactStatus=status;
  r.contactStatusAt=new Date().toISOString();
  put(K.r,a);
  refreshRouteViews();
}
function clearRouteContactStatus(i){
  const a=arr(K.r),r=a.find(x=>x.id===i);if(!r)return;
  delete r.contactStatus;delete r.contactStatusAt;
  put(K.r,a);
  refreshRouteViews();
}
function retryRouteContact(i){clearRouteContactStatus(i);}
function routeOrderForList(list){
  const s=settings(), ids=list.map(x=>x.id), saved=Array.isArray(s.routeOrder)?s.routeOrder:[];
  const valid=saved.filter(id=>ids.includes(id));
  const missing=ids.filter(id=>!valid.includes(id));
  return valid.concat(missing);
}
function saveRouteOrder(ids){
  const s=settings(), old=Array.isArray(s.routeOrder)?s.routeOrder:[];
  const keep=old.filter(id=>!ids.includes(id));
  s.routeOrder=keep.concat(ids);
  put(K.s,s);
}
function moveRouteItem(id,delta){
  // بيدور على بطاقات خط السير في أي مكان في الصفحة الحالية (routeList في
  // route.html، أو ودجت خط سير اليوم في صفحة الأوامر) بدل ما يتقيّد بعنصر
  // واحد بعينه بالـ id.
  const nodes=[...document.querySelectorAll("[data-route-id]")];if(!nodes.length)return;
  const ids=nodes.map(x=>x.dataset.routeId);
  const i=ids.indexOf(id),j=i+delta;if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];saveRouteOrder(ids);refreshRouteViews();
}
function renderRoute(){
  let el=document.getElementById("routeList");if(!el)return;
  let today=dayKeyLocal(new Date()), cf=document.getElementById("routeCenterFilter")?.value||"", mode=document.getElementById("routeMode")?.value||"today", summaryEl=document.getElementById("routeSummary");
  const allRequests=arr(K.r), customers=arr(K.c);
  if(summaryEl){
    let scheduledToday=allRequests.filter(x=>x.visit&&dayKeyLocal(x.visit)===today),closedToday=scheduledToday.filter(x=>x.closed),contactedToday=scheduledToday.filter(x=>x.contactStatus),visitedNotClosed=scheduledToday.filter(x=>!x.closed&&!x.contactStatus&&x.status!=="ملغي"&&x.visitedAt&&dayKeyLocal(x.visitedAt)===today),notVisited=scheduledToday.filter(x=>!x.closed&&!x.contactStatus&&x.status!=="ملغي"&&!(x.visitedAt&&dayKeyLocal(x.visitedAt)===today)),collectedToday=allRequests.filter(x=>x.paidAt&&dayKeyLocal(x.paidAt)===today).reduce((a,x)=>a+Math.max(0,(+x.total||0)-(+x.deposit||0)),0);
    summaryEl.innerHTML=`<div class="route-summary"><div class="stat"><b>${scheduledToday.length}</b><span>📅 المجدول اليوم</span></div><div class="stat"><b>${closedToday.length}</b><span>✅ أُغلق وتم التحصيل</span></div><div class="stat"><b>${visitedNotClosed.length}</b><span>🚶 تمت الزيارة والعمل جارٍ</span></div><div class="stat"><b>${notVisited.length}</b><span>⏳ لم تتم الزيارة بعد</span></div><div class="stat"><b>${collectedToday.toFixed(2)} ج</b><span>💰 المُحصَّل اليوم</span></div></div>`;
  }
  let list=allRequests.filter(x=>x.visit).filter(x=>{
    let k=dayKeyLocal(x.visit),pending=x.status!=="ملغي"&&!x.closed;
    if(mode==="today")return k===today;
    if(mode==="overdue")return k<today&&pending;
    return k===today||(k<today&&pending);
  }).map(x=>({...x,_c:customers.find(z=>z.id===x.customerId)||{},_addr:resolveRequestAddress(x)}));
  if(cf)list=list.filter(x=>x._addr.center===cf);
  const orderIds=routeOrderForList(list), byId=new Map(list.map(x=>[x.id,x]));
  list=orderIds.map(id=>byId.get(id)).filter(Boolean);
  if(!list.length){el.innerHTML='<div class="item">لا يوجد مواعيد ضمن الاختيار الحالي.</div>';return}
  let groups={};
  list.forEach(x=>{let k=x._addr.center||"بدون مركز";(groups[k]=groups[k]||[]).push(x)});
  let html="";
  Object.keys(groups).forEach(center=>{
    html+=`<h3 class="route-group-title">🗺️ ${esc(center)} <span class="badge">${groups[center].length}</span></h3>`;
    html+=groups[center].map(x=>{
      let visitedToday=!!(x.visitedAt&&dayKeyLocal(x.visitedAt)===today),isDone=x.status==="مكتمل";
      let contactBadge=x.contactStatus==='unavailable'?'<span class="badge route-badge-unavailable">📵 غير متاح</span>':x.contactStatus==='no-answer'?'<span class="badge route-badge-noanswer">📞 لم يرد</span>':'';
      let stateBadge=x.closed?'<span class="badge route-badge-done">✅ مُغلق</span>':x.status==="ملغي"?'<span class="badge">🚫 ملغي</span>':contactBadge|| (visitedToday?'<span class="badge route-badge-visited">🚶 تمت الزيارة</span>':'<span class="badge route-badge-pending">⏳ قيد الانتظار</span>'),lateBadge=dayKeyLocal(x.visit)<today&&!x.closed&&x.status!=="ملغي"&&!x.contactStatus?'<span class="badge">⚠️ متأخر</span>':"";
      const contactCollapsed=!!x.contactStatus && !x.closed && !isDone;
      if(isDone || contactCollapsed){
        const statusText=isDone?'✅ مكتمل':(x.contactStatus==='unavailable'?'📵 غير متاح':'📞 لم يرد');
        const statusClass=isDone?'route-badge-done':(x.contactStatus==='unavailable'?'route-badge-unavailable':'route-badge-noanswer');
        const when=x.contactStatusAt?new Date(x.contactStatusAt).toLocaleString('ar-EG',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
        const retryBtn=contactCollapsed?`<button type="button" class="route-retry-btn mini-action" onclick="event.stopPropagation();retryRouteContact('${x.id}')" title="إرجاع الطلب إلى الحالة النشطة لإعادة المحاولة">🔄 إعادة المحاولة</button>`:'';
        return `<div class="route-completed-row" data-route-id="${x.id}" onclick="location.href='request.html?id=${x.id}'" title="اضغط لفتح أمر الشغل"><b>👤 ${esc(x._c.name||"بدون اسم")}</b><span class="badge ${statusClass}">${statusText}</span><span class="route-row-arrows">${retryBtn}<button type="button" class="route-up-btn mini-action" onclick="event.stopPropagation();moveRouteItem('${x.id}',-1)" title="تحريك لأعلى">⬆️</button><button type="button" class="route-down-btn mini-action" onclick="event.stopPropagation();moveRouteItem('${x.id}',1)" title="تحريك لأسفل">⬇️</button></span></div>`;
      }
      let toggleBtn=(!x.closed&&x.status!=="ملغي")?`<button type="button" class="secondary mini-action" onclick="event.preventDefault();event.stopPropagation();toggleVisited('${x.id}')">${visitedToday?"↩️ إلغاء تسجيل الزيارة":"✅ تسجيل الزيارة"}</button>`:"";
      let contactBtns=(!x.closed&&x.status!=="ملغي")?`<button type="button" class="route-contact-unavailable mini-action" onclick="event.preventDefault();event.stopPropagation();setRouteContactStatus('${x.id}','unavailable')">📵 غير متاح</button><button type="button" class="route-contact-noanswer mini-action" onclick="event.preventDefault();event.stopPropagation();setRouteContactStatus('${x.id}','no-answer')">📞 لم يرد</button>`:"";
      return `<div class="item route-order-card" data-route-id="${x.id}"><div class="route-order-head"><a href="request.html?id=${x.id}"><b>🛠️ ${esc(x.no)}</b></a><span class="route-order-name">👤 ${esc(x._c.name||"")}</span><span class="route-head-status">${stateBadge}${lateBadge}</span></div><div class="route-order-data"><div class="route-data-cell">📍 <span>${esc(addressText(x._addr))}</span></div><div class="route-data-cell">📞 <span>${contactLinksHtml(x._c.phone)}</span></div><div class="route-data-cell">🔧 <span>${esc(deviceName(x.deviceId))}</span></div><div class="route-data-cell">📝 <span>${esc(x.fault||"")}</span></div><div class="route-data-cell">⏰ <span>${x.visit?new Date(x.visit).toLocaleString("ar-EG",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span></div>${x.closed?`<div class="route-data-cell">💰 <span>${Math.max(0,(+x.total||0)-(+x.deposit||0)).toFixed(2)} ج</span></div>`:""}</div><div class="route-order-actions">${toggleBtn?`<div class="route-visit-row">${toggleBtn}</div>`:""}${contactBtns?`<div class="route-contact-row">${contactBtns}</div>`:""}<div class="route-arrows-row"><button type="button" class="route-up-btn mini-action" onclick="event.preventDefault();moveRouteItem('${x.id}',-1)" title="تحريك لأعلى">⬆️</button><button type="button" class="route-down-btn mini-action" onclick="event.preventDefault();moveRouteItem('${x.id}',1)" title="تحريك لأسفل">⬇️</button></div></div></div>`;
    }).join("");
  });
  el.innerHTML=html;
}
function initRoutePage(){
  let cfEl=document.getElementById("routeCenterFilter");if(!cfEl)return;
  cfEl.innerHTML='<option value="">🗺️ كل المراكز</option>'+(settings().centers||[]).map(x=>`<option>${esc(x)}</option>`).join("");
  cfEl.onchange=renderRoute;
  document.getElementById("routeMode").onchange=renderRoute;
  renderRoute();
}

// متابعة العملاء الساكتين: عملاء عندهم أمر شغل سابق ومفيش أمر جديد من مدة معينة.
function renderFollowup(){
  let el=document.getElementById("followupList");if(!el)return;
  let days=+(document.getElementById("followupDays")?.value||60);
  let now=new Date();
  let rows=arr(K.c).map(cu=>{
    let orders=arr(K.r).filter(x=>x.customerId===cu.id);
    let last=orders.reduce((a,x)=>{let d=x.createdAt||"";return d>a?d:a},"");
    let daysSince=last?Math.floor((now-new Date(last))/86400000):null;
    return {c:cu,ordersCount:orders.length,last,daysSince};
  }).filter(x=>x.ordersCount>0&&x.daysSince!==null&&x.daysSince>=days);
  rows.sort((a,b)=>b.daysSince-a.daysSince);
  el.innerHTML=rows.length?rows.map(x=>`<div class="item record-card"><div class="item-head"><a href="customer.html?id=${x.c.id}"><b>👤 ${esc(x.c.name)}</b></a><span class="badge">⏳ ${x.daysSince} يوم</span></div><div>${contactLinksHtml(x.c.phone)}</div><div>📍 ${esc(addressText(x.c.mainAddress||{}))}</div><div>🛠️ ${x.ordersCount} أمر سابق • آخر أمر ${new Date(x.last).toLocaleDateString("ar-EG")}</div><div class="actions"><a class="primary small-btn" href="requests.html?customer=${x.c.id}&add=1">➕ أمر شغل جديد</a></div></div>`).join(""):'<div class="item">لا يوجد عملاء ساكتين ضمن المدة المختارة 🎉</div>';
}
function initFollowupPage(){
  let dEl=document.getElementById("followupDays");if(!dEl)return;
  dEl.onchange=renderFollowup;
  renderFollowup();
}
