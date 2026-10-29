// Foreground-tab break reminders. No server requests or notifications permission.
(() => {
  const HOUR = 60 * 60 * 1000;
  let enabled = true, elapsed = 0, preview = false;
  try { enabled = localStorage.getItem("quiet-web-break-reminders") !== "off"; } catch {}
  try { const saved = Number(sessionStorage.getItem("quiet-web-screen-time")); if (Number.isFinite(saved)) elapsed = Math.max(0,Math.min(saved,HOUR)); } catch {}
  let last = performance.now();
  const settings = document.createElement("dialog"); settings.className = "screen-time-dialog";
  settings.setAttribute("aria-labelledby","screen-time-title");
  settings.innerHTML = '<h2 id="screen-time-title">A little breathing room.</h2><p class="dialog-copy">A gentle reminder after every hour you spend with Quiet Web in a visible tab. Time in the background does not count.</p><label class="privacy-choice"><input id="break-reminders-enabled" type="checkbox"><span>Remind me every hour</span></label><p id="screen-time-progress" class="helper-text"></p><div class="break-actions"><button type="button" class="theme-toggle" id="preview-break">Preview reminder</button><button type="button" class="primary-button" id="close-screen-time">Done</button></div>';
  const reminder = document.createElement("dialog"); reminder.className = "break-reminder";
  reminder.setAttribute("aria-labelledby","break-reminder-title"); reminder.setAttribute("aria-describedby","break-reminder-copy");
  reminder.innerHTML = '<p class="eyebrow">A moment for yourself</p><h2 id="break-reminder-title">take a break touch some grass :)</h2><p id="break-reminder-copy" class="dialog-copy">Your reading will be right here when you get back.</p><div class="break-actions"><button type="button" class="theme-toggle" id="dismiss-break">Close</button><button type="button" class="primary-button" id="accept-break">Okay</button></div>';
  document.body.append(settings,reminder);
  const checkbox = settings.querySelector("input"); checkbox.checked = enabled;
  function save() { try { sessionStorage.setItem("quiet-web-screen-time",String(elapsed)); } catch {} }
  function updateProgress() { settings.querySelector("#screen-time-progress").textContent = enabled ? `${Math.floor(elapsed / 60000)} of 60 minutes toward your next break. This tab’s progress survives a refresh.` : "Break reminders are off."; }
  function showReminder(isPreview = false) {
    if (reminder.open || document.hidden) return;
    preview = isPreview;
    reminder.showModal();
    if (window.gsap && typeof motionEnabled === "function" && motionEnabled()) gsap.fromTo(reminder,{opacity:0,y:10},{opacity:1,y:0,duration:.3,ease:"power2.out",clearProps:"opacity,transform"});
  }
  function tick() {
    const now = performance.now(), delta = Math.max(0,now-last); last = now;
    // Ignore suspended/sleeping gaps instead of counting hours away from the screen.
    if (enabled && !document.hidden && !reminder.open && delta <= 30000) elapsed = Math.min(HOUR,elapsed+delta);
    save(); updateProgress();
    if (enabled && elapsed >= HOUR) showReminder();
  }
  reminder.addEventListener("close",() => { if (!preview) elapsed = 0; preview = false; last = performance.now(); save(); updateProgress(); });
  reminder.querySelector("#dismiss-break").onclick = () => reminder.close();
  reminder.querySelector("#accept-break").onclick = () => reminder.close();
  document.getElementById("screen-time-settings").onclick = () => { tick(); if (!reminder.open) settings.showModal(); updateProgress(); };
  settings.querySelector("#preview-break").onclick = () => showReminder(true);
  settings.querySelector("#close-screen-time").onclick = () => settings.close();
  checkbox.onchange = () => {
    enabled = checkbox.checked; last = performance.now();
    try { localStorage.setItem("quiet-web-break-reminders",enabled ? "on" : "off"); } catch {}
    if (!enabled) { elapsed = 0; if (reminder.open) reminder.close(); }
    save(); updateProgress();
  };
  document.addEventListener("visibilitychange",() => { last = performance.now(); if (!document.hidden) tick(); else save(); });
  window.addEventListener("pagehide",save);
  window.addEventListener("storage",event => { if (event.key !== "quiet-web-break-reminders") return; enabled = event.newValue !== "off"; checkbox.checked = enabled; elapsed = 0; last = performance.now(); if (!enabled && reminder.open) reminder.close(); save(); updateProgress(); });
  setInterval(tick,15000); updateProgress();
})();
