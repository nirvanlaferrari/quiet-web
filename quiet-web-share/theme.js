// Keep the original paper theme intact; apply the saved choice before first paint.
(() => {
  let theme = "dark";
  try { theme = localStorage.getItem("small-web-theme") === "light" ? "light" : "dark"; } catch {}
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0e100f" : "#f5f1e8");
    const button = document.getElementById("theme-toggle");
    if (button) {
      button.textContent = theme === "dark" ? "Dark theme" : "Light theme";
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.title = theme === "dark" ? "Switch to the original light theme" : "Switch to dark theme";
    }
  }
  applyTheme();
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    document.getElementById("theme-toggle").addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      applyTheme();
      try { localStorage.setItem("small-web-theme", theme); } catch {}
    });
  });
})();
