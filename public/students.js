/* ============================================================
   students.js
   Lee la tabla `estudiantes` (con su grado y grupo resueltos)
   directamente desde la base de datos vía GET /estudiantes, y
   agrega búsqueda, filtros y paginación 100% funcionales sobre
   esos datos en el cliente. Editar y Borrar solo se ofrecen si
   window.IS_ADMIN es true (lo define admin.ejs / usuario.ejs);
   el servidor también exige rol Administrador para esas rutas,
   así que ocultarlas aquí es solo para no confundir a un usuario
   sin esos permisos, no la única barrera.
   ============================================================ */
(function () {
  "use strict";

  var IS_ADMIN = window.IS_ADMIN === true;

  var STUDENTS = [];
  var PAGE_SIZE = 4;
  var currentPage = 1;
  var filtered = [];

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

  if (!tbody) return; /* esta página no tiene la tabla de estudiantes */

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

  /* ── Poblar el filtro de grados según lo que haya en la BD ─── */
  function populateGradoFilter() {
    var seleccionActual = gradoSelect.value;
    gradoSelect.querySelectorAll("option[data-dynamic]").forEach(function (opt) { opt.remove(); });
    var grados = Array.from(new Set(STUDENTS.map(function (s) { return s.grado; })))
      .sort(function (a, b) { return Number(a) - Number(b); });
    grados.forEach(function (g) {
      var opt = document.createElement("option");
      opt.value = g;
      opt.textContent = "Grado " + g;
      opt.setAttribute("data-dynamic", "1");
      gradoSelect.appendChild(opt);
    });
    if (grados.indexOf(seleccionActual) !== -1) gradoSelect.value = seleccionActual;
  }

  /* ── Estadísticas globales (sobre el total, no el filtro) ─── */
  function renderStats() {
    var total = STUDENTS.length;
    var avg = total ? Math.round(STUDENTS.reduce(function (a, s) { return a + s.asistencia; }, 0) / total) : 0;
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
        "</div>";
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

  /* ── Cargar estudiantes desde la base de datos ────────────── */
  function loadStudents() {
    tbody.innerHTML = '<tr><td colspan="6" class="students-empty">Cargando estudiantes…</td></tr>';
    paginationInfo.textContent = "";
    paginationControls.innerHTML = "";

    fetch("/estudiantes")
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, body: data }; });
      })
      .then(function (result) {
        if (!result.body || !result.body.ok) {
          tbody.innerHTML = '<tr><td colspan="6" class="students-empty">No se pudo cargar la lista de estudiantes.</td></tr>';
          return;
        }

        STUDENTS = result.body.estudiantes.map(function (s) {
          return {
            matricula: s.matricula,
            nombre: s.nombre,
            grado: String(s.grado),
            grupo: Number(s.grupo),
            codigo_qr: s.codigo_qr,
            estado: s.estado || "Activo",
            asistencia: Number(s.asistencia) || 0
          };
        });

        populateGradoFilter();
        renderStats();
        applyFilters();
      })
      .catch(function (err) {
        console.warn("No se pudo conectar con el servidor:", err);
        tbody.innerHTML = '<tr><td colspan="6" class="students-empty">Error de conexión con el servidor.</td></tr>';
      });
  }

  /* admin-students.js llama a esto después de crear un estudiante,
     para que la tabla se refresque con lo que ya quedó en la BD. */
  window.refreshStudentsTable = loadStudents;

  loadStudents();

  /* ============================================================
     MENÚ DE ACCIONES POR FILA (ver QR / editar / borrar)

     Un solo menú compartido, agregado a document.body y
     posicionado con position:fixed calculado en JS. Así se evita
     que .table-wrapper (overflow:hidden) o .table-scroll
     (overflow-x:auto) lo recorten o lo vuelvan invisible.
     "Editar información" y "Borrar estudiante" solo se agregan si
     IS_ADMIN — un usuario común solo puede ver el QR.
     ============================================================ */
  var rowMenu = document.createElement("div");
  rowMenu.className = "row-actions-menu";
  rowMenu.id = "row-actions-menu";
  rowMenu.hidden = true;
  var menuButtonsHtml =
    '<button data-action="qr"><span class="material-symbols-outlined">qr_code_2</span>Ver código QR</button>';
  if (IS_ADMIN) {
    menuButtonsHtml +=
      '<button data-action="edit"><span class="material-symbols-outlined">edit</span>Editar información</button>' +
      '<button class="danger" data-action="delete"><span class="material-symbols-outlined">delete</span>Borrar estudiante</button>';
  }
  rowMenu.innerHTML = menuButtonsHtml;
  document.body.appendChild(rowMenu);

  var openMenuMatricula = null;

  function closeAllMenus() {
    rowMenu.hidden = true;
    openMenuMatricula = null;
  }

  function openMenuFor(btn, matricula) {
    openMenuMatricula = matricula;
    rowMenu.hidden = false;

    var rect = btn.getBoundingClientRect();
    var menuWidth = rowMenu.offsetWidth || 190;
    var left = rect.right - menuWidth;
    if (left < 8) left = 8;
    var top = rect.bottom + 4;
    var maxTop = window.innerHeight - rowMenu.offsetHeight - 8;
    if (top > maxTop) top = Math.max(8, rect.top - rowMenu.offsetHeight - 4); /* abre hacia arriba si no cabe abajo */

    rowMenu.style.left = left + "px";
    rowMenu.style.top = top + "px";
  }

  tbody.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-open-menu]");
    if (openBtn) {
      var matricula = Number(openBtn.getAttribute("data-open-menu"));
      var wasOpenForThisRow = !rowMenu.hidden && openMenuMatricula === matricula;
      closeAllMenus();
      if (!wasOpenForThisRow) openMenuFor(openBtn, matricula);
      return;
    }
  });

  rowMenu.addEventListener("click", function (e) {
    var actionBtn = e.target.closest("[data-action]");
    if (!actionBtn) return;
    var action = actionBtn.getAttribute("data-action");
    var student = STUDENTS.find(function (s) { return s.matricula === openMenuMatricula; });
    closeAllMenus();
    if (!student) return;
    if (action === "qr") openQrModal(student);
    if (action === "edit" && IS_ADMIN) openEditModal(student);
    if (action === "delete" && IS_ADMIN) deleteStudent(student);
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".row-actions") && !e.target.closest(".row-actions-menu")) closeAllMenus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllMenus();
  });
  /* Captura: los contenedores con scroll (como .table-scroll) no
     burbujean su evento "scroll", así que se escucha en captura
     para no dejar el menú flotando en una posición vieja. */
  window.addEventListener("scroll", closeAllMenus, true);
  window.addEventListener("resize", closeAllMenus);

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

  if (!IS_ADMIN) return; /* lo de abajo (editar/borrar) es solo para Administrador */

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
  var editSubmitBtn = editForm.querySelector('button[type="submit"]');

  function openEditModal(student) {
    editMatriculaInput.value = student.matricula;
    editNombreInput.value = student.nombre;
    editGradoSelect.value = student.grado;
    editGrupoSelect.value = String(student.grupo);
    editEstadoSelect.value = student.estado;
    editBanner.hidden = true;
    editNombreInput.closest(".field").classList.remove("has-error");
    editNombreError.hidden = true;
    if (editSubmitBtn) editSubmitBtn.disabled = false;
    editOverlay.hidden = false;
  }
  function closeEditModal() { editOverlay.hidden = true; }
  editClose.addEventListener("click", closeEditModal);
  editCancel.addEventListener("click", closeEditModal);
  editOverlay.addEventListener("click", function (e) { if (e.target === editOverlay) closeEditModal(); });

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
    var payload = {
      nombre: nombre,
      grado: editGradoSelect.value,
      grupo: editGrupoSelect.value,
      estado: editEstadoSelect.value
    };

    if (editSubmitBtn) editSubmitBtn.disabled = true;
    editBanner.hidden = false;
    editBanner.classList.remove("is-error");
    editBanner.textContent = "Guardando cambios…";

    fetch("/admin/estudiantes/" + encodeURIComponent(matricula), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, body: data }; });
      })
      .then(function (result) {
        if (!result.body || !result.body.ok) {
          var mensaje = (result.body && result.body.mensaje) || "No se pudo actualizar el estudiante.";
          editBanner.classList.add("is-error");
          editBanner.textContent = mensaje;
          if (editSubmitBtn) editSubmitBtn.disabled = false;
          return;
        }

        editBanner.textContent = "Cambios guardados correctamente.";
        loadStudents();
        window.setTimeout(closeEditModal, 900);
      })
      .catch(function (err) {
        console.warn("No se pudo conectar con el servidor:", err);
        editBanner.classList.add("is-error");
        editBanner.textContent = "Error de conexión con el servidor. Intenta de nuevo.";
        if (editSubmitBtn) editSubmitBtn.disabled = false;
      });
  });

  /* ── Borrar estudiante ─────────────────────────────────────── */
  function deleteStudent(student) {
    var confirmado = window.confirm(
      "¿Seguro que quieres borrar a " + student.nombre + " (matrícula #" + student.matricula + ")? Esta acción no se puede deshacer."
    );
    if (!confirmado) return;

    fetch("/admin/estudiantes/" + encodeURIComponent(student.matricula), { method: "DELETE" })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, body: data }; });
      })
      .then(function (result) {
        if (!result.body || !result.body.ok) {
          var mensaje = (result.body && result.body.mensaje) || "No se pudo borrar el estudiante.";
          alert(mensaje);
          return;
        }
        loadStudents();
      })
      .catch(function (err) {
        console.warn("No se pudo conectar con el servidor:", err);
        alert("Error de conexión con el servidor. Intenta de nuevo.");
      });
  }
})();
