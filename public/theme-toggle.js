/* ============================================================
   theme-toggle.js
   Añade un botón flotante que permite alternar entre modo claro
   y oscuro en cualquier página del sitio. La preferencia se
   guarda en localStorage y se respeta la preferencia del sistema
   operativo si el usuario aún no ha elegido nada.
   ============================================================ */
(function () {
  var STORAGE_KEY = "ingreso-seguro-theme";

  function getPreferredTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    var systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    return systemPrefersLight ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    var btn = document.getElementById("theme-toggle-btn");
    if (btn) {
      var icon = btn.querySelector(".material-symbols-outlined");
      if (icon) icon.textContent = theme === "light" ? "dark_mode" : "light_mode";
      btn.setAttribute(
        "aria-label",
        theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"
      );
    }
  }

  // Aplica el tema lo antes posible para evitar parpadeos.
  applyTheme(getPreferredTheme());

  function createToggleButton() {
    if (document.getElementById("theme-toggle-btn")) return;

    var btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.type = "button";
    btn.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "light" ? "dark" : "light");
    });

    document.body.appendChild(btn);
    // Ajusta el ícono al estado actual una vez montado el botón.
    applyTheme(document.documentElement.getAttribute("data-theme"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createToggleButton);
  } else {
    createToggleButton();
  }
})();
