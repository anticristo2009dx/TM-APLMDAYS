const express = require('express');
const router = express.Router();
    
const conexion = require("./database/db.js");

router.get('/contacto', (req, res) => {
    
     conexion.query("SELECT * FROM usuarios", (error, results) => { 
         if (error) {
             throw error;
         } else {
             res.render("admin", { results: results });
         }
        })
    });

    //crear registros
    router.get('/create', (req, res) => {
        res.render('create');
    }


module.exports = router;