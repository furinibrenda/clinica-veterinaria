const clientForm = document.querySelector("#client-form");
const clientMessage = document.querySelector("#client-form-message");

function showClientMessage(text, isSuccess = false) {
  clientMessage.textContent = text;
  clientMessage.classList.toggle("is-success", isSuccess);
}

async function submitClient(form) {
  showClientMessage("");
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const result = await response.json();

    if (!response.ok) {
      showClientMessage(result.error || "Não foi possível cadastrar o cliente.");
      return;
    }

    form.reset();
    showClientMessage("Cliente cadastrado com sucesso.", true);
  } catch {
    showClientMessage("Não foi possível conectar ao servidor. Tente novamente.");
  } finally {
    submitButton.disabled = false;
  }
}

clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitClient(clientForm);
});
