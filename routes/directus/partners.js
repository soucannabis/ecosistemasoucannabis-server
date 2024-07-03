const express = require('express');
const router = express.Router();
const directusRequest = require("../modules/directusRequest");
const auth = require("../modules/auth")


router.get("/partners", async (req, res) => {
  if (auth(req.headers.authorization)) {
    const response = await directusRequest("/items/Partners", "", "GET");
    res.send(response);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/partner", async (req, res) => {
  if (await auth(req.headers.authorization)) {
    const response = await directusRequest("/items/Partners?filter[user_code][_eq]=" + req.query.code, "", "GET");
    res.send(response[0]);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/partner", async (req, res) => {
  if (await auth(req.headers.authorization)) {
    const partnerData = req.body
    if (req.body && req.body.pass_account) {
      var pass = req.body.pass_account
      pass = pass.toString()
      const pass_account = encrypt(pass, process.env.PASS_ENCRYPT);
      partnerData.pass_account = pass_account
    }

  

    const response = await directusRequest("/items/Partners?filter[id_doc][_eq]=" + req.body.id_doc, "", "GET");
   console.log(response)
    if (response && !response.length > 0) {
      const createPartner = await directusRequest("/items/Partners", partnerData, "POST");
     
      if (createPartner && createPartner.id) {
        res.send(true);
      } else { res.send(false); }
    }else{
      res.send(false);
    }


    if (req.body.cpf) {
      const response = await directusRequest("/items/Partners?filter[cpf][_eq]=" + req.body.cpf, "", "GET");
      if (response && response.length > 0) {
        res.send(false);
      } else {
        const createPartner = await directusRequest("/items/Partners", partnerData, "POST");
        if (createPartner && createPartner.id) {
          res.send(true);
        } else { res.send(false); }
      }
    }

    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.delete("/partner", async (req, res) => {
  if (await auth(req.headers.authorization)) {
    const partnerData = await directusRequest("/items/Partners/" + req.body.partnerId, "", "DELETE");
    res.send(partnerData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.patch("/partner", async (req, res) => {
  if (await auth(req.headers.authorization)) {
    const partnerData = await directusRequest("/items/Partners/" + req.body.partnerId, req.body.formData, "PATCH");
    res.send(partnerData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
})

module.exports = router