// app.js — Farm Khata core logic

// ---------- DATA MODEL ----------
// crop = {
//   id, name, emoji, acres, season,
//   fertilizer: [{id, type, bags, costPerBag}],
//   seeds: [{id, type, qty, cost}],
//   labour: [{id, activity, numLabourers, costPerLabourer}],
//   pesticide: [{id, name, cost}],
//   harvesting: [{id, desc, cost}],
//   equipment: [{id, desc, cost}],
//   yieldQuintals: number,
//   sales: [{id, quintals, pricePerQuintal}]
// }

const STORAGE_KEY = 'fk_crops_v1';
let crops = [];
let currentCropId = null;
let currentCategory = null; // 'fertilizer'|'seeds'|'labour'|'pesticide'|'harvesting'|'equipment'|'yieldSale'
let navHistory = ['home'];
let selectedEmoji = '🌾';

const CROP_EMOJIS = ['🌾','🌽','🍅','🥔','🌶️','🍆','🧅','🍌','🥭','🌻','🫘','🍇','🥜','🍉','🪴','🌿'];

function loadCrops() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    crops = raw ? JSON.parse(raw) : [];
  } catch(e) { crops = []; }
}
function saveCrops() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
}
function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
}
function fmtMoney(n) {
  n = Number(n) || 0;
  return '₹' + n.toLocaleString('en-IN', {maximumFractionDigits:0});
}
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=> el.classList.remove('show'), 1600);
}

// ---------- CALCULATIONS ----------
function calcCropExpense(crop) {
  const fert = (crop.fertilizer||[]).reduce((s,f)=> s + (Number(f.bags)*Number(f.costPerBag)||0), 0);
  const seed = (crop.seeds||[]).reduce((s,x)=> s + (Number(x.cost)||0), 0);
  const lab = (crop.labour||[]).reduce((s,x)=> s + (Number(x.numLabourers)*Number(x.costPerLabourer)||0), 0);
  const pest = (crop.pesticide||[]).reduce((s,x)=> s + (Number(x.cost)||0), 0);
  const harv = (crop.harvesting||[]).reduce((s,x)=> s + (Number(x.cost)||0), 0);
  const equip = (crop.equipment||[]).reduce((s,x)=> s + (Number(x.cost)||0), 0);
  return {fert, seed, lab, pest, harv, equip, total: fert+seed+lab+pest+harv+equip};
}
function calcCropSale(crop) {
  return (crop.sales||[]).reduce((s,x)=> s + (Number(x.quintals)*Number(x.pricePerQuintal)||0), 0);
}
function calcCropPL(crop) {
  const exp = calcCropExpense(crop).total;
  const sale = calcCropSale(crop);
  return {expense: exp, sale, net: sale - exp};
}

// ---------- NAVIGATION ----------
function navTo(screen, push=true) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+screen).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.screen===screen);
  });
  document.getElementById('fabBtn').style.display = screen==='home' ? 'flex' : 'none';
  document.getElementById('backBtn').style.display = screen==='home' ? 'none' : 'flex';
  if (push) navHistory.push(screen);
  renderCurrentScreen();
}
function goBack() {
  if (navHistory.length > 1) {
    navHistory.pop();
    const prev = navHistory[navHistory.length-1];
    navTo(prev, false);
  } else {
    navTo('home', false);
  }
}
function renderCurrentScreen() {
  const active = document.querySelector('.screen.active').id;
  if (active === 'screen-home') renderHome();
  else if (active === 'screen-crop') renderCropDetail(currentCropId);
  else if (active === 'screen-category') renderCategoryScreen(currentCropId, currentCategory);
  else if (active === 'screen-report') renderReport();
}

// ---------- HOME SCREEN ----------
function renderHome() {
  const sumCard = document.getElementById('seasonSummaryCard');
  let totalExp = 0, totalSale = 0;
  crops.forEach(c => {
    const pl = calcCropPL(c);
    totalExp += pl.expense;
    totalSale += pl.sale;
  });
  const net = totalSale - totalExp;
  sumCard.innerHTML = `
    <p class="top-label">${t('this_season')}</p>
    <p class="top-amt">${fmtMoney(net)} <span style="font-size:14px;font-weight:600;">${net>=0 ? t('profit') : t('loss')}</span></p>
    <div class="summary-row">
      <div>${t('total_expense')}<span class="v">${fmtMoney(totalExp)}</span></div>
      <div>${t('total_sale')}<span class="v">${fmtMoney(totalSale)}</span></div>
    </div>
  `;

  const list = document.getElementById('cropList');
  if (crops.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="e-icon">🌱</span>
        <div class="e-title">${t('no_crops_title')}</div>
        <div class="e-sub">${t('no_crops_sub')}</div>
      </div>`;
    return;
  }
  list.innerHTML = crops.map(c => {
    const pl = calcCropPL(c);
    const cls = pl.net >= 0 ? 'profit-text' : 'loss-text';
    return `
      <div class="card crop-card" onclick="openCropDetail('${c.id}')">
        <div class="crop-emoji">${c.emoji}</div>
        <div class="crop-info">
          <p class="crop-name">${escapeHtml(c.name)}</p>
          <p class="crop-sub">${c.acres ? c.acres + ' ' + t('acres') : ''} ${c.season ? '· ' + escapeHtml(c.season) : ''}</p>
        </div>
        <div class="crop-pl">
          <div class="amt ${cls}">${fmtMoney(Math.abs(pl.net))}</div>
          <div class="lbl">${pl.net>=0 ? t('profit') : t('loss')}</div>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ---------- ADD CROP SHEET ----------
function openAddCropSheet(editId) {
  const editing = editId ? crops.find(c=>c.id===editId) : null;
  selectedEmoji = editing ? editing.emoji : '🌾';
  const overlay = document.getElementById('sheetOverlay');
  const content = document.getElementById('sheetContent');
  content.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${editing ? t('edit_crop') : t('add_crop')}</h2>
    <div class="field">
      <label>${t('pick_icon')}</label>
      <div class="crop-emoji-picker" id="emojiPicker"></div>
    </div>
    <div class="field">
      <label>${t('crop_name')}</label>
      <input type="text" id="inpCropName" placeholder="${t('crop_name_ph')}" value="${editing ? escapeHtml(editing.name) : ''}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('acres')}</label>
        <input type="number" inputmode="decimal" id="inpAcres" placeholder="${t('acres_ph')}" value="${editing ? editing.acres : ''}">
      </div>
      <div class="field">
        <label>${t('season')}</label>
        <input type="text" id="inpSeason" placeholder="${t('season_ph')}" value="${editing ? escapeHtml(editing.season||'') : ''}">
      </div>
    </div>
    <button class="btn btn-primary" onclick="saveCrop('${editing ? editing.id : ''}')">${t('save')}</button>
    ${editing ? `<button class="btn btn-danger" style="margin-top:10px;" onclick="deleteCrop('${editing.id}')">${t('delete')}</button>` : ''}
  `;
  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = CROP_EMOJIS.map(e => `
    <button class="emoji-opt ${e===selectedEmoji?'selected':''}" data-emoji="${e}" onclick="pickEmoji('${e}',this)">${e}</button>
  `).join('');
  overlay.classList.add('active');
}
function pickEmoji(e, btn) {
  selectedEmoji = e;
  document.querySelectorAll('.emoji-opt').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('active');
}
function closeSheetIfBackdrop(ev) {
  if (ev.target.id === 'sheetOverlay') closeSheet();
}
function saveCrop(editId) {
  const name = document.getElementById('inpCropName').value.trim();
  const acres = document.getElementById('inpAcres').value;
  const season = document.getElementById('inpSeason').value.trim();
  if (!name) { showToast(t('fill_required')); return; }
  if (editId) {
    const c = crops.find(x=>x.id===editId);
    c.name = name; c.acres = acres; c.season = season; c.emoji = selectedEmoji;
  } else {
    crops.push({
      id: uid(), name, acres, season, emoji: selectedEmoji,
      fertilizer: [], seeds: [], labour: [], pesticide: [], harvesting: [], equipment: [],
      yieldQuintals: 0, sales: []
    });
  }
  saveCrops();
  closeSheet();
  showToast(t('saved'));
  renderHome();
}
function deleteCrop(id) {
  if (!confirm(t('delete_crop_confirm'))) return;
  crops = crops.filter(c=>c.id!==id);
  saveCrops();
  closeSheet();
  navTo('home', false);
  showToast(t('deleted'));
}

// ---------- CROP DETAIL SCREEN ----------
function openCropDetail(id) {
  currentCropId = id;
  navTo('crop');
}

const CATEGORY_DEFS = {
  fertilizer: {icon:'🧪', labelKey:'fertilizer'},
  seeds: {icon:'🌰', labelKey:'seeds'},
  labour: {icon:'👨‍🌾', labelKey:'labour'},
  pesticide: {icon:'🧴', labelKey:'pesticide'},
  harvesting: {icon:'🌾', labelKey:'harvesting'},
  equipment: {icon:'🚜', labelKey:'equipment'},
};

function renderCropDetail(id) {
  const crop = crops.find(c=>c.id===id);
  if (!crop) { navTo('home', false); return; }
  const pl = calcCropPL(crop);
  const exp = calcCropExpense(crop);
  const sale = calcCropSale(crop);
  const plCls = pl.net >= 0 ? 'profit' : 'loss';

  const catRows = Object.keys(CATEGORY_DEFS).map(key => {
    const def = CATEGORY_DEFS[key];
    const count = (crop[key]||[]).length;
    let amt = 0;
    if (key==='fertilizer') amt = exp.fert;
    else if (key==='seeds') amt = exp.seed;
    else if (key==='labour') amt = exp.lab;
    else if (key==='pesticide') amt = exp.pest;
    else if (key==='harvesting') amt = exp.harv;
    else if (key==='equipment') amt = exp.equip;
    return `
      <div class="line-item" onclick="openCategory('${key}')" style="cursor:pointer;">
        <div>
          <div class="li-main">${def.icon} ${t(def.labelKey)}</div>
          <div class="li-sub">${count} ${count===1?'entry':'entries'}</div>
        </div>
        <div class="li-amt">${fmtMoney(amt)}</div>
      </div>`;
  }).join('');

  document.getElementById('cropDetailContent').innerHTML = `
    <div class="card" style="display:flex;align-items:center;gap:12px;">
      <div class="crop-emoji" style="font-size:34px;">${crop.emoji}</div>
      <div style="flex:1;">
        <p class="crop-name" style="font-size:19px;">${escapeHtml(crop.name)}</p>
        <p class="crop-sub">${crop.acres ? crop.acres+' '+t('acres') : ''} ${crop.season ? '· '+escapeHtml(crop.season) : ''}</p>
      </div>
      <button class="add-link" onclick="openAddCropSheet('${crop.id}')">✏️</button>
    </div>

    <div class="big-pl-card ${plCls}">
      <div class="pl-lbl">${pl.net>=0 ? t('profit') : t('loss')}</div>
      <div class="pl-amt">${fmtMoney(Math.abs(pl.net))}</div>
    </div>

    <div class="card">
      <div class="pl-breakdown-row">
        <span class="pbr-label">💰 ${t('total_expense')}</span>
        <span class="pbr-amt">${fmtMoney(exp.total)}</span>
      </div>
      <div class="pl-breakdown-row">
        <span class="pbr-label">📦 ${t('sale_income')}</span>
        <span class="pbr-amt">${fmtMoney(sale)}</span>
      </div>
    </div>

    <div class="section-title">${t('expense_breakdown')}</div>
    ${catRows}

    <div class="section-title">${t('yield_sale')}</div>
    <div class="line-item" onclick="openCategory('yieldSale')" style="cursor:pointer;">
      <div>
        <div class="li-main">📦 ${t('yield_label')}: ${crop.yieldQuintals || 0} ${t('quintals')}</div>
        <div class="li-sub">${(crop.sales||[]).length} ${t('sale_entry').toLowerCase()}(s)</div>
      </div>
      <div class="li-amt">${fmtMoney(sale)}</div>
    </div>
  `;
}

function openCategory(cat) {
  currentCategory = cat;
  navTo('category');
}

// ---------- GENERIC CATEGORY SCREEN ----------
function renderCategoryScreen(cropId, cat) {
  const crop = crops.find(c=>c.id===cropId);
  if (!crop) { navTo('home', false); return; }
  const container = document.getElementById('categoryContent');

  if (cat === 'yieldSale') {
    renderYieldSaleScreen(crop, container);
    return;
  }

  const def = CATEGORY_DEFS[cat];
  const items = crop[cat] || [];
  const rows = items.map(item => renderLineItemRow(cat, item)).join('');

  container.innerHTML = `
    <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <p class="crop-name" style="font-size:17px;margin:0;">${def.icon} ${t(def.labelKey)}</p>
        <p class="crop-sub" style="margin:2px 0 0;">${escapeHtml(crop.name)}</p>
      </div>
      <button class="add-link" onclick="openLineItemForm('${cat}')">${t('add_item')}</button>
    </div>
    ${items.length === 0 ? `
      <div class="empty-state">
        <span class="e-icon">${def.icon}</span>
        <div class="e-title">${t('no_records_yet')}</div>
        <div class="e-sub">${t('tap_add_to_start')}</div>
      </div>` : rows}
  `;
}

function categoryItemTotal(cat, item) {
  if (cat==='fertilizer') return Number(item.bags)*Number(item.costPerBag)||0;
  if (cat==='seeds') return Number(item.cost)||0;
  if (cat==='labour') return Number(item.numLabourers)*Number(item.costPerLabourer)||0;
  if (cat==='pesticide') return Number(item.cost)||0;
  if (cat==='harvesting') return Number(item.cost)||0;
  if (cat==='equipment') return Number(item.cost)||0;
  return 0;
}

function renderLineItemRow(cat, item) {
  const amt = categoryItemTotal(cat, item);
  let main='', sub='';
  if (cat==='fertilizer') { main = escapeHtml(item.type); sub = `${item.bags} bags × ${fmtMoney(item.costPerBag)}`; }
  else if (cat==='seeds') { main = escapeHtml(item.type); sub = item.qty ? `${item.qty} kg` : ''; }
  else if (cat==='labour') { main = escapeHtml(item.activity); sub = `${item.numLabourers} × ${fmtMoney(item.costPerLabourer)}`; }
  else if (cat==='pesticide') { main = escapeHtml(item.name); sub = ''; }
  else if (cat==='harvesting') { main = escapeHtml(item.desc); sub = ''; }
  else if (cat==='equipment') { main = escapeHtml(item.desc); sub = ''; }
  return `
    <div class="line-item">
      <div>
        <div class="li-main">${main}</div>
        ${sub ? `<div class="li-sub">${sub}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="li-amt">${fmtMoney(amt)}</div>
        <button class="li-del" onclick="deleteLineItem('${cat}','${item.id}')">🗑</button>
      </div>
    </div>`;
}

function deleteLineItem(cat, itemId) {
  const crop = crops.find(c=>c.id===currentCropId);
  crop[cat] = (crop[cat]||[]).filter(i=>i.id!==itemId);
  saveCrops();
  renderCategoryScreen(currentCropId, cat);
  showToast(t('deleted'));
}

// ---------- LINE ITEM ADD FORMS ----------
function openLineItemForm(cat) {
  const overlay = document.getElementById('sheetOverlay');
  const content = document.getElementById('sheetContent');
  const def = CATEGORY_DEFS[cat];
  let formHtml = '';

  if (cat === 'fertilizer') {
    formHtml = `
      <div class="field"><label>${t('fert_type')}</label><input type="text" id="f_type" placeholder="${t('fert_type_ph')}"></div>
      <div class="field-row">
        <div class="field"><label>${t('num_bags')}</label><input type="number" inputmode="decimal" id="f_bags"></div>
        <div class="field"><label>${t('cost_per_bag')}</label><input type="number" inputmode="decimal" id="f_cost"></div>
      </div>`;
  } else if (cat === 'seeds') {
    formHtml = `
      <div class="field"><label>${t('seed_type')}</label><input type="text" id="f_type" placeholder="${t('seed_type_ph')}"></div>
      <div class="field-row">
        <div class="field"><label>${t('seed_qty')}</label><input type="number" inputmode="decimal" id="f_qty"></div>
        <div class="field"><label>${t('seed_cost')}</label><input type="number" inputmode="decimal" id="f_cost"></div>
      </div>`;
  } else if (cat === 'labour') {
    formHtml = `
      <div class="field"><label>${t('activity_name')}</label><input type="text" id="f_activity" placeholder="${t('activity_name_ph')}"></div>
      <div class="field-row">
        <div class="field"><label>${t('num_labourers')}</label><input type="number" inputmode="decimal" id="f_num"></div>
        <div class="field"><label>${t('cost_per_labourer')}</label><input type="number" inputmode="decimal" id="f_cost"></div>
      </div>`;
  } else if (cat === 'pesticide') {
    formHtml = `
      <div class="field"><label>${t('pesticide_name')}</label><input type="text" id="f_name" placeholder="${t('pesticide_name_ph')}"></div>
      <div class="field"><label>${t('pesticide_cost')}</label><input type="number" inputmode="decimal" id="f_cost"></div>`;
  } else if (cat === 'harvesting') {
    formHtml = `
      <div class="field"><label>${t('harvest_desc')}</label><input type="text" id="f_desc" placeholder="${t('harvest_desc_ph')}"></div>
      <div class="field"><label>${t('harvest_cost')}</label><input type="number" inputmode="decimal" id="f_cost"></div>`;
  } else if (cat === 'equipment') {
    formHtml = `
      <div class="field"><label>${t('equip_desc')}</label><input type="text" id="f_desc" placeholder="${t('equip_desc_ph')}"></div>
      <div class="field"><label>${t('equip_cost')}</label><input type="number" inputmode="decimal" id="f_cost"></div>`;
  }

  content.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${def.icon} ${t(def.labelKey)}</h2>
    ${formHtml}
    <button class="btn btn-primary" onclick="saveLineItem('${cat}')">${t('save')}</button>
  `;
  overlay.classList.add('active');
}

function saveLineItem(cat) {
  const crop = crops.find(c=>c.id===currentCropId);
  let item = {id: uid()};
  let valid = true;

  if (cat === 'fertilizer') {
    item.type = document.getElementById('f_type').value.trim();
    item.bags = document.getElementById('f_bags').value;
    item.costPerBag = document.getElementById('f_cost').value;
    if (!item.type || !item.bags || !item.costPerBag) valid = false;
  } else if (cat === 'seeds') {
    item.type = document.getElementById('f_type').value.trim();
    item.qty = document.getElementById('f_qty').value;
    item.cost = document.getElementById('f_cost').value;
    if (!item.type || !item.cost) valid = false;
  } else if (cat === 'labour') {
    item.activity = document.getElementById('f_activity').value.trim();
    item.numLabourers = document.getElementById('f_num').value;
    item.costPerLabourer = document.getElementById('f_cost').value;
    if (!item.activity || !item.numLabourers || !item.costPerLabourer) valid = false;
  } else if (cat === 'pesticide') {
    item.name = document.getElementById('f_name').value.trim();
    item.cost = document.getElementById('f_cost').value;
    if (!item.name || !item.cost) valid = false;
  } else if (cat === 'harvesting') {
    item.desc = document.getElementById('f_desc').value.trim();
    item.cost = document.getElementById('f_cost').value;
    if (!item.desc || !item.cost) valid = false;
  } else if (cat === 'equipment') {
    item.desc = document.getElementById('f_desc').value.trim();
    item.cost = document.getElementById('f_cost').value;
    if (!item.desc || !item.cost) valid = false;
  }

  if (!valid) { showToast(t('fill_required')); return; }

  crop[cat] = crop[cat] || [];
  crop[cat].push(item);
  saveCrops();
  closeSheet();
  showToast(t('saved'));
  renderCategoryScreen(currentCropId, cat);
}

// ---------- YIELD & SALE SCREEN ----------
function renderYieldSaleScreen(crop, container) {
  const saleRows = (crop.sales||[]).map(s => `
    <div class="line-item">
      <div>
        <div class="li-main">${s.quintals} ${t('quintals')} × ${fmtMoney(s.pricePerQuintal)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <div class="li-amt">${fmtMoney(Number(s.quintals)*Number(s.pricePerQuintal))}</div>
        <button class="li-del" onclick="deleteSaleItem('${s.id}')">🗑</button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="card">
      <p class="crop-name" style="font-size:17px;margin:0 0 12px;">📦 ${t('yield_sale')}</p>
      <div class="field" style="margin-bottom:0;">
        <label>${t('total_yield')}</label>
        <input type="number" inputmode="decimal" id="inpYield" value="${crop.yieldQuintals||''}" onchange="updateYield(this.value)">
      </div>
    </div>

    <div class="section-title">
      ${t('sale_income')}
      <button class="add-link" onclick="openSaleForm()">${t('add_sale')}</button>
    </div>
    ${(crop.sales||[]).length===0 ? `
      <div class="empty-state">
        <span class="e-icon">💰</span>
        <div class="e-title">${t('no_records_yet')}</div>
        <div class="e-sub">${t('tap_add_to_start')}</div>
      </div>` : saleRows}
  `;
}
function updateYield(val) {
  const crop = crops.find(c=>c.id===currentCropId);
  crop.yieldQuintals = val;
  saveCrops();
}
function openSaleForm() {
  const overlay = document.getElementById('sheetOverlay');
  const content = document.getElementById('sheetContent');
  content.innerHTML = `
    <div class="sheet-handle"></div>
    <h2>${t('sale_entry')}</h2>
    <div class="field"><label>${t('quintals_sold')}</label><input type="number" inputmode="decimal" id="s_qty"></div>
    <div class="field"><label>${t('price_per_quintal')}</label><input type="number" inputmode="decimal" id="s_price"></div>
    <button class="btn btn-primary" onclick="saveSaleItem()">${t('save')}</button>
  `;
  overlay.classList.add('active');
}
function saveSaleItem() {
  const qty = document.getElementById('s_qty').value;
  const price = document.getElementById('s_price').value;
  if (!qty || !price) { showToast(t('fill_required')); return; }
  const crop = crops.find(c=>c.id===currentCropId);
  crop.sales = crop.sales || [];
  crop.sales.push({id: uid(), quintals: qty, pricePerQuintal: price});
  saveCrops();
  closeSheet();
  showToast(t('saved'));
  renderCategoryScreen(currentCropId, 'yieldSale');
}
function deleteSaleItem(id) {
  const crop = crops.find(c=>c.id===currentCropId);
  crop.sales = (crop.sales||[]).filter(s=>s.id!==id);
  saveCrops();
  renderCategoryScreen(currentCropId, 'yieldSale');
  showToast(t('deleted'));
}

// ---------- REPORT SCREEN ----------
function renderReport() {
  const container = document.getElementById('reportContent');
  if (crops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="e-icon">📊</span>
        <div class="e-title">${t('no_crops_title')}</div>
        <div class="e-sub">${t('no_crops_sub')}</div>
      </div>`;
    return;
  }

  const rows = crops.map(c => {
    const pl = calcCropPL(c);
    return {crop:c, pl};
  }).sort((a,b)=> b.pl.net - a.pl.net);

  const best = rows[0];
  const worst = rows[rows.length-1];

  let totalExp=0, totalSale=0;
  rows.forEach(r=>{ totalExp+=r.pl.expense; totalSale+=r.pl.sale; });
  const netAll = totalSale-totalExp;

  container.innerHTML = `
    <div class="card" style="text-align:center;padding:20px;">
      <p class="crop-sub" style="margin:0 0 6px;">${t('overall_report')}</p>
      <p style="font-size:28px;font-weight:800;margin:0;" class="${netAll>=0?'profit-text':'loss-text'}">${fmtMoney(Math.abs(netAll))}</p>
      <p class="crop-sub" style="margin:4px 0 0;">${netAll>=0?t('profit'):t('loss')}</p>
    </div>

    ${rows.length>1 ? `
    <div class="card" style="padding:14px 16px;">
      <div class="pl-breakdown-row">
        <span class="pbr-label">🏆 ${t('best_crop')}</span>
        <span class="pbr-amt profit-text">${best.crop.emoji} ${escapeHtml(best.crop.name)}</span>
      </div>
      <div class="pl-breakdown-row">
        <span class="pbr-label">⚠️ ${t('worst_crop')}</span>
        <span class="pbr-amt loss-text">${worst.crop.emoji} ${escapeHtml(worst.crop.name)}</span>
      </div>
    </div>` : ''}

    <div class="section-title">${t('all_crops_compared')}</div>
    ${rows.map(r => `
      <div class="line-item" onclick="openCropDetail('${r.crop.id}')" style="cursor:pointer;">
        <div>
          <div class="li-main">${r.crop.emoji} ${escapeHtml(r.crop.name)}</div>
          <div class="li-sub">${t('total_expense')}: ${fmtMoney(r.pl.expense)} · ${t('total_sale')}: ${fmtMoney(r.pl.sale)}</div>
        </div>
        <div class="li-amt ${r.pl.net>=0?'profit-text':'loss-text'}">${fmtMoney(Math.abs(r.pl.net))}</div>
      </div>
    `).join('')}

    <div class="section-title">Data</div>
    <button class="btn btn-secondary" onclick="exportData()">${t('export_data')}</button>
    <div style="height:10px;"></div>
    <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">${t('import_data')}</button>
    <input type="file" id="importFile" accept=".json" style="display:none;" onchange="importData(event)">
    <div style="height:10px;"></div>
    <button class="btn btn-danger" onclick="clearAllData()">${t('clear_all_data')}</button>
  `;
}

function exportData() {
  const blob = new Blob([JSON.stringify(crops, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'farm-khata-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(t('saved'));
}
function importData(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        crops = data;
        saveCrops();
        renderReport();
        showToast(t('saved'));
      }
    } catch(err) { alert('Invalid file'); }
  };
  reader.readAsText(file);
  ev.target.value = '';
}
function clearAllData() {
  if (!confirm(t('clear_all_confirm'))) return;
  crops = [];
  saveCrops();
  renderReport();
  showToast(t('deleted'));
}

// ---------- INIT ----------
function init() {
  loadCrops();
  applyI18n();
  renderHome();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}
document.addEventListener('DOMContentLoaded', init);
