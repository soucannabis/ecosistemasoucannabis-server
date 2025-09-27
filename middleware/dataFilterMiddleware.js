const dataFilterMiddleware = (req, res, next) => {
  // ✅ Excluir rotas de autenticação do middleware de filtro
  const route = req.baseUrl + req.path;
  if (route.startsWith('/api/auth')) {
    console.log(`🔍 [MIDDLEWARE] Rotas de autenticação excluídas do filtro: ${route}`);
    return next();
  }
  
  // Intercepta res.json() para filtrar dados
  const originalJson = res.json;
  res.json = function(data) {
    const filteredData = filterDataByPath(data, req);
    return originalJson.call(this, filteredData);
  };
  next();
};

// ✅ Função principal de filtragem
function filterDataByPath(data, req) {
  const route = req.baseUrl + req.path;
  const method = req.method;
  const query = req.query;
  const page = query?.info?.split("->")[0]?.trim();

  // ✅ Configuração de filtros adaptada para o sistema atual
  const filters = {
    // Filtros para autenticação
    '/api/directus/search': {
      'default': {
        'POST': {
          allowedFields: ['email_account', 'user_code']
        }
      }
    }
  };

  // ✅ Buscar configuração de filtro
  const filterConfig = findFilterConfig(filters, route, page, method);
  
  if (filterConfig) {
    // ✅ Aplicar filtro
    return applyFilter(data, filterConfig);
  }
  
  // ✅ Se não há filtro configurado, retornar dados originais
  return data;
}

// ✅ Função para encontrar configuração de filtro
function findFilterConfig(filters, route, page, method) {
  // Buscar configuração específica para a rota
  const routeConfig = filters[route];
  if (!routeConfig) return null;

  // Buscar configuração para a página específica
  const pageConfig = routeConfig[page] || routeConfig['default'];
  if (!pageConfig) return null;

  // Buscar configuração para o método HTTP
  return pageConfig[method] || pageConfig['default'];
}

// ✅ Função para aplicar filtro aos dados
function applyFilter(data, config) {
  if (!data) return data;

  // ✅ Tratar arrays
  if (Array.isArray(data)) {
    return data.map(item => filterObject(item, config));
  }

  // ✅ Tratar objetos únicos
  return filterObject(data, config);
}

// ✅ Função para filtrar objeto individual
function filterObject(obj, config) {
  if (!obj || typeof obj !== 'object') return obj;

  const result = {};

  // ✅ Campos que sempre passam
  const specialFields = ['success', 'message', 'error', 'count', 'total', 'data'];

  Object.keys(obj).forEach(key => {
    // ✅ Campos especiais sempre passam, mas se for 'data' e for objeto, filtrar recursivamente
    if (specialFields.includes(key)) {
      if (key === 'data' && obj[key] && typeof obj[key] === 'object') {
        result[key] = filterObject(obj[key], config);
      } else {
        result[key] = obj[key];
      }
      return;
    }

    // ✅ Aplicar filtro de campos permitidos
    if (config.allowedFields) {
      if (config.allowedFields.includes(key)) {
        result[key] = obj[key];
      }
      return;
    }

    // ✅ Aplicar filtro de campos bloqueados
    if (config.blockedFields) {
      if (!config.blockedFields.includes(key)) {
        result[key] = obj[key];
      }
      return;
    }

    // ✅ Se não há configuração específica, manter campo
    result[key] = obj[key];
  });

  return result;
}

module.exports = dataFilterMiddleware;
