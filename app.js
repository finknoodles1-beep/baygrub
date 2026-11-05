import { restaurants, categories, categoryFor } from './restaurants.js';

const scene = document.querySelector('.scene');
const toggle = document.querySelector('.motion-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = preference.matches;
let spinAnimation = null;
let soundEnabled = false;
let audioContext = null;
let tickFrame = null;
let instantResult = preference.matches;
try {
  const saved = localStorage.getItem('baygrub-animation');
  if (saved !== null) { instantResult = saved !== 'on'; paused = instantResult; }
} catch { /* Storage may be disabled; the control still works for this visit. */ }
function updateMotion() {
  document.body.classList.toggle('paused', paused);
  document.body.classList.toggle('motion-enabled', !paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
  toggle.querySelector('.button-label').textContent = paused ? 'Resume motion' : 'Pause motion';
  toggle.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
  if (spinAnimation) paused ? spinAnimation.pause() : spinAnimation.play();
  if (spinAnimation) status.textContent = paused ? 'PAUSED' : 'ROLLING';
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
const soundButton = document.querySelector('#sound-toggle');
const instantButton = document.querySelector('#instant-toggle');
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
  note.textContent = `${pool().length} restaurants · Equal odds`;
  status.textContent = 'READY';
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
  status.textContent = 'OPENING';
  openLabel.textContent = 'Opening…';
  openSubtitle.textContent = '';
  openButton.classList.add('opening');
  note.textContent = '';
  instantButton.disabled = true;
  if (soundEnabled) {
    try { audioContext ??= new AudioContext(); await audioContext.resume(); } catch { soundEnabled = false; }
  }
  const eligible = pool();
  const winner = pick(eligible);
  // The selected restaurant is exactly the card that stops at the center marker.
  const index = 78 + randomIndex(7);
  const entries = Array.from({ length: 96 }, () => pick(eligible));
  entries[index] = winner;
  await new Promise(resolve => setTimeout(resolve, instantResult ? 30 : 650));
  renderTrack(entries);
  winningIndex = index;
  track.style.transform = 'translateX(0px)';
  const target = centerOffset(index);
  const reduced = instantResult;
  const duration = reduced ? 150 : 13000;
  track.dataset.duration = String(duration);
  const landing = target - 12;
  // Continuous quartic deceleration: fast for several seconds, then individual
  // cards become readable, followed by a slow last few ticks and a short settle.
  const frames = reduced ? [
    { transform: 'translateX(0px)' },
    { transform: `translateX(${target}px)` }
  ] : Array.from({ length: 101 }, (_, i) => {
    const t = i / 100;
    const position = landing * (1 - Math.pow(1 - t, 4));
    return { offset: t * .94, transform: `translateX(${position}px)`, filter: `blur(${(1.25 * Math.pow(1 - t, 3)).toFixed(3)}px)`, easing: i === 100 ? 'cubic-bezier(.16,1,.3,1)' : 'linear' };
  }).concat([{ offset: 1, transform: `translateX(${target}px)`, filter: 'blur(0px)' }]);
  const animation = track.animate(frames, { duration, easing: 'linear', fill: 'forwards' });
  spinAnimation = animation;
  scene.classList.add('is-rolling');
  status.textContent = 'ROLLING';
  const stride = track.children[1].offsetLeft - track.children[0].offsetLeft;
  let lastTick = -1;
  const tick = () => {
    if (spinAnimation !== animation) return;
    const progress = Math.min(Number(animation.currentTime || 0) / duration / .94, 1);
    const distance = Math.abs(landing) * (1 - Math.pow(1 - progress, 4));
    const cardNumber = Math.floor(distance / stride);
    if (!reduced && animation.playState === 'running' && cardNumber !== lastTick) {
      lastTick = cardNumber;
      playTick();
      document.querySelector('.reel-marker').animate([
        { filter: 'brightness(1.8)', transform: 'rotate(-1.5deg)' },
        { filter: 'brightness(1)', transform: 'rotate(0deg)' }
      ], { duration: 110 });
    }
    tickFrame = requestAnimationFrame(tick);
  };
  tick();
  try {
    await animation.finished;
    // Commit a responsive final position before removing the animation.
    track.style.transform = `translateX(${centerOffset(index)}px)`;
    animation.cancel();
    spinAnimation = null;
    cancelAnimationFrame(tickFrame);
    scene.classList.remove('is-rolling');
    track.style.filter = '';
    track.children[index].classList.add('is-winner');
    status.textContent = 'SELECTED';
    note.textContent = `${winner.emoji} ${winner.name} — ${winner.cuisine}`;
    if (!reduced) playTick(true);
    await new Promise(resolve => setTimeout(resolve, reduced ? 30 : 1000));
    showWinner(winner);
  } catch {
    spinAnimation = null;
    cancelAnimationFrame(tickFrame);
    scene.classList.remove('is-rolling');
    idleReel();
    note.textContent = 'Interrupted. Try again.';
  } finally {
    spinning = false;
    filter.disabled = false;
    instantButton.disabled = false;
    document.querySelector('#view-restaurants').disabled = false;
    openButton.disabled = false;
    openButton.classList.remove('opening');
    openLabel.textContent = 'Open case';
    openSubtitle.textContent = '';
  }
}
function playTick(final = false) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(final ? 520 : 1350, now);
  oscillator.frequency.exponentialRampToValueAtTime(final ? 260 : 650, now + .025);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(final ? .12 : .055, now + .002);
  gain.gain.exponentialRampToValueAtTime(.0001, now + (final ? .25 : .035));
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(now); oscillator.stop(now + (final ? .26 : .04));
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
soundButton.addEventListener('click', async () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    try { audioContext ??= new AudioContext(); await audioContext.resume(); }
    catch { soundEnabled = false; }
  }
  soundButton.textContent = soundEnabled ? 'Sound: on' : 'Sound: off';
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
});
function updateInstant() {
  instantButton.textContent = instantResult ? 'Animation: off' : 'Animation: on';
  instantButton.setAttribute('aria-pressed', String(!instantResult));
}
instantButton.addEventListener('click', () => {
  instantResult = !instantResult;
  try { localStorage.setItem('baygrub-animation', instantResult ? 'off' : 'on'); } catch { /* Session only. */ }
  if (!instantResult && paused) { paused = false; updateMotion(); }
  updateInstant();
});
updateInstant();
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
  document.querySelector('#pool-results').textContent = `${entries.length} of ${restaurants.length} restaurants`;
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
