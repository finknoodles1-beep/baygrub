import { restaurants, categories, categoryFor } from './restaurants.js';

const scene = document.querySelector('.scene');
const toggle = document.querySelector('.motion-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = preference.matches;
let spinAnimation = null;
function updateMotion() {
  document.body.classList.toggle('paused', paused);
  document.body.classList.toggle('motion-enabled', !paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
  toggle.querySelector('.button-label').textContent = paused ? 'Resume motion' : 'Pause motion';
  toggle.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
  if (spinAnimation) paused ? spinAnimation.pause() : spinAnimation.play();
  if (spinAnimation) status.textContent = paused ? 'ROLL PAUSED' : 'ROLLING…';
}

const filter = document.querySelector('#cuisine-filter');
const track = document.querySelector('#reel-track');
const reelWindow = document.querySelector('#reel-window');
const openButton = document.querySelector('#open-case');
const openLabel = document.querySelector('#open-label');
const openSubtitle = document.querySelector('#open-subtitle');
const status = document.querySelector('.reel-status');
const note = document.querySelector('#selection-note');
const resultDialog = document.querySelector('#result-dialog');
const poolDialog = document.querySelector('#pool-dialog');
let spinning = false;
let winningIndex = -1;

// Rejection sampling avoids favoring a restaurant when the pool size changes.
function randomIndex(length) {
  const max = 0x100000000 - (0x100000000 % length);
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= max);
  return bytes[0] % length;
}
const pick = array => array[randomIndex(array.length)];
const pool = () => restaurants.filter(r => filter.value === 'all' || r.emoji === filter.value);

for (const [emoji, category] of Object.entries(categories)) {
  if (!restaurants.some(r => r.emoji === emoji)) continue;
  const option = document.createElement('option');
  option.value = emoji;
  option.textContent = `${emoji} ${category.name}`;
  filter.append(option);
}
document.querySelector('#pool-count').textContent = restaurants.length;

function renderTrack(entries) {
  track.replaceChildren(...entries.map(restaurant => {
    const card = document.createElement('div');
    card.className = 'food-card';
    card.dataset.restaurant = restaurant.name;
    card.style.setProperty('--cuisine-color', categoryFor(restaurant).color);
    const emoji = document.createElement('span');
    emoji.className = 'food-emoji'; emoji.textContent = restaurant.emoji;
    const cuisine = document.createElement('span');
    cuisine.className = 'food-type'; cuisine.textContent = restaurant.cuisine;
    card.append(emoji, cuisine);
    return card;
  }));
}
function idleReel() {
  winningIndex = -1;
  renderTrack(Array.from({ length: 12 }, (_, i) => pool()[i % pool().length]));
  track.style.transform = 'translateX(-30px)';
  note.textContent = `${pool().length} local spots. Every restaurant has the same chance.`;
  status.textContent = 'READY TO ROLL';
}
filter.addEventListener('change', idleReel);
idleReel();

function centerOffset(index) {
  const card = track.children[index];
  return reelWindow.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
}
function showWinner(restaurant) {
  document.querySelector('#winner-emoji').textContent = restaurant.emoji;
  document.querySelector('#winner-cuisine').textContent = restaurant.cuisine;
  document.querySelector('#result-title').textContent = restaurant.name;
  document.querySelector('#winner-address').textContent = restaurant.address;
  document.querySelector('#winner-source').href = restaurant.source;
  document.querySelector('#winner-directions').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ', ' + restaurant.address)}`;
  resultDialog.showModal();
}

async function openCase() {
  if (spinning) return;
  spinning = true;
  openButton.disabled = true;
  filter.disabled = true;
  document.querySelector('#view-restaurants').disabled = true;
  status.textContent = 'UNBOXING…';
  openLabel.textContent = 'Unboxing your next bite…';
  openSubtitle.textContent = 'Something good is on its way.';
  openButton.classList.add('opening');
  note.textContent = 'The box is choosing. Hang tight…';
  const eligible = pool();
  const winner = pick(eligible);
  // The selected restaurant is exactly the card that stops at the center marker.
  const index = 44 + randomIndex(5);
  const entries = Array.from({ length: 56 }, () => pick(eligible));
  entries[index] = winner;
  await new Promise(resolve => setTimeout(resolve, paused ? 50 : 600));
  renderTrack(entries);
  winningIndex = index;
  track.style.transform = 'translateX(0px)';
  const target = centerOffset(index);
  const reduced = paused;
  const animation = track.animate([
    { transform: 'translateX(0px)' },
    { transform: `translateX(${target}px)` }
  ], { duration: reduced ? 120 : 6600, easing: 'cubic-bezier(.12,.72,.12,1)', fill: 'forwards' });
  spinAnimation = animation;
  status.textContent = reduced ? 'CHOOSING…' : 'ROLLING…';
  try {
    await animation.finished;
    // Commit a responsive final position before removing the animation.
    track.style.transform = `translateX(${centerOffset(index)}px)`;
    animation.cancel();
    spinAnimation = null;
    track.children[index].classList.add('is-winner');
    status.textContent = 'DELIVERY COMPLETE';
    note.textContent = `${winner.emoji} ${winner.name} — ${winner.cuisine}`;
    await new Promise(resolve => setTimeout(resolve, reduced ? 30 : 350));
    showWinner(winner);
  } catch {
    spinAnimation = null;
    idleReel();
    note.textContent = 'That roll was interrupted. Tap the box to try again.';
  } finally {
    spinning = false;
    filter.disabled = false;
    document.querySelector('#view-restaurants').disabled = false;
    openButton.disabled = false;
    openButton.classList.remove('opening');
    openLabel.textContent = 'Crack another food case';
    openSubtitle.textContent = 'Another box. Another delicious possibility. ↗';
  }
}
openButton.addEventListener('click', openCase);
document.querySelector('#roll-again').addEventListener('click', () => {
  resultDialog.close();
  openCase();
});
for (const dialog of [resultDialog, poolDialog]) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }});
}

function renderRestaurants(query = '') {
  const term = query.trim().toLocaleLowerCase();
  const entries = restaurants.filter(r => `${r.name} ${r.cuisine} ${r.address} ${categoryFor(r).name}`.toLocaleLowerCase().includes(term));
  document.querySelector('#pool-results').textContent = `${entries.length} of ${restaurants.length} places${term ? ' match your search' : ' in the local lineup'}`;
  const list = document.querySelector('#restaurant-list');
  list.replaceChildren(...entries.map(restaurant => {
    const row = document.createElement('div'); row.className = 'restaurant-row';
    const emoji = document.createElement('span'); emoji.className = 'row-emoji'; emoji.textContent = restaurant.emoji; emoji.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('div'); copy.className = 'row-copy';
    const name = document.createElement('strong'); name.textContent = restaurant.name;
    const details = document.createElement('p'); details.textContent = `${restaurant.cuisine} · ${restaurant.address}`;
    copy.append(name, details);
    const source = document.createElement('a'); source.href = restaurant.source; source.textContent = 'Info ↗'; source.target = '_blank'; source.rel = 'noopener noreferrer'; source.setAttribute('aria-label', `Restaurant information for ${restaurant.name}`);
    row.append(emoji, copy, source); return row;
  }));
  if (!entries.length) {
    const empty = document.createElement('p'); empty.className = 'pool-explanation'; empty.textContent = 'No matches. Try a cuisine like Thai or a city like Dublin.'; list.append(empty);
  }
}
document.querySelector('#view-restaurants').addEventListener('click', () => {
  renderRestaurants(document.querySelector('#restaurant-search').value);
  poolDialog.showModal();
});
document.querySelector('#restaurant-search').addEventListener('input', event => renderRestaurants(event.target.value));
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!spinning && winningIndex >= 0) track.style.transform = `translateX(${centerOffset(winningIndex)}px)`;
  }, 100);
});
toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
preference.addEventListener('change', event => { paused = event.matches; updateMotion(); });
updateMotion();
if (matchMedia('(pointer:fine)').matches) {
  scene.addEventListener('pointermove', event => {
    if (paused) return;
    scene.style.setProperty('--mx', `${(event.clientX / innerWidth - .5) * 8}px`);
    scene.style.setProperty('--my', `${(event.clientY / innerHeight - .5) * 6}px`);
  });
  scene.addEventListener('pointerleave', () => {
    scene.style.setProperty('--mx', '0px'); scene.style.setProperty('--my', '0px');
  });
}
const fireflies = document.querySelector('.fireflies');
for (let i = 0; i < 22; i++) {
  const dot = document.createElement('i');
  dot.className = 'firefly';
  dot.style.cssText = `left:${(i * 47.3) % 100}%;top:${(i * 29.7) % 100}%;--duration:${6 + i % 5}s;--delay:-${i * .9}s`;
  fireflies.append(dot);
}
