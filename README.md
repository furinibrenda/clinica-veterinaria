# SGCV - Sistema de Gestão de Clínica Veterinária

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

1. Abra a pasta `backend` do projeto no terminal (`cd backend`).
2. No PowerShell, instale as dependências com `npm.cmd install`.
3. Crie os acessos iniciais com `npm.cmd run seed`.
4. Anote os logins e senhas exibidos no terminal. As senhas são aleatórias,
   mostradas somente quando as contas são criadas e armazenadas no banco apenas
   como hash bcrypt.
5. Inicie o sistema com `npm.cmd start`.
6. Acesse [http://localhost:3000](http://localhost:3000).

O banco SQLite é criado em `data/sgcv.db`. O script de seed pode ser executado
novamente sem alterar as senhas de contas já criadas. Não remova o banco para
recuperar uma senha: isso também excluiria os demais dados. O arquivo legado
`data/users.json` é mantido intacto, mas não é mais usado para autenticação. Os
hashes legados não podem ser convertidos para bcrypt sem as senhas originais;
por isso, os acessos antigos precisam ser recriados pelo seed.

As sessões expiram após 30 minutos sem atividade. O cadastro público foi
removido; a criação de contas é feita pelo seed.

Veja [a documentação do backend](backend/README.md) para a estrutura em camadas,
configuração, contratos da API e testes (`npm.cmd test` na pasta `backend`).
