const $ = selector => document.querySelector(selector);
const game = $('.case-game'), view = $('#review-view'), status = $('#shared-status');
const form = $('#review-form'), editForm = $('#edit-form');
let state = { current: null, reviews: [] }, initialized = false, showingId = null, editingId = null, syncing = null;
let hooks = {}, stateEpoch = 0;
const tiers = ['S', 'A', 'B', 'C', 'D', 'F'];
async function api(path, options = {}) {
  const res = await fetch(path, { cache: 'no-store', ...options });
  let data; try { data = await res.json(); } catch { throw new Error('Could not connect to shared storage.'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
const setMessage = (selector, text) => { $(selector).textContent = text; };
const wordCount = text => text.trim() ? text.trim().split(/\s+/u).length : 0;
function updateWords() {
  const count = wordCount(form.elements.review.value);
  $('#word-count').textContent = `${count} / 150 words`;
  form.elements.review.setCustomValidity(count > 150 ? 'Keep your review to 150 words or fewer.' : '');
}
function localDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
}
function resetForm() {
  form.reset(); form.elements.date.value = localDate(); updateWords();
  $('#photo-preview').hidden = true; $('#photo-preview').removeAttribute('src');
  setMessage('#form-message', '');
}
function renderCurrent() {
  if (!initialized || window.baygrubSpinning || document.body.classList.contains('in-beast')) return;
  status.textContent = '';
  const pick = state.current;
  if (pick) {
    if (showingId !== pick.id) { resetForm(); showingId = pick.id; }
    $('#current-name').textContent = pick.restaurant.name;
    $('#current-details').textContent = `${pick.restaurant.cuisine} · ${pick.restaurant.address}`;
    $('#current-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pick.restaurant.name + ', ' + pick.restaurant.address)}`;
    game.hidden = true; view.hidden = false; hooks.onShowReview?.(pick);
  } else {
    showingId = null; game.hidden = false; view.hidden = true; hooks.onShowPicker?.();
  }
}
async function sync({ render = true } = {}) {
  // A refresh requested after a write must read again, even if a previous
  // request began before the write and is still in flight.
  if (syncing) { await syncing; return sync({ render }); }
  const epoch = stateEpoch;
  syncing = (async () => {
    try {
      const next = await api('/api/state');
      if (epoch !== stateEpoch) return;
      state = next; initialized = true;
      if (render) renderCurrent();
      if ($('#history-dialog').open) renderHistory();
    } catch (error) {
      if (!initialized) { game.hidden = true; view.hidden = true; }
      status.textContent = `${error.message} Retrying…`;
    }
  })();
  try { await syncing; } finally { syncing = null; }
}

export async function reserveRestaurant(restaurant) {
  return api('/api/current', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:restaurant.name}) });
}
export async function showSelected(pick) {
  stateEpoch++; state.current = pick; initialized = true; await sync({ render: false }); renderCurrent();
}
async function compressPhoto(file) {
  if (!file) return null;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Could not open this image. Try another photo.'); }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let blob;
    for (const quality of [.84,.7,.55,.4]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 1200000) return new File([blob], 'visit.jpg', { type:'image/jpeg' });
    }
    throw new Error('This photo is too large. Try a different photo.');
  } finally { bitmap.close(); }
}
function formDataWithPhoto(formElement, photo) {
  const data = new FormData(formElement); data.delete('photo'); if (photo) data.set('photo', photo); return data;
}
function text(tag, value, className = '') { const el = document.createElement(tag); el.textContent = value; if (className) el.className = className; return el; }
function renderHistory() {
  const list = $('#history-list'); list.replaceChildren();
  if (!state.reviews.length) { list.append(text('p','No reviews yet. Your first visit will appear here.', 'history-empty')); return; }
  for (const tier of tiers) {
    const reviews = state.reviews.filter(r => r.tier === tier); if (!reviews.length) continue;
    const group = document.createElement('section'); group.className = 'history-tier';
    const heading = text('h3',tier,'history-tier-letter'); heading.setAttribute('aria-label',`${tier} tier`); group.append(heading);
    const cards = document.createElement('div'); cards.className = 'history-cards';
    for (const review of reviews) {
      const card = document.createElement('article'); card.className = 'history-card';
      const image = document.createElement('img'); image.src = `/api/reviews/${encodeURIComponent(review.id)}/photo`; image.alt = `Photo from ${review.restaurant.name}`; image.loading = 'lazy';
      const content = document.createElement('div'); content.className = 'history-content';
      content.append(text('h4',review.restaurant.name), text('p',`${review.visit_date} · ${review.restaurant.cuisine}`, 'history-meta'), text('p',review.review,'history-review'));
      const actions = document.createElement('div'); actions.className = 'history-actions';
      const edit = text('button','Edit'); edit.type = 'button'; edit.addEventListener('click',()=>openEdit(review));
      const remove = text('button','Delete'); remove.type = 'button'; remove.addEventListener('click',async()=>{
        if (!confirm(`Delete the review for ${review.restaurant.name}?`)) return;
        try { await api(`/api/reviews/${review.id}`,{method:'DELETE'}); await sync(); } catch(e) { alert(e.message); }
      });
      actions.append(edit,remove); content.append(actions); card.append(image,content); cards.append(card);
    }
    group.append(cards); list.append(group);
  }
}
function openEdit(review) {
  editingId = review.id; editForm.reset(); $('#edit-name').textContent = review.restaurant.name;
  editForm.elements.review.value = review.review; editForm.elements.tier.value = review.tier; editForm.elements.date.value = review.visit_date;
  setMessage('#edit-message',''); $('#edit-dialog').showModal();
}
export function initShared(options = {}) {
  hooks = options; resetForm();
  form.elements.review.addEventListener('input', updateWords);
  form.elements.photo.addEventListener('change', () => {
    const preview = $('#photo-preview'), file = form.elements.photo.files[0];
    if (!file) { preview.hidden = true; return; }
    const url = URL.createObjectURL(file); preview.onload = () => URL.revokeObjectURL(url); preview.onerror = () => URL.revokeObjectURL(url); preview.src = url; preview.hidden = false;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); updateWords(); if (!form.reportValidity() || !state.current) return;
    const button = form.querySelector('[type=submit]'); button.disabled = true; setMessage('#form-message','Saving your review…');
    try {
      const photo = await compressPhoto(form.elements.photo.files[0]); const data = formDataWithPhoto(form,photo); data.set('pickId',state.current.id);
      await api('/api/reviews',{method:'POST',body:data}); showingId = null; resetForm(); await sync(); status.textContent = 'Review saved! Ready for the next pick.';
    } catch(e) { setMessage('#form-message',e.message); } finally { button.disabled = false; }
  });
  $('#reset-pick').addEventListener('click', async () => {
    if (!state.current || !confirm('Reset the current pick and return to the start? The review history will stay.')) return;
    try { await api('/api/current',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:state.current.id})}); await sync(); } catch(e) { alert(e.message); await sync(); }
  });
  $('#master-reset').addEventListener('click', async () => {
    if (!confirm('Reset the current pick and return to the start? Your review history will be kept.')) return;
    try {
      await sync({render:false});
      if (state.current) await api('/api/current',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:state.current.id})});
      window.dispatchEvent(new Event('baygrub:reset'));
      await sync();
    } catch(e) { alert(e.message); await sync(); }
  });
  $('#history-open').addEventListener('click', async () => { await sync({render:false}); renderHistory(); $('#history-dialog').showModal(); });
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
  $('#clear-history').addEventListener('click', async () => {
    if (!state.reviews.length || !confirm('Delete ALL reviews and photos from history? This cannot be undone.')) return;
    try { await api('/api/reviews',{method:'DELETE'}); await sync(); } catch(e) { alert(e.message); }
  });
  editForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if (wordCount(editForm.elements.review.value)>150) { setMessage('#edit-message','Keep your review to 150 words or fewer.'); return; }
    const button = editForm.querySelector('[type=submit]'); button.disabled = true; setMessage('#edit-message','Saving…');
    try { const photo = await compressPhoto(editForm.elements.photo.files[0]); await api(`/api/reviews/${editingId}`,{method:'PUT',body:formDataWithPhoto(editForm,photo)}); $('#edit-dialog').close(); await sync(); }
    catch(e) { setMessage('#edit-message',e.message); } finally { button.disabled = false; }
  });
  document.addEventListener('visibilitychange',()=>{ if (!document.hidden) sync(); });
  document.addEventListener('baygrub:beast-exit',()=>sync());
  document.addEventListener('baygrub:beast-view',event=>{ if (!event.detail?.open) sync(); });
  sync(); setInterval(()=>{ if (!document.hidden) sync(); },6000);
}
