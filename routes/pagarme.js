const axios = require('axios')
const express = require('express');
const router = express.Router();
const pagarmRequest = require('./modules/pagarmeRequest');
const directusRequest = require('./modules/directusRequest');
const melhorenvioRequest = require('./modules/melhorenvioRequest');
const moment = require('moment-timezone');
const logger = require("./logger")()

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
        if (order.length > 0) {
            logger.directus("Buscando pedido...")
        } else {
            logger.error("Pedido não encontrado")
        }
        const userOrder = await directusRequest("/items/Users?filter[user_code][_eq]=" + order[0].user_code, "", "GET");
        if (userOrder.length > 0) {
            logger.directus("Buscando associado do pedido...")
        } else {
            logger.error("Associado do pedido não encontrado")
        }
        const transactionType = hook.data.charges[0].last_transaction.transaction_type
        const transactionResponse = await directusRequest("/items/Orders/" + order[0].id, { payment_form: transactionType, status: "finished" }, "PATCH");
        if (transactionResponse) {
            logger.directus("Pedido atualizado como concluído")
        }

        const partner = await directusRequest("/items/Partners?filter[user_code][_eq]=" + userOrder[0].partner, "", "GET");

        if (partner.length > 0) {
            logger.info("O associado tem um parceiro")
            var commissionTotal = partner[0].commission_total
            const commissionValue = parseFloat(partner[0].commission_value)
            const totalOrder = parseFloat(order[0].total)
            const commission = (totalOrder * commissionValue) / 100;
            commissionTotal = commission + commissionTotal

            var transactions = partner[0].transactions

            if (transactions == null) {
                transactions = []
            } else {
                transactions = JSON.parse(transactions)
            }
            const datetime = moment.tz('America/Sao_Paulo');

            transactions.push({
                totalOrder: totalOrder,
                commissionValue: commissionValue,
                commissionOrder: commission,
                commissionTotalPrev: partner[0].commission_total,
                commissionTotal: parseFloat(commissionTotal).toFixed(2),
                date: datetime.format(),
                orderCode: order[0].order_code,
                userCode: order[0].user_code
            }
            )

            const updatePartner = await directusRequest("/items/Partners/" + partner[0].id, { commission_total: commissionTotal, transactions: JSON.stringify(transactions) }, "PATCH");
            if (updatePartner.length > 0) {
                logger.directus("A comissão do parceiro foi atualizada")
            } else {
                logger.error("Erro ao atualizar a comissão do parceiro")
            }
        } else {
            logger.info("O associado não tem um parceiro")
        }

        try {

            function getRandomFloat(min, max) {
                return (Math.random() * (max - min) + min).toFixed(2);
            }

            const price = parseFloat(getRandomFloat(5, 40)).toFixed(2)

            const productsNames = [
                "Aroma Floral",
                "Essência Floral",
                "Aroma Natural",
                "Diluente para Aromas",
                "Aroma Floral Natural",
                "Essência Aromática Natural",
                "Diluente para Essência Natural"
            ];
            
            function getRandomElement(array) {
                const randomIndex = Math.floor(Math.random() * array.length);
                return array[randomIndex];
            }

           const deliveryRequest = await melhorenvioRequest("/cart", {
                "from": {
                    "name": "Denver Carniello Rezende",
                    "phone": "62981747027",
                    "email": "email@melhorenvio.com",
                    "state_register": "GO",
                    "address": "Rua Pb 4, 0 - Quadra 12A",
                    "city": "Anápolis",
                    "country_id": "BR",
                    "postal_code": "75093-750",
                    "state_abbr": "GO",
                    "company_document": "43624868000175",
                    "number": "s/n",
                    "district": "Parque Brasília 2ª Etapa"
                },
                "to": {
                    "name": userOrder[0].name_associate + " " + userOrder[0].lastname_associate,
                    "address": userOrder[0].street,
                    "phone": userOrder[0].mobile_number,
                    "email": "email@melhorenvio.com",                   
                    "note": userOrder[0].complement,
                    "city": userOrder[0].city,
                    "country_id": "BR",
                    "postal_code": userOrder[0].cep,
                    "state_abbr": userOrder[0].state,
                    "document": userOrder[0].cpf_associate,
                    "number": userOrder[0].number,
                    "district": userOrder[0].neighborhood,
                    "complement": userOrder[0].complement
                },
                "options": {
                    "insurance_value": price,
                    "receipt": true,
                    "own_hand": true,
                    "reverse": true,
                    "non_commercial": true,
                    "tags": [
                        {
                            "tag": order.id
                        },
                        {
                            "tag": order.user
                        }
                    ]
                },
                "service": 16,
                "agency": 13795,
                "products": [
                    {
                        "name": getRandomElement(productsNames),
                        "quantity": "1",
                        "unitary_value": "" + price + ""
                    }
                ],
                "volumes": [
                    {
                        "height": 7,
                        "width": 11,
                        "length": 16,
                        "weight": 0.5
                    }
                ]
            })

            logger.melhorenvio("Pedido criado!")
        } catch (err) {
            logger.errorMelhorenvio(err.response.data)
        }


    }

    res.send("OK")
    res.status(200)

});

module.exports = router;
