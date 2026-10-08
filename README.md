# Brenda Beauty Studio

Sistema demonstrativo de site e gestão de agendamentos para o Brenda Beauty
Studio, desenvolvido para apresentação de TCC.

## Tecnologias

- HTML
- CSS
- JavaScript puro
- `localStorage` para clientes, contas e agendamentos
- `sessionStorage` para a sessão atual

Não é necessário instalar programas, iniciar servidor ou ter conexão com a
internet. Abra `index.html` diretamente no navegador.

## Acessos de demonstração

- **ADMIN:** `admin@brendabeauty.com` / `Admin123`
- **CLIENTE:** `cliente@brendabeauty.com` / `Cliente123`

As contas iniciais são criadas automaticamente no primeiro acesso. O cliente de
demonstração tem dados de perfil preenchidos. Também é possível criar uma conta
pela opção **Cadastre-se** na tela de login.

## Funcionalidades

- **Site público:** início, sobre nós, portfólio, contato e login.
- **Clientes (ADMIN):** cadastro com campos obrigatórios, máscara e validação de
  CPF, telefone e e-mail; bloqueio de CPF/e-mail duplicados; edição, exclusão e
  pesquisa por nome, CPF, telefone ou e-mail.
- **Agendamentos:** criação, consulta em ordem de data, edição, exclusão e status.
  A agenda impede dois horários ativos iguais no mesmo dia; horários cancelados
  deixam de bloquear a vaga.
- **Acesso CLIENTE:** consulta dos próprios dados e agendamentos e solicitação de
  novos horários. A gestão de clientes, consultas administrativas, relatórios e
  backup é exclusiva do ADMIN.
- **Relatórios (ADMIN):** totais por status, consulta por período e impressão.
- **Backup (ADMIN):** exportação de clientes, usuários e agendamentos para JSON e restauração após confirmação.
- **Contato:** formulário demonstrativo que mostra confirmação local, sem envio a servidor.

## Observações para apresentação

As credenciais e os dados ficam no navegador onde o sistema é aberto. O login é
um controle demonstrativo, não uma autenticação segura de servidor. Para
reiniciar os dados locais, limpe o armazenamento do site nas ferramentas do
navegador; as contas e dados de demonstração serão criados novamente.
