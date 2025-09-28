require("newrelic");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middlewares essenciais
app.use(bodyParser.json());
app.use(fileUpload());
app.use(cookieParser());

// ✅ Verificar variáveis de ambiente obrigatórias
const requiredEnvVars = [
  "DIRECTUS_API_TOKEN",
  "DIRECTUS_API_URL",
  "PASS_ENCRYPT",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    "❌ Variáveis de ambiente obrigatórias não encontradas:",
    missingVars
  );
  process.exit(1);
}

console.log("✅ Todas as variáveis de ambiente estão configuradas");

// ✅ Configurar CORS para cookies
const allowedOrigins = process.env.CORS
  ? process.env.CORS.split(",")
  : ["http://localhost:5173"];

console.log(`🔍 [CORS] Origens permitidas:`, allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      console.log(`🔍 [CORS] Verificando origem: ${origin}`);

      // Permite requests sem origem (como em ferramentas como Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        console.log(`✅ [CORS] Origem permitida: ${origin || "sem origem"}`);
        callback(null, true);
      } else {
        console.log(`❌ [CORS] Origem bloqueada: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // ✅ CRÍTICO: Permite cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Requested-With",
    ],
    exposedHeaders: ["Set-Cookie"],
  })
);

// ✅ Middleware para garantir headers CORS corretos
app.use((req, res, next) => {
  console.log(`🔍 [CORS] Headers da requisição:`, {
    origin: req.headers.origin,
    method: req.method,
    "user-agent": req.headers["user-agent"],
  });

  // Garantir que os headers CORS sejam sempre enviados
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Cookie, X-Requested-With"
  );

  // Headers especiais para permitir sameSite: 'none' com secure: false em desenvolvimento
  res.header("Access-Control-Expose-Headers", "Set-Cookie");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");

  // Responder a requisições OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    console.log(`🔍 [CORS] Respondendo a requisição OPTIONS`);
    return res.status(200).end();
  }

  next();
});

// ✅ Configuração de cookies seguros para CORS
app.use((req, res, next) => {
  res.cookie = (name, value, options = {}) => {
    // Configuração que funciona para cross-origin em desenvolvimento
    const defaultOptions = {
      httpOnly: true, // Não acessível via JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      domain: process.env.COOKIE_DOMAIN,
      path: "/", // Disponível em todo o site
      maxAge: 5 * 24 * 60 * 60 * 1000, // 5 dias
    };

    const cookieString = `${name}=${value}; ${Object.entries({
      ...defaultOptions,
      ...options,
    })
      .map(([key, val]) => `${key}=${val}`)
      .join("; ")}`;

    console.log(`🔍 [COOKIE] String do cookie: ${cookieString}`);

    // Para desenvolvimento, adicionar header especial para permitir sameSite: 'none' com secure: false
    if (process.env.NODE_ENV !== "production") {
      res.setHeader("Set-Cookie", cookieString);
      res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    } else {
      res.setHeader("Set-Cookie", cookieString);
    }
  };
  next();
});

// Rota de healthcheck para validar se a API está ativa
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API está ativa e funcionando",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rota de teste para verificar cookies
app.get("/test-cookies", (req, res) => {
  console.log(`🔍 [TEST] Testando cookies - Headers:`, req.headers);
  console.log(`🔍 [TEST] Cookies recebidos:`, req.cookies);

  res.json({
    success: true,
    message: "Teste de cookies",
    cookies: req.cookies,
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      userAgent: req.headers["user-agent"],
    },
    timestamp: new Date().toISOString(),
  });
});

// ✅ Importar e aplicar middleware de filtro de dados
const dataFilterMiddleware = require("./middleware/dataFilterMiddleware");
app.use("/api", dataFilterMiddleware);

// ✅ Importar rotas de autenticação
const { router: authRoutes } = require("./routes/auth");
app.use("/api/auth", authRoutes);

// ✅ Importar rotas públicas
const publicRoutes = require("./routes/public");
app.use("/api/directus", publicRoutes);
app.use("/api/email", publicRoutes);
app.use("/api", publicRoutes); // ✅ Adicionar registro direto para /api

// ✅ Importar rotas protegidas
const protectedRoutes = require("./routes/protected");
app.use("/api/directus", protectedRoutes);

// ✅ Importar outras rotas
const docuseal = require("./routes/docuseal");
const email = require("./routes/email");

app.use("/api/docuseal", docuseal);
app.use("/api/email", email);

// ✅ Limpeza automática de sessões (executar a cada hora)
setInterval(async () => {
  try {
    const now = new Date().toISOString();

    // Buscar usuários com sessões expiradas
    const expiredUsersResponse = await fetch(
      `${process.env.DIRECTUS_API_URL}/items/Users?filter[session_expires][_lt]=${now}&filter[is_session_active][_eq]=true`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const expiredUsers = await expiredUsersResponse.json();

    if (expiredUsers.data && expiredUsers.data.length > 0) {
      // Invalidar sessões expiradas
      for (const user of expiredUsers.data) {
        await fetch(`${process.env.DIRECTUS_API_URL}/items/Users/${user.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.DIRECTUS_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_session_active: false,
            session_token: null,
            session_expires: null,
          }),
        });
      }

      console.log(
        `🧹 ${
          expiredUsers.data.length
        } sessões expiradas limpas: ${new Date().toISOString()}`
      );
    }
  } catch (error) {
    console.error("❌ Erro ao limpar sessões:", error);
  }
}, 3600000); // 1 hora

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔒 Sistema de autenticação seguro ativo`);
});
