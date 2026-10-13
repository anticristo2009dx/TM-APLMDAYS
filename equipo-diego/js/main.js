document.addEventListener('DOMContentLoaded', () => {
      
      // EXPLICACIÓN: Referencias al elemento raíz (HTML) para aplicar dataset
      const root = document.documentElement;

      // ==========================================
      // 1. GESTIÓN DE TEMAS (CLARO/OSCURO/ALTO CONTRASTE)
      // ==========================================
      const selectTheme = document.getElementById('select-theme');

      // Cargar preferencia guardada o detectar preferencia del sistema
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
      setTheme(initialTheme);

      selectTheme.addEventListener('change', (e) => {
        setTheme(e.target.value);
      });

      function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        selectTheme.value = theme;
        localStorage.setItem('theme', theme);
      }

      // ==========================================
      // 2. CAMBIADOR DE COLOR DE ACENTO
      // ==========================================
      const accentBtns = document.querySelectorAll('.btn-accent-picker');
      const savedAccent = localStorage.getItem('accent') || 'blue';
      root.setAttribute('data-accent', savedAccent);

      accentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          root.setAttribute('data-accent', color);
          localStorage.setItem('accent', color);
        });
      });

      // ==========================================
      // 3. TAMAÑO DE FUENTE ACCESIBLE
      // ==========================================
      const btnFontSmall = document.getElementById('btn-font-small');
      const btnFontNormal = document.getElementById('btn-font-normal');
      const btnFontLarge = document.getElementById('btn-font-large');

      const savedFontSize = localStorage.getItem('fontSize') || 'normal';
      root.setAttribute('data-font-size', savedFontSize);

      btnFontSmall.addEventListener('click', () => setFontSize('small'));
      btnFontNormal.addEventListener('click', () => setFontSize('normal'));
      btnFontLarge.addEventListener('click', () => setFontSize('large'));

      function setFontSize(size) {
        root.setAttribute('data-font-size', size);
        localStorage.setItem('fontSize', size);
      }

      // ==========================================
      // 4. CAMBIADOR DE TIPOGRAFÍA
      // ==========================================
      const selectFontFamily = document.getElementById('select-font-family');
      const savedFontFamily = localStorage.getItem('fontFamily') || 'sans';
      
      root.setAttribute('data-font-family', savedFontFamily);
      selectFontFamily.value = savedFontFamily;

      selectFontFamily.addEventListener('change', (e) => {
        const family = e.target.value;
        root.setAttribute('data-font-family', family);
        localStorage.setItem('fontFamily', family);
      });

      // ==========================================
      // 5. FILTRADO DE PROYECTOS (PORTAFOLIO)
      // ==========================================
      const filterBtns = document.querySelectorAll('.filter-btn');
      const projectCards = document.querySelectorAll('.project-card');

      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Quitar clase active
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const filterValue = btn.getAttribute('data-filter');

          projectCards.forEach(card => {
            const categories = card.getAttribute('data-category');
            if (filterValue === 'all' || categories.includes(filterValue)) {
              card.style.display = 'flex';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });

      // ==========================================
      // 6. BOTÓN IMPRIMIR / PDF
      // ==========================================
      document.getElementById('btn-print').addEventListener('click', () => {
        window.print();
      });

      // ==========================================
      // 7. AÑO DINÁMICO EN FOOTER
      // ==========================================
      document.getElementById('year').textContent = new Date().getFullYear();
    });
