const express = require("express");

function validateJsonObject(req, res, next) {
  if (!req.jsonBodyLength || !req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "Envie os dados em formato JSON válido." });
  }
  next();
}

const jsonObjectBody = [
  express.json({
    limit: "16kb",
    verify(req, res, buffer) {
      req.jsonBodyLength = buffer.length;
    },
  }),
  validateJsonObject,
];

module.exports = { jsonObjectBody };
