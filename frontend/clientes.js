const searchForm = document.querySelector("#client-search");
const clientList = document.querySelector("#client-list");
const listMessage = document.querySelector("#client-list-message");

function renderClients(clientes) {
  clientList.replaceChildren();

  if (clientes.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-row";
    cell.colSpan = 4;
    cell.textContent = "Nenhum cliente encontrado.";
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
    clientList.append(row);
  }
}

async function buscarClientes(termo = "") {
  const params = new URLSearchParams({ busca: termo });
  listMessage.textContent = "";
  clientList.replaceChildren();

  try {
    const response = await fetch(`/api/clientes?${params}`);
    const result = await response.json();

    if (!response.ok) {
      listMessage.textContent = result.error || "Não foi possível carregar os clientes.";
      return;
    }
    renderClients(result.clientes);
  } catch {
    listMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  buscarClientes(new FormData(searchForm).get("busca").trim());
});

buscarClientes();
