function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = 500;
  let message = "Ocorreu um erro interno. Tente novamente.";
  if (error.type === "entity.too.large") {
    status = 413;
    message = "A solicitação é muito grande.";
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Envie os dados em formato JSON válido.";
  } else if (error.status >= 400 && error.status < 500) {
    status = error.status;
    message = status === 400 ? "Endereço inválido." : "Não foi possível processar a solicitação.";
  } else {
    console.error("Erro ao processar solicitação:", error);
  }

  res.set("Cache-Control", "no-store").status(status).json({ error: message });
}

module.exports = { errorHandler };
