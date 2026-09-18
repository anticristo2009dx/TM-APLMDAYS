//llamar express

const express = require('express');
const app = express();
const path = require('path');
// se pone el urlencoded para recibir datos de formularios
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// invocamos dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

//public

app.use(express.static(path.join(__dirname, 'public')));

console.log(__dirname);

// establecemos el motor de plantillas ejs
app.set("view engine", "ejs");

// bcryptjs
const bcryptjs = require('bcryptjs');


// var de la ssession

const session = require('express-session');
app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}));

// invocar conexxion
const connection = require ("./database/db.js");

// Roles de la tabla `usuarios` (columna `rol`):
//   1 = Profesor
//   2 = Administrador
//   3 = Celador
const ROLES = {
    PROFESOR: 1,
    ADMIN: 2,
    CELADOR: 3
};

// Middleware para proteger rutas según el rol guardado en la sesión.
// Si no hay sesión, manda a login. Si el rol no está permitido, 403.
function ensureRole(...rolesPermitidos) {
    return function (req, res, next) {
        if (!req.session || !req.session.rol) {
            return res.redirect('/login');
        }
        if (!rolesPermitidos.includes(req.session.rol)) {
            return res.status(403).send('No tienes permisos para acceder a esta página.');
        }
        next();
    };
}

// establecer rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.render('login', { alert: false });
});

app.get('/dashboard.html', (req, res) => {

    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// El panel de administracion ahora es una sola vista EJS que contiene
// dashboard, estudiantes, configuracion y admin, y cambia entre ellas
// sin recargar (ver views/admin.ejs). Solo el rol Administrador puede entrar.
app.get('/admin', ensureRole(ROLES.ADMIN), (req, res) => {
    res.render('admin', { nombre: req.session.nombre });
});

// Panel para usuarios comunes (Profesor y Celador). Reutiliza el mismo
// patrón de vista única sin recarga que /admin, pero sin la sección de
// Administrador (ver views/usuario.ejs).
app.get('/panel', ensureRole(ROLES.PROFESOR, ROLES.CELADOR), (req, res) => {
    const rolLabel = req.session.rol === ROLES.CELADOR ? 'Celador' : 'Profesor';
    res.render('usuario', { nombre: req.session.nombre, rolLabel: rolLabel });
});

app.get('/students.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'students.html'));
});

app.get('/settings.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

app.get('/nosotros.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'nosotros.html'));
});

app.get('/qr.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
});

// Hojas de vida del equipo (cada carpeta se sirve solo a sí misma)
app.use('/equipo-diego', express.static(path.join(__dirname, 'equipo-diego')));
app.use('/equipo-julian', express.static(path.join(__dirname, 'equipo-julian')));
app.use('/equipo-lever', express.static(path.join(__dirname, 'equipo-lever')));
app.use('/equipo-sebastian', express.static(path.join(__dirname, 'equipo-sebastian')));


// Ruta de Autenticación (Modo Prueba sin Hash)
app.post('/auth', (req, res) => {
    const usuarioIngresado = req.body.email;
    const password = req.body.password;

    if (usuarioIngresado && password) {
        connection.query('SELECT * FROM usuarios WHERE nombre = ?', [usuarioIngresado], (error, results) => {
            if (error) {
                console.log("Error en BD:", error);
                return res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Error de conexión con la base de datos",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            }

            // Comparación directa en texto plano (Modo Prueba)
            if (results.length === 0 || password !== results[0].contrasena) {
                res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario o contraseña incorrectos",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            } else {
                // Sesión y redirección por rol
                req.session.nombre = results[0].nombre;
                req.session.rol = results[0].rol;

                let destino = 'dashboard.html';
                if (results[0].rol === ROLES.ADMIN) {
                    destino = '/admin';
                } else if (results[0].rol === ROLES.PROFESOR || results[0].rol === ROLES.CELADOR) {
                    destino = '/panel';
                }

                res.render('login', {
                    alert: true,
                    alertTitle: "Conexión exitosa",
                    alertMessage: "¡Bienvenido " + req.session.nombre + "!",
                    alertIcon: "success",
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: destino
                });
            }
        });
    } else {
        res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Por favor complete todos los campos",
            alertIcon: "warning",
            showConfirmButton: true,
            timer: false,
            ruta: 'login'
        });
    }
});

// ------------------------------------------------------------------
// Crear nuevo usuario (Profesor o Celador) desde el botón
// "Agregar Nuevo Usuario" del panel de Administrador.
// Solo el Administrador puede crear usuarios, y solo puede asignar
// el rol Profesor o Celador (nunca Administrador desde aquí).
// ------------------------------------------------------------------
app.post('/admin/usuarios', ensureRole(ROLES.ADMIN), (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    const cedula = (req.body.cedula || '').trim();
    const correo = (req.body.correo || '').trim();
    const contrasena = (req.body.contrasena || '').trim();
    const rol = parseInt(req.body.rol, 10);

    if (!nombre || !cedula || !contrasena || !rol) {
        return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos obligatorios.' });
    }

    if (rol !== ROLES.PROFESOR && rol !== ROLES.CELADOR) {
        return res.status(400).json({ ok: false, mensaje: 'Solo puedes crear usuarios con rol Profesor o Celador.' });
    }

    // la columna `contrasena` es varchar(20) en la BD (modo prueba, sin hash)
    if (contrasena.length > 20) {
        return res.status(400).json({ ok: false, mensaje: 'La contraseña no puede tener más de 20 caracteres.' });
    }

    // evitar usuarios duplicados por nombre
    connection.query('SELECT id_usuario FROM usuarios WHERE nombre = ?', [nombre], (error, filas) => {
        if (error) {
            console.log('Error en BD:', error);
            return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
        }

        if (filas.length > 0) {
            return res.status(409).json({ ok: false, mensaje: 'Ya existe un usuario registrado con ese nombre.' });
        }

        connection.query(
            'INSERT INTO usuarios (nombre, rol, cedula, contrasena, correo) VALUES (?, ?, ?, ?, ?)',
            [nombre, rol, cedula, contrasena, correo || null],
            (errorInsert, resultado) => {
                if (errorInsert) {
                    console.log('Error en BD:', errorInsert);
                    return res.status(500).json({ ok: false, mensaje: 'Error al guardar el usuario en la base de datos.' });
                }

                return res.json({
                    ok: true,
                    mensaje: 'Usuario creado correctamente.',
                    usuario: {
                        id_usuario: resultado.insertId,
                        nombre: nombre,
                        rol: rol,
                        rolNombre: rol === ROLES.CELADOR ? 'Celador' : 'Profesor',
                        cedula: cedula,
                        correo: correo || null
                    }
                });
            }
        );
    });
});

//CRUD (Creacio, Lectura, Actualizacion y Eliminacion) de usuarios desde el panel de Administrador
app.get("/")=> {
    res.send
}



app.listen(3000, () => {
    console.log('Server is running in http://localhost:3000');
});