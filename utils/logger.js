const fs = require('fs');
const path = require('path');

// ✅ Sistema de logs para rastreamento de cadastro
class UserLogger {
  constructor() {
    this.logsDir = path.join(__dirname, '../logs');
    this.ensureLogsDirectory();
  }

  // ✅ Criar diretório de logs se não existir
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log('📁 [LOGGER] Diretório de logs criado:', this.logsDir);
    }
  }

  // ✅ Detectar informações do dispositivo e navegador
  detectDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // ✅ Detectar navegador
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // ✅ Detectar dispositivo
    let device = 'Desktop';
    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet')) device = 'Tablet';
    else if (userAgent.includes('iPhone')) device = 'iPhone';
    else if (userAgent.includes('iPad')) device = 'iPad';
    else if (userAgent.includes('Android')) device = 'Android';

    // ✅ Detectar sistema operacional
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';

    return {
      browser,
      device,
      os,
      userAgent,
      ip,
      timestamp: new Date().toISOString()
    };
  }

  // ✅ Gerar nome do arquivo de log baseado no email
  generateLogFileName(email) {
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.-]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    return `${sanitizedEmail}_${date}.json`;
  }

  // ✅ Log de início de sessão
  logSessionStart(req, email) {
    const deviceInfo = this.detectDeviceInfo(req);
    const logData = {
      sessionId: this.generateSessionId(),
      email: email,
      startTime: new Date().toISOString(),
      deviceInfo,
      actions: []
    };

    this.writeLog(email, logData);
    return logData.sessionId;
  }

  // ✅ Log de ação do usuário
  logUserAction(req, email, action, data = {}) {
    const deviceInfo = this.detectDeviceInfo(req);
    const actionLog = {
      timestamp: new Date().toISOString(),
      action,
      data,
      deviceInfo: {
        browser: deviceInfo.browser,
        device: deviceInfo.device,
        os: deviceInfo.os,
        ip: deviceInfo.ip
      }
    };

    this.appendToLog(email, actionLog);
  }

  // ✅ Log de página acessada
  logPageAccess(req, email, page, data = {}) {
    this.logUserAction(req, email, 'PAGE_ACCESS', {
      page,
      url: req.url,
      method: req.method,
      ...data
    });
  }

  // ✅ Log de formulário preenchido
  logFormSubmission(req, email, formName, formData = {}) {
    this.logUserAction(req, email, 'FORM_SUBMISSION', {
      formName,
      formData: this.sanitizeFormData(formData),
      fieldsCount: Object.keys(formData).length
    });
  }

  // ✅ Log de erro
  logError(req, email, error, context = {}) {
    this.logUserAction(req, email, 'ERROR', {
      error: error.message || error,
      stack: error.stack,
      context
    });
  }

  // ✅ Log de sucesso
  logSuccess(req, email, successType, data = {}) {
    this.logUserAction(req, email, 'SUCCESS', {
      successType,
      data
    });
  }

  // ✅ Sanitizar dados do formulário (remover senhas)
  sanitizeFormData(formData) {
    const sanitized = { ...formData };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.pass_account) sanitized.pass_account = '[REDACTED]';
    if (sanitized.confirmPassword) sanitized.confirmPassword = '[REDACTED]';
    return sanitized;
  }

  // ✅ Gerar ID de sessão único
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ✅ Escrever log inicial
  writeLog(email, logData) {
    try {
      const fileName = this.generateLogFileName(email);
      const filePath = path.join(this.logsDir, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(logData, null, 2));
      console.log(`📝 [LOGGER] Log criado para ${email}: ${fileName}`);
    } catch (error) {
      console.error('❌ [LOGGER] Erro ao escrever log:', error);
    }
  }

  // ✅ Adicionar ação ao log existente
  appendToLog(email, actionLog) {
    try {
      const fileName = this.generateLogFileName(email);
      const filePath = path.join(this.logsDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // ✅ Verificar se o arquivo não está vazio ou corrompido
        if (!fileContent.trim()) {
          console.warn(`⚠️ [LOGGER] Arquivo de log vazio para ${email}, recriando...`);
          this.writeLog(email, {
            sessionId: this.generateSessionId(),
            email: email,
            startTime: new Date().toISOString(),
            deviceInfo: this.detectDeviceInfo({ headers: {} }),
            actions: [actionLog]
          });
          return;
        }
        
        const existingData = JSON.parse(fileContent);
        existingData.actions.push(actionLog);
        existingData.lastActivity = new Date().toISOString();
        
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
        console.log(`📝 [LOGGER] Ação adicionada para ${email}: ${actionLog.action}`);
      } else {
        console.warn(`⚠️ [LOGGER] Arquivo de log não encontrado para ${email}`);
      }
    } catch (error) {
      console.error('❌ [LOGGER] Erro ao adicionar ação ao log:', error);
    }
  }

  // ✅ Ler log de usuário
  getUserLog(email) {
    try {
      const fileName = this.generateLogFileName(email);
      const filePath = path.join(this.logsDir, fileName);
      
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      return null;
    } catch (error) {
      console.error('❌ [LOGGER] Erro ao ler log:', error);
      return null;
    }
  }

  // ✅ Listar todos os logs
  getAllLogs() {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files.filter(file => file.endsWith('.json'));
    } catch (error) {
      console.error('❌ [LOGGER] Erro ao listar logs:', error);
      return [];
    }
  }
}

module.exports = UserLogger;
