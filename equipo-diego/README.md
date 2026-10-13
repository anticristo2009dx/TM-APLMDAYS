# Portafolio y Hoja de Vida – Diego Antonio Rivero Carrasco

Portafolio web personal construido con **HTML5, CSS3 y JavaScript nativos**, listo para desplegar en **Netlify**.

## Arquitectura

```
portafolio/
├── index.html        # Estructura y contenido (una sola página)
├── css/styles.css    # Estilos, temas y diseño responsive
├── js/main.js        # Interactividad y preferencias del usuario
├── assets/           # Imágenes (colocar aquí foto.jpg)
├── netlify.toml      # Configuración de despliegue y cabeceras
└── README.md
```

Es un sitio estático de una sola página: sin dependencias, sin build, sin servidor.

## Decisión tomada: HTML5 nativo

| Opción | Motivo |
| --- | --- |
| **HTML5 nativo (elegida)** | Es la base de tu archivo original, carga muy rápido, no requiere build y se despliega arrastrando la carpeta. Es ideal para un portafolio de una página. |
| React + Vite | Útil si el sitio crece a muchas páginas o componentes reutilizables; hoy añadiría complejidad innecesaria. |
| Next.js / Angular | Aportan SEO por rutas o estructura empresarial que este proyecto no necesita todavía. |

Si más adelante quieres migrar a React, las secciones de `index.html` ya están separadas y se convierten fácilmente en componentes.

## Descripción de los componentes

| Componente | Descripción |
| --- | --- |
| **Skip link** | Enlace oculto que permite a quien navega con teclado saltar al contenido principal. |
| **Toolbar** | Barra fija con controles de accesibilidad: tamaño de texto, tipografía, color de acento, tema (claro, oscuro, alto contraste) y exportar a PDF. |
| **Hero** | Foto (`assets/foto.jpg`, con iniciales "DR" si no existe), nombre, rol, resumen y botones de acción. |
| **Contacto** | Ubicación, correo y teléfono. |
| **Habilidades técnicas** | Lenguajes, frameworks y herramientas en etiquetas. |
| **Soft skills** | Habilidades blandas en tarjetas. |
| **Sobre mí** | Presentación breve y propósito. |
| **Educación y formación** | Línea de tiempo. |
| **Proyectos** | Tarjetas de proyectos con descripción y enlaces. |
| **Hobbies** | Tarjetas con tu descripción y cómo cada hobby aporta a tu perfil profesional. |
| **Footer** | Derechos y botón "volver arriba". |

### Cómo funciona la personalización (`js/main.js`)

- Los cambios de tema, acento, tamaño y fuente se aplican como atributos `data-*` en `<html>`; el CSS reacciona mediante variables (custom properties).
- Las preferencias se guardan en `localStorage`.
- El tema inicial respeta la preferencia del sistema (`prefers-color-scheme`).
- La hoja de estilos incluye reglas `@media print` para exportar un PDF limpio.

## Despliegue en Netlify

**Opción A, arrastrar y soltar:** entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta del proyecto.

**Opción B, con GitHub (recomendada):**
1. Sube el proyecto a un repositorio.
2. En Netlify: *Add new site → Import an existing project*.
3. Deja el comando de build vacío; el directorio de publicación es `.` (ya definido en `netlify.toml`).
4. Cada `git push` actualizará el sitio automáticamente.

## Cómo ampliar el contenido

- **Más proyectos:** duplica un bloque `.project-card` dentro de `.projects-grid` en `index.html`; puedes añadir enlaces dentro de `.project-links`.
- **Más formación o experiencia:** duplica un bloque `.timeline-item`.
- **Foto:** reemplaza `assets/foto.jpg` (cuadrada, ~480 px).
- Los textos "Me aporta" de los hobbies son una propuesta; edítalos a tu gusto.
