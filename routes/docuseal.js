const axios = require('axios')
const express = require('express');
const router = express.Router();
const docusealRequest = require('./modules/docusealRequest');
const directusRequest = require('./modules/directusRequest');


router.post('/create-contract', async (req, res) => {

    const token = req.headers.authorization
    const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", '', "GET")

    if (verToken) {
        console.log("DOCUSEAL")
        console.log(req.body)

        var body = JSON.stringify({
            "template_id": 1,
            "submission": [
                {
                    "submitters": [
                        {
                            "name": req.body[2].default_value,
                            "role": "First Submitter",
                            "email": req.body[1].default_value,
                            "fields": req.body
                        }
                    ]
                }
            ]
        });

        const docusignContract = await docusealRequest("/submissions", body, "POST")
        res.send(docusignContract)
        res.status(200)
    } else {
        res.status(401).json({ mensagem: 'Credenciais inválidas' });
        res.status(401)
    }
});

router.post('/assign-contracts', async (req, res) => {
    console.log(req.body)
    if (req.body.event_type == "form.completed") {
        await directusRequest("/items/Users/" + req.body.data.values[0].value, { associate_status: 4, contract: req.body.data.documents[0].url, status:"signedcontract"}, "PATCH")
    }
    res.status(200).send("OK")
});

module.exports = router;
