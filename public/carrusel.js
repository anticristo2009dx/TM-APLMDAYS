/* ============================================================
   carrusel.js
   Controla el carrusel del hero de la portada mediante una clase
   ".is-active" en vez de animaciones CSS por keyframes/delay (que
   se desincronizaban y podían dejar dos diapositivas visibles a la
   vez, o quedarse detenidas en una sola imagen).

   - Cambia de diapositiva con botones anterior/siguiente y dots.
   - Autoplay que se reinicia tras cualquier interacción manual.
   - Navegación por teclado (flechas) cuando el carrusel tiene foco.
   - Pausa el autoplay mientras el cursor o el foco están dentro.
   - Actualiza los atributos ARIA para lectores de pantalla.
   - Respeta prefers-reduced-motion (sin autoplay ni transición).
   ============================================================ */
(function () {
  "use strict";

  var AUTOPLAY_MS = 5500;

  var root = document.getElementById("hero-carrusel");
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll(".carrusel__slide"));
  var dots = Array.prototype.slice.call(root.querySelectorAll(".carrusel__dot"));
  var prevBtn = root.querySelector(".carrusel__control--prev");
  var nextBtn = root.querySelector(".carrusel__control--next");
  if (!slides.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = Math.max(0, slides.findIndex(function (s) { return s.classList.contains("is-active"); }));
  var timer = null;

  function render() {
    slides.forEach(function (slide, i) {
      var active = i === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    dots.forEach(function (dot, i) {
      var active = i === current;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });
  }

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    render();
  }

  function stopAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (reduceMotion || slides.length < 2) return;
    timer = setInterval(function () {
      goTo(current + 1);
    }, AUTOPLAY_MS);
  }

  // Cualquier interacción manual reinicia el conteo del autoplay,
  // para que no cambie de diapositiva justo después de que el
  // usuario ya eligió una.
  function userGoTo(index) {
    goTo(index);
    startAutoplay();
  }

  if (nextBtn) nextBtn.addEventListener("click", function () { userGoTo(current + 1); });
  if (prevBtn) prevBtn.addEventListener("click", function () { userGoTo(current - 1); });
  dots.forEach(function (dot, i) {
    dot.addEventListener("click", function () { userGoTo(i); });
  });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      userGoTo(current + 1);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      userGoTo(current - 1);
      e.preventDefault();
    }
  });

  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", function (e) {
    if (!root.contains(e.relatedTarget)) startAutoplay();
  });

  render();
  startAutoplay();
})();
