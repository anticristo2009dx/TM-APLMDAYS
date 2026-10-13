/* ============================================================
   qr-scanner.js
   Lectura de códigos QR para el registro de asistencia.
   Usa jsQR (vendorizado en jsQR.js) para decodificar imágenes,
   ya sea desde la cámara en vivo o desde un archivo subido.
   ============================================================ */
(function () {
  "use strict";

  /* ── Directorio simulado de estudiantes ───────────────────────
     Los códigos QR de prueba (carpeta qr-demo/) están generados
     a partir de estos mismos valores, así que escanearlos aquí
     siempre produce una coincidencia real. */
  var DIRECTORY = {
    "ISQR-2024-8842": { name: "Mariana Gómez", id: "#2024-8842", estado: "Activo" },
    "ISQR-2024-1105": { name: "Santiago Restrepo", id: "#2024-1105", estado: "En Prueba" },
    "ISQR-2024-9221": { name: "Valentina Ortiz", id: "#2024-9221", estado: "Activo" },
    "ISQR-2024-4412": { name: "Juan Pablo Cardona", id: "#2024-4412", estado: "Suspendido" }
  };
  var DEMO_CODES = Object.keys(DIRECTORY);

  var viewport = document.getElementById("scanner-viewport");
  var video = document.getElementById("scanner-video");
  var canvas = document.getElementById("scanner-canvas");
  var statusEl = document.getElementById("scanner-status");
  var startBtn = document.getElementById("start-camera-btn");
  var stopBtn = document.getElementById("stop-camera-btn");
  var simulateBtn = document.getElementById("simulate-btn");
  var fileInput = document.getElementById("qr-file-input");

  var resultEmpty = document.getElementById("scan-result-empty");
  var resultBox = document.getElementById("scan-result");
  var resultAvatar = document.getElementById("scan-result-avatar");
  var resultName = document.getElementById("scan-result-name");
  var resultMeta = document.getElementById("scan-result-meta");
  var resultTime = document.getElementById("scan-result-time");

  var tableBody = document.getElementById("recent-scans-body");
  var tableEmpty = document.getElementById("recent-scans-empty");

  var stream = null;
  var scanning = false;
  var rafId = null;
  var lastCode = null;
  var lastCodeAt = 0;
  var demoIndex = 0;
  var ctx = canvas.getContext("2d", { willReadFrequently: true });

  function setStatus(text, mode) {
    statusEl.textContent = text;
    statusEl.className = "scanner-status" + (mode ? " is-" + mode : "");
  }

  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p[0]; })
      .join("")
      .toUpperCase();
  }

  function formatTime() {
    var d = new Date();
    return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function badgeClassFor(estado) {
    if (estado === "Activo") return "badge-active";
    if (estado === "En Prueba") return "badge-probation";
    return "badge-suspended";
  }

  function registerScan(code) {
    var now = Date.now();
    /* evita registrar el mismo código dos veces en menos de 4s (rebote de cámara) */
    if (code === lastCode && now - lastCodeAt < 4000) return;
    lastCode = code;
    lastCodeAt = now;

    var student = DIRECTORY[code];
    var time = formatTime();

    if (!student) {
      setStatus("Código no reconocido", "error");
      addTableRow("Código desconocido (" + code + ")", null, time);
      return;
    }

    setStatus("Código detectado", "found");

    resultEmpty.hidden = true;
    resultBox.hidden = false;
    resultAvatar.textContent = initials(student.name);
    resultName.textContent = student.name;
    resultMeta.textContent = student.id + " · " + student.estado;
    resultTime.textContent = "Registrado a las " + time;

    addTableRow(student.name, student.estado, time);
  }

  function addTableRow(name, estado, time) {
    tableEmpty.hidden = true;
    var tr = document.createElement("tr");

    var tdName = document.createElement("td");
    tdName.textContent = name;
    tr.appendChild(tdName);

    var tdEstado = document.createElement("td");
    if (estado) {
      var badge = document.createElement("span");
      badge.className = "badge " + badgeClassFor(estado);
      badge.textContent = estado;
      tdEstado.appendChild(badge);
    } else {
      tdEstado.textContent = "—";
    }
    tr.appendChild(tdEstado);

    var tdTime = document.createElement("td");
    tdTime.className = "text-right cell--muted";
    tdTime.textContent = time;
    tr.appendChild(tdTime);

    tableBody.prepend(tr);
  }

  /* ── Cámara ────────────────────────────────────────────────── */
  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Cámara no disponible en este navegador", "error");
      return;
    }
    setStatus("Solicitando permiso de cámara…", "scanning");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(function (mediaStream) {
        stream = mediaStream;
        video.srcObject = stream;
        video.play();
        viewport.classList.add("is-active");
        startBtn.hidden = true;
        stopBtn.hidden = false;
        scanning = true;
        setStatus("Buscando código…", "scanning");
        rafId = requestAnimationFrame(scanFrame);
      })
      .catch(function (err) {
        setStatus("No se pudo acceder a la cámara", "error");
        console.warn("Error de cámara:", err);
      });
  }

  function stopCamera() {
    scanning = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    viewport.classList.remove("is-active");
    startBtn.hidden = false;
    stopBtn.hidden = true;
    setStatus("En espera");
  }

  function scanFrame() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = window.jsQR
        ? window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" })
        : null;
      if (code && code.data) {
        registerScan(code.data.trim());
      }
    }
    rafId = requestAnimationFrame(scanFrame);
  }

  /* ── Subir imagen ──────────────────────────────────────────── */
  function handleFile(file) {
    if (!file) return;
    setStatus("Leyendo imagen…", "scanning");
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height) : null;
      URL.revokeObjectURL(url);
      if (code && code.data) {
        registerScan(code.data.trim());
      } else {
        setStatus("No se encontró un código QR en la imagen", "error");
      }
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      setStatus("No se pudo leer la imagen", "error");
    };
    img.src = url;
  }

  /* ── Simulación (para probar sin cámara ni imagen) ────────── */
  function simulateScan() {
    var code = DEMO_CODES[demoIndex % DEMO_CODES.length];
    demoIndex++;
    setStatus("Simulando lectura…", "scanning");
    window.setTimeout(function () {
      lastCode = null; /* permite repetir el mismo código en modo simulación */
      registerScan(code);
    }, 400);
  }

  startBtn.addEventListener("click", startCamera);
  stopBtn.addEventListener("click", stopCamera);
  simulateBtn.addEventListener("click", simulateScan);
  fileInput.addEventListener("change", function (e) {
    handleFile(e.target.files && e.target.files[0]);
    fileInput.value = "";
  });

  window.addEventListener("beforeunload", stopCamera);
})();
