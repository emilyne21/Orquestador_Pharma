import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import router from "./routes.js";

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger: pino({ level: process.env.LOG_LEVEL || "info" }) }));

// CORS simple para front y pruebas
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

app.use("/", router);

// Manejo de errores uniforme
app.use((err, req, res, _next) => {
  req.log?.error({ err }, "orchestrator error");
  const status = err.response?.status || 502;
  res.status(status).json({
    error: "UPSTREAM_ERROR",
    message: err.message,
    upstream: err.config?.baseURL,
    path: err.config?.url
  });
});

const port = Number(process.env.PORT || 8084);
app.listen(port, () => console.log(`Orchestrator up on :${port}`));
