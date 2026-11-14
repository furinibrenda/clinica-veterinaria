# SGCV - Sistema de Gestão de Clínica Veterinária

Projeto da disciplina de Análise e Projeto de Sistemas.  
Autora: Brenda Furini Cardoso

## Descrição

Sistema da Clínica Veterinária Focinho & Cia para gerenciar tutores, animais,
consultas e atendimentos, com os perfis Recepcionista e Veterinário.

## Tecnologias

JavaScript, Node.js, Express 5, SQLite (`better-sqlite3`) e `bcryptjs`.

## Requisitos

- Node.js 20 ou superior
- npm

## Como executar

No terminal, entre no diretório `backend`:

```powershell
cd backend
npm install
npm run seed
npm start
```

O servidor fica disponível em [http://localhost:3000](http://localhost:3000).
O banco SQLite é criado em `backend/data/sgcv.db`. O seed cria ou atualiza
usuários de teste; suas senhas são armazenadas no banco como hash bcrypt.

| Perfil | Login | Senha |
|---|---|---|
| Veterinário | `veterinario` | `Vet123@4` |
| Recepcionista | `recepcionista` | `Recep123@` |

Para executar os testes, use outro terminal no diretório `backend`:

```powershell
npm test
```

Os testes usam o runner nativo do Node.js e não precisam que o servidor esteja
em execução.

## Acesso e cadastro de usuários

As sessões expiram após 30 minutos sem atividade e são mantidas em memória;
reiniciar o servidor encerra as sessões existentes.

O sistema não oferece um fluxo funcional de cadastro de usuários pela
interface. A página `frontend/cadastro-usuario.html` é apenas um formulário
visual e não está conectada à API. No entanto, a rota `POST /api/register`
permanece ativa e cria usuários sem exigir autenticação. O seed também cria ou
atualiza as duas contas de teste listadas acima.

## Situação dos requisitos

Resumo da implementação comparada aos requisitos da documentação do projeto:

| Requisito | Situação | Observação |
|---|---|---|
| RF-01 — Cadastrar e consultar clientes | Implementado | Cadastro, validação de CPF e busca por nome ou CPF. |
| RF-02 — Cadastrar animais | Implementado | Exige tutor existente e ativo. |
| RF-03 — Agendar consultas | Implementado | Valida tutor, animal, veterinário, horário, data futura e disponibilidade. |
| RF-04 — Alterar consultas | Implementado | Permite alterar data, horário e veterinário de consultas agendadas. |
| RF-05 — Cancelar consultas | Implementado | Altera o status e mantém o registro. |
| RF-06 — Consultar agenda | Implementado | Consulta por data e veterinário; permite abrir atendimentos realizados. |
| RF-07 — Registrar atendimento | Implementado | Restrito ao perfil Veterinário; atualiza o status da consulta. |
| RF-08 — Registrar diagnóstico | Implementado | Diagnóstico obrigatório para concluir o atendimento. |
| RF-09 — Autenticar usuário | Implementado | Login com mensagem de erro genérica para credenciais inválidas. |
| RF-10 — Inativar clientes e animais | Implementado | Inativação lógica, bloqueada quando há consulta agendada. |
| RF-11 — Registrar adendo | Implementado | Mantém o diagnóstico original e registra autoria e data. |
| RNF-01 — Controle de acesso por perfil | Implementado | Rotas e páginas restringem operações conforme o perfil. |
| RNF-02 — Segurança das credenciais | Implementado | Hash bcrypt, senha mínima de 8 caracteres e sessão com expiração por inatividade. |
| RNF-03 — Desempenho | Não verificado | Não há medição que comprove o limite de 5 segundos com 10 usuários. |
| RNF-04 — Disponibilidade | Não verificado | A meta de 99% não foi medida. |
| RNF-05 — Backup e recuperação | Parcial | Backup diário e retenção das sete cópias mais recentes implementados; restauração pendente. |

## Backup

Ao iniciar o servidor, o sistema cria um backup do banco e programa novas
cópias diárias, mantendo as sete mais recentes em `backend/backups/`. A
restauração de dados a partir dos backups ainda não está implementada.
