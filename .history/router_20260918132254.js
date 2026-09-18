const express = require('express');
const router = express.Router();
    
const conexion = require("./database/db.js");

router.get('/contacto', (req, res) => {
    
     conexion.query("SELECT * FROM usuarios", (error, results) => { 
         if (error) {
             throw error;
         } else {
             res.send("admin", result:results);
         }
        })
    });

module.exports = router;