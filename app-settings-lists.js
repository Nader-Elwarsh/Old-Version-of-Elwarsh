/* app-settings-lists.js — جزء من الإعدادات: القرى والأنواع والماركات (مرتبط تاريخيًا بجوار كود أوامر الشغل). */
function addVillage(center){let s=settings(),v=prompt("اسم القرية الجديدة داخل "+center);if(!v)return;v=v.trim();s.villages[center]=s.villages[center]||[];if(!s.villages[center].includes(v))s.villages[center].push(v);put(K.s,s);settingsPage()}
function renameVillage(center,v){let s=settings(),n=prompt("الاسم الجديد للقرية",v);if(!n||n===v)return;let a=s.villages[center]||[],i=a.indexOf(v);if(i>=0)a[i]=n;put(K.s,s);settingsPage()}
function moveVillage(center,i,d){let s=settings(),a=s.villages[center]||[],j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];s.villages[center]=a;put(K.s,s);settingsPage()}
function setVillagePosition(center,i,pos){let s=settings(),a=[...(s.villages[center]||[])];let n=parseInt(pos,10);if(!Number.isFinite(n))return settingsPage();n=Math.max(1,Math.min(a.length,n));if(i<0||i>=a.length||i===n-1)return;let item=a.splice(i,1)[0];a.splice(n-1,0,item);s.villages[center]=a;put(K.s,s);settingsPage()}function deleteVillage(center,v){if(!confirm("حذف القرية؟"))return;let s=settings();s.villages[center]=(s.villages[center]||[]).filter(x=>x!==v);if(s.villageGroups&&s.villageGroups[center])delete s.villageGroups[center][v];put(K.s,s);settingsPage()}
function villageGroupOf(center,village){let s=settings();return (s.villageGroups&&s.villageGroups[center]&&s.villageGroups[center][village])||"village"}
function toggleVillageGroup(center,village){let s=settings();s.villageGroups=s.villageGroups||{};s.villageGroups[center]=s.villageGroups[center]||{};let cur=s.villageGroups[center][village]||"village";s.villageGroups[center][village]=cur==="city"?"village":"city";put(K.s,s);settingsPage()}
function editTypeOptions(x){let s=settings(),v=prompt("التصنيفات مفصولة بفاصلة",(s.types[x]||[]).join(", "));if(v===null)return;s.types[x]=v.split(",").map(a=>a.trim()).filter(Boolean);put(K.s,s);settingsPage()}
function moveBrand(i,d){let s=settings(),a=s.brands,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];put(K.s,s);settingsPage()}
function movePartCategory(i,d){let s=settings(),a=s.partCats,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];put(K.s,s);settingsPage()}
function renameBrand(x){let n=prompt("الاسم الجديد للماركة",x);if(!n||n===x)return;let s=settings(),i=s.brands.indexOf(x);if(i>=0)s.brands[i]=n;put(K.s,s);settingsPage()}
function renamePartCategory(x){let n=prompt("الاسم الجديد للتصنيف",x);if(!n||n===x)return;let s=settings(),i=s.partCats.indexOf(x);if(i>=0)s.partCats[i]=n;put(K.s,s);settingsPage()}

