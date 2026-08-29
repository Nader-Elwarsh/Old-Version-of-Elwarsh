/* =========================================================
   الورشة الفنية — الترحيلات (migrations.js)
   =========================================================
   بيشتغل مرة واحدة بس لكل تعديل في شكل البيانات (schema)، بالمقارنة
   بين wf_schema_version المحفوظ والإصدار الحالي (CURRENT_SCHEMA_VERSION
   في shared-data.js). كل ترحيل بياخد رقم إصدار "من" و"لحد"، وبيتنفذوا
   بالترتيب. الملف ده لازم يتحمّل بعد shared-data.js وimage-store.js
   وقبل app.js، وrunMigrations() لازم تتنادى (وتتنتظر await) قبل أول
   رندر في الصفحة.
   ========================================================= */
(function (window) {
  "use strict";

  // ترحيل 1 → 2: نقل صور الأجهزة والقطع من base64 جوه localStorage
  // إلى IndexedDB (image-store.js)، والاستبدال بمرجع قصير بدل الصورة
  // نفسها. راجع شرح السبب في أعلى image-store.js.
  async function migrate1to2() {
    if (!window.ImageStore) return; // الصفحة لسه ما حمّلتش image-store.js
    let K = window.K;
    for (const key of [K.d, K.p]) {
      let list = arr(key);
      let changed = false;
      for (const rec of list) {
        if (rec.photo && String(rec.photo).startsWith("data:")) {
          try {
            rec.photo = await window.ImageStore.save(rec.photo);
            changed = true;
          } catch (e) {
            console.error("[migrations] تعذر ترحيل صورة سجل", rec.id, e);
          }
        }
      }
      if (changed) put(key, list);
    }
  }

  // ترحيل 2 → 3: اعتماد دورة حالات أمر الشغل الرسمية (جديد / جاري التنفيذ
  // / مكتمل / ملغي) وحالات الورشة الرسمية (غير مطلوب / تم السحب / تم
  // التسليم)، وإزالة حقل الأولوية اللي بقى غير مستخدم في أوامر الشغل.
  // راجع WORK_ORDER_LIFECYCLE_APPROVED.md لتفاصيل الدورة المعتمدة.
  function migrate2to3() {
    let K = window.K;
    const STATUS_MAP = {
      "جديد": "جديد",
      "تم التواصل": "جاري التنفيذ",
      "مجدول": "جاري التنفيذ",
      "جاري الفحص": "جاري التنفيذ",
      "انتظار موافقة العميل": "جاري التنفيذ",
      "تحت الإصلاح": "جاري التنفيذ",
      "جاري التنفيذ": "جاري التنفيذ",
      "مكتمل": "مكتمل",
      "ملغي": "ملغي"
    };
    const WORKSHOP_MAP = {
      "غير مطلوب": "غير مطلوب",
      "مطلوب السحب": "تم السحب",
      "تم السحب": "تم السحب",
      "استلام الورشة": "تم السحب",
      "تحت الإصلاح": "تم السحب",
      "جاهز للتسليم": "تم السحب",
      "تم التسليم": "تم التسليم"
    };
    let requests = arr(K.r);
    requests.forEach(r => {
      r.status = STATUS_MAP[r.status] || "جديد";
      if (r.workshopStatus) r.workshopStatus = WORKSHOP_MAP[r.workshopStatus] || "غير مطلوب";
      if ("priority" in r) delete r.priority;
      if (!Array.isArray(r.statusHistory)) {
        r.statusHistory = [{ from: "", to: r.status, at: r.createdAt || new Date().toISOString() }];
      }
    });
    put(K.r, requests);

    let s = get(K.s, null);
    if (s) {
      s.orderStatuses = ["جديد", "جاري التنفيذ", "مكتمل", "ملغي"];
      s.workshopStatuses = ["غير مطلوب", "تم السحب", "تم التسليم"];
      delete s.priorities;
      put(K.s, s);
    }
  }

  const MIGRATIONS = [
    { from: 1, to: 2, run: migrate1to2 },
    { from: 2, to: 3, run: migrate2to3 }
  ];

  async function runMigrations() {
    let v = window.getSchemaVersion ? window.getSchemaVersion() : 1;
    let target = window.CURRENT_SCHEMA_VERSION || 1;
    if (v >= target) return;
    for (const m of MIGRATIONS) {
      if (v === m.from) {
        try {
          await m.run();
          v = m.to;
          window.setSchemaVersion(v);
        } catch (e) {
          console.error(`[migrations] فشل الترحيل من ${m.from} إلى ${m.to}`, e);
          break; // نوقف السلسلة عند أول فشل بدل ما نكمل على بيانات غير متسقة
        }
      }
    }
  }

  window.runMigrations = runMigrations;
})(window);
