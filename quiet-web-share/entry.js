// Native adaptation of the supplied Gateway Flow canvas, without an iframe or CDN dependencies.
(() => {
  const entry = document.getElementById("entry-page");
  if (new URLSearchParams(location.search).has("reader")) { entry.hidden = true; return; }
  const canvas = document.getElementById("gateway-flow");
  const context = canvas.getContext("2d");
  if (!context) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const motionAllowed = () => {
    let preference = "system";
    try { preference = localStorage.getItem("small-web-motion") || "system"; } catch {}
    return preference === "on" || (preference !== "off" && !reduced.matches);
  };
  let width = 0, height = 0, frame = 0, last = 0;
  const paths = Array.from({ length: 44 }, (_, i) => ({ left: i % 2 === 0, y: i / 43, t: Math.random(), speed: .025 + Math.random() * .025 }));
  function resize() {
    width = canvas.clientWidth; height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function draw(time) {
    const delta = last ? Math.min((time - last) / 1000, .05) : 0; last = time;
    context.clearRect(0, 0, width, height);
    paths.forEach(path => {
      const start = path.left ? 0 : width, y = path.y * height;
      const end = width / 2, middle = height * .52;
      context.beginPath(); context.moveTo(start, y);
      context.bezierCurveTo(start + (end - start) * .5, y, start + (end - start) * .8, middle, end, middle);
      context.strokeStyle = "rgba(195,210,169,.14)"; context.lineWidth = .8;
      context.setLineDash([1, 5]); context.stroke(); context.setLineDash([]);
      if (motionAllowed()) path.t = (path.t + delta * path.speed) % 1;
      const t = path.t, u = 1 - t;
      const x = u ** 3 * start + 3 * u ** 2 * t * (start + (end - start) * .5) + 3 * u * t ** 2 * (start + (end - start) * .8) + t ** 3 * end;
      const py = (u ** 3 + 3 * u ** 2 * t) * y + (3 * u * t ** 2 + t ** 3) * middle;
      context.fillStyle = "rgba(214,255,88,.7)"; context.fillRect(x, py, 2, 2);
    });
    if (!document.hidden && motionAllowed()) frame = requestAnimationFrame(draw);
  }
  function restart() { cancelAnimationFrame(frame); last = 0; draw(performance.now()); }
  resize(); restart();
  window.addEventListener("resize", () => { resize(); restart(); });
  document.addEventListener("visibilitychange", restart);
  reduced.addEventListener("change", restart);
  if (window.gsap && motionAllowed()) {
    gsap.fromTo(".entry-intro > *", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, stagger: .09, ease: "power2.out", clearProps: "opacity,transform" });
  }
})();
