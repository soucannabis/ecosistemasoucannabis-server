const axios = require("axios");
const express = require("express");
const router = express.Router();
const directusRequest = require("./modules/directusRequest");
const sendEmail = require("./modules/sendEmail");
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");
const FormData = require('form-data');

function decrypt(decrypt, secretKey) {
  const bytes = CryptoJS.AES.decrypt(decrypt, secretKey);
  decrypt = bytes.toString(CryptoJS.enc.Utf8);
  return decrypt;
}

function encrypt(encrypt, secretKey) {
  const encrypted = CryptoJS.AES.encrypt(encrypt, secretKey).toString();
  return encrypted;
}

const secretKey = process.env.PASS_ENCRYPT;

router.post("/auth", (req, res) => {
  const { login, senha } = req.body;

  if (login === "admin" && senha === "pass") {
    const token = jwt.sign({ login }, chaveSecreta);
    res.json({ token });
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
  }
  res.status(200);
});

module.exports = router;
