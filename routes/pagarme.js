const axios = require('axios')
const express = require('express');
const router = express.Router();
const pagarmRequest = require('./modules/pagarmeRequest');
const directusRequest = require('./modules/directusRequest');

router.post('/orders', async (req, res) => {

    const token = req.headers.authorization
    const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", '', "GET")

    if (verToken) {     
        const order = await pagarmRequest("/orders", req.body, "POST")
        res.send(order)
        res.status(200)
    } else {
        res.status(401).json({ mensagem: 'Credenciais inválidas' });
        res.status(401)
    }
});

module.exports = router;
