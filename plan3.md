According to the user:
> Se o usuário ainda não deu permissão para a origem e não tem perfil selecionado: Exibe uma tela contendo a logo do Kapivatar, o nome "Kapivatar", informando que o site tal solicitou autorização para se conectar ao Kapivatar. Na mesma página já pede para o usuário enviar a foto e informar o nome do perfil, caso esteja de acordo.
> Se o usuário ainda não deu permissão para a origem e já tem pelo menos perfil selecionado: Exibe uma tela contendo a logo do Kapivatar, o nome "Kapivatar", informando que o site tal solicitou autorização para se conectar ao Kapivatar. Na mesma página já pede para o usuário selecionar o perfil que deseja selecionar e autorizar para o site.
> Se o usuário já deu permissão para a origem: Exibe uma tela contendo a logo do Kapivatar, o nome "Kapivatar", informando quais perfis já foram autorizados para aquela origem e perguntando se o usuário quer selecionar ou autorizar outro perfil.
> As permissões para a origem devem ser a nível de perfil. Ou seja, uma origem pode ter permissão para usar um perfil e não para usar outro. O perfil selecionado também deve ser por origem.

1.  **Modify `/autenticar` route (and `/perfil_autenticado`) to support "selected profile per origin"**.
    - We currently store `perfil_selecionado` in the root of the data folder.
    - We will need to read/write `perfil_selecionado` *inside* the origin folder (e.g., `hash_origem/perfil_selecionado`).
    - What about "permissões para a origem devem ser a nível de perfil"?
      Currently, the user clicks "Autorizar" and we just create the `hash_origem` directory. It means the origin is authorized to read the *global* `perfil_selecionado`.
      Now, if the permissions are per-profile, maybe the origin folder `hash_origem` should contain a file `perfis_autorizados` (a list of authorized profile IDs), and `perfil_selecionado` (the currently selected one for that origin). Or even simpler: the files inside `hash_origem` are just empty files named after the profile ID, indicating authorization!
      Let's use a JSON file `perfis_autorizados` inside `hash_origem`, or simply write a file `perfil_selecionado` inside `hash_origem` and when authorizing a profile, we write its ID to `hash_origem/perfil_selecionado` and also append to `hash_origem/perfis_autorizados`.

    *Wait*, the VFS implementation uses `IndexedDB` (`byName` and `byContent`). `diretorio.getDirectoryHandle(hash_origem, { create: true })` returns a virtual directory.
    Let's check how `VirtualDirectoryHandle` writes a file. We can just use `escrever_arquivo(subdiretorio, "perfil_selecionado", id)`.

2.  **What does `/perfil_autenticado` do?**
    - It gets `origem = obter_origem_externa()`.
    - Gets `hash_origem`.
    - Opens `subdiretorio = diretorio.getDirectoryHandle(hash_origem, { create: false })`.
    - If `subdiretorio` exists, it looks for the authorized profile.
      - Before: it read `id_selecionado = await obter_id_perfil_selecionado()` from the global directory.
      - Now: it should read `id_selecionado` from `subdiretorio`, i.e., `await ler_arquivo(subdiretorio, "perfil_selecionado")`.
      - If it exists, it posts `KAPIVATAR_CONECTADO` to the parent window with the profile's info.
    - Wait, if `subdiretorio` exists but no `perfil_selecionado` inside it, it shouldn't post `KAPIVATAR_CONECTADO`. It should just render the generic icon.
    - The requirement says: "O perfil selecionado também deve ser por origem." So we get the profile selected for that specific origin.

3.  **What does `/autenticar` do?**
    - It gets `origem = obter_origem_externa()`.
    - Gets `hash_origem`.
    - Tries to open `subdiretorio = diretorio.getDirectoryHandle(hash_origem, { create: false })`.
    - Needs to list all globally created profiles: `const arquivo_perfis = await ler_arquivo(diretorio, "perfis")`.
      - If NO global profiles exist (or we just want to know if there's *any* profile), wait, the requirement says "Se o usuário ainda não deu permissão para a origem e não tem perfil selecionado". Wait, does it mean "não tem perfil" or literally "não tem perfil selecionado (globalmente)"? It probably means "if the user has NO PROFILES at all". Or maybe "if the user has no profiles created". Let's assume it means if `lista_perfis.perfis.length === 0`.
      - Let's read carefully: "Se o usuário ainda não deu permissão para a origem e não tem perfil selecionado: Exibe uma tela... pede para o usuário enviar a foto e informar o nome do perfil"
      - "Se o usuário ainda não deu permissão para a origem e já tem pelo menos perfil selecionado: Exibe uma tela... pede para o usuário selecionar o perfil que deseja selecionar e autorizar para o site."
      I think "tem perfil selecionado" is a typo for "tem perfil criado", because if you have a profile, you select it to authorize. Or it literally means if you have a globally selected profile. Actually, the global selected profile might be used as the default selected profile for the Kapivatar UI itself. I will just check if there are ANY profiles. If there are, I show the selection list. If not, I show the creation form. But wait, if they *do* have profiles, we should probably list them so they can choose which one to authorize.

4.  Let's refine the three states for `/autenticar`:
    - Check if `subdiretorio` exists and has authorized profiles. We can keep an array of authorized profiles in `perfis_autorizados` inside the `subdiretorio`, OR just assume any profile ID present as a file inside `subdiretorio` is authorized.
    - Let's use a JSON file `perfis_autorizados` inside `subdiretorio`.
    - State 1: `subdiretorio` doesn't exist (or `perfis_autorizados` is empty), AND user has no profiles (or `perfis` array is empty).
      - Action: Show logo, "Kapivatar", "O aplicativo [origem] solicitou autorização...".
      - Form: Input foto, Input nome. (No need for bio? The prompt only asks for foto and nome).
      - Submit button: Creates profile (generating keys, etc), authorizes it for this origin, selects it for this origin, and sends `KAPIVATAR_AUTORIZADO`.
    - State 2: `subdiretorio` doesn't exist (or `perfis_autorizados` is empty), AND user HAS at least one profile.
      - Action: Show logo, "Kapivatar", "O aplicativo [origem] solicitou autorização...".
      - Form: A list of the user's profiles (cards or radio buttons) to select which one to authorize.
      - Submit button: Authorizes selected profile for this origin, selects it for this origin, and sends `KAPIVATAR_AUTORIZADO`.
    - State 3: `subdiretorio` exists AND user has already authorized at least one profile.
      - Action: Show logo, "Kapivatar", "Você já autorizou os seguintes perfis para o aplicativo [origem]".
      - Form: List of ALREADY authorized profiles (maybe with a "Selecionar" button next to each to switch the selected profile for this origin), PLUS an option to "Autorizar outro perfil" (which could show the remaining unauthorized profiles, or just a button that switches to State 2).

Let's check the wording of State 3:
> Se o usuário já deu permissão para a origem: Exibe uma tela contendo a logo do Kapivatar, o nome "Kapivatar", informando quais perfis já foram autorizados para aquela origem e perguntando se o usuário quer selecionar ou autorizar outro perfil.

So State 3 shows:
- Logo
- "Kapivatar"
- "Perfis já autorizados para [origem]" -> List of authorized profiles. Clicking one selects it and closes the popup (sending `KAPIVATAR_AUTORIZADO`).
- "Autorizar outro perfil" button -> Switches to State 2 (or State 1 if no other profiles exist).
