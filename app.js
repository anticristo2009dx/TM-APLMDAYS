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
    // 1. Consultar usuarios en MySQL
    connection.query('SELECT * FROM usuarios', (error, resultados) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error en la base de datos');
        }
        // 2. Pasar los resultados a la plantilla EJS con el nombre "usuarios"
        res.render('admin', {
            usuarios: resultados,
            nombre: req.session.nombre
        });
    });
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
        connection.query('SELECT * FROM usuarios WHERE nombre = ?', [usuarioIngresado], async (error, results) => {
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

            if (results.length === 0) {
                return res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario o contraseña incorrectos",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            }

            // Comparar la contraseña ingresada con el hash guardado en MySQL
            const match = await bcryptjs.compare(password, results[0].contrasena);

            if (!match) {
                return res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario o contraseña incorrectos",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            }

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
app.post('/admin/usuarios', ensureRole(ROLES.ADMIN), async (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    const cedula = (req.body.cedula || '').trim();
    const correo = (req.body.correo || '').trim();
    const contrasena = (req.body.contrasena || '').trim();
    const rol = parseInt(req.body.rol, 10);

    if (!nombre || !cedula || !contrasena || !rol) {
        return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos obligatorios.' });
    }

    if (rol !== ROLES.ADMIN && rol !== ROLES.PROFESOR && rol !== ROLES.CELADOR) {
        return res.status(400).json({ ok: false, mensaje: 'El rol seleccionado no es válido.' });
    }

    try {
        // Verificar duplicados por nombre
        connection.query('SELECT id_usuario FROM usuarios WHERE nombre = ?', [nombre], async (error, filas) => {
            if (error) {
                console.log('Error en BD:', error);
                return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
            }

            if (filas.length > 0) {
                return res.status(409).json({ ok: false, mensaje: 'Ya existe un usuario registrado con ese nombre.' });
            }

            // Encriptación de la contraseña con bcryptjs
            const passwordHash = await bcryptjs.hash(contrasena, 8);

            // Insertar usuario con la contraseña hash
            connection.query(
                'INSERT INTO usuarios (nombre, rol, cedula, contrasena, correo) VALUES (?, ?, ?, ?, ?)',
                [nombre, rol, cedula, passwordHash, correo || null],
                (errorInsert, resultado) => {
                    if (errorInsert) {
                        console.log('Error en BD:', errorInsert);
                        return res.status(500).json({ ok: false, mensaje: 'Error al guardar el usuario en la base de datos.' });
                    }

                    let nombreRol = 'Usuario';
                    if (rol === ROLES.ADMIN) nombreRol = 'Administrador';
                    if (rol === ROLES.PROFESOR) nombreRol = 'Profesor';
                    if (rol === ROLES.CELADOR) nombreRol = 'Celador';

                    return res.json({
                        ok: true,
                        mensaje: 'Usuario creado correctamente.',
                        usuario: {
                            id_usuario: resultado.insertId,
                            nombre: nombre,
                            rol: rol,
                            rolNombre: nombreRol,
                            cedula: cedula,
                            correo: correo || null
                        }
                    });
                }
            );
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
    }
});

// ------------------------------------------------------------------
// Actualizar usuario existente desde el botón "Editar" de la tabla
// de usuarios del panel de Administrador.
// ------------------------------------------------------------------
app.put('/admin/usuarios/:id', ensureRole(ROLES.ADMIN), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const nombre = (req.body.nombre || '').trim();
    const cedula = (req.body.cedula || '').trim();
    const correo = (req.body.correo || '').trim();
    const contrasena = (req.body.contrasena || '').trim();
    const rol = parseInt(req.body.rol, 10);

    if (!id || !nombre || !cedula || !rol) {
        return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos obligatorios.' });
    }

    if (rol !== ROLES.ADMIN && rol !== ROLES.PROFESOR && rol !== ROLES.CELADOR) {
        return res.status(400).json({ ok: false, mensaje: 'El rol seleccionado no es válido.' });
    }

    try {
        // Evitar que el nombre quede duplicado con el de otro usuario
        connection.query('SELECT id_usuario FROM usuarios WHERE nombre = ? AND id_usuario != ?', [nombre, id], async (error, filas) => {
            if (error) {
                console.log('Error en BD:', error);
                return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
            }

            if (filas.length > 0) {
                return res.status(409).json({ ok: false, mensaje: 'Ya existe otro usuario registrado con ese nombre.' });
            }

            function guardar(sql, params) {
                connection.query(sql, params, (errorUpdate, resultado) => {
                    if (errorUpdate) {
                        console.log('Error en BD:', errorUpdate);
                        return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el usuario en la base de datos.' });
                    }
                    if (resultado.affectedRows === 0) {
                        return res.status(404).json({ ok: false, mensaje: 'El usuario no existe.' });
                    }
                    return res.json({ ok: true, mensaje: 'Usuario actualizado correctamente.' });
                });
            }

            if (contrasena) {
                // Solo se re-encripta la contraseña si el administrador escribió una nueva
                const passwordHash = await bcryptjs.hash(contrasena, 8);
                guardar(
                    'UPDATE usuarios SET nombre = ?, rol = ?, cedula = ?, correo = ?, contrasena = ? WHERE id_usuario = ?',
                    [nombre, rol, cedula, correo || null, passwordHash, id]
                );
            } else {
                guardar(
                    'UPDATE usuarios SET nombre = ?, rol = ?, cedula = ?, correo = ? WHERE id_usuario = ?',
                    [nombre, rol, cedula, correo || null, id]
                );
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor.' });
    }
});

// ------------------------------------------------------------------
// Eliminar usuario desde el botón "Eliminar" de la tabla de usuarios
// del panel de Administrador.
// ------------------------------------------------------------------
app.delete('/admin/usuarios/:id', ensureRole(ROLES.ADMIN), (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) {
        return res.status(400).json({ ok: false, mensaje: 'Usuario inválido.' });
    }

    connection.query('DELETE FROM usuarios WHERE id_usuario = ?', [id], (error, resultado) => {
        if (error) {
            console.log('Error en BD:', error);
            return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el usuario en la base de datos.' });
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'El usuario no existe.' });
        }
        return res.json({ ok: true, mensaje: 'Usuario eliminado correctamente.' });
    });
});

app.use("/", require("./router.js"));

app.listen(3000, () => {
    console.log('Server is running in http://localhost:3000');
});