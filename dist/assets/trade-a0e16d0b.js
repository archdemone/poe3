import{dK as a}from"./main-e8601b72.js";function p(){var o;const n=document.getElementById("inventoryPanel");if(!n)return;n.querySelectorAll(".inventory-item, .grid-item").forEach(t=>{t.setAttribute("draggable","true")}),document.querySelector("#vendorPanel .sell-area, #vendorPanel .vendor-sell-area");const e=document.querySelector("#vendorPanel .sell-zone");if(e){const t=e.cloneNode(!0);(o=e.parentNode)==null||o.replaceChild(t,e),t.addEventListener("dragover",s),t.addEventListener("drop",c)}}function s(n){n.preventDefault()}function c(n){var t;const e=n;e.preventDefault();const o=(t=e.dataTransfer)==null?void 0:t.getData("text/plain");if(o){const r=window.currentInventoryGrid;if(r){const d=r.items.find(i=>i.item.uid===o);if(d){const i=a(d.item),l=r.items.indexOf(d);l>-1&&r.items.splice(l,1),window.renderGrid&&window.renderGrid(),u(`Sold ${d.item.baseId} for ${i} gold`)}}}}function u(n){const e=document.createElement("div");e.textContent=n,e.style.cssText=`
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: #c4b088;
    padding: 12px 16px;
    border-radius: 4px;
    z-index: 10000;
    font-size: 14px;
    border: 1px solid rgba(196, 176, 136, 0.3);
  `,document.body.appendChild(e),setTimeout(()=>{document.body.removeChild(e)},3e3)}export{p as enableInventorySelling};
