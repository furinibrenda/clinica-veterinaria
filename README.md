g# SGCV - Sistema de Gestão de Clínica Veterinária

Projeto da disciplina de Análise e Projeto de Sistemas.  
Autora: Brenda Furini Cardoso

## Descrição

Sistema da Clínica Veterinária Focinho & Cia para gestão de tutores, animais,
consultas e atendimentos. Os perfis de acesso são Recepcionista e Veterinário.

## Tecnologias

JavaScript, Node.js, Express 5, SQLite (`better-sqlite3`) e `bcryptjs`.

## Requisitos

- Node.js 20 ou superior
- npm

## Como executar

Os comandos devem ser executados no diretório `backend`, onde está o
`package.json`:

1. `npm install` — instala as dependências do projeto.
2. `npm run seed` — cria ou atualiza os usuários de teste no banco SQLite.
3. `npm start` — inicia o servidor. Acesse
   [http://localhost:3000](http://localhost:3000).
4. `npm test` — executa os testes automatizados. Como `npm start` mantém o
   servidor em execução, rode os testes em outro terminal, também no diretório
   `backend`.

O banco SQLite é criado em `backend/data/sgcv.db`. As senhas dos usuários de
teste são armazenadas no banco como hash bcrypt.

| Perfil | Login | Senha |
|---|---|---|
| Veterinário | `veterinario` | `Vet123@4` |
| Recepcionista | `recepcionista` | `Recep123@` |

As sessões expiram após 30 minutos sem atividade. O cadastro público foi
removido; a criação de contas é feita pelo seed.

## Status dos requisitos

O repositório não contém um catálogo com a descrição de todos os requisitos.
IDs sem descrição verificável são mantidos como planejados, sem atribuir a eles
funcionalidades por suposição.

| Requisito | Descrição disponível ou evidência | Status |
|---|---|---|
| RF-01 | Descrição não disponível no repositório. | Planejado |
| RF-02 | Descrição não disponível no repositório. | Planejado |
| RF-03 | Descrição não disponível no repositório. | Planejado |
| RF-04 | Alteração de data, horário e veterinário de consulta agendada. | Implementado |
| RF-05 | Descrição não disponível no repositório. | Planejado |
| RF-06 | Descrição não disponível no repositório. | Planejado |
| RF-07 | Descrição não disponível no repositório. | Planejado |
| RF-08 | Descrição não disponível no repositório. | Planejado |
| RF-09 | Descrição não disponível no repositório. | Planejado |
| RF-10 | Descrição não disponível no repositório. | Planejado |
| RF-11 | Registro de adendos sem alterar o diagnóstico original. | Implementado |
| RNF-01 | Descrição não disponível no repositório. | Planejado |
| RNF-02 | Descrição não disponível no repositório. | Planejado |
| RNF-03 | Não verificado. | Planejado |
| RNF-04 | Não verificado. | Planejado |
| RNF-05 | Backup diário do banco, com retenção das sete cópias mais recentes. | Implementado |

RNF-03 e RNF-04 não foram verificados.
