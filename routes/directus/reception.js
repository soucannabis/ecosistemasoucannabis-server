const express = require('express');
const router = express.Router();
const directusRequest = require("../modules/directusRequest");
const auth = require("../modules/auth")


router.get("/reception", async (req, res) => {
  if (auth(req.headers.authorization)) {
    const response = await directusRequest("/items/Reception", "", "GET");
    res.send(response);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.patch("/reception", async (req, res) => {
  if (auth(req.headers.authorization)) {
    const response = await directusRequest("/items/Reception/"+req.query.id, {reception_phase:req.body.columnId}, "PATCH");
    res.send(response);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});


router.post("/reception", async (req, res) => {
  if (auth(req.headers.authorization)) {
    const response = await directusRequest("/items/Reception/", req.body, "POST");
    res.send(response);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

module.exports = router