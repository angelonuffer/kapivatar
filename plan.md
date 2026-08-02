1. **Modificar `carregar_tela_permissao` para aceitar um argumento opcional**:
   - `carregar_tela_permissao` deve ser capaz de mostrar a tela customizada caso a chamada venha do iframe `perfil_autenticado` (ou `autenticar`).
   - Mas o problema parece ser na tela exibida quando não há permissão E estamos na rota `/perfil_autenticado` ou `/autenticar`.

2. **Modificar a lógica em `if (path === "/perfil_autenticado")`**:
   - Atualmente, se ele não tem permissão (`permissao !== "granted"` ou diretorio nulo), ele só exibe um ícone `account_circle` e quando clica, abre o popup `/autenticar`.
   - O requisito diz: "A janela aberta quando o usuário clica na imagem em `/perfil_autenticado` deve exibir uma das seguintes páginas:" -> Isso se refere à página `/autenticar` (que abre no popup), e não o iframe em si.
   - Deixe-me reler o requisito: "A janela aberta quando o usuário clica na imagem em `/perfil_autenticado` deve exibir uma das seguintes páginas:" -> Isso é claramente a página `/autenticar`.

3. **Analisar a rota `/autenticar`**:
   - Se `!diretorio` (usuário não escolheu a pasta de dados ainda), atualmente chama `carregar_tela_login()`.
   - Requisito: Se não deu permissão (ou não escolheu pasta) e NÃO tem perfil selecionado: Exibe uma tela com a logo e informando "o site tal solicitou autorização... pede para enviar foto e nome do perfil".
   - Se não deu permissão (ou não escolheu pasta) e JÁ tem perfil selecionado: Pede para selecionar o perfil que deseja autorizar.
   - Espere, se ele não deu permissão para a pasta de dados (`permissao !== "granted"`), como vamos saber se ele tem perfil ou não? Talvez a "permissão para a origem" mencionada no requisito não seja a permissão da pasta de dados, mas sim a autorização do site (a origin).

4. **Entender a "permissão para a origem"**:
   - Atualmente, o app cria uma subpasta com o `hash_origem` (ex: `await diretorio.getDirectoryHandle(hash_origem, { create: true })`) quando o usuário autoriza um site, e depois o iframe `/perfil_autenticado` verifica a existência dessa pasta (`getDirectoryHandle(hash_origem, { create: false })`) para saber se o usuário já deu permissão.
   - O requisito diz: "As permissões para a origem devem ser a nível de perfil. Ou seja, uma origem pode ter permissão para usar um perfil e não para usar outro. O perfil selecionado também deve ser por origem."
   - Portanto, a "permissão para a origem" não é mais apenas uma pasta global para a origem, mas deve armazenar QUAIS perfis foram autorizados e QUAL está selecionado!

5. **Armazenar permissões e perfil selecionado por origem**:
   - Em vez de apenas criar uma pasta `hash_origem`, podemos criar um arquivo `origem_${hash_origem}` (ou usar a pasta `hash_origem` e armazenar arquivos dentro dela).
   - O ideal é manter a pasta `hash_origem` e colocar lá dentro um arquivo `perfis_autorizados` (lista) e `perfil_selecionado` (string ID).
   - Ou podemos simplificar e ter um JSON `permissoes_${hash_origem}` na pasta de dados raiz.
   - Vamos ler a forma como o kapivatar faz. Ele usa arquivos.

6. **Refatorar `/perfil_autenticado` e `/autenticar`**:
   - Como refatorar isso? Vou investigar mais.
