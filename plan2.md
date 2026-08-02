1. Modify `if (path === "/autenticar")` block in `www/kapivatar.js`.
   - When checking for `!diretorio` (or no `readwrite` permission), currently it calls `carregar_tela_login()` or `carregar_tela_permissao()`. Wait, the prompt says:
   "Se o usuário ainda não deu permissão para a origem e não tem perfil selecionado... já pede para o usuário enviar a foto e informar o nome do perfil, caso esteja de acordo."
   Wait... no! It says "Se o usuário ainda não deu permissão para a origem". A permissão para a origem não é a permissão da pasta de dados, é a autorização para o site se conectar ao Kapivatar (que hoje é a tela de 'Autorizar').
   E se o usuário não escolheu a pasta de dados ou não deu permissão pra pasta de dados (o Kapivatar ainda não tem acesso)? Nesse caso, precisamos primeiro que ele acesse o Kapivatar (login/permissao). O prompt não menciona mudar isso.

2. Let's assume "permissão para a origem" refers to the site's authorization (the `KAPIVATAR_AUTORIZADO` part).
   The flow in `/autenticar` when the directory is ready:
   - It gets the origin: `const origem = obter_origem_externa()`.
   - It needs to check what profiles the user has:
     `const arquivo_perfis = await ler_arquivo(diretorio, "perfis")` etc.
     If the user has NO profile at all (or `!id_selecionado`), instead of saying "Você precisa criar e selecionar um perfil no Kapivatar antes de autorizar aplicativos externos.", we should show a screen asking for:
     - The site wants to authorize.
     - Form to create a profile (photo, name).
     - When they fill it out, we create the profile, select it, AND authorize the origin.
     - This addresses: "Se o usuário ainda não deu permissão para a origem e não tem perfil selecionado... Na mesma página já pede para o usuário enviar a foto e informar o nome do perfil, caso esteja de acordo." (Wait, is it "não tem perfil criado" or "não tem perfil selecionado"? The prompt says "não tem perfil selecionado", mas o fato é que podemos pedir o nome/foto para criar/selecionar, ou selecionar um existente. E no segundo bullet point: "Se o usuário ... já tem pelo menos perfil selecionado". Acho que ele quis dizer "já tem pelo menos um perfil CRIADO". Se ele tem perfis criados, ele deve poder selecionar um. "já tem pelo menos perfil selecionado" -> "já tem pelo menos um perfil criado"? Vamos assumir que é "já tem pelo menos um perfil no Kapivatar").

3. Let's check `arquivo_perfis`:
   If `lista_perfis.perfis.length === 0`, we show the "create profile" form.
   If `lista_perfis.perfis.length > 0`, we show the "select profile to authorize" screen.
   BUT WAIT: "O perfil selecionado também deve ser por origem." -> This is a HUGE structural change.
   Currently, the selected profile is stored in `perfil_selecionado` in the root of the data folder.
   If the selected profile is per origin, where do we store it?
   Inside the origin folder: `hash_origem/perfil_selecionado`?
   Currently, `hash_origem` is a subfolder. Yes!
   So, we need a function `obter_id_perfil_selecionado_para_origem(origem)`.

Let's do some testing on how to implement this.
