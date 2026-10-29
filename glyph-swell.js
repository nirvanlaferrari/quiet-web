// Canvas adaptation of the supplied Glyph Swell component; keeps the original Flow renderer available.
(() => {
  const entry = document.getElementById("entry-page");
  const hero = entry.querySelector(".entry-hero");
  entry.dataset.background = "glyph";
  const canvas = document.getElementById("glyph-swell"), ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = !matchMedia("(hover:hover) and (pointer:fine)").matches;
  const moving = () => {
    let motion = "system";
    try { motion = localStorage.getItem("small-web-motion") || "system"; } catch {}
    return motion === "on" || (motion !== "off" && !reduced.matches);
  };
  let raf = 0, visible = true, last = 0, lastIdle = 0, lastSpawn = 0, lastCell = -1;
  let width = 0, height = 0, cols = 0, rows = 0, ratio = 1, sprite = 0;
  const size = coarse ? 19 : 20, ramp = "·:-+=*#", swells = [];
  const atlas = document.createElement("canvas"), ink = atlas.getContext("2d");
  const origin = performance.now();
  const now = () => (performance.now() - origin) / 1000;
  function resize() {
    if (!ctx || !ink) return;
    width = hero.clientWidth; height = hero.clientHeight;
    ratio = Math.min(devicePixelRatio || 1, 2); sprite = Math.ceil(size * ratio);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    cols = Math.ceil(width / size) + 1; rows = Math.ceil(height / size) + 1;
    atlas.width = sprite * ramp.length; atlas.height = sprite * 2;
    ink.textAlign = "center"; ink.textBaseline = "middle";
    ink.font = `500 ${Math.round(size * .82 * ratio)}px "DM Mono", monospace`;
    ["#9fe6b0", "#e9fff0"].forEach((color, row) => {
      ink.fillStyle = color;
      [...ramp].forEach((glyph, i) => ink.fillText(glyph, i * sprite + sprite / 2, row * sprite + sprite / 2));
    });
  }
  function paint(t) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    while (swells.length && t - swells[0].t > 6) swells.shift();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let value = .06 + .05 * Math.sin(x * .37 + t * .6) * Math.sin(y * .29 - t * .45);
      for (const swell of swells) {
        const age = t - swell.t, distance = Math.hypot(x - swell.x, y - swell.y);
        value += swell.a * Math.exp(-((distance - age * 17) ** 2) / 8) * Math.exp(-age * .55) / (1 + distance * .015);
      }
      if (value < .035) continue;
      const level = Math.min(ramp.length - 1, Math.floor(value * ramp.length * 1.05));
      ctx.globalAlpha = Math.min(1, .2 + value * 1.15);
      ctx.drawImage(atlas, level * sprite, value > .8 ? sprite : 0, sprite, sprite, x * size * ratio - sprite / 2, y * size * ratio - sprite / 2, sprite, sprite);
    }
    ctx.globalAlpha = 1;
  }
  function active() { return ctx && entry.dataset.background === "glyph" && !entry.hidden && !new URLSearchParams(location.search).has("reader") && visible && !document.hidden; }
  function loop(ms) {
    raf = 0;
    if (!active() || !moving()) return;
    if (ms - last >= 33) {
      last = ms; const t = now();
      if (t - lastIdle > 2.4 && t - lastSpawn > 1.2) {
        lastIdle = t; swells.push({ x: Math.random() * cols, y: Math.random() * rows, t, a: .8 });
      }
      paint(t);
    }
    raf = requestAnimationFrame(loop);
  }
  function wake() {
    cancelAnimationFrame(raf); raf = 0;
    if (!active()) return;
    if (moving()) raf = requestAnimationFrame(loop);
    else {
      swells.length = 0;
      swells.push({ x: cols * .3, y: rows * .4, t: 0, a: 1.2 });
      paint(1.4);
    }
  }
  function spawn(event, amplitude) {
    if (!active() || !moving() || event.target.closest("a, button, select, label")) return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / size, y = (event.clientY - rect.top) / size;
    if (x < 0 || y < 0 || x > cols || y > rows) return;
    const cell = Math.floor(y) * 10000 + Math.floor(x), t = now();
    if (amplitude < 1 && (cell === lastCell || t - lastSpawn < .14)) return;
    lastCell = cell; lastSpawn = t;
    swells.push({ x, y, t, a: amplitude });
    if (swells.length > 14) swells.shift();
  }
  if (!ctx || !ink) return;
  if (!coarse) hero.addEventListener("pointermove", event => spawn(event, .8), { passive: true });
  hero.addEventListener("pointerdown", event => spawn(event, 1.6), { passive: true });
  new ResizeObserver(() => { resize(); wake(); }).observe(hero);
  new IntersectionObserver(([event]) => { visible = event.isIntersecting; wake(); }).observe(hero);
  new MutationObserver(wake).observe(entry, { attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("visibilitychange", wake); reduced.addEventListener("change", wake);
  document.fonts?.ready.then(() => { resize(); wake(); });
  resize(); wake();
})();
