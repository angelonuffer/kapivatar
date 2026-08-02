Let's draft the actual JS modifications for `if (path === "/autenticar")`:

Wait, if I change the logic of `if (path === "/perfil_autenticado")`, I should change how it reads the selected profile.
Currently:
```javascript
            if (subdiretorio) {
              let foto_exibida = false
              let dados_perfil = null
              const arquivo_id = await ler_arquivo(diretorio, id_selecionado)
              ...
```
Wait, the `subdiretorio` is just checked to see if it exists. Then it still reads `id_selecionado` from `diretorio` (the global one).
So, if `subdiretorio` exists, it uses the GLOBAL selected profile!
We need to change this to read `id_selecionado` from `subdiretorio`!
But `subdiretorio` is just a VirtualDirectoryHandle. Does it support `ler_arquivo`?
`ler_arquivo` is:
```javascript
const ler_arquivo = async (diretorio, nome) => {
  try {
    const handle = await diretorio.getFileHandle(nome)
    const file = await handle.getFile()
    return file
  } catch (e) {
    return null
  }
}
```
Yes, it does! So we can just do:
`const arquivo_id_selecionado = await ler_arquivo(subdiretorio, "perfil_selecionado")`
`const id_selecionado = await arquivo_id_selecionado.text()`

Let's test this concept.
