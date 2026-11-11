const searchForm = document.querySelector("#client-search");
const clientList = document.querySelector("#client-list");
const listMessage = document.querySelector("#client-list-message");

function renderClients(clientes) {
  clientList.replaceChildren();

  if (clientes.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 5;
    cell.textContent = "Nenhum cliente encontrado para os dados informados.";
    row.append(cell);
    clientList.append(row);
    return;
  }

  for (const cliente of clientes) {
    const row = document.createElement("tr");
    for (const value of [cliente.nome, cliente.cpf, cliente.telefone]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    const ativo = cliente.ativo === 1;
    status.className = `client-status${ativo ? "" : " is-inactive"}`;
    status.textContent = ativo ? "Ativo" : "Inativo";
    statusCell.append(status);
    row.append(statusCell);

    const actionsCell = document.createElement("td");
    if (ativo) {
      const inactivateButton = document.createElement("button");
      inactivateButton.className = "client-inactivate-button";
      inactivateButton.dataset.clientId = cliente.id;
      inactivateButton.type = "button";
      inactivateButton.textContent = "Inativar";
      actionsCell.append(inactivateButton);
    } else {
      actionsCell.textContent = "—";
    }
    row.append(actionsCell);
    clientList.append(row);
  }
}

async function buscarClientes(termo = "") {
  const params = new URLSearchParams({ busca: termo });
  listMessage.textContent = "";
  listMessage.classList.remove("is-success");
  clientList.replaceChildren();

  try {
    const response = await fetch(`/api/clientes?${params}`);
    const result = await response.json();

    if (!response.ok) {
      listMessage.textContent = result.error || "Não foi possível carregar os clientes.";
      return false;
    }
    renderClients(result.clientes);
    return true;
  } catch {
    listMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    return false;
  }
}

async function inativarCliente(button) {
  const confirmado = window.confirm("Deseja realmente inativar este cliente?");
  if (!confirmado) return;

  listMessage.textContent = "";
  listMessage.classList.remove("is-success");
  button.disabled = true;
  try {
    const response = await fetch(`/api/clientes/${button.dataset.clientId}/inativar`, {
      method: "PATCH",
    });
    const result = await response.json();

    if (!response.ok) {
      listMessage.textContent = result.error || "Não foi possível inativar o cliente.";
      button.disabled = false;
      return;
    }

    const termo = new FormData(searchForm).get("busca").trim();
    if (await buscarClientes(termo)) {
      listMessage.textContent = result.message;
      listMessage.classList.add("is-success");
    }
  } catch {
    listMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
    button.disabled = false;
  }
}

clientList.addEventListener("click", (event) => {
  const button = event.target.closest(".client-inactivate-button");
  if (button) inativarCliente(button);
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buscarClientes(new FormData(searchForm).get("busca").trim());
});

buscarClientes();
