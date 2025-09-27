const express = require('express');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const router = express.Router();

// ✅ Função para validar credenciais
async function validateUserCredentials(email, password) {
  try {
    console.log(`🔍 [AUTH] Iniciando validação de credenciais para: ${email}`);
    
    // Buscar usuário usando credenciais do servidor
    const userResponse = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users?filter[email_account][_eq]=${email}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔍 [AUTH] Status da resposta da API: ${userResponse.status}`);
    
    const users = await userResponse.json();
    console.log(`🔍 [AUTH] Dados retornados da API:`, JSON.stringify(users, null, 2));
    
    if (users.data && users.data.length > 0) {
      const user = users.data[0];
      console.log(`🔍 [AUTH] Usuário encontrado:`, {
        id: user.id,
        user_code: user.user_code,
        name: user.name,
        email: user.email_account,
        hasPassword: !!user.pass_account
      });
      
      // Se o usuário não tem senha definida (cadastro recente), permitir login
      if (!user.pass_account || user.pass_account === null) {
        console.log(`✅ [AUTH] Login de usuário recém-cadastrado: ${email}`);
        return {
          id: user.id,
          user_code: user.user_code,
          name: user.name,
          email: user.email_account
        };
      }
      
      // Se o usuário tem senha definida, validar credenciais
      console.log(`🔍 [AUTH] Validando senha para usuário: ${email}`);
      const decryptedPassword = decryptPassword(user.pass_account, process.env.PASS_ENCRYPT);
      
      // Verificar se a descriptografia foi bem-sucedida
      if (!decryptedPassword) {
        console.log(`❌ [AUTH] Erro ao descriptografar senha do usuário ${email}`);
        return null;
      }
      
      console.log(`🔍 [AUTH] Senha descriptografada com sucesso para: ${email}`);
      
      // Comparar senhas no servidor
      const passwordMatch = decryptedPassword === password;
      console.log(`🔍 [AUTH] Comparação de senhas para ${email}: ${passwordMatch ? 'MATCH' : 'NO MATCH'}`);
      
      if (passwordMatch) {
        console.log(`✅ [AUTH] Credenciais válidas para: ${email}`);
        return {
          id: user.id,
          user_code: user.user_code,
          name: user.name,
          email: user.email_account
        };
      } else {
        console.log(`❌ [AUTH] Senha incorreta para: ${email}`);
      }
    } else {
      console.log(`❌ [AUTH] Usuário não encontrado: ${email}`);
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
    
    console.log(`✅ [DECRYPT] Senha descriptografada com sucesso`);
    return decrypted;
  } catch (error) {
    console.error('❌ [DECRYPT] Erro na descriptografia:', error);
    return null;
  }
}

// ✅ Função para gerar token seguro
function generateSecureToken() {
  const token = crypto.randomBytes(32).toString('hex');
  console.log(`🔍 [TOKEN] Token de sessão gerado: ${token.substring(0, 20)}...`);
  console.log(`🔍 [TOKEN] Tamanho do token: ${token.length} caracteres`);
  return token;
}

// ✅ Função para salvar sessão
async function saveUserSession(userId, sessionToken) {
  try {
    console.log(`🔍 [SESSION] Salvando sessão para usuário ID: ${userId}`);
    console.log(`🔍 [SESSION] Token da sessão: ${sessionToken.substring(0, 20)}...`);
    
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora
    console.log(`🔍 [SESSION] Sessão expira em: ${expiresAt.toISOString()}`);
    
    const sessionData = {
      session_token: sessionToken,
      session_expires: expiresAt.toISOString(),
      last_activity: new Date().toISOString(),
      is_session_active: true
    };
    
    console.log(`🔍 [SESSION] Dados da sessão:`, JSON.stringify(sessionData, null, 2));
    
    const response = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    
    console.log(`🔍 [SESSION] Status da resposta da API: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ [SESSION] Sessão salva com sucesso para usuário: ${userId}`);
    } else {
      const errorText = await response.text();
      console.log(`❌ [SESSION] Erro ao salvar sessão: ${errorText}`);
    }
    
    return response.ok;
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
    console.log(`🔍 [MIDDLEWARE] Iniciando verificação de autenticação`);
    console.log(`🔍 [MIDDLEWARE] URL da requisição: ${req.originalUrl}`);
    console.log(`🔍 [MIDDLEWARE] Método: ${req.method}`);
    console.log(`🔍 [MIDDLEWARE] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`🔍 [MIDDLEWARE] Cookies recebidos:`, JSON.stringify(req.cookies, null, 2));
    
    const sessionToken = req.cookies.session_token;
    
    if (!sessionToken) {
      console.log(`❌ [MIDDLEWARE] Token de sessão não encontrado nos cookies`);
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }
    
    console.log(`🔍 [MIDDLEWARE] Token de sessão encontrado: ${sessionToken.substring(0, 20)}...`);
    
    // Verificar sessão no banco (buscar usuário pelo session_token)
    console.log(`🔍 [MIDDLEWARE] Verificando sessão no banco de dados`);
    const userResponse = await fetch(`${process.env.DIRECTUS_API_URL}/items/Users?filter[session_token][_eq]=${sessionToken}&filter[is_session_active][_eq]=true`, {
      headers: {
        'Authorization': `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`🔍 [MIDDLEWARE] Status da resposta da API: ${userResponse.status}`);
    const users = await userResponse.json();
    console.log(`🔍 [MIDDLEWARE] Dados retornados da API:`, JSON.stringify(users, null, 2));
    
    if (!users.data || users.data.length === 0) {
      console.log(`❌ [MIDDLEWARE] Sessão não encontrada ou inativa no banco`);
      return res.status(401).json({ success: false, message: 'Sessão inválida' });
    }
    
    const user = users.data[0];
    console.log(`🔍 [MIDDLEWARE] Usuário encontrado:`, {
      id: user.id,
      user_code: user.user_code,
      name: user.name,
      email: user.email_account,
      session_expires: user.session_expires,
      is_session_active: user.is_session_active
    });
    
    // Verificar se não expirou
    const now = new Date();
    const expiresAt = new Date(user.session_expires);
    console.log(`🔍 [MIDDLEWARE] Verificando expiração - Agora: ${now.toISOString()}, Expira: ${expiresAt.toISOString()}`);
    
    if (now > expiresAt) {
      console.log(`❌ [MIDDLEWARE] Sessão expirada - invalidando`);
      // Marcar como inativa
      await invalidateUserSession(sessionToken);
      return res.status(401).json({ success: false, message: 'Sessão expirada' });
    }
    
    console.log(`✅ [MIDDLEWARE] Sessão válida - adicionando usuário à requisição`);
    
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
    
    console.log(`✅ [MIDDLEWARE] Autenticação bem-sucedida - prosseguindo`);
    next();
  } catch (error) {
    console.error('❌ [MIDDLEWARE] Erro no middleware de auth:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
}

// ✅ ROTA: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    console.log(`🔍 [LOGIN] Iniciando processo de login`);
    console.log(`🔍 [LOGIN] Headers da requisição:`, JSON.stringify(req.headers, null, 2));
    console.log(`🔍 [LOGIN] Body da requisição:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 [LOGIN] URL completa: ${req.originalUrl}`);
    console.log(`🔍 [LOGIN] Método: ${req.method}`);
    
    const { email, password } = req.body;
    
    // Validar entrada
    if (!email || !password) {
      console.log(`❌ [LOGIN] Dados obrigatórios não fornecidos - Email: ${!!email}, Senha: ${!!password}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }
    
    console.log(`🔍 [LOGIN] Dados de entrada válidos - Email: ${email}`);
    
    // Validar credenciais
    const user = await validateUserCredentials(email, password);
    
    if (user) {
      console.log(`✅ [LOGIN] Usuário autenticado com sucesso:`, {
        id: user.id,
        user_code: user.user_code,
        name: user.name,
        email: user.email
      });
      
      // Gerar token único
      const sessionToken = generateSecureToken();
      
      // Salvar sessão
      const sessionSaved = await saveUserSession(user.id, sessionToken);
      
      if (sessionSaved) {
        console.log(`🔍 [COOKIE] Configurando cookie de sessão`);
        console.log(`🔍 [COOKIE] Nome: session_token`);
        console.log(`🔍 [COOKIE] Valor: ${sessionToken.substring(0, 20)}...`);
        console.log(`🔍 [COOKIE] HttpOnly: true`);
        console.log(`🔍 [COOKIE] Secure: ${process.env.NODE_ENV === 'production'}`);
        console.log(`🔍 [COOKIE] Origem: ${req.headers.origin || 'sem origem'}`);
        console.log(`🔍 [COOKIE] Host: ${req.headers.host}`);
        console.log(`🔍 [COOKIE] SameSite: strict (funciona para cross-origin)`);
        console.log(`🔍 [COOKIE] MaxAge: 24 horas`);
        
        // Definir cookie HttpOnly com configuração que funciona para cross-origin
        res.cookie('session_token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });
        
        console.log(`✅ [COOKIE] Cookie configurado com sucesso`);
        
        // Log de auditoria
        console.log(`✅ [LOGIN] Login realizado: ${user.email} - ${new Date().toISOString()}`);
        
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
      // Log de tentativa de login inválida
      console.log(`❌ [LOGIN] Tentativa de login inválida: ${email} - ${new Date().toISOString()}`);
      
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
    
    // Log de auditoria
    console.log(`✅ Logout realizado: ${req.user.email} - ${new Date().toISOString()}`);
    
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
