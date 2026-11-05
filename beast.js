const beastOpen = document.querySelector('#beast-open');
const beastBack = document.querySelector('#beast-back');
const beastView = document.querySelector('#beast-view');
const rain = document.querySelector('#money-rain');
const list = document.querySelector('#player-list');
const slots = document.querySelector('#slots');
const lever = document.querySelector('#slot-lever');
const result = document.querySelector('#slot-result');
const players = ['Krish', 'Danny', 'Jordan', 'Ameen', 'Vikram', 'Anshul'];
const selected = new Set(players);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let spinning = false;
let spinToken = 0;

// A small hand-drawn beast emblem, kept inline so it loads with the site.
beastOpen.innerHTML = `<svg class="beast-mark" viewBox="0 0 80 64" aria-hidden="true"><path d="M7 16 26 9 35 1l8 8 23-2-7 9 13 10-9 4-5 18-14 8-13-3-7 9-4-14-10-7 6-7L2 32l10-5z" fill="#28d8fc" stroke="#111829" stroke-width="3" stroke-linejoin="round"/><path d="m25 25 12 3-9 4zm25-2-8 8 12-2z" fill="#111829"/><path d="m43 34-8 10 7-2-3 10 15-15-9 1 4-7z" fill="#ff44a1" stroke="#111829" stroke-width="1.4"/></svg><span class="beast-wordmark">MR<span>BEAST</span><small>WHO PAYS?</small></span>`;

function chooseRandom(length) {
  const max = 0x100000000 - (0x100000000 % length);
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= max);
  return value[0] % length;
}
function renderPlayers() {
  list.replaceChildren(...players.map(name => {
    const label = document.createElement('label');
    label.className = 'player-chip';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = name; input.checked = selected.has(name); input.disabled = spinning;
    const text = document.createElement('span'); text.textContent = name;
    input.addEventListener('change', () => {
      input.checked ? selected.add(name) : selected.delete(name);
      lever.disabled = !selected.size;
      result.textContent = selected.size ? '' : 'Pick at least one person.';
    });
    label.append(input, text);
    return label;
  }));
}
function setReel(reel, names) {
  reel.querySelectorAll('.slot-cell').forEach((cell, index) => {
    const name = names[index];
    cell.querySelector('.slot-name').textContent = name;
    cell.querySelector('.slot-initial').textContent = name.charAt(0).toUpperCase();
    cell.dataset.name = name;
    cell.classList.remove('winning-cell');
  });
}
function renderReels() {
  slots.replaceChildren(...Array.from({length: 5}, (_, column) => {
    const reel = document.createElement('div'); reel.className = 'slot-reel';
    reel.innerHTML = Array.from({length: 3}, () => '<div class="slot-cell"><span class="slot-initial" aria-hidden="true"></span><strong class="slot-name"></strong></div>').join('');
    setReel(reel, Array.from({length: 3}, (_, row) => players[(column + row) % players.length]));
    return reel;
  }));
}
function makeRain() {
  rain.replaceChildren(...Array.from({length: 30}, (_, i) => {
    const bill = document.createElement('span'); bill.className = 'money-bill';
    bill.textContent = '$';
    bill.style.setProperty('--x', `${(i * 37 + 7) % 100}%`);
    bill.style.setProperty('--delay', `${(i % 9) * .055}s`);
    bill.style.setProperty('--duration', `${1.05 + (i % 5) * .14}s`);
    bill.style.setProperty('--turn', `${(i % 2 ? 1 : -1) * (180 + i * 17)}deg`);
    return bill;
  }));
  rain.classList.remove('raining'); void rain.offsetWidth; rain.classList.add('raining');
  setTimeout(() => { rain.classList.remove('raining'); rain.replaceChildren(); }, 2600);
}
async function changePage(open) {
  if (spinning) { spinToken++; spinning = false; renderPlayers(); lever.disabled = !selected.size; }
  makeRain();
  await new Promise(resolve => setTimeout(resolve, reduced.matches ? 0 : 420));
  document.body.classList.toggle('in-beast', open);
  beastView.hidden = !open;
  document.dispatchEvent(new CustomEvent('baygrub:beast-view', {detail: {open}}));
  if (!open) document.dispatchEvent(new CustomEvent('baygrub:beast-exit'));
  if (open) beastBack.focus({preventScroll:true}); else beastOpen.focus({preventScroll:true});
  window.scrollTo({top: 0, behavior: 'instant'});
}
beastOpen.addEventListener('click', () => changePage(true));
beastBack.addEventListener('click', () => changePage(false));

lever.addEventListener('click', async () => {
  if (spinning || !selected.size) return;
  const eligible = players.filter(name => selected.has(name));
  // Every position is drawn independently from the selected players.
  const drawColumn = () => Array.from({ length: 3 }, () => eligible[chooseRandom(eligible.length)]);
  const outcomes = Array.from({ length: 5 }, drawColumn);
  const token = ++spinToken;
  spinning = true; lever.disabled = true; renderPlayers();
  result.textContent = '';
  const reels = [...slots.children];
  reels.forEach(reel => { reel.classList.remove('landed'); reel.classList.add('rolling'); });
  lever.classList.add('pulled');
  setTimeout(() => lever.classList.remove('pulled'), 600);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const timer = setInterval(() => {
    if (token !== spinToken) { clearInterval(timer); return; }
    for (const reel of reels) if (reel.classList.contains('rolling')) setReel(reel, drawColumn());
  }, reduced.matches ? 80 : 85);
  for (let i = 0; i < reels.length; i++) {
    await delay(i === 0 ? 6500 : 850);
    if (token !== spinToken) { clearInterval(timer); return; }
    reels[i].classList.remove('rolling');
    setReel(reels[i], outcomes[i]);
    reels[i].classList.add('landed');
  }
  clearInterval(timer);
  if (token !== spinToken) return;
  spinning = false; lever.disabled = false; renderPlayers();
  const matches = eligible.filter(name => outcomes.every(column => column.includes(name)));
  const winner = matches.length ? matches[chooseRandom(matches.length)] : null;
  if (winner) for (const reel of reels) {
    const cell = [...reel.querySelectorAll('.slot-cell')].find(item => item.dataset.name === winner);
    if (cell) cell.classList.add('winning-cell');
  }
  result.textContent = winner ? `${winner.toUpperCase()} SPONSORS!!` : 'NO MATCH — PULL AGAIN';
  result.classList.remove('result-pop'); void result.offsetWidth; result.classList.add('result-pop');
  if (winner) makeRain();
});
renderPlayers(); renderReels();
