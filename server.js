require("newrelic");
const express = require('express');
const cors = require("cors")
const bodyParser = require("body-parser")
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
dotenv.config();


const app = express();
app.use(bodyParser.json());
app.use(fileUpload());
const allowedOrigins = process.env.CORS.split(',');

app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origem (como em ferramentas como Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rota de healthcheck para validar se a API está ativa
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API está ativa e funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

const direcuts = require('./routes/directus')
const chatwoot = require('./routes/chatwoot')
const docuseal = require('./routes/docuseal')
const email = require('./routes/email')

app.use('/api/directus', direcuts); 
app.use('/api/chatwoot', chatwoot)
app.use('/api/docuseal', docuseal)
app.use('/api/email', email)

app.listen(process.env.PORT, '192.168.0.104', () => {
  console.log(`Servidor rodando na porta ${process.env.PORT} e IP 192.168.0.104`);
});
