//llamar express

const express = require('express');
const app = express();
const path = require('path');
// se pone el urlencoded para recibir datos de formularios
app.use(express.urlencoded({ extended: false }));
// límite ampliado: la foto del estudiante viaja como data URL en base64
app.use(express.json({ limit: '8mb' }));


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
//   1 = Usuario (solo puede registrar ingresos por QR; sin permisos de administración)
//   2 = Administrador
const ROLES = {
    USUARIO: 1,
    ADMIN: 2
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
            nombre: req.session.nombre,
            isAdmin: true
        });
    });
});
// Panel para usuarios comunes (rol Usuario: solo registro por QR, sin
// permisos de cambios). Reutiliza el mismo patrón de vista única sin
// recarga que /admin, pero sin la sección de Administrador (ver
// views/usuario.ejs).
app.get('/panel', ensureRole(ROLES.USUARIO), (req, res) => {
    res.render('usuario', { nombre: req.session.nombre, rolLabel: 'Usuario', isAdmin: false });
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
            req.session.id_usuario = results[0].id_usuario;

            let destino = 'dashboard.html';
            if (results[0].rol === ROLES.ADMIN) {
                destino = '/admin';
            } else if (results[0].rol === ROLES.USUARIO) {
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
// Crear nuevo usuario (rol Usuario) desde el botón
// "Agregar Nuevo Usuario" del panel de Administrador.
// Solo el Administrador puede crear usuarios, y solo puede asignar
// el rol Usuario o Administrador.
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

    if (rol !== ROLES.ADMIN && rol !== ROLES.USUARIO) {
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

    if (rol !== ROLES.ADMIN && rol !== ROLES.USUARIO) {
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

// ------------------------------------------------------------------
// Registrar un ingreso (lectura de QR en portería) en la tabla
// `registro` de la base de datos `lefolde`. La dispara qr-scanner.js
// cada vez que reconoce un código de estudiante válido.
// ------------------------------------------------------------------
app.post('/registro', ensureRole(ROLES.USUARIO, ROLES.ADMIN), (req, res) => {
    const codigoQr = (req.body.codigo_qr || '').toString().trim();
    const idUsuario = req.session.id_usuario;

    if (!codigoQr) {
        return res.status(400).json({ ok: false, mensaje: 'Falta el código QR.' });
    }
    if (!idUsuario) {
        return res.status(401).json({ ok: false, mensaje: 'No hay una sesión de usuario válida.' });
    }

    connection.query('SELECT matricula, nombre, estado FROM estudiantes WHERE codigo_qr = ?', [codigoQr], (error, filas) => {
        if (error) {
            console.log('Error en BD:', error);
            return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
        }
        if (filas.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Ese código QR no corresponde a ningún estudiante registrado en la base de datos.' });
        }

        const matricula = filas[0].matricula;
        connection.query(
            'INSERT INTO registro (matricula, fecha, id_usuario) VALUES (?, NOW(), ?)',
            [matricula, idUsuario],
            (errorInsert, resultado) => {
                if (errorInsert) {
                    console.log('Error en BD:', errorInsert);
                    return res.status(500).json({ ok: false, mensaje: 'Error al guardar el registro en la base de datos.' });
                }
                return res.json({
                    ok: true,
                    mensaje: 'Registro guardado.',
                    id_registro: resultado.insertId,
                    estudiante: { matricula: matricula, nombre: filas[0].nombre, estado: filas[0].estado }
                });
            }
        );
    });
});

// ------------------------------------------------------------------
// Resuelve (y crea si hace falta) el id_grupo correspondiente a un
// grado + número de grupo, según las tablas `grados` y `grupos` de
// lefolde.sql. La semilla de datos solo trae 11°-1 cargado, así que
// cualquier otra combinación (6° a 11°, grupos 1-3) se crea la
// primera vez que se usa.
// ------------------------------------------------------------------
function resolverIdGrupo(grado, numeroGrupo, callback) {
    connection.query('SELECT id_grado FROM grados WHERE grado = ?', [String(grado)], (error, filasGrado) => {
        if (error) return callback(error);

        function conIdGrado(idGrado) {
            connection.query(
                'SELECT id_grupo FROM grupos WHERE id_grado = ? AND numero_grupo = ?',
                [idGrado, numeroGrupo],
                (error2, filasGrupo) => {
                    if (error2) return callback(error2);
                    if (filasGrupo.length > 0) return callback(null, filasGrupo[0].id_grupo);

                    connection.query(
                        'INSERT INTO grupos (id_grado, numero_grupo) VALUES (?, ?)',
                        [idGrado, numeroGrupo],
                        (error3, resultado) => {
                            if (error3) return callback(error3);
                            callback(null, resultado.insertId);
                        }
                    );
                }
            );
        }

        if (filasGrado.length > 0) return conIdGrado(filasGrado[0].id_grado);

        connection.query(
            'INSERT INTO grados (grado, nivel_educativo) VALUES (?, ?)',
            [String(grado), 'bachiller'],
            (error2, resultado) => {
                if (error2) return callback(error2);
                conIdGrado(resultado.insertId);
            }
        );
    });
}

// ------------------------------------------------------------------
// Listar estudiantes desde la tabla `estudiantes` (con su grado y
// grupo ya resueltos) para la página de Estudiantes. La puede leer
// cualquier usuario con sesión iniciada (Usuario o Administrador);
// solo el Administrador puede crear, editar o borrar.
// ------------------------------------------------------------------
app.get('/estudiantes', ensureRole(ROLES.USUARIO, ROLES.ADMIN), (req, res) => {
    connection.query(
        'SELECT e.matricula, e.nombre, e.codigo_qr, e.estado, e.asistencia, ' +
        'g.grado AS grado, gr.numero_grupo AS grupo ' +
        'FROM estudiantes e ' +
        'JOIN grupos gr ON e.id_grupo = gr.id_grupo ' +
        'JOIN grados g ON gr.id_grado = g.id_grado ' +
        'ORDER BY e.nombre',
        (error, filas) => {
            if (error) {
                console.log('Error en BD:', error);
                return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
            }
            return res.json({ ok: true, estudiantes: filas });
        }
    );
});

// ------------------------------------------------------------------
// Helpers del registro de estudiantes
// ------------------------------------------------------------------
const MATRICULA_MAX = 2147483647;           // límite de una columna INT de MySQL
const GRADOS_VALIDOS = ['6', '7', '8', '9', '10', '11'];
const GRUPOS_POR_GRADO = 3;

// La matrícula debe ser un entero positivo escrito solo con dígitos
// (rechaza "12abc", negativos, decimales y números fuera del rango INT).
function parseMatricula(valor) {
    const texto = String(valor === undefined || valor === null ? '' : valor).trim();
    if (!/^\d{1,10}$/.test(texto)) return null;
    const numero = parseInt(texto, 10);
    if (numero < 1 || numero > MATRICULA_MAX) return null;
    return numero;
}

// Código QR propio del estudiante: "ISQR-2026-" + últimos 4 dígitos de su
// matrícula (mismo formato de los estudiantes ya cargados en la BD). Como
// `codigo_qr` es UNIQUE, si esos 4 dígitos ya los usa OTRO estudiante se usa
// la matrícula completa, así cada QR identifica a un solo estudiante.
function generarCodigoQr(matricula, callback) {
    const base = 'ISQR-2026-' + String(matricula).slice(-4);
    connection.query('SELECT matricula FROM estudiantes WHERE codigo_qr = ?', [base], (error, filas) => {
        if (error) return callback(error);
        if (filas.length === 0 || filas[0].matricula === matricula) return callback(null, base);
        callback(null, 'ISQR-2026-' + matricula);
    });
}

const SQL_ESTUDIANTE_POR_MATRICULA =
    'SELECT e.matricula, e.nombre, e.codigo_qr, e.estado, e.asistencia, ' +
    'g.grado AS grado, gr.numero_grupo AS grupo ' +
    'FROM estudiantes e ' +
    'JOIN grupos gr ON e.id_grupo = gr.id_grupo ' +
    'JOIN grados g ON gr.id_grado = g.id_grado ' +
    'WHERE e.matricula = ?';

function tieneQr(estudiante) {
    return !!(estudiante.codigo_qr && String(estudiante.codigo_qr).trim() !== '');
}

// ------------------------------------------------------------------
// Consulta previa a registrar un estudiante: dada una matrícula,
// indica si YA está en la base de datos (y devuelve sus datos reales:
// nombre, grado, grupo) y cuál es el código QR que le corresponde.
// La usa el formulario "Agregar estudiante" para tomar la matrícula
// desde la BD en lugar de inventarla o calcularla.
// ------------------------------------------------------------------
app.get('/admin/estudiantes/consulta/:matricula', ensureRole(ROLES.ADMIN), (req, res) => {
    const matricula = parseMatricula(req.params.matricula);
    if (!matricula) {
        return res.status(400).json({ ok: false, mensaje: 'La matrícula debe ser un número entero positivo.' });
    }

    connection.query(SQL_ESTUDIANTE_POR_MATRICULA, [matricula], (error, filas) => {
        if (error) {
            console.log('Error en BD:', error);
            return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
        }

        const existente = filas.length > 0 ? filas[0] : null;
        if (existente && tieneQr(existente)) {
            return res.json({ ok: true, existe: true, estudiante: existente, codigo_qr: existente.codigo_qr });
        }

        generarCodigoQr(matricula, (errorQr, codigoQr) => {
            if (errorQr) {
                console.log('Error en BD:', errorQr);
                return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
            }
            return res.json({ ok: true, existe: !!existente, estudiante: existente, codigo_qr: codigoQr });
        });
    });
});

// ------------------------------------------------------------------
// Registrar estudiante desde el botón "Agregar Estudiante" del panel
// de Administrador.
//
//  * La matrícula NUNCA se genera ni se calcula: la asigna el colegio
//    y se toma de la base de datos.
//  * Si la matrícula YA existe en `estudiantes`, se usan sus datos
//    reales (nombre, grado, grupo) tal como están en la BD y se
//    completa el registro: se guarda la foto (si se envió) y se asigna
//    su código QR si todavía no tenía. Un QR ya emitido no se cambia.
//  * Si la matrícula no existe, se crea el estudiante con esa
//    matrícula y se genera su código QR propio.
// ------------------------------------------------------------------
app.post('/admin/estudiantes', ensureRole(ROLES.ADMIN), (req, res) => {
    const matricula = parseMatricula(req.body.matricula);
    const nombre = (req.body.nombre || '').toString().trim();
    const grado = (req.body.grado || '').toString().trim();
    const grupo = parseInt(req.body.grupo, 10);
    const fotoDataUrl = (req.body.foto || '').toString();

    if (!matricula) {
        return res.status(400).json({ ok: false, mensaje: 'Ingresa una matrícula válida (número entero positivo).' });
    }

    let retrato = null;
    if (fotoDataUrl.indexOf('base64,') !== -1) {
        try {
            retrato = Buffer.from(fotoDataUrl.split('base64,')[1], 'base64');
            if (retrato.length === 0) retrato = null;
        } catch (e) {
            retrato = null; // si la foto viene corrupta, se guarda el estudiante sin foto
        }
    }

    function errorBD(err, mensaje) {
        console.log('Error en BD:', err);
        return res.status(500).json({ ok: false, mensaje: mensaje || 'Error de conexión con la base de datos.' });
    }

    connection.query(SQL_ESTUDIANTE_POR_MATRICULA, [matricula], (errorCheck, filasCheck) => {
        if (errorCheck) return errorBD(errorCheck);

        // ── Caso 1: la matrícula ya está en la base de datos ──────────
        if (filasCheck.length > 0) {
            const existente = filasCheck[0];

            function responderExistente(codigoQr) {
                return res.json({
                    ok: true,
                    existente: true,
                    mensaje: 'Matrícula tomada de la base de datos. Registro completado.',
                    estudiante: {
                        matricula: existente.matricula,
                        nombre: existente.nombre,
                        grado: existente.grado,
                        grupo: existente.grupo,
                        codigo_qr: codigoQr,
                        estado: existente.estado,
                        asistencia: existente.asistencia
                    }
                });
            }

            function guardarCambios(codigoQr, esNuevoQr) {
                if (!esNuevoQr && !retrato) return responderExistente(codigoQr);
                const sets = [];
                const params = [];
                if (esNuevoQr) { sets.push('codigo_qr = ?'); params.push(codigoQr); }
                if (retrato) { sets.push('retrato = ?'); params.push(retrato); }
                params.push(matricula);
                connection.query('UPDATE estudiantes SET ' + sets.join(', ') + ' WHERE matricula = ?', params, (errorUpd) => {
                    if (errorUpd) return errorBD(errorUpd, 'Error al actualizar el estudiante en la base de datos.');
                    return responderExistente(codigoQr);
                });
            }

            if (tieneQr(existente)) return guardarCambios(existente.codigo_qr, false);

            return generarCodigoQr(matricula, (errorQr, codigoQr) => {
                if (errorQr) return errorBD(errorQr);
                guardarCambios(codigoQr, true);
            });
        }

        // ── Caso 2: matrícula nueva → se crea el estudiante ───────────
        if (!nombre) {
            return res.status(400).json({ ok: false, mensaje: 'Ingresa el nombre completo del estudiante.' });
        }
        if (GRADOS_VALIDOS.indexOf(grado) === -1) {
            return res.status(400).json({ ok: false, mensaje: 'El grado seleccionado no es válido.' });
        }
        if (!(grupo >= 1 && grupo <= GRUPOS_POR_GRADO)) {
            return res.status(400).json({ ok: false, mensaje: 'El grupo seleccionado no es válido.' });
        }

        resolverIdGrupo(grado, grupo, (error, idGrupo) => {
            if (error) return errorBD(error);

            generarCodigoQr(matricula, (errorQr, codigoQr) => {
                if (errorQr) return errorBD(errorQr);

                function insertar(codigo, esReintento) {
                    connection.query(
                        'INSERT INTO estudiantes (matricula, nombre, retrato, codigo_qr, id_grupo, estado, asistencia) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [matricula, nombre, retrato, codigo, idGrupo, 'Activo', 100],
                        (error3) => {
                            if (error3) {
                                if (error3.code === 'ER_DUP_ENTRY') {
                                    // Alguien registró la misma matrícula justo ahora.
                                    if (String(error3.message).toUpperCase().indexOf('PRIMARY') !== -1) {
                                        return res.status(409).json({ ok: false, mensaje: 'Esa matrícula acaba de ser registrada. Vuelve a consultarla.' });
                                    }
                                    // Otro estudiante tomó ese QR en el mismo instante: matrícula completa.
                                    if (!esReintento) return insertar('ISQR-2026-' + matricula, true);
                                }
                                return errorBD(error3, 'Error al guardar el estudiante en la base de datos.');
                            }

                            return res.json({
                                ok: true,
                                existente: false,
                                mensaje: 'Estudiante agregado correctamente.',
                                estudiante: {
                                    matricula: matricula,
                                    nombre: nombre,
                                    grado: grado,
                                    grupo: grupo,
                                    codigo_qr: codigo,
                                    estado: 'Activo',
                                    asistencia: 100
                                }
                            });
                        }
                    );
                }

                insertar(codigoQr, false);
            });
        });
    });
});

// ------------------------------------------------------------------
// Editar estudiante desde el menú de acciones de la página de
// Estudiantes. Solo el Administrador puede hacerlo; la matrícula no
// se puede cambiar (es la llave primaria y ya viene del colegio).
// ------------------------------------------------------------------
app.put('/admin/estudiantes/:matricula', ensureRole(ROLES.ADMIN), (req, res) => {
    const matricula = parseInt(req.params.matricula, 10);
    const nombre = (req.body.nombre || '').trim();
    const grado = (req.body.grado || '').toString().trim();
    const grupo = parseInt(req.body.grupo, 10);
    const estado = (req.body.estado || '').trim();

    if (!matricula || !nombre || !grado || !grupo || !estado) {
        return res.status(400).json({ ok: false, mensaje: 'Completa todos los campos obligatorios.' });
    }

    resolverIdGrupo(grado, grupo, (error, idGrupo) => {
        if (error) {
            console.log('Error en BD:', error);
            return res.status(500).json({ ok: false, mensaje: 'Error de conexión con la base de datos.' });
        }

        connection.query(
            'UPDATE estudiantes SET nombre = ?, id_grupo = ?, estado = ? WHERE matricula = ?',
            [nombre, idGrupo, estado, matricula],
            (errorUpdate, resultado) => {
                if (errorUpdate) {
                    console.log('Error en BD:', errorUpdate);
                    return res.status(500).json({ ok: false, mensaje: 'Error al actualizar el estudiante en la base de datos.' });
                }
                if (resultado.affectedRows === 0) {
                    return res.status(404).json({ ok: false, mensaje: 'El estudiante no existe.' });
                }
                return res.json({ ok: true, mensaje: 'Estudiante actualizado correctamente.' });
            }
        );
    });
});

// ------------------------------------------------------------------
// Borrar estudiante desde el menú de acciones de la página de
// Estudiantes. Solo el Administrador puede hacerlo.
// ------------------------------------------------------------------
app.delete('/admin/estudiantes/:matricula', ensureRole(ROLES.ADMIN), (req, res) => {
    const matricula = parseInt(req.params.matricula, 10);
    if (!matricula) {
        return res.status(400).json({ ok: false, mensaje: 'Estudiante inválido.' });
    }

    connection.query('DELETE FROM estudiantes WHERE matricula = ?', [matricula], (error, resultado) => {
        if (error) {
            console.log('Error en BD:', error);
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
                return res.status(409).json({ ok: false, mensaje: 'No se puede borrar: este estudiante ya tiene registros de ingreso guardados.' });
            }
            return res.status(500).json({ ok: false, mensaje: 'Error al eliminar el estudiante en la base de datos.' });
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'El estudiante no existe.' });
        }
        return res.json({ ok: true, mensaje: 'Estudiante eliminado correctamente.' });
    });
});

app.use("/", require("./router.js"));

app.listen(3000, () => {
    console.log('Server is running in http://localhost:3000');
});