/* =========================================================
   الورشة الفنية — المحافظ (wallets.js)
   =========================================================
   ده قسم منفصل عن "الخزنة" (treasury.js) بالكامل ومختلف عنه في الغرض:
   - الخزنة (treasury.js) = درج نقدي واحد مستقل، لا يتأثر تلقائيًا بأي حاجة.
   - المحافظ (هنا) = كذا "مكان" فلوس فعلي (محفظتي الشخصية، محافظ موبايل،
     إنستاباي...) مربوطة فعليًا بأوامر الشغل: لما عميل يدفع عربون أو
     تحصيل نهائي، بيتحدد دفع في أنهي محفظة، وده بيتسجل هنا تلقائيًا.
     وبرضو تقدر تسجل منها مصاريفك الشخصية ومصاريف التشغيل يدويًا،
     فتعرف بالظبط "الفلوس اللي في المحفظة دي جايه منين ورايحة فين".

   أسماء المحافظ نفسها وتصنيفات الحركة (شخصي/تشغيل/تحصيل عميل...) قوايم
   قابلة للتعديل بالكامل (إضافة/تعديل/حذف/ترتيب) من صفحة الإعدادات، بنفس
   آلية باقي القوايم في النظام (settings().wallets / settings().walletCategories).
   ========================================================= */

/* ---------------------------------------------------------------------
   قراءة وحساب الأرصدة
--------------------------------------------------------------------- */
function walletTxEntries(){return arr(K.wtx).filter(x=>!x.deleted)}
function walletTxFor(walletName){return walletTxEntries().filter(x=>x.wallet===walletName)}
function walletBalance(walletName){return walletTxFor(walletName).reduce((a,x)=>a+(x.type==="in"?(+x.amount||0):-(+x.amount||0)),0)}
function walletsOverview(){return (settings().wallets||[]).map(w=>({name:w,balance:walletBalance(w)}))}
// إجمالي الرصيد الكلي عبر كل المحافظ مع بعض، للعرض السريع فوق الصفحة.
function walletsTotalBalance(){return walletsOverview().reduce((a,w)=>a+w.balance,0)}
// ملخص حسب تصنيف الحركة (شخصي/تشغيل/تحصيل عميل...): إجمالي وارد وصادر لكل تصنيف،
// عشان "أنا بصرف إيه شخصيًا وإيه مصاريف تشغيل" يبقى رقم واحد واضح.
function walletCategoryTotals(){
  let map={};
  walletTxEntries().forEach(x=>{
    let c=x.category||"أخرى";
    map[c]=map[c]||{in:0,out:0};
    if(x.type==="in")map[c].in+=(+x.amount||0);else map[c].out+=(+x.amount||0);
  });
  return Object.entries(map).map(([category,v])=>({category,...v}));
}

/* ---------------------------------------------------------------------
   حركة يدوية (من صفحة المحافظ نفسها أو من زر الإدخال السريع بالرئيسية)
--------------------------------------------------------------------- */
function addWalletManual(type,prefix="wt"){
  let amountEl=document.getElementById(prefix+"Amount"),walletEl=document.getElementById(prefix+"Wallet"),
      categoryEl=document.getElementById(prefix+"Category"),reasonEl=document.getElementById(prefix+"Reason"),
      dateEl=document.getElementById(prefix+"Date"),timeEl=document.getElementById(prefix+"Time"),
      noteEl=document.getElementById(prefix+"Note");
  let amount=+amountEl?.value||0,wallet=(walletEl?.value||"").trim(),
      category=categoryEl?.value||"أخرى",reason=(reasonEl?.value||"").trim(),
      date=dateEl?.value||localDateKey(new Date()),time=timeEl?.value||new Date().toTimeString().slice(0,5);
  if(amount<=0)return alert("أدخل مبلغ صحيح.");
  if(!wallet)return alert("اختر المحفظة.");
  if(!reason)return alert("اكتب سبب الحركة.");
  let entry={
    id:id(),refKey:null,manualOverride:true,deleted:false,type,amount,wallet,category,
    date,time,reason,note:(noteEl?.value||"").trim(),source:"manual",createdAt:new Date().toISOString()
  };
  put(K.wtx,arr(K.wtx).concat(entry));
  return entry;
}
function walletManualFromPage(type){
  addWalletManual(type,"wt");
  renderWallets();
}
function editWalletTx(txId){
  let a=arr(K.wtx),e=a.find(x=>x.id===txId);if(!e)return;
  let newAmount=prompt("المبلغ:",e.amount);if(newAmount===null)return;
  let newReason=prompt("سبب الحركة:",e.reason||"");if(newReason===null)return;
  let newNote=prompt("تفاصيل إضافية:",e.note||"");if(newNote===null)return;
  e.amount=Math.abs(+newAmount)||0;e.reason=(newReason||"").trim()||e.reason;e.note=(newNote||"").trim();
  if(e.refKey)e.manualOverride=true;
  put(K.wtx,a);renderWallets();
}
function deleteWalletTx(txId){
  let a=arr(K.wtx),e=a.find(x=>x.id===txId);if(!e)return;
  let msg=e.refKey?"هذه الحركة مرتبطة بأمر شغل. حذفها من هنا لن يعدّل أمر الشغل نفسه، بس هتختفي من كشف المحفظة. تأكيد الحذف؟":"حذف هذه الحركة من كشف المحفظة؟";
  if(!confirm(msg))return;
  e.deleted=true;put(K.wtx,a);renderWallets();
}

/* ---------------------------------------------------------------------
   الربط التلقائي بأوامر الشغل: كل ما تتغيّر قيمة العربون أو يتحصّل
   المبلغ النهائي مع تحديد محفظة، بتتسجل/تتحدّث حركة واحدة مرتبطة
   بنفس refKey (بدل ما تتكرر الحركة في كل مرة يتعدل فيها الأمر).
--------------------------------------------------------------------- */
function upsertWalletTxForRef(refKey,data){
  let a=arr(K.wtx),idx=a.findIndex(x=>x.refKey===refKey&&!x.deleted);
  let amount=+data.amount||0,wallet=(data.wallet||"").trim();
  if(!wallet||amount<=0){
    if(idx>=0){a[idx].deleted=true;put(K.wtx,a)}
    return;
  }
  if(idx>=0){
    Object.assign(a[idx],{amount,wallet,category:data.category||a[idx].category,reason:data.reason||a[idx].reason,date:data.date||a[idx].date});
  }else{
    a.push({
      id:id(),refKey,manualOverride:false,deleted:false,type:"in",amount,wallet,
      category:data.category||"تحصيل عميل",reason:data.reason||"",note:data.note||"",
      date:data.date||localDateKey(new Date()),time:new Date().toTimeString().slice(0,5),
      source:"order-link",createdAt:new Date().toISOString()
    });
  }
  put(K.wtx,a);
}
function removeWalletTxForRef(refKey){
  let a=arr(K.wtx),idx=a.findIndex(x=>x.refKey===refKey&&!x.deleted);
  if(idx<0)return;a[idx].deleted=true;put(K.wtx,a);
}
// بيتنادى بعد حفظ أمر الشغل (جديد أو تعديل)؛ لو مفيش محفظة متحددة أو
// العربون صفر، الحركة (لو كانت موجودة من قبل) بتتشال تلقائيًا.
function syncWalletForOrderDeposit(order){
  upsertWalletTxForRef("order-deposit-"+order.id,{
    amount:order.deposit,wallet:order.depositWallet,category:"تحصيل عميل",
    reason:`💵 عربون أمر الشغل ${order.no}`
  });
}
// بيتنادى وقت "تم الدفع بالكامل وإغلاق الأمر" مع تحديد المحفظة اللي
// اتحصل فيها المبلغ المتبقي.
function syncWalletForOrderClose(order,collected,wallet){
  upsertWalletTxForRef("order-final-"+order.id,{
    amount:collected,wallet,category:"تحصيل عميل",
    reason:`💳 تحصيل نهائي أمر الشغل ${order.no}`
  });
}

/* ---------------------------------------------------------------------
   العرض: صفحة المحافظ الكاملة
--------------------------------------------------------------------- */
function renderWallets(){
  let el=document.getElementById("walletsPage");if(!el)return;
  let wallets=settings().wallets||[],categories=settings().walletCategories||[];
  let filterWallet=document.getElementById("wFilterWallet")?.value||"",
      filterCategory=document.getElementById("wFilterCategory")?.value||"";
  let overview=walletsOverview(),catTotals=walletCategoryTotals();
  let today=localDateKey(new Date());
  let list=walletTxEntries()
    .filter(x=>(!filterWallet||x.wallet===filterWallet)&&(!filterCategory||x.category===filterCategory))
    .sort((a,b)=>new Date((b.date||"")+"T"+(b.time||"00:00"))-new Date((a.date||"")+"T"+(a.time||"00:00"))||new Date(b.createdAt)-new Date(a.createdAt));
  el.innerHTML=`
    <div class="treasury-balance">
      <span>إجمالي أرصدة كل المحافظ</span><b>${walletsTotalBalance().toFixed(2)} ج</b>
    </div>
    <div class="profile-grid" style="margin:10px 0 14px">
      ${overview.length?overview.map(w=>`<div class="kv"><b>👛 ${esc(w.name)}</b>${w.balance.toFixed(2)} ج</div>`).join(""):`<div class="hint">لا توجد محافظ بعد. أضفها من ⚙️ الإعدادات ← المحافظ.</div>`}
    </div>
    <details class="expense-panel">
      <summary>📊 ملخص حسب نوع الحركة (شخصي / تشغيل / تحصيل عميل...)</summary>
      <div class="profile-grid">
        ${catTotals.length?catTotals.map(c=>`<div class="kv"><b>${esc(c.category)}</b>وارد ${c.in.toFixed(2)} ج · صادر ${c.out.toFixed(2)} ج</div>`).join(""):`<div class="hint">لا توجد حركات بعد.</div>`}
      </div>
    </details>
    <div class="treasury-actions">
      <div class="form-grid">
        <label>المبلغ<input id="wtAmount" type="number" step="0.01" min="0" placeholder="0.00"></label>
        <label>المحفظة<select id="wtWallet">${wallets.map(w=>`<option>${esc(w)}</option>`).join("")}</select></label>
        <label>التصنيف<select id="wtCategory">${categories.map(c=>`<option>${esc(c)}</option>`).join("")}</select></label>
        <label>التاريخ<input id="wtDate" type="date" value="${today}"></label>
        <label>الوقت<input id="wtTime" type="time" value="${new Date().toTimeString().slice(0,5)}"></label>
        <label class="wide">السبب<input id="wtReason" placeholder="مثال: عربون، سحب شخصي، بنزين..."></label>
        <label class="wide">تفاصيل إضافية<input id="wtNote" placeholder="اختياري"></label>
      </div>
      <div class="actions">
        <button type="button" class="primary" onclick="walletManualFromPage('in')">➕ وارد</button>
        <button type="button" class="secondary danger-btn" onclick="walletManualFromPage('out')">➖ صرف</button>
      </div>
    </div>
    <div class="filters">
      <select id="wFilterWallet" onchange="renderWallets()"><option value="">كل المحافظ</option>${wallets.map(w=>`<option ${w===filterWallet?"selected":""}>${esc(w)}</option>`).join("")}</select>
      <select id="wFilterCategory" onchange="renderWallets()"><option value="">كل التصنيفات</option>${categories.map(c=>`<option ${c===filterCategory?"selected":""}>${esc(c)}</option>`).join("")}</select>
    </div>
    <h3 class="treasury-list-title">📋 كشف حركات المحافظ</h3>
    ${list.length?list.map(x=>`<div class="treasury-row ${x.type}">
      <div class="treasury-row-main">
        <b>${esc(x.reason||"—")}</b>
        <small>${esc(new Date((x.date||today)+"T"+(x.time||"00:00")).toLocaleString("ar-EG"))} • 👛 ${esc(x.wallet||"—")} • 🏷️ ${esc(x.category||"أخرى")}${x.source==="order-link"?" • 🔗 أمر شغل":""}</small>
        ${x.note?`<small>📝 ${esc(x.note)}</small>`:""}
      </div>
      <div class="treasury-row-amount ${x.type}">${x.type==="in"?"+":"−"}${(+x.amount||0).toFixed(2)} ج</div>
      <div class="treasury-row-actions"><button type="button" class="mini-action" onclick="editWalletTx('${x.id}')">✏️</button><button type="button" class="mini-action" onclick="deleteWalletTx('${x.id}')">🗑️</button></div>
    </div>`).join(""):`<div class="hint">لا توجد حركات في المحافظ بعد.</div>`}
  `;
}
