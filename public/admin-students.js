/* ============================================================
   admin-students.js
   Da funcionalidad real al botón "Agregar Estudiante" del panel
   de Administrador. La matrícula NO se genera: es la que el colegio
   ya asignó y se toma de la base de datos. Al escribirla, el
   formulario consulta la BD (GET /admin/estudiantes/consulta/:m):
     - si ya existe, autocompleta nombre, grado y grupo reales y
       bloquea esos campos;
     - si no existe, permite registrarla como matrícula nueva.
   El código QR propio del estudiante lo define el servidor (único
   por estudiante) y aquí solo se dibuja la vista previa con QRious.
   ============================================================ */
(function () {
  "use strict";

  var GRUPOS_POR_GRADO = 3; /* mismo esquema usado en students.js */

  var openBtn = document.getElementById("add-student-btn");
  var overlay = document.getElementById("add-student-overlay");
  if (!openBtn || !overlay) return; /* esta página no es admin.html */

  var closeBtn = document.getElementById("add-student-close");
  var cancelBtn = document.getElementById("add-student-cancel");
  var form = document.getElementById("add-student-form");
  var banner = document.getElementById("add-student-banner");

  var matriculaInput = document.getElementById("student-matricula");
  var matriculaError = document.getElementById("student-matricula-error");
  var matriculaHint = document.getElementById("student-matricula-hint");
  var nombreInput = document.getElementById("student-nombre");
  var nombreError = document.getElementById("student-nombre-error");
  var gradoSelect = document.getElementById("student-grado");
  var gradoError = document.getElementById("student-grado-error");
  var grupoSelect = document.getElementById("student-grupo");
  var grupoError = document.getElementById("student-grupo-error");

  var fotoInput = document.getElementById("student-foto");
  var fotoPreview = document.getElementById("student-photo-preview");
  var fotoDataUrl = null;
  var FOTO_MAX_BYTES = 5 * 1024 * 1024; /* el servidor acepta JSON de hasta 8 MB (base64) */

  var lookupTimer = null;
  var lookupSeq = 0;      /* descarta respuestas viejas si el usuario sigue escribiendo */
  var autofilled = false; /* true si nombre/grado/grupo vinieron de la BD */

  var qrPreviewRow = document.getElementById("qr-preview-row");
  var qrPreviewValue = document.getElementById("qr-preview-value");
  var qrPreviewLabel = document.getElementById("qr-preview-label");
  var qrPreviewCanvas = document.getElementById("qr-preview-canvas");
  var submitBtn = document.getElementById("add-student-submit");

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
    clearFieldError(gradoSelect, gradoError);
  });
  grupoSelect.addEventListener("change", function () {
    clearFieldError(grupoSelect, grupoError);
  });
  nombreInput.addEventListener("input", function () {
    clearFieldError(nombreInput, nombreError);
  });
  matriculaInput.addEventListener("input", function () {
    /* solo dígitos: la matrícula es un número entero */
    var limpio = matriculaInput.value.replace(/\D/g, "");
    if (limpio !== matriculaInput.value) matriculaInput.value = limpio;
    clearFieldError(matriculaInput, matriculaError);
    scheduleLookup();
  });

  /* ── Campos bloqueados cuando los datos vienen de la BD ───── */
  function setLocked(locked) {
    nombreInput.readOnly = locked;
    gradoSelect.disabled = locked;
    grupoSelect.disabled = locked;
  }

  function ensureOption(select, value, label) {
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value) return;
    }
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }

  function clearAutofill() {
    if (!autofilled) return;
    autofilled = false;
    setLocked(false);
    nombreInput.value = "";
    gradoSelect.value = "";
    populateGrupos(null);
  }

  function showHint(text, found) {
    if (!text) { matriculaHint.hidden = true; matriculaHint.textContent = ""; return; }
    matriculaHint.textContent = text;
    matriculaHint.classList.toggle("is-found", !!found);
    matriculaHint.hidden = false;
  }

  /* ── Vista previa del QR (el código lo define el servidor) ── */
  function showQr(codigo, yaRegistrado) {
    qrPreviewValue.textContent = codigo;
    qrPreviewLabel.textContent = yaRegistrado
      ? "Código QR del estudiante (ya registrado en la base de datos)"
      : "Código QR propio del estudiante (se guarda al registrarlo)";
    /* eslint-disable no-undef */
    new QRious({ element: qrPreviewCanvas, value: codigo, size: 60, background: "#fff", foreground: "#0f172a", padding: 2 });
    qrPreviewRow.hidden = false;
  }

  function scheduleLookup() {
    window.clearTimeout(lookupTimer);
    lookupSeq++;
    clearAutofill();
    showHint("");
    qrPreviewRow.hidden = true;
    var matricula = matriculaInput.value.trim();
    if (!matricula || Number(matricula) <= 0) return;
    lookupTimer = window.setTimeout(function () { lookupMatricula(matricula); }, 350);
  }

  /* Consulta la BD: ¿ya existe esta matrícula? Si sí, trae sus datos. */
  function lookupMatricula(matricula) {
    var seq = ++lookupSeq;
    showHint("Consultando la base de datos…", false);
    fetch("/admin/estudiantes/consulta/" + encodeURIComponent(matricula))
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, body: data }; });
      })
      .then(function (result) {
        if (seq !== lookupSeq) return; /* llegó tarde: el usuario ya cambió la matrícula */
        if (!result.body || !result.body.ok) {
          showHint((result.body && result.body.mensaje) || "No se pudo consultar la base de datos.", false);
          return;
        }
        var d = result.body;
        if (d.existe && d.estudiante) {
          var e = d.estudiante;
          autofilled = true;
          nombreInput.value = e.nombre;
          ensureOption(gradoSelect, String(e.grado), "Grado " + e.grado);
          gradoSelect.value = String(e.grado);
          populateGrupos(String(e.grado));
          ensureOption(grupoSelect, String(e.grupo), "Grupo " + e.grupo + " (" + e.grado + "-" + e.grupo + ")");
          grupoSelect.value = String(e.grupo);
          setLocked(true);
          clearFieldError(nombreInput, nombreError);
          clearFieldError(gradoSelect, gradoError);
          clearFieldError(grupoSelect, grupoError);
          showHint("Matrícula encontrada en la base de datos: se usarán sus datos registrados.", true);
          showQr(d.codigo_qr, !!(d.estudiante.codigo_qr && String(d.estudiante.codigo_qr).trim()));
        } else {
          showHint("Matrícula nueva: no está en la base de datos todavía, se registrará con los datos que ingreses.", false);
          showQr(d.codigo_qr, false);
        }
      })
      .catch(function (err) {
        if (seq !== lookupSeq) return;
        console.warn("No se pudo consultar la matrícula:", err);
        showHint("No se pudo consultar la base de datos. Intenta de nuevo.", false);
      });
  }

  /* ── Foto opcional ─────────────────────────────────────────── */
  fotoInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > FOTO_MAX_BYTES) {
      showBanner("La foto pesa más de 5 MB. Elige una imagen más liviana.", true);
      fotoInput.value = "";
      return;
    }
    hideBanner();
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
    if (!/^\d{1,10}$/.test(matriculaInput.value.trim()) || Number(matriculaInput.value) <= 0 || Number(matriculaInput.value) > 2147483647) {
      setFieldError(matriculaInput, matriculaError, "Ingresa la matrícula asignada por el colegio (solo números).");
      valid = false;
    } else {
      clearFieldError(matriculaInput, matriculaError);
    }
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
    window.clearTimeout(lookupTimer);
    lookupSeq++;
    autofilled = false;
    setLocked(false);
    showHint("");
    fotoDataUrl = null;
    fotoPreview.innerHTML = '<span class="material-symbols-outlined">person</span>';
    qrPreviewRow.hidden = true;
    hideBanner();
    clearFieldError(matriculaInput, matriculaError);
    clearFieldError(nombreInput, nombreError);
    clearFieldError(gradoSelect, gradoError);
    clearFieldError(grupoSelect, grupoError);
    submitBtn.disabled = false;
  }

  function openModal() {
    resetForm();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    matriculaInput.focus();
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
    showBanner("Guardando estudiante…", false);

    var payload = {
      matricula: matriculaInput.value.trim(),
      nombre: nombreInput.value.trim(),
      grado: gradoSelect.value,
      grupo: grupoSelect.value,
      foto: fotoDataUrl || ""
    };

    fetch("/admin/estudiantes", {
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
          var mensaje = (result.body && result.body.mensaje) || "No se pudo guardar el estudiante en la base de datos.";
          showBanner(mensaje, true);
          submitBtn.disabled = false;
          return;
        }

        var e = result.body.estudiante;

        showQr(e.codigo_qr, true);
        showBanner(
          (result.body.existente
            ? "Matrícula tomada de la base de datos: "
            : "Estudiante agregado: ") +
            e.nombre + " (matrícula #" + e.matricula + ", QR " + e.codigo_qr + ").",
          false
        );

        // students.js expone este gancho para recargar la tabla desde
        // la base de datos (ya no desde localStorage).
        if (typeof window.refreshStudentsTable === "function") {
          window.refreshStudentsTable();
        }

        window.setTimeout(function () {
          closeModal();
        }, 1500);
      })
      .catch(function (err) {
        console.warn("No se pudo conectar con el servidor:", err);
        showBanner("Error de conexión con el servidor. Intenta de nuevo.", true);
        submitBtn.disabled = false;
      });
  });
})();
