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

router.post('/webhook', async (req, res) => {
    const hook = req.body

    if (hook.type == "order.paid") {
        const order = await directusRequest("/items/Orders?filter[cod][_eq]=" + hook.data.code, "", "GET");
        const userOrder = await directusRequest("/items/Users?filter[id][_eq]=" + order.user, "", "GET");
        const transactionType = hook.data.charges[0].last_transaction.transaction_type

        await directusRequest("/items/Orders/" + order.id, { payment_form: transactionType, status:"finished" }, "PATCH");

    }

    res.send("OK")
    res.status(200)

});

module.exports = router;
