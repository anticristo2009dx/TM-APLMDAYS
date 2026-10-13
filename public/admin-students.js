/* ============================================================
   admin-students.js
   Da funcionalidad real al botón "Agregar Estudiante" del panel
   de Administrador: abre un modal, valida los datos, genera
   matrícula + código QR automáticamente (según la forma de la
   tabla `estudiantes` de lefolde.sql) y guarda el nuevo
   estudiante en localStorage para que aparezca de inmediato en
   la página de Estudiantes.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "ingreso-seguro-nuevos-estudiantes";
  var COUNTER_KEY = "ingreso-seguro-matricula-counter";
  var GRUPOS_POR_GRADO = 3; /* mismo esquema usado en students.js */

  var openBtn = document.getElementById("add-student-btn");
  var overlay = document.getElementById("add-student-overlay");
  if (!openBtn || !overlay) return; /* esta página no es admin.html */

  var closeBtn = document.getElementById("add-student-close");
  var cancelBtn = document.getElementById("add-student-cancel");
  var form = document.getElementById("add-student-form");
  var banner = document.getElementById("add-student-banner");

  var nombreInput = document.getElementById("student-nombre");
  var nombreError = document.getElementById("student-nombre-error");
  var gradoSelect = document.getElementById("student-grado");
  var gradoError = document.getElementById("student-grado-error");
  var grupoSelect = document.getElementById("student-grupo");
  var grupoError = document.getElementById("student-grupo-error");

  var fotoInput = document.getElementById("student-foto");
  var fotoPreview = document.getElementById("student-photo-preview");
  var fotoDataUrl = null;

  var qrPreviewRow = document.getElementById("qr-preview-row");
  var qrPreviewValue = document.getElementById("qr-preview-value");
  var submitBtn = document.getElementById("add-student-submit");

  /* ── Utilidades de almacenamiento ─────────────────────────── */
  function getNextMatricula() {
    var last = 0;
    try {
      last = parseInt(localStorage.getItem(COUNTER_KEY), 10) || 0;
    } catch (e) { /* no-op */ }
    var next = Math.max(last, 100844) + 1; /* continúa después de la última matrícula de ejemplo */
    try { localStorage.setItem(COUNTER_KEY, String(next)); } catch (e) { /* no-op */ }
    return next;
  }

  function saveStudent(student) {
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) { list = []; }
    list.push(student);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage:", e);
    }
  }

  /* ── Grupo dinámico según el grado elegido ────────────────── */
  function populateGrupos(grado) {
    grupoSelect.innerHTML = "";
    if (!grado) {
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = "Elige un grado primero";
      grupoSelect.appendChild(placeholder);
      grupoSelect.disabled = true;
      return;
    }
    grupoSelect.disabled = false;
    var ph = document.createElement("option");
    ph.value = "";
    ph.disabled = true;
    ph.selected = true;
    ph.textContent = "Selecciona un grupo";
    grupoSelect.appendChild(ph);
    for (var i = 1; i <= GRUPOS_POR_GRADO; i++) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = "Grupo " + i + " (" + grado + "-" + i + ")";
      grupoSelect.appendChild(opt);
    }
  }

  gradoSelect.addEventListener("change", function () {
    populateGrupos(gradoSelect.value);
    updateQrPreview();
    clearFieldError(gradoSelect, gradoError);
  });
  grupoSelect.addEventListener("change", function () {
    updateQrPreview();
    clearFieldError(grupoSelect, grupoError);
  });
  nombreInput.addEventListener("input", function () {
    clearFieldError(nombreInput, nombreError);
  });

  /* ── Vista previa de matrícula / QR ────────────────────────── */
  var previewMatricula = null;
  function updateQrPreview() {
    var ready = nombreInput.value.trim() && gradoSelect.value && grupoSelect.value;
    if (!ready) {
      qrPreviewRow.hidden = true;
      return;
    }
    if (!previewMatricula) previewMatricula = getPreviewMatricula();
    var qr = "ISQR-2026-" + String(previewMatricula).slice(-4);
    qrPreviewValue.textContent = "#" + previewMatricula + " · " + qr;
    qrPreviewRow.hidden = false;
  }
  function getPreviewMatricula() {
    var last = 0;
    try { last = parseInt(localStorage.getItem(COUNTER_KEY), 10) || 0; } catch (e) { /* no-op */ }
    return Math.max(last, 100844) + 1;
  }
  nombreInput.addEventListener("input", updateQrPreview);

  /* ── Foto opcional ─────────────────────────────────────────── */
  fotoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      fotoDataUrl = ev.target.result;
      fotoPreview.innerHTML = "<img src=\"" + fotoDataUrl + "\" alt=\"\" />";
    };
    reader.readAsDataURL(file);
  });

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

  function validate() {
    var valid = true;
    if (!nombreInput.value.trim()) {
      setFieldError(nombreInput, nombreError, "Ingresa el nombre completo del estudiante.");
      valid = false;
    } else {
      clearFieldError(nombreInput, nombreError);
    }
    if (!gradoSelect.value) {
      setFieldError(gradoSelect, gradoError, "Selecciona un grado.");
      valid = false;
    } else {
      clearFieldError(gradoSelect, gradoError);
    }
    if (!grupoSelect.value) {
      setFieldError(grupoSelect, grupoError, "Selecciona un grupo.");
      valid = false;
    } else {
      clearFieldError(grupoSelect, grupoError);
    }
    return valid;
  }

  /* ── Abrir / cerrar modal ──────────────────────────────────── */
  function resetForm() {
    form.reset();
    populateGrupos(null);
    fotoDataUrl = null;
    fotoPreview.innerHTML = '<span class="material-symbols-outlined">person</span>';
    qrPreviewRow.hidden = true;
    previewMatricula = null;
    hideBanner();
    clearFieldError(nombreInput, nombreError);
    clearFieldError(gradoSelect, gradoError);
    clearFieldError(grupoSelect, grupoError);
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

  /* ── Envío del formulario ──────────────────────────────────── */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideBanner();
    if (!validate()) {
      showBanner("Revisa los campos marcados antes de continuar.", true);
      return;
    }

    submitBtn.disabled = true;
    var matricula = getNextMatricula();
    var codigo_qr = "ISQR-2026-" + String(matricula).slice(-4);

    var student = {
      matricula: matricula,
      nombre: nombreInput.value.trim(),
      grado: gradoSelect.value,
      grupo: Number(grupoSelect.value),
      codigo_qr: codigo_qr,
      estado: "Activo",
      asistencia: 100,
      foto: fotoDataUrl || null
    };

    saveStudent(student);

    showBanner(
      "Estudiante agregado: " + student.nombre + " (matrícula #" + matricula + ", QR " + codigo_qr + "). Ya aparece en la página de Estudiantes.",
      false
    );

    window.setTimeout(function () {
      closeModal();
    }, 1800);
  });
})();
