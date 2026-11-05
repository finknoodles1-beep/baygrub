const scene = document.querySelector('.scene');
const toggle = document.querySelector('.motion-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = preference.matches;
function updateMotion() {
  document.body.classList.toggle('paused', paused);
  document.body.classList.toggle('motion-enabled', !paused);
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
  toggle.querySelector('.button-label').textContent = paused ? 'Resume motion' : 'Pause motion';
  toggle.querySelector('.pause-icon').textContent = paused ? '▷' : 'Ⅱ';
}
toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
preference.addEventListener('change', event => { paused = event.matches; updateMotion(); });
updateMotion();
if (matchMedia('(pointer:fine)').matches) {
  scene.addEventListener('pointermove', event => {
    if (paused || preference.matches) return;
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
