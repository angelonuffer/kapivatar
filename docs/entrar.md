# Entrar no Kapivatar

O perfil no Kapivatar é um arquivo local. Não há senha central nem conta criada em um servidor.
Ao entrar, o usuário escolhe um dos três caminhos abaixo.

## Abrir um perfil existente

O usuário seleciona a opção **Abrir perfil** e escolhe qualquer arquivo cujo conteúdo seja SQLite 3.

O navegador solicita acesso de leitura e gravação ao arquivo. Depois da abertura, o
Kapivatar verifica apenas se o conteúdo é um banco SQLite íntegro. Faltas na estrutura são
reparadas automaticamente:

- a tabela `kapivatar_dados` é criada quando não existe;
- as colunas `chave` e `valor` são criadas ou normalizadas quando necessário;
- a linha `perfil` é criada quando não existe;
- campos ausentes do objeto `perfil`, como dispositivo, outros dispositivos e chave privada,
  são preenchidos automaticamente.

O cancelamento do seletor de arquivos não mostra erro. Após uma abertura válida, o handle
do arquivo é salvo no IndexedDB e a aplicação navega para a página principal.

Essa opção depende da File System Access API. Navegadores sem `showOpenFilePicker` não
podem abrir um perfil por este fluxo.

## Criar um perfil

A opção **Criar perfil** abre o formulário de criação. O usuário pode informar:

- uma imagem de capa;
- um nome;
- uma imagem de foto;
- uma biografia.

O campo **Nome** é obrigatório. Capa, foto e biografia são opcionais.

Ao salvar:

1. o navegador solicita o local e o nome do novo arquivo;
2. um arquivo SQLite vazio é criado;
3. são geradas uma chave privada RSA-OAEP e sua chave pública correspondente;
4. o dispositivo local é identificado;
5. os dados do perfil são gravados no arquivo;
6. as imagens selecionadas são armazenadas no sistema de arquivos virtual;
7. o handle do arquivo é salvo no IndexedDB;
8. a aplicação abre o perfil recém-criado.

O nome informado é usado para sugerir o nome do arquivo, acrescentando a extensão
`.kapivatar`. O usuário pode escolher outro nome ou local no seletor do navegador.

Se a criação ou gravação falhar, a aplicação permanece no formulário e informa que não foi
possível salvar o perfil.

## Usar o perfil de outro dispositivo

A opção **Perfil de outro dispositivo** inicia o fluxo de pareamento como dispositivo receptor.
Ela leva o usuário a `/dispositivos/parear/receber`.

Nesse fluxo, um perfil criado em outro dispositivo é recebido por meio de pareamento seguro.
O perfil precisa ser associado ao dispositivo local antes de ficar disponível na tela inicial.
O processo não transfere handles ou permissões locais do navegador anterior.

## Estado temporário e permissão

Ao escolher um arquivo ou criar um perfil, a aplicação solicita explicitamente acesso ao
arquivo no navegador. Essa permissão é necessária para ler e gravar os dados no perfil
selecionado.

A seleção abre o arquivo somente enquanto o usuário mantém o handle autorizado. O conteúdo
continua no arquivo local; o navegador não envia o perfil para um banco central.

## Navegação

Depois que um perfil é aberto ou criado com sucesso, a aplicação navega para `/`.

O usuário pode fechar o perfil posteriormente pela área de dispositivos. Ao fechar o
arquivo, a tela inicial volta a oferecer **Abrir perfil**, **Criar perfil** e
**Perfil de outro dispositivo**.
