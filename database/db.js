const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.BD_HOST,
    user: process.env.BD_USER,
    password: process.env.BD_PASSWORD,
    database: process.env.BD_NAME
});

connection.connect((error) => {
    if (error) {
        console.log("Error en la conexion a la BD" + error);
        return;
    }
    console.log("Conexion a la BD exitosa");
});
module.exports = connection;