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

## Backup

Ao iniciar o servidor, o sistema cria um backup do banco e programa novas
cópias diárias, mantendo as sete mais recentes em `backend/backups/`. A
restauração de dados a partir dos backups ainda não está implementada.
