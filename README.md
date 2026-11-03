# SGCV - Sistema de Gestão de Clínica Veterinária

Projeto da disciplina de Análise e Projeto de Sistemas.  
Autora: Brenda Furini Cardoso

## Descrição

Sistema da Clínica Veterinária Focinho & Cia que centraliza o cadastro de tutores e animais, o agendamento de consultas sem conflito de horário e o registro de atendimentos e diagnósticos.

**Atores:** Recepcionista e Veterinário.

## Tecnologias

JavaScript, Node.js, HTML e CSS.

## Primeiros passos

Esta versão inicial contém somente as telas de cadastro e login para os perfis
Veterinário e Recepcionista. Os usuários são salvos localmente em
`data/users.json`, e as senhas são armazenadas com hash. As sessões são mantidas
em memória por até 12 horas e encerradas ao parar o servidor.

### Requisitos

- Node.js 18 ou superior
- Visual Studio Code (opcional, recomendado para editar o projeto)

### Como executar

1. Abra a pasta do projeto no VS Code.
2. No menu **Terminal > Novo Terminal**, execute `npm start`.
3. Acesse [http://localhost:3000](http://localhost:3000) no navegador.
4. Se necessário, defina outra porta antes de iniciar: no PowerShell,
   `$env:PORT=3001; npm start`.

Não é necessário instalar dependências. Para começar, crie uma conta com nome,
login, senha de pelo menos 8 caracteres e perfil; depois, entre com o login e a
senha cadastrados. O arquivo `data/users.json` é criado automaticamente e não é
versionado. A sessão é encerrada ao parar o servidor.

