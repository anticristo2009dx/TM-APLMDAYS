const express = require('express');
const router = express.Router();
    
const conexion = require("./database/db.js");

router.get('/contacto', (req, res) => {
    conexion.query("SELECT * FROM contacto", (error, results) => {
});

module.exports = router;