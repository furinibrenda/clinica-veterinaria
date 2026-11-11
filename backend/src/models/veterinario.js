const { db } = require("../../database");
const StatusConsulta = require("./statusConsulta");

const consultaAgendadaNoHorario = db.prepare(`
  SELECT 1
  FROM consultas
  WHERE veterinario_id = @veterinario_id
    AND data = @data
    AND hora = @hora
    AND status = @status
    AND (@consulta_id IS NULL OR id != @consulta_id)
  LIMIT 1
`);

class Veterinario {
  constructor({ id, nome }) {
    this.id = id;
    this.nome = nome;
  }

  estaDisponivel(data, hora, consultaId = null) {
    return !consultaAgendadaNoHorario.get({
      veterinario_id: this.id,
      data,
      hora,
      status: StatusConsulta.AGENDADA,
      consulta_id: consultaId,
    });
  }
}

module.exports = Veterinario;
