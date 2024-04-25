const axios = require('axios')
const express = require('express');
const router = express.Router();
const correiosRequest = require('./modules/correiosRequest');
const directusRequest = require("./modules/directusRequest");

router.post('/shipment-calculate', async (req, res) => {
    const token = req.headers.authorization
    const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", '', "GET")

    if (verToken) {       
        const shipmentCalculate = await correiosRequest("/shipment/calculate",{
            "from": {
              "postal_code": req.body.cepFrom
            },
            "to": {
              "postal_code": req.body.cepTo
            },
            "products": [
              {
                "id": "xx",
                "width": 11,
                "height": 17,
                "length": 11,
                "weight": 0.7,
                "insurance_value": 1,
                "quantity": 1
              }
            ]
          })
        res.send(shipmentCalculate)
        res.status(200)
    } else {
        res.status(401).json({ mensagem: 'Credenciais inválidas' });
        res.status(401)
    }
});

module.exports = router;
