const express = require('express');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const router = express.Router();

// ✅ Função para validar credenciais
async function validateUserCredentials(email, password) {
  try {
    // Buscar usuário usando credenciais do servidor
    const userResponse = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users?filter[email_account][_eq]=${email}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = await userResponse.json();
    
    if (users.data && users.data.length > 0) {
      const user = users.data[0];
      
      // Se o usuário não tem senha definida (cadastro recente), permitir login
      if (!user.pass_account || user.pass_account === null) {
        return {
          id: user.id,
          user_code: user.user_code,
          name: user.name,
          email: user.email_account
        };
      }
      
      // Se o usuário tem senha definida, validar credenciais
      const decryptedPassword = decryptPassword(user.pass_account, process.env.PASS_ENCRYPT);
      
      // Verificar se a descriptografia foi bem-sucedida
      if (!decryptedPassword) {
        console.error(`❌ [AUTH] Erro ao descriptografar senha do usuário ${email}`);
        return null;
      }
      
      // Comparar senhas no servidor
      const passwordMatch = decryptedPassword === password;
      
      if (passwordMatch) {
        return {
          id: user.id,
          user_code: user.user_code,
          name: user.name,
          email: user.email_account
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ [AUTH] Erro na validação:', error);
    return null;
  }
}

// ✅ Função para descriptografar senha (usando CryptoJS para compatibilidade)
function decryptPassword(encryptedPassword, key) {
  try {
    console.log(`🔍 [DECRYPT] Iniciando descriptografia de senha`);
    console.log(`🔍 [DECRYPT] Senha criptografada (primeiros 20 chars): ${encryptedPassword.substring(0, 20)}...`);
    console.log(`🔍 [DECRYPT] Chave de criptografia disponível: ${!!key}`);
    
    if (!encryptedPassword || !key) {
      console.log(`❌ [DECRYPT] Parâmetros inválidos`);
      return null;
    }
    
    // Usar CryptoJS para compatibilidade com o sistema existente
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      console.log(`❌ [DECRYPT] Falha na descriptografia - resultado vazio`);
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('❌ [DECRYPT] Erro na descriptografia:', error);
    return null;
  }
}

// ✅ Função para gerar token seguro
function generateSecureToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return token;
}

// ✅ Função para salvar sessão
async function saveUserSession(userId, sessionToken) {
  try {
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 dias
    
    const sessionData = {
      session_token: sessionToken,
      session_expires: expiresAt.toISOString(),
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

// ✅ Função para invalidar sessão
async function invalidateUserSession(sessionToken) {
  try {
    // Buscar usuário pelo session_token
    const userResponse = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users?filter[session_token][_eq]=${sessionToken}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = await userResponse.json();
    
    if (users.data && users.data.length > 0) {
      const user = users.data[0];
      
      // Invalidar sessão do usuário
      const response = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_session_active: false,
          session_token: null,
          session_expires: null
        })
      });
      
      return response.ok;
    }
    
    return true; // Se não encontrou usuário, considera como sucesso
  } catch (error) {
    console.error('Erro ao invalidar sessão:', error);
    return false;
  }
}

// ✅ Middleware de autenticação
async function authMiddleware(req, res, next) {
  try {
    const sessionToken = req.cookies.session_token;
    
    if (!sessionToken) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    
    // Verificar sessão no banco (buscar usuário pelo session_token)
    const userResponse = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users?filter[session_token][_eq]=${sessionToken}&filter[is_session_active][_eq]=true`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = await userResponse.json();
    
    if (!users.data || users.data.length === 0) {
      return res.status(401).json({ success: false, message: 'Sessão inválida' });
    }
    
    const user = users.data[0];
    
    // Verificar se não expirou
    const now = new Date();
    const expiresAt = new Date(user.session_expires);
    
    if (now > expiresAt) {
      // Marcar como inativa
      await invalidateUserSession(sessionToken);
      return res.status(401).json({ success: false, message: 'Sessão expirada' });
    }
    
    // Adicionar dados do usuário à requisição
    req.user = {
      id: user.id,
      user_code: user.user_code,
      name: user.name,
      email: user.email_account
    };
    
    console.log(`🔍 [MIDDLEWARE] Atualizando última atividade do usuário`);
    
    // Atualizar última atividade
    await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        last_activity: new Date().toISOString()
      })
    });
    
    next();
  } catch (error) {
    console.error('❌ [MIDDLEWARE] Erro no middleware de auth:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

// ✅ ROTA: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validar entrada
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    // Validar credenciais
    const user = await validateUserCredentials(email, password);
    
    if (user) {
      
      // Gerar token único
      const sessionToken = generateSecureToken();
      
      // Salvar sessão
      const sessionSaved = await saveUserSession(user.id, sessionToken);
      
      if (sessionSaved) {            
        // Definir cookie HttpOnly com configuração que funciona para cross-origin
        res.cookie('session_token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: "none",
          path: '/',
          maxAge: 5 * 24 * 60 * 60 * 1000 // 5 dias
        });
        
        res.json({
          success: true,
          user: {
            user_code: user.user_code,
            name: user.name,
            email: user.email
          }
        });
      } else {
        console.log(`❌ [LOGIN] Falha ao salvar sessão para usuário: ${user.email}`);
        res.status(500).json({ 
          success: false, 
          message: 'Erro ao criar sessão' 
        });
      }
    } else {
      res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }
  } catch (error) {
    console.error('❌ [LOGIN] Erro no login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        user_code: req.user.user_code,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// ✅ ROTA: POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const sessionToken = req.cookies.session_token;
    
    // Invalidar sessão no banco
    await invalidateUserSession(sessionToken);
    
    // Limpar cookie
    res.clearCookie('session_token');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = { router, authMiddleware };
