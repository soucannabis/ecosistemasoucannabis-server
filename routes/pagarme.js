const axios = require('axios')
const express = require('express');
const router = express.Router();
const pagarmRequest = require('./modules/pagarmeRequest');
const directusRequest = require('./modules/directusRequest');
const moment = require('moment-timezone');

router.post('/orders', async (req, res) => {

    const token = req.headers.authorization
    const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", '', "GET")

    if (verToken) {
        const order = await pagarmRequest("/orders", req.body, "POST")
        console.log(order)
        res.send(order)
        res.status(200)
    } else {
        res.status(401).json({ mensagem: 'Credenciais inválidas' });
        res.status(401)
    }
});

router.post('/orders', async (req, res) => {

    const token = req.headers.authorization
    const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", '', "GET")

    if (verToken) {
        const order = await pagarmRequest("/orders", req.body, "POST")
        console.log(order)
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
        const order = await directusRequest("/items/Orders?filter[order_code][_eq]=" + hook.data.code, "", "GET");
        const userOrder = await directusRequest("/items/Users?filter[user_code][_eq]=" + order[0].user_code, "", "GET");
        const transactionType = hook.data.charges[0].last_transaction.transaction_type

        const partner = await directusRequest("/items/Partners?filter[user_code][_eq]=" + userOrder[0].partner, "", "GET");
        var commissionTotal = partner[0].commission_total

        const commissionValue = parseFloat(partner[0].commission_value)
        const totalOrder = parseFloat(order[0].total)
        const commission = (totalOrder * commissionValue) / 100;
        commissionTotal = commission + commissionTotal

        var transactions = partner[0].transactions

        if (transactions == null) {
            transactions = []
        }else{
            transactions = JSON.parse(transactions)
        }

        const datetime = moment.tz('America/Sao_Paulo');

        transactions.push({
            commissionValue: commissionValue,
            commissionOrder: commission,
            commissionTotalPrev: partner[0].commission_total,
            commissionTotal: parseFloat(commissionTotal).toFixed(2),
            date: datetime.format(),
            orderCode: order[0].order_code,
            userCode: order[0].user_code
        }
        )

         await directusRequest("/items/Partners/" + partner[0].id, { commission_total: commissionTotal, transactions:JSON.stringify(transactions) }, "PATCH");
         await directusRequest("/items/Orders/" + order[0].id, { payment_form: transactionType, status: "finished" }, "PATCH");

    }

    res.send("OK")
    res.status(200)

});

module.exports = router;
