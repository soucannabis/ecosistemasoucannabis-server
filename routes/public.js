const express = require('express');
const directusRequest = require('./modules/directusRequest');
const sendEmail = require('./modules/sendEmail');
const CryptoJS = require('crypto-js');
const router = express.Router();

function encrypt(encrypt, secretKey) {
    const encrypted = CryptoJS.AES.encrypt(encrypt, secretKey).toString();
    return encrypted;
}

// ✅ ROTA PÚBLICA: POST /api/directus/create-user
router.post('/create-user', async (req, res) => {
  try {
    var formData = {};

    if (req.body.email_account) {
      formData = {
        email_account: req.body.email_account,
        associate_status: 0,
        partner: req.body.partner
      };
    }

    if (req.body.responsable_type) {
      formData = req.body;
    }

    const createUser = await directusRequest("/items/Users", formData, "POST");
    
    // Se usuário foi criado com sucesso, definir cookie de sessão
    if (createUser && createUser.id && createUser.session_token) {
      res.cookie('session_token', createUser.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 5 * 24 * 60 * 60 * 1000 // 5 dias
      });
    }
    
    res.json({
      success: true,
      data: createUser
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA PÚBLICA: POST /api/directus/search
router.post('/search', async (req, res) => {
  try {
    const userData = await directusRequest(req.body.query, "", "GET");
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA PÚBLICA: POST /api/email/lost-password
router.post('/lost-password', async (req, res) => {
  try {
    const userData = await directusRequest("/items/Users?filter[email_account][_eq]=" + req.body.email + "", '', "GET");

    if (userData == undefined) {
      console.log("email nao existe");
      res.json({
        success: false,
        message: "Email não encontrado"
      });
      return;
    }
        
    const secretKey = process.env.PASS_ENCRYPT;

    var id = userData.id;
    id = id.toString();

    const date = new Date().getTime();

    const timestamp = encrypt(date.toString(), secretKey);
    const userId = encrypt(id.toString(), secretKey);

    sendEmail(req.body.email, 'Recuperação de senha', '<a href="' + process.env.REACT_APP_URL + '/nova-senha?' + timestamp + '?' + userId + '">Clique aqui para redefinir sua senha</a>');

    res.json({
      success: true,
      message: "Email de recuperação enviado"
    });
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA PÚBLICA: POST /api/redefine-pass (para redefinição de senha sem autenticação)
router.post('/redefine-pass', async (req, res) => {
  try {
    console.log(`🔍 [REDEFINE] Dados recebidos:`, JSON.stringify(req.body, null, 2));
    
    const { userId, formData } = req.body;
    
    // Verificar se userId existe
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId é obrigatório'
      });
    }
    
    // Verificar se formData existe
    if (!formData) {
      return res.status(400).json({
        success: false,
        message: 'formData é obrigatório'
      });
    }
    
    // Aceitar tanto pass_account quanto passA
    const newPassword = formData.pass_account || formData.passA;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'formData.pass_account ou formData.passA é obrigatório'
      });
    }
    
    console.log(`🔍 [REDEFINE] Redefinindo senha para usuário ID: ${userId}`);
    console.log(`🔍 [REDEFINE] Nova senha (primeiros 5 chars): ${newPassword.substring(0, 5)}...`);
    
    const secretKey = process.env.PASS_ENCRYPT;
    
    // Criptografar nova senha
    const pass = newPassword.toString();
    const encryptedPassword = encrypt(pass, secretKey);
    
    console.log(`🔍 [REDEFINE] Senha criptografada (primeiros 20 chars): ${encryptedPassword.substring(0, 20)}...`);
    
    // Preparar dados para atualização
    const updateData = {
      pass_account: encryptedPassword
    };
    
    console.log(`🔍 [REDEFINE] Atualizando senha no banco para usuário ID: ${userId}`);
    const userData = await directusRequest("/items/Users/" + userId, updateData, "PATCH");
    console.log(`🔍 [REDEFINE] Resposta da atualização:`, userData);
    
    res.json({
      success: true,
      message: "Senha redefinida com sucesso",
      data: userData
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
