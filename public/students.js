/* ============================================================
   students.js
   Modela la tabla `estudiantes` (matricula, nombre, id_grupo -> 
   grado/grupo, codigo_qr) de la base de datos MySQL adjunta y
   agrega búsqueda, filtros y paginación 100% funcionales sobre
   esos datos en el cliente.
   ============================================================ */
(function () {
  "use strict";

  /* ── Datos de ejemplo con la misma forma que las tablas
     `estudiantes` + `grupos` + `grados` de lefolde.sql ────────── */
  var STUDENTS = [
    { matricula: 100823, nombre: "Mariana Gómez",        grado: "11", grupo: 2, codigo_qr: "ISQR-2024-8842", estado: "Activo",     asistencia: 96 },
    { matricula: 100824, nombre: "Santiago Restrepo",    grado: "11", grupo: 1, codigo_qr: "ISQR-2024-1105", estado: "En Prueba",  asistencia: 78 },
    { matricula: 100825, nombre: "Valentina Ortiz",      grado: "10", grupo: 2, codigo_qr: "ISQR-2024-9221", estado: "Activo",     asistencia: 98 },
    { matricula: 100826, nombre: "Juan Pablo Cardona",   grado: "10", grupo: 1, codigo_qr: "ISQR-2024-4412", estado: "Suspendido", asistencia: 54 },
    { matricula: 100827, nombre: "Isabella Zapata",      grado: "9",  grupo: 3, codigo_qr: "ISQR-2024-3301", estado: "Activo",     asistencia: 93 },
    { matricula: 100828, nombre: "Samuel Vélez",         grado: "9",  grupo: 1, codigo_qr: "ISQR-2024-3302", estado: "Activo",     asistencia: 90 },
    { matricula: 100829, nombre: "Mariana Higuita",      grado: "9",  grupo: 2, codigo_qr: "ISQR-2024-3303", estado: "En Prueba",  asistencia: 74 },
    { matricula: 100830, nombre: "Andrés Puerta",        grado: "8",  grupo: 1, codigo_qr: "ISQR-2024-2201", estado: "Activo",     asistencia: 95 },
    { matricula: 100831, nombre: "Salomé Correa",        grado: "8",  grupo: 2, codigo_qr: "ISQR-2024-2202", estado: "Activo",     asistencia: 99 },
    { matricula: 100832, nombre: "Tomás Bedoya",         grado: "8",  grupo: 3, codigo_qr: "ISQR-2024-2203", estado: "Suspendido", asistencia: 48 },
    { matricula: 100833, nombre: "Luciana Arboleda",     grado: "7",  grupo: 1, codigo_qr: "ISQR-2024-1101", estado: "Activo",     asistencia: 92 },
    { matricula: 100834, nombre: "Emmanuel Ríos",        grado: "7",  grupo: 2, codigo_qr: "ISQR-2024-1102", estado: "En Prueba",  asistencia: 80 },
    { matricula: 100835, nombre: "Gabriela Muñoz",       grado: "7",  grupo: 3, codigo_qr: "ISQR-2024-1103", estado: "Activo",     asistencia: 97 },
    { matricula: 100836, nombre: "Nicolás Escobar",      grado: "6",  grupo: 1, codigo_qr: "ISQR-2024-0601", estado: "Activo",     asistencia: 91 },
    { matricula: 100837, nombre: "Sara Montoya",         grado: "6",  grupo: 2, codigo_qr: "ISQR-2024-0602", estado: "Activo",     asistencia: 94 },
    { matricula: 100838, nombre: "David Osorio",         grado: "6",  grupo: 3, codigo_qr: "ISQR-2024-0603", estado: "En Prueba",  asistencia: 71 },
    { matricula: 100839, nombre: "Antonella Giraldo",    grado: "11", grupo: 1, codigo_qr: "ISQR-2024-8843", estado: "Activo",     asistencia: 99 },
    { matricula: 100840, nombre: "Simón Palacio",        grado: "11", grupo: 2, codigo_qr: "ISQR-2024-8844", estado: "Suspendido", asistencia: 52 },
    { matricula: 100841, nombre: "Valeria Loaiza",       grado: "10", grupo: 1, codigo_qr: "ISQR-2024-4413", estado: "Activo",     asistencia: 96 },
    { matricula: 100842, nombre: "Esteban Marín",        grado: "10", grupo: 2, codigo_qr: "ISQR-2024-4414", estado: "En Prueba",  asistencia: 76 },
    { matricula: 100843, nombre: "Manuela Ospina",       grado: "9",  grupo: 3, codigo_qr: "ISQR-2024-3304", estado: "Activo",     asistencia: 90 },
    { matricula: 100844, nombre: "Jerónimo Villa",       grado: "8",  grupo: 1, codigo_qr: "ISQR-2024-2204", estado: "Activo",     asistencia: 88 }
  ];

  /* ── Combinar con estudiantes agregados desde Administrador ──
     (guardados en localStorage por admin-students.js; en un
     backend real esto sería una consulta a la tabla `estudiantes`) */
  (function mergeNewStudents() {
    var added = [];
    try {
      added = JSON.parse(localStorage.getItem("ingreso-seguro-nuevos-estudiantes")) || [];
    } catch (e) { added = []; }
    added.forEach(function (s) {
      if (!STUDENTS.some(function (existing) { return existing.matricula === s.matricula; })) {
        STUDENTS.push(s);
      }
    });
  })();

  /* ── Aplicar ediciones guardadas desde el menú de Acciones ─── */
  (function applyEdits() {
    var edits = {};
    try {
      edits = JSON.parse(localStorage.getItem("ingreso-seguro-estudiantes-editados")) || {};
    } catch (e) { edits = {}; }
    STUDENTS.forEach(function (s) {
      var edit = edits[s.matricula];
      if (edit) Object.assign(s, edit);
    });
  })();

  /* ── Quitar estudiantes borrados desde el menú de Acciones ──── */
  (function removeDeleted() {
    var deleted = [];
    try {
      deleted = JSON.parse(localStorage.getItem("ingreso-seguro-estudiantes-borrados")) || [];
    } catch (e) { deleted = []; }
    if (deleted.length) {
      STUDENTS = STUDENTS.filter(function (s) { return deleted.indexOf(s.matricula) === -1; });
    }
  })();

  var PAGE_SIZE = 4;
  var currentPage = 1;
  var filtered = STUDENTS.slice();

  var tbody = document.getElementById("students-tbody");
  var paginationInfo = document.getElementById("pagination-info");
  var paginationControls = document.getElementById("pagination-controls");
  var filtersPanel = document.getElementById("filters-panel");
  var toggleFiltersBtn = document.getElementById("toggle-filters-btn");
  var clearFiltersBtn = document.getElementById("clear-filters-btn");
  var searchInput = document.getElementById("filter-search");
  var gradoSelect = document.getElementById("filter-grado");
  var estadoSelect = document.getElementById("filter-estado");
  var filtersCount = document.getElementById("filters-count");

  var statTotal = document.getElementById("stat-total");
  var statAttendance = document.getElementById("stat-attendance");
  var statHonor = document.getElementById("stat-honor");
  var statRisk = document.getElementById("stat-risk");

  if (!tbody) return; /* esta página no es students.html */

  /* ── Poblar el filtro de grados dinámicamente ─────────────── */
  var grados = Array.from(new Set(STUDENTS.map(function (s) { return s.grado; })))
    .sort(function (a, b) { return Number(a) - Number(b); });
  grados.forEach(function (g) {
    var opt = document.createElement("option");
    opt.value = g;
    opt.textContent = "Grado " + g;
    gradoSelect.appendChild(opt);
  });

  function initials(name) {
    return name.split(" ").filter(Boolean).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase();
  }

  function badgeClass(estado) {
    if (estado === "Activo") return "badge-active";
    if (estado === "En Prueba") return "badge-probation";
    return "badge-suspended";
  }

  function attendanceTone(pct) {
    if (pct >= 90) return "secondary";
    if (pct >= 70) return "tertiary";
    return "error";
  }

  /* ── Estadísticas globales (sobre el total, no el filtro) ─── */
  function renderStats() {
    var total = STUDENTS.length;
    var avg = Math.round(STUDENTS.reduce(function (a, s) { return a + s.asistencia; }, 0) / total);
    var honor = STUDENTS.filter(function (s) { return s.asistencia >= 95; }).length;
    var risk = STUDENTS.filter(function (s) { return s.asistencia < 70 || s.estado === "Suspendido"; }).length;

    statTotal.textContent = total.toLocaleString("es-CO");
    statAttendance.textContent = avg + "%";
    statHonor.textContent = honor;
    statRisk.textContent = risk;
  }

  /* ── Render de la tabla según filtros + página actual ─────── */
  function renderTable() {
    tbody.innerHTML = "";

    if (filtered.length === 0) {
      var trEmpty = document.createElement("tr");
      trEmpty.innerHTML = '<td colspan="6" class="students-empty">No se encontraron estudiantes con esos filtros.</td>';
      tbody.appendChild(trEmpty);
      paginationInfo.textContent = "0 resultados";
      paginationControls.innerHTML = "";
      return;
    }

    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    pageItems.forEach(function (s) {
      var tr = document.createElement("tr");

      var tdStudent = document.createElement("td");
      var avatarInner = s.foto
        ? '<img src="' + s.foto + '" alt="" />'
        : '<div class="avatar-placeholder">' + initials(s.nombre) + "</div>";
      tdStudent.innerHTML =
        '<div class="student-cell">' +
        '<div class="student-avatar">' + avatarInner + "</div>" +
        "<div><p class=\"student-name\">" + s.nombre + "</p>" +
        '<p class="student-email">QR: ' + s.codigo_qr + "</p></div></div>";
      tr.appendChild(tdStudent);

      var tdMatricula = document.createElement("td");
      tdMatricula.className = "td-id";
      tdMatricula.textContent = "#" + s.matricula;
      tr.appendChild(tdMatricula);

      var tdGrado = document.createElement("td");
      tdGrado.className = "td-major";
      tdGrado.textContent = "Grado " + s.grado + " · Grupo " + s.grupo;
      tr.appendChild(tdGrado);

      var tdEstado = document.createElement("td");
      tdEstado.innerHTML = '<span class="badge ' + badgeClass(s.estado) + '">' + s.estado + "</span>";
      tr.appendChild(tdEstado);

      var tdAsistencia = document.createElement("td");
      var tone = attendanceTone(s.asistencia);
      tdAsistencia.innerHTML =
        '<div class="gpa-cell"><div class="gpa-track"><div class="gpa-fill ' + tone + '" style="width:' + s.asistencia + '%"></div></div>' +
        '<span class="gpa-label ' + tone + '">' + s.asistencia + "%</span></div>";
      tr.appendChild(tdAsistencia);

      var tdAction = document.createElement("td");
      tdAction.innerHTML =
        '<div class="row-actions">' +
        '<button class="action-btn" data-open-menu="' + s.matricula + '"><span class="material-symbols-outlined">more_vert</span></button>' +
        '<div class="row-actions-menu" id="menu-' + s.matricula + '" hidden>' +
        '<button data-action="qr" data-matricula="' + s.matricula + '"><span class="material-symbols-outlined">qr_code_2</span>Ver código QR</button>' +
        '<button data-action="edit" data-matricula="' + s.matricula + '"><span class="material-symbols-outlined">edit</span>Editar información</button>' +
        '<button class="danger" data-action="delete" data-matricula="' + s.matricula + '"><span class="material-symbols-outlined">delete</span>Borrar estudiante</button>' +
        "</div></div>";
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    var shownFrom = start + 1;
    var shownTo = Math.min(start + PAGE_SIZE, filtered.length);
    paginationInfo.textContent = "Mostrando " + shownFrom + "–" + shownTo + " de " + filtered.length + " estudiantes";

    renderPaginationControls(totalPages);
  }

  function renderPaginationControls(totalPages) {
    paginationControls.innerHTML = "";

    var prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">chevron_left</span>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", function () { goToPage(currentPage - 1); });
    paginationControls.appendChild(prevBtn);

    for (var p = 1; p <= totalPages; p++) {
      (function (page) {
        var btn = document.createElement("button");
        btn.className = "page-btn" + (page === currentPage ? " active" : "");
        btn.textContent = page;
        btn.addEventListener("click", function () { goToPage(page); });
        paginationControls.appendChild(btn);
      })(p);
    }

    var nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">chevron_right</span>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener("click", function () { goToPage(currentPage + 1); });
    paginationControls.appendChild(nextBtn);
  }

  function goToPage(page) {
    currentPage = page;
    renderTable();
    document.querySelector(".table-wrapper").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ── Filtros (búsqueda + grado + estado) ──────────────────── */
  function applyFilters() {
    var q = searchInput.value.trim().toLowerCase();
    var grado = gradoSelect.value;
    var estado = estadoSelect.value;

    filtered = STUDENTS.filter(function (s) {
      var matchesQuery = !q ||
        s.nombre.toLowerCase().includes(q) ||
        String(s.matricula).includes(q) ||
        s.codigo_qr.toLowerCase().includes(q);
      var matchesGrado = !grado || s.grado === grado;
      var matchesEstado = !estado || s.estado === estado;
      return matchesQuery && matchesGrado && matchesEstado;
    });

    currentPage = 1;
    filtersCount.textContent = filtered.length + " de " + STUDENTS.length + " estudiantes coinciden con el filtro actual.";
    renderTable();
  }

  toggleFiltersBtn.addEventListener("click", function () {
    var isHidden = filtersPanel.hidden;
    filtersPanel.hidden = !isHidden;
    toggleFiltersBtn.setAttribute("aria-expanded", String(isHidden));
  });

  clearFiltersBtn.addEventListener("click", function () {
    searchInput.value = "";
    gradoSelect.value = "";
    estadoSelect.value = "";
    applyFilters();
  });

  searchInput.addEventListener("input", applyFilters);
  gradoSelect.addEventListener("change", applyFilters);
  estadoSelect.addEventListener("change", applyFilters);

  renderStats();
  applyFilters();

  /* ============================================================
     MENÚ DE ACCIONES POR FILA (ver QR / editar / borrar)
     ============================================================ */
  function closeAllMenus() {
    document.querySelectorAll(".row-actions-menu").forEach(function (m) { m.hidden = true; });
  }

  tbody.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-menu]");
    if (openBtn) {
      var matricula = openBtn.getAttribute("data-open-menu");
      var menu = document.getElementById("menu-" + matricula);
      var wasHidden = menu.hidden;
      closeAllMenus();
      menu.hidden = !wasHidden;
      return;
    }

    var actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      var action = actionBtn.getAttribute("data-action");
      var m = Number(actionBtn.getAttribute("data-matricula"));
      var student = STUDENTS.find(function (s) { return s.matricula === m; });
      closeAllMenus();
      if (!student) return;
      if (action === "qr") openQrModal(student);
      if (action === "edit") openEditModal(student);
      if (action === "delete") deleteStudent(student);
    }
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".row-actions")) closeAllMenus();
  });

  /* ── Ver código QR ─────────────────────────────────────────── */
  var qrOverlay = document.getElementById("qr-view-overlay");
  var qrCanvas = document.getElementById("qr-view-canvas");
  var qrName = document.getElementById("qr-view-name");
  var qrMeta = document.getElementById("qr-view-meta");
  var qrDownloadBtn = document.getElementById("qr-view-download");
  var qrCloseBtn = document.getElementById("qr-view-close");
  var currentQrStudent = null;

  function openQrModal(student) {
    currentQrStudent = student;
    qrName.textContent = student.nombre;
    qrMeta.textContent = "Matrícula #" + student.matricula + " · " + student.codigo_qr;
    /* eslint-disable no-undef */
    new QRious({ element: qrCanvas, value: String(student.codigo_qr), size: 220, background: "#fff", foreground: "#0f172a" });
    qrOverlay.hidden = false;
  }
  qrCloseBtn.addEventListener("click", function () { qrOverlay.hidden = true; });
  qrOverlay.addEventListener("click", function (e) { if (e.target === qrOverlay) qrOverlay.hidden = true; });
  qrDownloadBtn.addEventListener("click", function () {
    if (!currentQrStudent) return;
    var link = document.createElement("a");
    link.download = "qr-" + currentQrStudent.matricula + ".png";
    link.href = qrCanvas.toDataURL("image/png");
    link.click();
  });

  /* ── Editar información ────────────────────────────────────── */
  var editOverlay = document.getElementById("edit-student-overlay");
  var editForm = document.getElementById("edit-student-form");
  var editClose = document.getElementById("edit-student-close");
  var editCancel = document.getElementById("edit-student-cancel");
  var editMatriculaInput = document.getElementById("edit-student-matricula");
  var editNombreInput = document.getElementById("edit-student-nombre");
  var editNombreError = document.getElementById("edit-nombre-error");
  var editGradoSelect = document.getElementById("edit-student-grado");
  var editGrupoSelect = document.getElementById("edit-student-grupo");
  var editEstadoSelect = document.getElementById("edit-student-estado");
  var editBanner = document.getElementById("edit-student-banner");

  function openEditModal(student) {
    editMatriculaInput.value = student.matricula;
    editNombreInput.value = student.nombre;
    editGradoSelect.value = student.grado;
    editGrupoSelect.value = String(student.grupo);
    editEstadoSelect.value = student.estado;
    editBanner.hidden = true;
    editNombreInput.closest(".field").classList.remove("has-error");
    editNombreError.hidden = true;
    editOverlay.hidden = false;
  }
  function closeEditModal() { editOverlay.hidden = true; }
  editClose.addEventListener("click", closeEditModal);
  editCancel.addEventListener("click", closeEditModal);
  editOverlay.addEventListener("click", function (e) { if (e.target === editOverlay) closeEditModal(); });

  function saveEdit(matricula, fields) {
    var edits = {};
    try { edits = JSON.parse(localStorage.getItem("ingreso-seguro-estudiantes-editados")) || {}; } catch (e) { edits = {}; }
    edits[matricula] = Object.assign(edits[matricula] || {}, fields);
    try { localStorage.setItem("ingreso-seguro-estudiantes-editados", JSON.stringify(edits)); } catch (e) { /* no-op */ }
  }

  editForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = editNombreInput.value.trim();
    if (!nombre) {
      editNombreInput.closest(".field").classList.add("has-error");
      editNombreError.textContent = "El nombre no puede quedar vacío.";
      editNombreError.hidden = false;
      return;
    }

    var matricula = Number(editMatriculaInput.value);
    var fields = {
      nombre: nombre,
      grado: editGradoSelect.value,
      grupo: Number(editGrupoSelect.value),
      estado: editEstadoSelect.value
    };

    var student = STUDENTS.find(function (s) { return s.matricula === matricula; });
    if (student) Object.assign(student, fields);
    saveEdit(matricula, fields);

    editBanner.hidden = false;
    editBanner.classList.remove("is-error");
    editBanner.textContent = "Cambios guardados correctamente.";

    renderStats();
    applyFilters();

    window.setTimeout(closeEditModal, 900);
  });

  /* ── Borrar estudiante ─────────────────────────────────────── */
  function deleteStudent(student) {
    var confirmado = window.confirm(
      "¿Seguro que quieres borrar a " + student.nombre + " (matrícula #" + student.matricula + ")? Esta acción no se puede deshacer."
    );
    if (!confirmado) return;

    STUDENTS = STUDENTS.filter(function (s) { return s.matricula !== student.matricula; });

    var deleted = [];
    try { deleted = JSON.parse(localStorage.getItem("ingreso-seguro-estudiantes-borrados")) || []; } catch (e) { deleted = []; }
    if (deleted.indexOf(student.matricula) === -1) deleted.push(student.matricula);
    try { localStorage.setItem("ingreso-seguro-estudiantes-borrados", JSON.stringify(deleted)); } catch (e) { /* no-op */ }

    renderStats();
    applyFilters();
  }
})();
