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

        // Verificar se usercode existe no array req.body
        const usercodeField = req.body.find(item => item.name === 'usercode');
        if (!usercodeField) {
            return res.status(400).json({ mensagem: 'Campo usercode não encontrado' });
        }

        const usercode = usercodeField.default_value;
        const associateData = await directusRequest("/items/Users?filter[id][_eq]=" + usercode + "", '', "GET")

        console.log(associateData)

        // Verificar se o responsable_type é "another" e buscar dados do paciente
        let templateId = 1; // template padrão
        
        if (associateData.responsable_type === "another") {
            templateId = 5; // template para responsável por outro paciente
            
            const patientData = await directusRequest("/items/Users?filter[user_code][_eq]=" + associateData.responsible_for + "", '', "GET")
            
            // Adicionar dados do paciente ao req.body
            req.body.push({
                name: 'Paciente',
                default_value: patientData.name_associate + " " + patientData.lastname_associate,
                readonly: true
            });
            
            req.body.push({
                name: 'CPF_paciente',
                default_value: patientData.cpf_associate,
                readonly: true
            });
        }

        var body = JSON.stringify({
            "template_id": templateId,
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
    console.log(req.body.data.values)

    const usercode = req.body.data.values.filter(item => item.field == "usercode")

    if (req.body.event_type == "form.completed") {
        await directusRequest("/items/Users/" + usercode[0].value, { associate_status: 4, contract: req.body.data.documents[0].url, status:"signedcontract"}, "PATCH")
    }
    res.status(200).send("OK")
});

module.exports = router;
