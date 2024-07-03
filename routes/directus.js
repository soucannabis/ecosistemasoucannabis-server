const axios = require("axios");
const express = require("express");
const router = express.Router();
const directusRequest = require("./modules/directusRequest");
const sendEmail = require("./modules/sendEmail");
const bcrypt = require("bcrypt");
const CryptoJS = require("crypto-js");

const partners = require("./directus/partners")
const reception = require("./directus/reception")

router.use('/', partners);
router.use('/', reception);

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


router.post("/user", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Users?filter[user_code][_eq]=" + req.body.code_user + "", "", "GET");
    if (userData) {
      //delete userData.status;
      delete userData.sort;
      delete userData.user_created;
      delete userData.user_updated;
    }
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/all-users", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Users?sort=-date_created&limit=-1", "", "GET");
console.log(userData.length)
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/users", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Users/" + req.query.userId, "", "GET");
    if (userData) {
      res.send(userData);
    }

    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/user", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    if (req.query.cpf) {
      const userData = await directusRequest("/items/Users?filter[cpf_associate][_eq]=" + req.query.cpf, "", "GET");
      if (userData) {
        res.send(userData);
      }
    }

    if (req.query.code) {
      const userData = await directusRequest("/items/Users?filter[user_code][_eq]=" + req.query.code, "", "GET");
      if (userData) {
        res.send(userData);
      }
    }

    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/login", async (req, res) => {

  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Partners?filter[email][_eq]=" + req.body.email + "&sort[]=-date_created&sort[]=-date_created", "", "GET");

    if (userData) {
      res.send(userData[0]);
    } else {
      res.send(false);
    }
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
  }
});

router.post("/search", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest(req.body.query, "", "GET");
    res.send(userData);
  }

  res.status(200).end();
});

router.post("/create-user", async (req, res) => {

  const token = req.headers.authorization;
  var formData = {};

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    if (req.body.email_account) {
      formData = {
        email_account: req.body.email_account,
        associate_status: 0,
      };
    }

    if (req.body.responsable_type) {
      formData = req.body;
    }

    // sendEmail(req.body.email_account, 'Bem-vindo à souCannabis', 'Olá, sejá bem vindo ao nosso sistema de cadastramento do usuários, siga os passos para se tornar um associado.')

    const createUser = await directusRequest("/items/Users", formData, "POST");
    res.send(createUser);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/update", async (req, res) => {
  const token = req.headers.authorization;
  const formData = req.body.formData;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Users/" + req.body.userId, formData, "PATCH");
    console.log(userData)
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
})

router.post("/update-order", async (req, res) => {
  const token = req.headers.authorization;
  const formData = req.body.formData;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/items/Orders/" + req.body.orderId, formData, "PATCH");
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
})

router.post("/files", async (req, res) => {
  const token = req.headers.authorization;

  if (!req.body.file) {
    console.log("Nenhum Arquivo");
  }

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const userData = await directusRequest("/files", req.body.file, "POST", { "Content-Type": "multipart/form-data" });
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/upload-files", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const formData = {
      Users_id: req.body.userId,
      directus_files_id: req.body.fileId,
    };
    const userData = await directusRequest("/items/Users_files", formData, "POST");
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/create-folder", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  if (verToken) {
    const createFolder = await directusRequest("/folders", req.body, "POST");
    res.send(createFolder);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/webhook-update", async (req, res) => {
  const data = req.body;

  if (data.payload.status == "associado") {
    const userData = await directusRequest("/items/Users?filter[id][_eq]=" + data.keys[0] + "", "", "GET");

    await directusRequest("/items/Users/" + data.keys[0], { associate_status: 8 }, "PATCH");
    sendEmail(userData.email_account, "Você foi aprovado como associdado", "Olá " + userData.name_associate + ", seu cadastro como associado da souCannabis foi aprovado, acesse essa página para acessar sua conta.");
  }
});

router.get("/products", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const userData = await directusRequest("/items/Products?sort=cod", "", "GET");
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/coupons", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");
  console.log(req.query)
  if (verToken) {
    const userData = await directusRequest("/items/Coupons?filter[user][_eq]="+req.query.userId, "", "GET");
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.delete("/coupons", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const userData = await directusRequest("/items/Coupons/" + req.body.couponId, "", "DELETE");
    res.send(userData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/coupons", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  const id = req.body.coupon.user
  if (verToken) {
    const userData = await directusRequest("/items/Coupons?filter[user][_eq]=" + id, "", "GET");

    if (userData && userData.length > 0) {
      res.send(false);
    } else {
      await directusRequest("/items/Coupons", req.body.coupon, "POST");
      res.send(true);
    }

    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/orders", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const orders = await directusRequest("/items/Orders", "", "GET");

    res.send(orders);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.get("/order", async (req, res) => {
  const token = req.headers.authorization;

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const orders = await directusRequest("/items/Orders?filter[order_code][_eq]=" + req.query.code, "", "GET");
    res.send(orders);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});




router.post("/documents", async (req, res) => {
  const token = req.headers.authorization;
  var docsData = []

  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const docs = await directusRequest("/items/Users_files?filter[id][_in]=" + req.body.documents, "", "GET");

    const promises = docs.map(async doc => {
      const docData = await directusRequest("/files/" + doc.directus_files_id, "", "GET");
      return {
        "docName": docData.title,
        "docType": docData.type,
        "docSlug": doc.directus_files_id
      };

    });

    const resolvedData = await Promise.all(promises);
    docsData.push(...resolvedData);

    res.send(docsData);
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});

router.post("/create-order", async (req, res) => {
  const token = req.headers.authorization;
  const verToken = await directusRequest("/items/Users_Api?filter[token][_eq]=" + token + "", "", "GET");

  if (verToken) {
    const order = await directusRequest("/items/Orders", req.body, "POST");
    res.send(order)
    res.status(200);
  } else {
    res.status(401).json({ mensagem: "Credenciais inválidas" });
    res.status(401);
  }
});


module.exports = router;
