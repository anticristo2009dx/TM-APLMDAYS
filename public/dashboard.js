/* ============================================================
   dashboard.js
   Renderiza la tabla "Registros de Ingreso Recientes" (modela la
   tabla `registro` de lefolde.sql, cruzada con `estudiantes` y
   `usuarios` para mostrar nombres legibles) y da funcionalidad
   real al botón "Exportar Reporte" generando un PDF con jsPDF.
   ============================================================ */
(function () {
  "use strict";

  /* ── Datos de ejemplo con la forma de `registro` + `estudiantes`
     + `usuarios` de lefolde.sql ─────────────────────────────── */
  var REGISTROS = [
    { matricula: 100823, nombre: "Mariana Gómez",       fecha: "2026-08-12 06:52", usuario: "prueba1" },
    { matricula: 100839, nombre: "Antonella Giraldo",   fecha: "2026-08-12 06:54", usuario: "prueba1" },
    { matricula: 100828, nombre: "Samuel Vélez",        fecha: "2026-08-12 06:55", usuario: "usuario2" },
    { matricula: 100831, nombre: "Salomé Correa",       fecha: "2026-08-12 06:57", usuario: "prueba1" },
    { matricula: 100836, nombre: "Nicolás Escobar",     fecha: "2026-08-12 06:58", usuario: "usuario2" },
    { matricula: 100825, nombre: "Valentina Ortiz",     fecha: "2026-08-12 07:01", usuario: "prueba1" },
    { matricula: 100841, nombre: "Valeria Loaiza",      fecha: "2026-08-12 07:02", usuario: "prueba1" },
    { matricula: 100833, nombre: "Luciana Arboleda",    fecha: "2026-08-12 07:03", usuario: "usuario2" },
    { matricula: 100844, nombre: "Jerónimo Villa",      fecha: "2026-08-12 07:05", usuario: "prueba1" },
    { matricula: 100835, nombre: "Gabriela Muñoz",      fecha: "2026-08-12 07:06", usuario: "usuario2" },
    { matricula: 100824, nombre: "Santiago Restrepo",   fecha: "2026-08-12 07:08", usuario: "prueba1" },
    { matricula: 100843, nombre: "Manuela Ospina",      fecha: "2026-08-12 07:10", usuario: "prueba1" }
  ];

  var tbody = document.getElementById("registros-tbody");
  if (!tbody) return; /* esta página no es dashboard.html */

  function formatFecha(f) {
    var d = new Date(f.replace(" ", "T"));
    if (isNaN(d.getTime())) return f;
    return d.toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function renderTable() {
    tbody.innerHTML = "";
    REGISTROS.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class=\"cell--muted\">" + r.nombre + "</td>" +
        "<td class=\"cell--mono\">#" + r.matricula + "</td>" +
        "<td class=\"cell--muted\">" + formatFecha(r.fecha) + "</td>" +
        "<td class=\"cell--muted\">" + r.usuario + "</td>";
      tbody.appendChild(tr);
    });
  }

  /* ── Exportar a PDF (jsPDF + autoTable) ───────────────────── */
  function exportPDF() {
    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      alert("No se pudo cargar el generador de PDF. Verifica tu conexión e inténtalo de nuevo.");
      return;
    }

    var doc = new jsPDFCtor({ orientation: "portrait", unit: "pt", format: "a4" });
    var today = new Date().toLocaleString("es-CO");

    doc.setFontSize(16);
    doc.setTextColor(20, 20, 30);
    doc.text("Ingreso Seguro — Reporte de Registros de Ingreso", 40, 44);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 110);
    doc.text("I.E. San Antonio de Prado · Generado el " + today, 40, 60);

    var rows = REGISTROS.map(function (r) {
      return [r.nombre, "#" + r.matricula, formatFecha(r.fecha), r.usuario];
    });

    doc.autoTable({
      startY: 80,
      head: [["Estudiante", "Matrícula", "Fecha y hora", "Registrado por"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [55, 94, 156], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 246, 251] },
      margin: { left: 40, right: 40 }
    });

    var finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 80;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 130);
    doc.text("Total de registros: " + REGISTROS.length, 40, finalY + 24);

    doc.save("reporte-ingresos-" + new Date().toISOString().slice(0, 10) + ".pdf");
  }

  ["export-report-btn", "export-report-btn-2"].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", exportPDF);
  });

  renderTable();
})();
