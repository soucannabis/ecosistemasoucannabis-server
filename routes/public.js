const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const directusRequest = require('./modules/directusRequest');
const sendEmail = require('./modules/sendEmail');
const CryptoJS = require('crypto-js');
const UserLogger = require('../utils/logger');
const router = express.Router();

// ✅ Inicializar sistema de logs
const logger = new UserLogger();

function encrypt(encrypt, secretKey) {
    const encrypted = CryptoJS.AES.encrypt(encrypt, secretKey).toString();
    return encrypted;
}

// ✅ Função para gerar token seguro
function generateSecureToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

// ✅ Função para salvar sessão
async function saveUserSession(userId, sessionToken) {
  try {
    const sessionData = {
      session_token: sessionToken,
      session_expires: null, // Sessão não expira mais
      last_activity: new Date().toISOString(),
      is_session_active: true
    };
    
    const response = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    
    if (response.ok) {
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ [SESSION] Erro ao salvar sessão: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ [SESSION] Erro ao salvar sessão:', error);
    return false;
  }
}

// ✅ ROTA PÚBLICA: POST /api/directus/create-user
router.post('/create-user', async (req, res) => {
  try {
    var formData = {};
    const isPatientCreation = req.body?.responsable_type === "patient" || !!req.body?.responsable_code;

    if (req.body.email_account) {
      formData = {
        email_account: req.body.email_account,
        associate_status: 0,
        partner: req.body.partner
      };
      if (req.body.bvid) {
        formData.bvid = req.body.bvid;
      }
      if (req.body.status) {
        formData.status = req.body.status;
      }
      
      // ✅ Log de início de sessão de cadastro
      const sessionId = logger.logSessionStart(req, req.body.email_account);
      logger.logPageAccess(req, req.body.email_account, 'CREATE_USER', {
        endpoint: '/api/directus/create-user',
        method: 'POST',
        formData: logger.sanitizeFormData(formData)
      });
    }

    if (req.body.responsable_type) {
      formData = req.body;
    }

    if (isPatientCreation) {
      formData.status = "Paciente";
    }

    const createUser = await directusRequest("/items/Users", formData, "POST");
    
    // Se usuário foi criado com sucesso, gerar token e definir cookie de sessão
    if (createUser && createUser.id) {
      if (isPatientCreation) {
        return res.json({
          success: true,
          data: createUser
        });
      }

      // Gerar token único
      const sessionToken = generateSecureToken();
      
      // Salvar sessão no banco
      const sessionSaved = await saveUserSession(createUser.id, sessionToken);
      
      if (sessionSaved) {
        const isHttps = req.headers.origin && req.headers.origin.startsWith('https://');
        
        if (isHttps) {
          console.log('🌐 [PRODUÇÃO] Usando configuração HTTPS com domain na criação de usuário');
          // ✅ Produção: configuração HTTPS com domain para subdomínios
          res.cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: true,                    // ✅ HTTPS obrigatório
            sameSite: 'lax',                // ✅ Compatível com Safari
            domain: process.env.COOKIE_DOMAIN,     // ✅ Domínio configurável
            path: '/',
            maxAge: 365 * 10 * 24 * 60 * 60 * 1000 // 10 anos
          });
          
          // ✅ Headers específicos para produção
          res.header('Access-Control-Allow-Credentials', 'true');
          res.header('Access-Control-Allow-Origin', req.headers.origin);
        } else {
          console.log('🏠 [LOCAL] Usando configuração para localhost na criação de usuário');
          // ✅ Localhost: configuração local
          res.cookie('session_token', sessionToken, {
            httpOnly: true,
            secure: false,                   // ✅ HTTP local
            sameSite: 'lax',                 // ✅ Same-origin
            path: '/',
            maxAge: 365 * 10 * 24 * 60 * 60 * 1000 // 10 anos
          });
        }
        
        // ✅ Log de sucesso na criação de usuário
        if (req.body.email_account) {
          logger.logSuccess(req, req.body.email_account, 'USER_CREATED', {
            userId: createUser.id,
            userCode: createUser.user_code,
            sessionToken: sessionToken ? 'SET' : 'NOT_SET'
          });
        }
        
        res.json({
          success: true,
          data: createUser
        });
      } else {
        console.log(`❌ [CREATE-USER] Falha ao salvar sessão para usuário: ${createUser.id}`);
        res.status(500).json({ 
          success: false, 
          message: 'Usuário criado, mas erro ao criar sessão' 
        });
      }
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao criar usuário' 
      });
    }
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    
    // ✅ Log de erro
    if (req.body.email_account) {
      logger.logError(req, req.body.email_account, error, {
        endpoint: '/api/directus/create-user',
        method: 'POST'
      });
    }
    
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

// ============================================================
// ✅ ROTAS PÚBLICAS: dados do pet via link (UUID = Users.user_code)
//    GET  /api/pet-data/:associateCode  -> dados atuais do pet
//    (o parâmetro de URL da página é ac e o valor é o Users.user_code)
//    POST /api/pet-data/:associateCode  -> atualiza Users.pet_data
// O código é um UUID não adivinhável e funciona como credencial
// do link; só o campo pet_data é lido/alterado, só para tipo "pet".
// ============================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PET_SPECIES = ['felino', 'canino'];
const PET_SEX = ['macho', 'femea'];

async function findPetUserByAssociateCode(associateCode) {
  const url =
    `${process.env.DIRECTUS_API_URL}/items/Users` +
    `?filter[user_code][_eq]=${encodeURIComponent(associateCode)}` +
    `&fields=id,name_associate,responsable_type,pet_data&limit=1`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`Directus respondeu ${response.status} ao buscar associado`);
  }
  const json = await response.json();
  const user = json?.data?.[0];
  if (!user || user.responsable_type !== 'pet') return null;
  return user;
}

function parseStoredPetData(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return typeof raw === 'object' ? raw : null;
}

// Valida e normaliza o corpo. Retorna { value } ou { errors }
function validatePetData(input) {
  const errors = [];
  const data = input && typeof input === 'object' ? input : {};
  const text = (v, max) => {
    if (v === null || v === undefined) return null;
    const str = String(v).trim();
    if (str === '') return null;
    return str.slice(0, max);
  };

  const especie = text(data.especie, 20)?.toLowerCase() || null;
  if (!PET_SPECIES.includes(especie)) errors.push('especie');

  const sexo = text(data.sexo, 20)?.toLowerCase() || null;
  if (!PET_SEX.includes(sexo)) errors.push('sexo');

  const raca = text(data.raca, 100);
  if (!raca) errors.push('raca');

  const idade = data.idade === '' || data.idade === null || data.idade === undefined
    ? NaN
    : Number(data.idade);
  if (!Number.isInteger(idade) || idade < 0 || idade > 60) errors.push('idade');

  if (errors.length) return { errors };
  return {
    value: {
      especie,
      raca,
      idade,
      sexo,
      tipo_produto: text(data.tipo_produto, 100),
      dosagem: text(data.dosagem, 200),
    },
  };
}

router.get('/pet-data/:associateCode', async (req, res) => {
  try {
    const { associateCode } = req.params;
    if (!UUID_REGEX.test(associateCode)) {
      return res.status(400).json({ success: false, message: 'Link inválido' });
    }
    const user = await findPetUserByAssociateCode(associateCode);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Link inválido' });
    }
    res.json({
      success: true,
      data: {
        name: user.name_associate || null,
        pet_data: parseStoredPetData(user.pet_data),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados do pet:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
});

router.post('/pet-data/:associateCode', async (req, res) => {
  try {
    const { associateCode } = req.params;
    if (!UUID_REGEX.test(associateCode)) {
      return res.status(400).json({ success: false, message: 'Link inválido' });
    }

    const { value, errors } = validatePetData(req.body?.pet_data);
    if (errors) {
      return res.status(422).json({ success: false, message: 'Dados inválidos', fields: errors });
    }

    const user = await findPetUserByAssociateCode(associateCode);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Link inválido' });
    }

    const response = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${user.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pet_data: value }),
    });
    if (!response.ok) {
      console.error('Erro Directus ao salvar pet_data:', response.status, await response.text());
      return res.status(502).json({ success: false, message: 'Não foi possível salvar' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar dados do pet:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
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

// ✅ ROTA PÚBLICA: POST /api/logs/user-session
router.post('/user-session', async (req, res) => {
  try {
    const { email, logs } = req.body;
    
    console.log('📝 [LOGS] Recebendo logs do frontend para:', email);
    
    // ✅ Log de recebimento de logs do frontend
    logger.logUserAction(req, email, 'FRONTEND_LOGS_RECEIVED', {
      sessionId: logs.sessionId,
      totalActions: logs.totalActions,
      startTime: logs.startTime,
      endTime: logs.endTime
    });
    
    // ✅ Salvar logs do frontend
    const fileName = logger.generateLogFileName(email);
    const filePath = path.join(logger.logsDir, `frontend_${fileName}`);
    
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
    console.log(`📝 [LOGS] Logs do frontend salvos: ${fileName}`);
    
    res.json({
      success: true,
      message: 'Logs recebidos com sucesso'
    });
  } catch (error) {
    console.error('❌ [LOGS] Erro ao processar logs do frontend:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar logs'
    });
  }
});

module.exports = router;
