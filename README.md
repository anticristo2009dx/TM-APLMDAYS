# Ingreso Seguro

## Cómo correr el proyecto

1. Instala las dependencias:
   ```
   npm install
   ```
2. Copia `env/.env.example` como `env/.env` y coloca los datos de tu
   servidor MySQL/MariaDB (host, usuario, contraseña, nombre de la
   base de datos `lefolde`).
3. Importa el esquema si todavía no lo has hecho:
   ```
   mysql -u tu_usuario -p lefolde < lefolde.sql
   ```
4. Levanta el servidor:
   ```
   node app.js
   ```
   (o `npx nodemon app.js` si prefieres que se reinicie solo al guardar cambios)
5. Abre `http://localhost:3000`.

## Usuarios de prueba (ya existen en el dump `lefolde.sql`)

| Usuario   | Contraseña | Rol | Redirige a       |
|-----------|------------|-----|-------------------|
| `prueba1` | `123456789`| 1   | `dashboard.html`  |
| `usuario2`| `987654321`| 2   | `admin.html`      |

## Qué está conectado a la base de datos real y qué no

- **Login (`/auth`)**: 100% real. Consulta la tabla `usuarios` en tu
  MySQL y valida usuario/contraseña de verdad.
- **Estudiantes, sus filtros/paginación, el modal de Agregar/Editar/
  Borrar, y el lector QR**: por ahora funcionan con datos de ejemplo
  y `localStorage` del navegador (no llegan a tu base de datos
  todavía). Tienen la misma forma que las tablas `estudiantes`,
  `grados` y `grupos` de tu esquema, así que conectarlos a una API
  real es el siguiente paso natural si lo necesitas.
- **Registros del Panel de Control y su exportación a PDF**: mismo
  caso, datos de ejemplo con la forma de la tabla `registro`.

## Estructura

- `app.js` — servidor Express (rutas de páginas + `/auth`).
- `database/db.js` — conexión MySQL.
- `views/login.ejs` — plantilla del login (la única página renderizada
  por el servidor; el resto son HTML estático servido desde la raíz
  del proyecto y `public/`).
- `admin.html`, `dashboard.html`, `students.html`, `settings.html`,
  `nosotros.html`, `qr.html`, `index.html` — páginas del sitio.
- `public/` — CSS, JS e imágenes de todas las páginas.
- `equipo-*/` — hojas de vida individuales del equipo (enlazadas
  desde "Nosotros").
