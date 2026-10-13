/* ============================================================
   login.js
   El envío del formulario es un POST real a /auth (lo maneja
   Express), así que aquí solo se agrega la interacción de
   mostrar/ocultar la contraseña.
   ============================================================ */
(function () {
  "use strict";

  var toggleBtn = document.getElementById("toggle-password");
  var passwordInput = document.getElementById("password");
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener("click", function () {
    var isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    var icon = toggleBtn.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = isHidden ? "visibility_off" : "visibility";
    toggleBtn.setAttribute("aria-label", isHidden ? "Ocultar contraseña" : "Mostrar contraseña");
  });
})();
