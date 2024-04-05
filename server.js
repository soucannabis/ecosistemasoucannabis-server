const express = require('express');
const cors = require("cors")
const bodyParser = require("body-parser")
const fileUpload = require('express-fileupload');
const dotenv = require('dotenv');
dotenv.config();


const app = express();
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cors({
  origin: process.env.CORS,
  credentials: true
}));


const direcuts = require('./routes/directus')
const chatwoot = require('./routes/chatwoot')
const docuseal = require('./routes/docuseal')
const pagarme = require('./routes/pagarme')
const email = require('./routes/email')

app.use('/api/directus', direcuts); 
app.use('/api/chatwoot', chatwoot)
app.use('/api/docuseal', docuseal)
app.use('/api/pagarme', pagarme)
app.use('/api/email', email)

app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
