const express = require('express');
const router = express.Router();
    
const conexion = require("./database/db.js");

router.get('/contacto', (req, res) => {
    res.render
    // conexion.query("SELECT * FROM usuarios", (error, results) => { 
    //     if (error) {
    //         throw error;
    //     } else {
    //         res.send(results);
    //     }
    // })
    });

module.exports = router;