const express = require('express');
const router = express.Router();
    
const conexion

router.get('/contacto', (req, res) => {
    res.send("contacto");
});

module.exports = router;