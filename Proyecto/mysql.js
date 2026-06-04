import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from "./base de datos/conexionmysql.js";

const app = express();
const PORT = 3000;

// Configuraciones necesarias para leer formularios y rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true })); // Permite leer datos enviados por formularios
app.use(express.static(__dirname)); // Sirve tus archivos CSS e imágenes automáticamente

// 1. RUTA PRINCIPAL: Muestra el formulario de Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 2. RUTA DE PROCESAMIENTO: Aquí llega el formulario al hacer clic en "Ingresar"
app.post('/login', async (req, res) => {
    const {username, password } = req.body; 

    try {
        const [rows] = await pool.query(
            'SELECT * FROM usuarios1 WHERE NOMBRE = ? AND PASS_ = ?', 
            [username, password]
        );

        if (rows.length > 0) {
            // Login exitoso
            res.redirect('dashboard.html'); 
        } else {
            // ❌ REDIRECCIÓN AL MISMO LOGIN CON LA BANDERA DE ERROR
            res.redirect('/?error=1');
        }

    } catch (error) {
        console.error('Error en el proceso de login:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});