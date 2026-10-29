// Native adaptation of the supplied Gateway Flow canvas, without an iframe or CDN dependencies.
(() => {
  const entry = document.getElementById("entry-page");
  if (new URLSearchParams(location.search).has("reader")) { entry.hidden = true; return; }
  const canvas = document.getElementById("gateway-flow");
  const context = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const motionAllowed = () => {
    let preference = "system";
    try { preference = localStorage.getItem("small-web-motion") || "system"; } catch {}
    return preference === "on" || (preference !== "off" && !reduced.matches);
  };
  let width = 0, height = 0, frame = 0, last = 0;
  entry.querySelectorAll('a[href="#entry-features"]').forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      document.getElementById("entry-features").scrollIntoView({ behavior: motionAllowed() ? "smooth" : "instant", block: "start" });
    });
  });
  const featureTargets = entry.querySelectorAll(".entry-features > .eyebrow, #features-title, .entry-feature-grid article, .entry-features > .entry-cta");
  let featureObserver;
  let textZoom;
  function setupTextZoom() {
    textZoom?.revert();
    if (entry.hidden || !window.gsap || !window.ScrollTrigger || !motionAllowed()) return;
    gsap.registerPlugin(ScrollTrigger);
    textZoom = gsap.context(() => {
      entry.querySelectorAll("#features-title, .entry-feature-grid h3, .entry-feature-grid p").forEach(text => {
        gsap.fromTo(text, { scale: .88, transformOrigin: "left center" }, {
          scale: 1, ease: "none",
          scrollTrigger: { trigger: text, start: "top 95%", end: "top 60%", scrub: .45, invalidateOnRefresh: true }
        });
      });
    }, entry);
  }
  setupTextZoom();
  reduced.addEventListener("change", setupTextZoom);
  if (window.gsap && motionAllowed() && "IntersectionObserver" in window) {
    gsap.set(featureTargets, { opacity: 0, y: 24 });
    featureObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(item => item.isIntersecting).map(item => item.target);
      visible.forEach(item => featureObserver.unobserve(item));
      if (visible.length) gsap.to(visible, { opacity: 1, y: 0, duration: .75, stagger: .08, ease: "power2.out", clearProps: "opacity,transform" });
    }, { threshold: 0, rootMargin: "0px 0px -30px 0px" });
    featureTargets.forEach(item => featureObserver.observe(item));
  }
  reduced.addEventListener("change", () => {
    if (motionAllowed() || !window.gsap) return;
    featureObserver?.disconnect();
    gsap.killTweensOf(featureTargets);
    gsap.set(featureTargets, { clearProps: "opacity,transform" });
  });
  entry.addEventListener("focusin", event => {
    if (!window.gsap) return;
    const target = event.target.closest(".entry-features > .entry-cta");
    if (target) { featureObserver?.unobserve(target); gsap.killTweensOf(target); gsap.set(target, { clearProps: "opacity,transform" }); }
  });
  let entering = false;
  let transition;
  const shell = document.querySelector(".app-shell");
  function finishEntrance() {
    document.body.classList.remove("reader-transition");
    gsap.set([entry, shell], { clearProps: "opacity,transform,transformOrigin" });
    const heading = document.getElementById("page-title");
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  function revealReader() {
    textZoom?.revert();
    featureObserver?.disconnect();
    entry.hidden = true;
    cancelAnimationFrame(frame);
    window.scrollTo(0, 0);
    const url = new URL(location.href); url.searchParams.set("reader", "");
    history.replaceState(null, "", url);
  }
  entry.addEventListener("click", event => {
    const link = event.target.closest('a[href="?reader"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (entering) return;
    entering = true;
    if (!window.gsap || !motionAllowed()) { revealReader(); document.getElementById("page-title").focus(); return; }
    document.body.classList.add("reader-transition");
    gsap.set(entry, { transformOrigin: `50% ${window.scrollY + innerHeight / 2}px` });
    transition = gsap.timeline({ onComplete: finishEntrance })
      .to(entry, { scale: .94, opacity: 0, duration: .38, ease: "power2.inOut" })
      .call(revealReader)
      .fromTo(shell, { scale: .95, opacity: 0, transformOrigin: "50% 25vh" },
        { scale: 1, opacity: 1, duration: .65, ease: "power3.out" });
  });
  reduced.addEventListener("change", () => { if (!motionAllowed()) transition?.progress(1); });
  if (!context) return;
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
    if (!entry.hidden && entry.dataset.background !== "glyph" && !document.hidden && motionAllowed()) frame = requestAnimationFrame(draw);
  }
  function restart() { cancelAnimationFrame(frame); if (entry.hidden || entry.dataset.background === "glyph") return; last = 0; draw(performance.now()); }
  resize(); restart();
  window.addEventListener("resize", () => { resize(); restart(); });
  document.addEventListener("visibilitychange", restart);
  reduced.addEventListener("change", restart);
  window.addEventListener("quiet-background-change", () => { resize(); restart(); });
  if (window.gsap && motionAllowed()) {
    gsap.fromTo(".entry-intro > *", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .8, stagger: .09, ease: "power2.out", clearProps: "opacity,transform" });
  }
})();
