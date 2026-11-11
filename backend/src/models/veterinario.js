const { db } = require("../../database");
const StatusConsulta = require("./statusConsulta");

const consultaAgendadaNoHorario = db.prepare(`
  SELECT 1
  FROM consultas
  WHERE veterinario_id = @veterinario_id
    AND data = @data
    AND hora = @hora
    AND status = @status
  LIMIT 1
`);

class Veterinario {
  constructor({ id, nome }) {
    this.id = id;
    this.nome = nome;
  }

  estaDisponivel(data, hora) {
    return !consultaAgendadaNoHorario.get({
      veterinario_id: this.id,
      data,
      hora,
      status: StatusConsulta.AGENDADA,
    });
  }
}

module.exports = Veterinario;
