const animalList = document.querySelector("#animal-list");
const listMessage = document.querySelector("#animal-list-message");

function renderAnimais(animais) {
  animalList.replaceChildren();

  if (animais.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 7;
    cell.textContent = "Nenhum animal encontrado.";
    row.append(cell);
    animalList.append(row);
    return;
  }

  for (const animal of animais) {
    const row = document.createElement("tr");
    for (const value of [
      animal.nome,
      animal.especie,
      animal.raca || "—",
      animal.data_nascimento || "—",
      animal.tutor,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    const ativo = animal.ativo === 1;
    status.className = `client-status${ativo ? "" : " is-inactive"}`;
    status.textContent = ativo ? "Ativo" : "Inativo";
    statusCell.append(status);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    if (ativo) {
      const inactivateButton = document.createElement("button");
      inactivateButton.className = "client-inactivate-button";
      inactivateButton.dataset.animalId = animal.id;
      inactivateButton.type = "button";
      inactivateButton.textContent = "Inativar";
      actionsCell.append(inactivateButton);
    } else {
      actionsCell.textContent = "—";
    }
    row.append(actionsCell);
    animalList.append(row);
  }
}

async function buscarAnimais() {
  listMessage.textContent = "";
  listMessage.classList.remove("is-success");
  animalList.replaceChildren();

  try {
    const response = await fetch("/api/animais");
    const result = await response.json();

    if (!response.ok) {
      listMessage.textContent = result.error || "Não foi possível carregar os animais.";
      return false;
    }
    renderAnimais(result.animais);
    return true;
  } catch {
    listMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    return false;
  }
}

async function inativarAnimal(button) {
  const confirmado = window.confirm("Deseja realmente inativar este animal?");
  if (!confirmado) return;

  listMessage.textContent = "";
  listMessage.classList.remove("is-success");
  button.disabled = true;
  try {
    const response = await fetch(`/api/animais/${button.dataset.animalId}/inativar`, {
      method: "PATCH",
    });
    const result = await response.json();

    if (!response.ok) {
      listMessage.textContent = result.error || "Não foi possível inativar o animal.";
      button.disabled = false;
      return;
    }

    if (await buscarAnimais()) {
      listMessage.textContent = result.message;
      listMessage.classList.add("is-success");
    }
  } catch {
    listMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    button.disabled = false;
  }
}

animalList.addEventListener("click", (event) => {
  const button = event.target.closest(".client-inactivate-button");
  if (button) inativarAnimal(button);
});

buscarAnimais();
