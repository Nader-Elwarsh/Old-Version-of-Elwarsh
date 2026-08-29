/* app-settings.js — صفحة الإعدادات العامة: القوائم القابلة للتعديل والترتيب بالسحب، ثيم خط السير، المراكز/الأنواع/الماركات/تصنيفات القطع. */
function listEditorHtml(title,key,icon){
  let a=settings()[key]||[];
  return `<section class="panel setting-list-panel"><div class="page-head"><h2>${icon} ${title}</h2><button class="secondary mini-action" onclick="addSettingItem('${key}')">➕ إضافة</button></div><div class="drag-hint">☷ اسحب أي عنصر وأفلته في المكان المطلوب</div><div id="list-${key}" class="sortable-list">${a.map((x,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="list" data-drag-key="${esc(key)}" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}.</b> ${esc(x)}</span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${a.length}" value="${i+1}" title="رقم الترتيب" onchange="setListPosition('${key}',${i},this.value)"><button class="secondary mini-action" onclick="renameSettingItem('${key}',${i})">✏️</button><button class="secondary mini-action" onclick="deleteSettingItem('${key}',${i})">🗑️</button></span></div>`).join("")}</div></section>`
}
function reorderSetting(kind,key,from,to){
  let s=settings();
  if(from===to||from<0||to<0)return;
  if(kind==='types'){
    let entries=Object.entries(s.types||{});if(from>=entries.length||to>=entries.length)return;
    let item=entries.splice(from,1)[0];entries.splice(to,0,item);s.types=Object.fromEntries(entries);
  }else{
    let a=kind==='villages'?(s.villages[key]||[]):(s[kind]||[]);
    if(from>=a.length||to>=a.length)return;
    let item=a.splice(from,1)[0];a.splice(to,0,item);
    if(kind==='villages')s.villages[key]=a;else s[kind]=a;
  }
  put(K.s,s);settingsPage();
}
function setListPosition(key,i,pos){
  let s=settings(),a=[...(s[key]||[])],n=parseInt(pos,10);
  if(!Number.isFinite(n))return settingsPage();n=Math.max(1,Math.min(a.length,n));
  if(i<0||i>=a.length||i===n-1)return;
  let item=a.splice(i,1)[0];a.splice(n-1,0,item);s[key]=a;put(K.s,s);settingsPage();
}
function bindSortableSettings(){
  document.querySelectorAll('.drag-item[draggable="true"]').forEach(el=>{
    el.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify({kind:el.dataset.dragKind,key:el.dataset.dragKey||'',index:+el.dataset.dragIndex}));el.classList.add('dragging')});
    el.addEventListener('dragend',()=>el.classList.remove('dragging'));
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over');e.dataTransfer.dropEffect='move'});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('drag-over');let raw=e.dataTransfer.getData('text/plain');if(!raw)return;try{let d=JSON.parse(raw);if(d.kind===el.dataset.dragKind&&(d.key||'')===(el.dataset.dragKey||''))reorderSetting(d.kind,d.kind==='villages'?d.key:(d.key||d.kind),d.index,+el.dataset.dragIndex)}catch(_){}});
  });
  // Touch/pointer fallback for phones where native HTML5 drag-and-drop is limited.
  document.querySelectorAll('.drag-handle').forEach(handle=>{
    let state=null;
    handle.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse')return;
      let row=handle.closest('.drag-item');if(!row)return;
      state={row,startX:e.clientX,startY:e.clientY,kind:row.dataset.dragKind,key:row.dataset.dragKey||'',index:+row.dataset.dragIndex,moved:false};
      handle.setPointerCapture?.(e.pointerId);row.classList.add('dragging');e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!state)return;
      if(Math.abs(e.clientY-state.startY)>6)state.moved=true;
      if(!state.moved)return;
      let target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drag-item');
      document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      if(target&&target!==state.row&&target.dataset.dragKind===state.kind&&(target.dataset.dragKey||'')===state.key)target.classList.add('drag-over');
      e.preventDefault();
    });
    handle.addEventListener('pointerup',e=>{
      if(!state)return;let target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.drag-item');
      let d=state;state=null;d.row.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
      if(target&&target!==d.row&&d.moved&&target.dataset.dragKind===d.kind&&(target.dataset.dragKey||'')===d.key)reorderSetting(d.kind,d.kind==='villages'?d.key:(d.key||d.kind),d.index,+target.dataset.dragIndex);
      e.preventDefault();
    });
    handle.addEventListener('pointercancel',()=>{if(state){state.row.classList.remove('dragging');state=null;document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'))}});
  });
}
function settingsPage(){
  if(!document.getElementById("centerSettings"))return;
  let s=settings();
  centerSettings.innerHTML=s.centers.map((c,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="centers" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. 📍 ${esc(c)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.centers.length}" value="${i+1}" title="رقم الترتيب" onchange="setListPosition('centers',${i},this.value)"><button class="secondary mini-action" onclick="renameCenter('${esc(c)}')">✏️</button><button class="secondary mini-action" onclick="deleteCenter('${esc(c)}')">🗑️</button></span></div><div class="village-box">${(s.villages[c]||[]).map((v,j)=>`<div class="village-row drag-item" draggable="true" data-drag-kind="villages" data-drag-key="${esc(c)}" data-drag-index="${j}"><span class="drag-handle" title="سحب للترتيب">☷</span><input class="order-number" type="number" min="1" max="${(s.villages[c]||[]).length}" value="${j+1}" title="رقم ترتيب القرية" onchange="setVillagePosition('${esc(c)}',${j},this.value)"><span class="village-name">${esc(v)}</span><span class="compact-actions"><button class="mini-action" title="تصنيف الخط: مدينة أو قرية — دوس للتبديل" onclick="toggleVillageGroup('${esc(c)}','${esc(v)}')">${villageGroupOf(c,v)==="city"?"🏙️":"🌾"}</button><button class="mini-action" title="تعديل الاسم" onclick="renameVillage('${esc(c)}','${esc(v)}')">✏️</button><button class="mini-action" title="حذف" onclick="deleteVillage('${esc(c)}','${esc(v)}')">🗑️</button></span></div>`).join("")}<button class="secondary mini-action" onclick="addVillage('${esc(c)}')">➕ قرية</button></div>`).join("");
  typeSettings.innerHTML=Object.entries(s.types).map(([t,c],i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="types" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(t)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${Object.keys(s.types).length}" value="${i+1}" title="رقم الترتيب" onchange="setTypePosition(${i},this.value)"><button class="secondary mini-action" onclick="renameType('${esc(t)}')">✏️</button><button class="secondary mini-action" onclick="deleteType('${esc(t)}')">🗑️</button></span></div><div class="hint type-options">${c.join("، ")||"لا توجد"} <button class="secondary mini-action" onclick="editTypeOptions('${esc(t)}')">✏️ تعديل التصنيفات</button></div>`).join("");
  brandSettings.innerHTML=s.brands.map((b,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="brands" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(b)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.brands.length}" value="${i+1}" title="رقم الترتيب" onchange="setListPosition('brands',${i},this.value)"><button class="secondary mini-action" onclick="renameBrand('${esc(b)}')">✏️</button><button class="secondary mini-action" onclick="deleteBrand('${esc(b)}')">🗑️</button></span></div>`).join("");
  partCategorySettings.innerHTML=s.partCats.map((b,i)=>`<div class="setting-row drag-item" draggable="true" data-drag-kind="partCats" data-drag-index="${i}"><span class="drag-handle" title="سحب للترتيب">☷</span><span class="setting-name"><b>${i+1}. ${esc(b)}</b></span><span class="compact-actions"><input class="order-number" type="number" min="1" max="${s.partCats.length}" value="${i+1}" title="رقم الترتيب" onchange="setListPosition('partCats',${i},this.value)"><button class="secondary mini-action" onclick="renamePartCategory('${esc(b)}')">✏️</button><button class="secondary mini-action" onclick="deletePartCategory('${esc(b)}')">🗑️</button></span></div>`).join("");
  let host=document.getElementById("settingsDynamic");
  if(host)host.innerHTML=`<section class="panel setting-list-panel"><div class="page-head"><h2>🛠️ دورة حالات أمر الشغل</h2></div><div class="hint">الحالات (جديد / جاري التنفيذ / مكتمل / ملغي) وحالات الورشة (غير مطلوب / تم السحب / تم التسليم) بقت دورة معتمدة وثابتة، ومش قابلة للتعديل من هنا. الأولوية اتشالت خالص من أوامر الشغل. راجع ملف WORK_ORDER_LIFECYCLE_APPROVED.md لتفاصيل الدورة والانتقالات المسموحة.</div></section>`+returnWindowSettingHtml()+[["executionPlaces","أماكن التنفيذ","📍"],["paymentStatuses","حالات الدفع","💳"],["units","وحدات القياس","📏"],["addressTypes","أنواع العناوين","🏠"],["orderTags","التصنيف اليدوي لأوامر الشغل","🏷️"],["expenseCategories","تصنيفات المصاريف","🧯"]].map(x=>listEditorHtml(...x)).join("");
  let rtHost=document.getElementById("routeThemeSettings");
  if(rtHost)rtHost.innerHTML=routeThemeSettingsHtml();
  bindSortableSettings();
}
function returnWindowSettingHtml(){
  let s=settings(),days=+s.returnWindowDays||7;
  return `<section class="panel setting-list-panel" id="return-window-panel"><div class="page-head"><h2>🔄 مهلة المرتجع بعد إغلاق الأمر</h2></div><div class="hint">أمر الشغل المكتمل وغير المغلق يفضل قابل للإرجاع/التعديل في أي وقت. أما بعد "تم الدفع بالكامل وإغلاق الأمر"، فبيبقى قابل للإرجاع فقط خلال عدد الأيام ده من تاريخ الإغلاق؛ بعدها مفيش مرتجع ولا تعديل.</div><div class="inline"><input id="returnWindowDaysInput" type="number" min="1" step="1" value="${days}" style="max-width:110px"><button class="secondary mini-action" onclick="setReturnWindowDays()">💾 حفظ المدة</button><span class="hint">حاليًا: ${days} يوم</span></div></section>`;
}
function setReturnWindowDays(){
  let el=document.getElementById("returnWindowDaysInput"),n=parseInt(el?.value,10);
  if(!Number.isFinite(n)||n<1){alert("اكتب عدد أيام صحيح (1 على الأقل).");return}
  let s=settings();s.returnWindowDays=n;put(K.s,s);settingsPage();
}
function routeThemeSettingsHtml(){
  let s=settings(),theme=s.routeTheme||"dark",color=s.routeThemeColor||"#17181b";
  let opt=(val,label,emoji)=>`<button type="button" class="secondary mini-action route-theme-opt${theme===val?" active-opt":""}" onclick="setRouteTheme('${val}')">${emoji} ${label}</button>`;
  return `<div class="compact-actions">${opt("auto","تلقائي (حسب النظام)","📱")}${opt("dark","داكن","🌙")}${opt("light","فاتح","☀️")}${opt("custom","لون مخصص","🎨")}</div>`
    +(theme==="custom"?`<div class="inline" style="margin-top:8px;align-items:center"><input type="color" id="routeThemeColorInput" value="${color}" onchange="setRouteThemeColor(this.value)"><span class="hint">اختر أي لون تفضله للخلفية</span></div>`:"");
}
function setRouteTheme(v){let s=settings();s.routeTheme=v;put(K.s,s);settingsPage()}
function setRouteThemeColor(v){let s=settings();s.routeTheme="custom";s.routeThemeColor=v;put(K.s,s);settingsPage()}
function setTypePosition(i,pos){let n=parseInt(pos,10),entries=Object.entries(settings().types||{});if(!Number.isFinite(n))return settingsPage();n=Math.max(1,Math.min(entries.length,n));if(i<0||i>=entries.length||i===n-1)return;let item=entries.splice(i,1)[0];entries.splice(n-1,0,item);let s=settings();s.types=Object.fromEntries(entries);put(K.s,s);settingsPage()}
function addCenter(){let el=document.getElementById("newCenter"),v=el&&el.value?el.value:prompt("اسم المركز الجديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.centers.includes(v)){s.centers.push(v);s.villages[v]=s.villages[v]||[]}put(K.s,s);if(el)el.value="";settingsPage()}
function renameCenter(c){let n=prompt("الاسم الجديد للمركز",c);if(!n||n===c)return;n=n.trim();if(!n)return;let s=settings(),i=s.centers.indexOf(c);if(i<0)return;s.centers[i]=n;s.villages[n]=s.villages[c]||[];if(n!==c)delete s.villages[c];put(K.s,s);settingsPage()}
function deleteCenter(c){if(!confirm(`حذف المركز «${c}» وكل قراه؟`))return;let s=settings();s.centers=s.centers.filter(x=>x!==c);delete s.villages[c];put(K.s,s);settingsPage()}
function addType(){let t=prompt("اسم نوع الجهاز الجديد");if(!t)return;t=t.trim();if(!t)return;let s=settings();if(!(t in s.types))s.types[t]=[];put(K.s,s);settingsPage()}
function renameType(t){let n=prompt("الاسم الجديد للنوع",t);if(!n||n===t)return;n=n.trim();if(!n)return;let s=settings();if(!(t in s.types))return;if(n in s.types&&n!==t){alert("هذا النوع موجود بالفعل");return}let entries=Object.entries(s.types).map(([k,v])=>[k===t?n:k,v]);s.types=Object.fromEntries(entries);put(K.s,s);settingsPage()}
function deleteType(t){if(!confirm(`حذف نوع الجهاز «${t}» وكل تصنيفاته؟`))return;let s=settings();delete s.types[t];put(K.s,s);settingsPage()}
function addBrand(){let v=prompt("اسم الماركة الجديدة");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.brands.includes(v))s.brands.push(v);put(K.s,s);settingsPage()}
function deleteBrand(b){if(!confirm(`حذف الماركة «${b}»؟`))return;let s=settings();s.brands=s.brands.filter(x=>x!==b);put(K.s,s);settingsPage()}
function addPartCategory(){let v=prompt("اسم تصنيف القطع الجديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();if(!s.partCats.includes(v))s.partCats.push(v);put(K.s,s);settingsPage()}
function deletePartCategory(c){if(!confirm(`حذف تصنيف «${c}»؟`))return;let s=settings();s.partCats=s.partCats.filter(x=>x!==c);put(K.s,s);settingsPage()}
function addSettingItem(key){let v=prompt("أضف عنصر جديد");if(!v)return;v=v.trim();if(!v)return;let s=settings();s[key]=s[key]||[];if(!s[key].includes(v))s[key].push(v);put(K.s,s);settingsPage()}
function renameSettingItem(key,i){let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;let n=prompt("الاسم الجديد",a[i]);if(!n||n===a[i])return;n=n.trim();if(!n)return;a[i]=n;s[key]=a;put(K.s,s);settingsPage()}
function deleteSettingItem(key,i){let s=settings(),a=s[key]||[];if(i<0||i>=a.length)return;if(!confirm(`حذف «${a[i]}»؟`))return;a.splice(i,1);s[key]=a;put(K.s,s);settingsPage()}


