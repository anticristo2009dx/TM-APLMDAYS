const mysql = require('mysql');
const bcryptjs = require('bcryptjs');

// Configura la conexión a tu base de datos
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tu_base_de_datos' // <-- Reemplaza por el nombre real de tu BD
});

connection.connect(async (err) => {
    if (err) {
        console.error('Error al conectar a la BD:', err);
        return;
    }

    console.log('Conectado a la base de datos.');

    // Seleccionar todos los usuarios
    connection.query('SELECT id_usuario, contrasena FROM usuarios', async (error, usuarios) => {
        if (error) {
            console.error('Error al obtener usuarios:', error);
            connection.end();
            return;
        }

        for (const usuario of usuarios) {
            // Verificar si la contraseña no parece estar encriptada ya por bcrypt (los hashes inician con $2a$ o $2b$)
            if (!usuario.contrasena.startsWith('$2a$') && !usuario.contrasena.startsWith('$2b$')) {
                const hash = await bcryptjs.hash(usuario.contrasena, 8);

                connection.query(
                    'UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?',
                    [hash, usuario.id_usuario],
                    (updateErr) => {
                        if (updateErr) {
                            console.error(`Error actualizando usuario ID ${usuario.id_usuario}:`, updateErr);
                        } else {
                            console.log(`Contraseña encriptada con éxito para el usuario ID ${usuario.id_usuario}`);
                        }
                    }
                );
            } else {
                console.log(`El usuario ID ${usuario.id_usuario} ya tiene contraseña encriptada.`);
            }
        }

        setTimeout(() => {
            console.log('Proceso finalizado.');
            connection.end();
        }, 2000);
    });
});