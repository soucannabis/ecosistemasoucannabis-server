const express = require('express');
const { authMiddleware } = require('./auth');
const directusRequest = require('./modules/directusRequest');
const sendEmail = require('./modules/sendEmail');
const bcrypt = require('bcrypt');
const CryptoJS = require('crypto-js');
const FormData = require('form-data');

const router = express.Router();

function decrypt(encryptedText, secretKey) {
  try {
    console.log(`🔍 [DECRYPT] Iniciando descriptografia`);
    console.log(`🔍 [DECRYPT] Texto criptografado (primeiros 20 chars): ${encryptedText?.substring(0, 20)}...`);
    console.log(`🔍 [DECRYPT] Chave disponível: ${!!secretKey}`);
    console.log(`🔍 [DECRYPT] Tamanho da chave: ${secretKey?.length || 0} caracteres`);
    
    if (!encryptedText || !secretKey) {
      console.log(`❌ [DECRYPT] Parâmetros inválidos`);
      return null;
    }
    
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    console.log(`✅ [DECRYPT] Descriptografia bem-sucedida`);
    return decrypted;
  } catch (error) {
    console.error('❌ [DECRYPT] Erro na descriptografia:', error);
    return null;
  }
}

function encrypt(plainText, secretKey) {
  const encrypted = CryptoJS.AES.encrypt(plainText, secretKey).toString();
  return encrypted;
}

const secretKey = process.env.PASS_ENCRYPT;

// ✅ ROTA: POST /api/directus/user (Protegido)
router.post('/user', authMiddleware, async (req, res) => {
  try {
    const { code_user } = req.body;
    
    // Verificar se o usuário pode acessar esses dados
    if (req.user.user_code !== code_user) {
      console.log(`❌ Tentativa de acesso negado: ${req.user.email} tentou acessar dados de ${code_user}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    // Buscar dados completos do usuário
    const userData = await directusRequest("/items/Users?filter[user_code][_eq]=" + code_user + "", "", "GET");
    
    if (userData) {
      // ✅ Filtrar dados sensíveis - remover campos desnecessários
      delete userData.status;
      delete userData.sort;
      delete userData.user_created;
      delete userData.user_updated;
      
      res.json({
        success: true,
        data: userData
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/directus/user-appointment (Protegido)
router.post('/user-appointment', authMiddleware, async (req, res) => {
  try {
    const { code_user } = req.body;
    
    // Verificar se o usuário pode acessar esses dados
    if (req.user.user_code !== code_user) {
      console.log(`❌ Tentativa de acesso negado: ${req.user.email} tentou acessar dados de ${code_user}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }
    
    const userData = await directusRequest("/items/Users?filter[user_code][_eq]=" + code_user + "", "", "GET");
    
    if (userData) {
      // ✅ Filtrar dados sensíveis para agendamentos
      delete userData.status;
      delete userData.sort;
      delete userData.user_created;
      delete userData.user_updated;
      delete userData.associate_status;
      delete userData.birthday_associate;
      delete userData.birthday_patient;
      delete userData.complement;
      delete userData.contract;
      delete userData.cpf_patient;
      delete userData.date_created;
      delete userData.date_updated;
      delete userData.email;
      delete userData.gender;
      delete userData.lastname_patient;
      delete userData.marital_status;
      delete userData.name_patient;
      delete userData.nationality;
      delete userData.pass_account;
      delete userData.proof_of_address;
      delete userData.reason_treatment;
      delete userData.reason_treatment_text;
      delete userData.responsable_type;
      delete userData.rg_associate;
      delete userData.rg_patient;
      delete userData.rg_patient_proof;
      delete userData.rg_proof;
      delete userData.secundary_number;
      delete userData.user_code;
      
      res.json({
        success: true,
        data: userData
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }
  } catch (error) {
    console.error('Erro ao buscar dados de agendamento:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/directus/login (Protegido - para compatibilidade)
router.post('/login', authMiddleware, async (req, res) => {
  try {
    const userData = await directusRequest("/items/Users?filter[email_account][_eq]=" + req.body.email + "&sort[]=-date_created", "", "GET");

    if (userData) {
      res.json({
        success: true,
        data: userData
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA search movida para /routes/public.js (rota pública)

// ✅ ROTA create-user movida para /routes/public.js (rota pública)

// ✅ ROTA: POST /api/directus/update (Protegido)
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const formData = req.body.formData;

    if (formData && formData.pass_account) {
      var pass = formData.pass_account;
      pass = pass.toString();

      var userPass = encrypt(pass, secretKey);
      formData.pass_account = userPass;
    }
    console.log(req.body)
    const userData = await directusRequest("/items/Users/" + req.body.userId, formData, "PATCH");
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/directus/files (Protegido)
router.post('/files', authMiddleware, async (req, res) => {
  try {
    const query = req.query;
    const file = req.files?.file;

    if (!file) {
      console.log("Nenhum arquivo foi enviado.");
      return res.status(400).json({ 
        success: false, 
        message: "Nenhum arquivo foi enviado." 
      });
    }

    const formData = new FormData();

    // Adiciona campos simples
    formData.append("folder", query.folder);

    // Adiciona o arquivo diretamente do buffer (file.data)
    formData.append("file", file.data, {
      filename: query.filename || file.name,
      contentType: file.mimetype,
    });

    // Adiciona outros metadados
    formData.append("title", file.name);

    // Envia o arquivo para o Directus
    const userData = await directusRequest("/files", formData, "POST");
    console.log("Arquivo enviado ao Directus:", userData);
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error("Erro no upload:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao processar a solicitação." 
    });
  }
});

// ✅ ROTA: POST /api/directus/upload-files (Protegido)
router.post('/upload-files', authMiddleware, async (req, res) => {
  try {
    const formData = {
      Users_id: req.body.userId,
      directus_files_id: req.body.fileId,
    };
    
    const userData = await directusRequest("/items/Users_files", formData, "POST");
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Erro ao fazer upload de arquivo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/directus/create-folder (Protegido)
router.post('/create-folder', authMiddleware, async (req, res) => {
  try {
    const createFolder = await directusRequest("/folders", req.body, "POST");
    
    res.json({
      success: true,
      data: createFolder
    });
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/directus/webhook-update (Protegido)
router.post('/webhook-update', authMiddleware, async (req, res) => {
  try {
    const data = req.body;

    if (data.payload.status == "associado") {
      const userData = await directusRequest("/items/Users?filter[id][_eq]=" + data.keys[0] + "", "", "GET");

      await directusRequest("/items/Users/" + data.keys[0], { associate_status: 8 }, "PATCH");
    }
    
    res.json({
      success: true,
      message: 'Webhook processado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: GET /api/directus/products (Protegido)
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const userData = await directusRequest("/items/Products", "", "GET");
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
