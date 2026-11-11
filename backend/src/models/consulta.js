const StatusConsulta = require("./statusConsulta");

class Consulta {
  constructor({
    id,
    animal_id,
    veterinario_id,
    agendado_por,
    data,
    hora,
    status = StatusConsulta.AGENDADA,
  }) {
    this.id = id;
    this.animal_id = animal_id;
    this.veterinario_id = veterinario_id;
    this.agendado_por = agendado_por;
    this.data = data;
    this.hora = hora;
    this.status = status;
  }
}

module.exports = Consulta;
