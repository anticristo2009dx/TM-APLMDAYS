/* ============================================================
   admin-users.js
   Da funcionalidad real al botón "Agregar Nuevo Usuario" del
   panel de Administrador: abre un modal, valida los datos y
   crea el usuario (Profesor o Celador) directamente en la
   base de datos a través de POST /admin/usuarios.
   ============================================================ */
(function () {
  "use strict";

  var openBtn = document.getElementById("add-user-btn");
  var overlay = document.getElementById("add-user-overlay");
  if (!openBtn || !overlay) return; /* esta página no tiene el panel de admin */

  var closeBtn = document.getElementById("add-user-close");
  var cancelBtn = document.getElementById("add-user-cancel");
  var form = document.getElementById("add-user-form");
  var banner = document.getElementById("add-user-banner");
  var submitBtn = document.getElementById("add-user-submit");

  var nombreInput = document.getElementById("user-nombre");
  var nombreError = document.getElementById("user-nombre-error");
  var cedulaInput = document.getElementById("user-cedula");
  var cedulaError = document.getElementById("user-cedula-error");
  var rolSelect = document.getElementById("user-rol");
  var rolError = document.getElementById("user-rol-error");
  var correoInput = document.getElementById("user-correo");
  var contrasenaInput = document.getElementById("user-contrasena");
  var contrasenaError = document.getElementById("user-contrasena-error");

  /* ── Validación ────────────────────────────────────────────── */
  function setFieldError(input, errorEl, message) {
    var wrap = input.closest(".field");
    if (wrap) wrap.classList.add("has-error");
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearFieldError(input, errorEl) {
    var wrap = input.closest(".field");
    if (wrap) wrap.classList.remove("has-error");
    errorEl.textContent = "";
    errorEl.hidden = true;
  }
  function showBanner(message, isError) {
    banner.textContent = message;
    banner.hidden = false;
    banner.classList.toggle("is-error", !!isError);
  }
  function hideBanner() { banner.hidden = true; }

  [
    [nombreInput, nombreError],
    [cedulaInput, cedulaError],
    [rolSelect, rolError],
    [contrasenaInput, contrasenaError]
  ].forEach(function (pair) {
    pair[0].addEventListener("input", function () { clearFieldError(pair[0], pair[1]); });
    pair[0].addEventListener("change", function () { clearFieldError(pair[0], pair[1]); });
  });

  function validate() {
    var valid = true;

    if (!nombreInput.value.trim()) {
      setFieldError(nombreInput, nombreError, "Ingresa el nombre completo del usuario.");
      valid = false;
    } else {
      clearFieldError(nombreInput, nombreError);
    }

    if (!cedulaInput.value.trim()) {
      setFieldError(cedulaInput, cedulaError, "Ingresa la cédula del usuario.");
      valid = false;
    } else {
      clearFieldError(cedulaInput, cedulaError);
    }

    if (!rolSelect.value) {
      setFieldError(rolSelect, rolError, "Selecciona si es Profesor o Celador.");
      valid = false;
    } else {
      clearFieldError(rolSelect, rolError);
    }

    if (!contrasenaInput.value.trim()) {
      setFieldError(contrasenaInput, contrasenaError, "Ingresa una contraseña.");
      valid = false;
    } else if (contrasenaInput.value.length > 20) {
      setFieldError(contrasenaInput, contrasenaError, "Máximo 20 caracteres.");
      valid = false;
    } else {
      clearFieldError(contrasenaInput, contrasenaError);
    }

    return valid;
  }

  /* ── Abrir / cerrar modal ──────────────────────────────────── */
  function resetForm() {
    form.reset();
    hideBanner();
    clearFieldError(nombreInput, nombreError);
    clearFieldError(cedulaInput, cedulaError);
    clearFieldError(rolSelect, rolError);
    clearFieldError(contrasenaInput, contrasenaError);
    submitBtn.disabled = false;
  }

  function openModal() {
    resetForm();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    nombreInput.focus();
  }
  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });

  /* ── Envío del formulario: guarda en la base de datos ─────────── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideBanner();

    if (!validate()) {
      showBanner("Revisa los campos marcados antes de continuar.", true);
      return;
    }

    var payload = {
      nombre: nombreInput.value.trim(),
      cedula: cedulaInput.value.trim(),
      correo: correoInput.value.trim(),
      contrasena: contrasenaInput.value,
      rol: rolSelect.value
    };

    submitBtn.disabled = true;
    showBanner("Guardando usuario…", false);

    fetch("/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, body: data };
        });
      })
      .then(function (result) {
        if (!result.body || !result.body.ok) {
          var mensaje = (result.body && result.body.mensaje) || "No se pudo crear el usuario.";
          showBanner(mensaje, true);
          submitBtn.disabled = false;
          return;
        }

        var rolNombre = result.body.usuario && result.body.usuario.rolNombre;
        var nombreCreado = result.body.usuario && result.body.usuario.nombre;
        showBanner(
          "Usuario creado: " + nombreCreado + " (" + rolNombre + "). Ya puede iniciar sesión.",
          false
        );

        window.setTimeout(function () {
          closeModal();
        }, 1800);
      })
      .catch(function (err) {
        console.warn("No se pudo conectar con el servidor:", err);
        showBanner("Error de conexión con el servidor. Intenta de nuevo.", true);
        submitBtn.disabled = false;
      });
  });
})();

// Capturar clics en los botones "Editar" de la tabla
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('btn-editar')) {
    const btn = e.target;

    // Cargar los datos del botón en el formulario del modal
    document.getElementById('edit-user-id').value = btn.dataset.id;
    document.getElementById('edit-user-nombre').value = btn.dataset.nombre;
    document.getElementById('edit-user-cedula').value = btn.dataset.cedula;
    document.getElementById('edit-user-rol').value = btn.dataset.rol;
    document.getElementById('edit-user-correo').value = btn.dataset.correo;
    document.getElementById('edit-user-contrasena').value = ''; // Limpiar campo clave

    // Mostrar el modal de edición
    const editOverlay = document.getElementById('edit-user-overlay');
    if (editOverlay) editOverlay.hidden = false;
  }
});