# Esquema de dados

Este documento descreve onde e como o Kapivatar persiste os dados de um perfil.

## Visão geral

Um perfil é armazenado em um único arquivo SQLite escolhido pelo usuário. A extensão sugerida é `.kapivatar`, embora o aplicativo também aceite arquivos `.sqlite`.

O armazenamento combina quatro mecanismos:

| Mecanismo | Conteúdo |
| --- | --- |
| Arquivo SQLite | Dados do perfil, arquivos virtuais, contatos, conversas, imagens e assobios |
| IndexedDB | Handle do arquivo SQLite selecionado pelo usuário |
| `localStorage` | Versões usadas na sincronização |
| `sessionStorage` | Estado temporário de permissão usado pelo sistema de arquivos virtual |

Os dados do perfil não são guardados em um banco central.

## Arquivo SQLite do perfil

O arquivo é aberto e manipulado no navegador por meio de SQLite WASM. Ao ser criado, ele contém somente a tabela abaixo:

```sql
CREATE TABLE kapivatar_dados (
  chave TEXT PRIMARY KEY,
  valor BLOB NOT NULL
);
```

| Coluna | Tipo | Restrição | Significado |
| --- | --- | --- | --- |
| `chave` | `TEXT` | chave primária | Nome lógico do dado ou caminho virtual do arquivo |
| `valor` | `BLOB` | `NOT NULL` | Conteúdo armazenado |

Na prática, `valor` pode ser armazenado pelo SQLite como texto, blob ou JSON JSON-text. As operações de leitura e escrita reconhecem esses formatos.

Um arquivo só é aceito pelo aplicativo quando:

- a tabela se chama exatamente `kapivatar_dados`;
- `chave` é `TEXT PRIMARY KEY`;
- `valor` é `BLOB NOT NULL`;
- não existem outras tabelas de usuário;
- não existem linhas com `chave` ou `valor` nulos;
- o arquivo passa na verificação `PRAGMA integrity_check`.

Essa validação impede que um arquivo aleatório seja confundido com um perfil ou que tabelas adicionais sejam abertas silenciosamente.

Todas as alterações usam inserção com substituição da chave:

```sql
INSERT INTO kapivatar_dados (chave, valor)
VALUES (?, ?)
ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;
```

Depois de gravar ou remover uma linha, o banco é exportado integralmente e escrito de volta no handle escolhido pelo usuário.

## Serialização da coluna `valor`

Os dados são convertidos conforme o tipo informado pela aplicação:

| Tipo produzido | Representação em `kapivatar_dados.valor` |
| --- | --- |
| Perfil (`chave = "perfil"`) | JSON-text; deve representar um objeto JSON |
| `string` | Texto SQLite |
| `Blob` | Bytes de `ArrayBuffer` |
| `ArrayBuffer` | Bytes |
| `ArrayBuffer.isView()` | Bytes da view |
| Outros objetos, números e valores que não se enquadram nos casos acima | `Uint8Array` JSON codificado com o prefixo `kapijson` |

Os objetos JSON genéricos armazenados pela aplicação são escritos com um prefixo binário `0x6b 0x61 0x70 0x69 0x6a 0x73 0x6f 0x6e` (os caracteres ASCII de `kapijson`) seguido por UTF-8 contendo `JSON.stringify(...)`. A leitura decodifica esse formato; valores sem o prefixo válido são retornados como bytes.

O conteúdo especial da chave `perfil` é sempre JSON-text. Ele é o único caso em que uma string armazenada é interpretada automaticamente como JSON na leitura.

## Estrutura do perfil

A chave reservada `perfil` contém um objeto JSON com o formato abaixo:

```json
{
  "capa": [
    { "data": "2026-11-21T14:12:51.041Z", "valor": "hash-sha256-hexadecimal" }
  ],
  "foto": [
    { "data": "2026-11-21T14:12:51.041Z", "valor": "hash-sha256-hexadecimal" }
  ],
  "nome": [
    { "data": "2026-11-21T14:12:51.041Z", "valor": "Nome" }
  ],
  "bio": [
    { "data": "2026-11-21T14:12:51.041Z", "valor": "Biografia" }
  ],
  "visibilidade_foto": [
    { "data": "2026-11-21T14:12:51.041Z", "valor": "privado" }
  ],
  "chave_privada": {},
  "dispositivo": {
    "id": "uuid",
    "nome": "Nome do dispositivo"
  },
  "outros_dispositivos": [
    {
      "id": "uuid",
      "nome": "Outro dispositivo",
      "chave_secreta": "chave-secreta-base64url",
      "pareado_em": "2026-11-21T14:12:51.041Z"
    }
  ]
}
```

Os campos `capa`, `foto`, `nome`, `bio` e `visibilidade_foto` são históricos. Cada entrada possui `data` em formato ISO 8601 e `valor`. O valor efetivo é a entrada cuja `data` é a maior.

Regras atuais:

- `capa` e `foto` referenciam hashes SHA-256 de 64 caracteres hexadecimais;
- `nome` e `bio` possuem valores textuais;
- `visibilidade_foto` aceita somente `privado` ou `publico`;
- `chave_privada` deve ser um JWK RSA-OAEP usado pelo perfil;
- `dispositivo.id` e `dispositivo.nome` são obrigatórios;
- `outros_dispositivos` deve ser uma lista;
- não são permitidos outros campos de primeiro nível no perfil.

A chave pública usada fora da aplicação é derivada da chave privada armazenada. O ID público do perfil é o SHA-256 da chave pública codificada em SPKI.

A chave `kapivatar.dispositivo.nome` herdada de versões anteriores é removida ao abrir um banco que ainda a contém. Ela não faz parte do formato atual.

## Sistema de arquivos virtual

Os dados não são separados em várias tabelas. A aplicação expõe uma interface de diretórios e arquivos que usa a mesma tabela `kapivatar_dados` como armazenamento chave-valor:

- nomes simples são chaves de arquivos;
- diretórios são representados por chaves iniciadas com `dir:`;
- subdiretórios acrescentam o prefixo do diretório à chave dos arquivos.

Exemplos:

| Uso | Chave |
| --- | --- |
| Arquivo raiz `contatos` | `contatos` |
| Conversa entre dois IDs | `chat_<meu_id>_<contato_id>` |
| Assobios ativos | `assobios` |
| Assobios arquivados | `assobios_arquivados` |
| Conteúdo identificado por conteúdo | `<hash_sha256>` |
| Diretório virtual | `dir:<nome_do_diretorio>` |
| Diretório dentro de outro diretório | `<prefixo>/<nome_do_diretorio>` com chave `dir:<prefixo><nome_do_diretorio>` |

Ao criar um diretório virtual, o valor contém o nome do diretório e o prefixo usado pelos descendentes:

```json
{
  "name": "nome",
  "prefix": "nome/"
}
```

Ao criar um arquivo virtual que ainda não existe, o valor inicial é uma string vazia. A escrita posterior substitui esse valor.

As referências a conteúdos são feitas pelo SHA-256:

1. o conteúdo é convertido em bytes;
2. o SHA-256 é calculado;
3. os bytes são guardados na chave correspondente ao hash;
4. o objeto JSON ou a chave de ponteiro guarda esse hash.

Esse padrão é usado, por exemplo, para fotos de perfil, capas, imagens de assobios e versões de conteúdos relacionais.

## Dados relacionais no sistema de arquivos virtual

### Contatos

O valor da chave `contatos` é texto contendo o hash da versão atual da lista de contatos.

Esse hash aponta para uma chave que contém JSON no formato:

```json
{
  "contatos": [],
  "solicitações_enviadas": [],
  "solicitações_recebidas": [],
  "solicitações_enviadas_datas": {},
  "data": "2026-11-21T14:12:51.041Z",
  "anterior": "hash-da-versao-anterior"
}
```

Cada contato também possui a chave pública do perfil remoto e, quando disponíveis, os hashes dos seus arquivos de foto e capa.

### Conversas

Cada conversa usa duas chaves:

- `chat_<meu_id>_<contato_id>` contém o hash da versão atual da conversa;
- o hash corresponde à chave com o objeto JSON da conversa.

Uma conversa atual tem o formato:

```json
{
  "mensagens": [
    {
      "id": "uuid-da-mensagem",
      "id_remetente": "id-do-perfil",
      "texto": "Texto da mensagem",
      "data": "2026-11-21T14:12:51.041Z",
      "recebida": false
    }
  ],
  "data": "2026-11-21T14:12:51.041Z",
  "anterior": "hash-da-versao-anterior"
}
```

`recebida` é opcional e indica que o remetente recebeu confirmação de entrega.

### Assobios

Há duas listas especiais:

- `assobios` representa os assobios ativos;
- `assobios_arquivados` representa os assobios arquivados.

Cada lista guarda o hash de uma versão JSON:

```json
{
  "assobios": ["uuid-do-assobio"],
  "data": "2026-11-21T14:12:51.041Z",
  "anterior": "hash-da-versao-anterior"
}
```

Cada UUID de assobio é uma chave cujo valor é o hash do conteúdo do assobio. A chave do hash contém JSON no formato:

```json
{
  "perfil": "id-do-perfil",
  "perfil_nome": "Nome no momento da publicação",
  "data": "2026-11-21T14:12:51.041Z",
  "data_modificacao": "2026-11-21T14:12:51.041Z",
  "nota": "Texto do assobio",
  "atributos": [
    {
      "nome": "Nome",
      "tipo": "texto",
      "valor": "Valor"
    }
  ],
  "imagem": "hash-sha256-hexadecimal",
  "anterior": "hash-da-versao-anterior"
}
```

Os tipos permitidos de atributo são `texto`, `numero` e `logico`.

### Autorizações externas

Ao autorizar um aplicativo externo, o aplicativo cria um diretório virtual cuja chave é derivada do SHA-256 da origem externa:

```text
dir:<sha256-da-origin>
```

A existência desse diretório indica que a origem foi autorizada. O diretório não guarda o perfil, apenas registra a autorização.

## IndexedDB

A persistência do handle do arquivo fora do SQLite fica no IndexedDB.

- nome do banco: SHA-256 de uma representação JSON do esquema passado a `banco.js`;
- versão: `1`;
- object store: `byName`;
- chave: `arquivo_sqlite`;
- valor: `FileSystemFileHandle` selecionado pelo usuário.

O banco real é identificado pelo código como um nome hexadecimal com 64 caracteres derivado do esquema:

```json
{
  "objectStores": [
    {
      "name": "byName"
    }
  ]
}
```

O IndexedDB guarda somente o handle que permite recuperar a localização do arquivo. O conteúdo do perfil continua no arquivo SQLite.

## `localStorage`

Os metadados locais usados pelo navegador são mantidos diretamente no `localStorage`:

| Chave | Conteúdo |
| --- | --- |
| `kapivatar.sincronizacao.versoes` | Objeto JSON que registra a última versão conhecida de cada chave sincronizada |

Cada entrada de versão sincronizada contém:

```json
{
  "instante": 1763734371041,
  "dispositivo": "uuid-do-dispositivo",
  "operacao": "gravar"
}
```

`operacao` pode ser `gravar` ou `remover`.

Também existe a constante interna `kapivatar.dispositivo.chave`, reservada para uma chave secreta do dispositivo, mas a implementação atual não a usa para persistir o valor.

## `sessionStorage`

O sistema de arquivos virtual usa `"_permissionState"` no `sessionStorage` para manter o estado temporário `granted` em casos sem handle nativo. Esse dado não faz parte do perfil.

## Sincronização entre dispositivos

Somente as linhas do arquivo SQLite são sincronizadas, exceto a chave reservada `arquivo_sqlite`. Todo valor deve respeitar o limite configurado de sincronização e é fragmentado para transporte MQTT.

O formato enviado declara:

- chave da linha;
- operação (`gravar` ou `remover`);
- versão (`instante`, `dispositivo`, `operacao`);
- formato do valor (`texto`, `json`, `binario` ou `vazio`);
- identificador da transferência;
- número da parte e total de partes;
- bytes codificados em base64 URL.

A resolução usa o registro de versão: o maior `instante` vence; em caso de empate, o menor/maior desempate segue o ID do dispositivo por comparação lexicográfica. Os dados enviados são protegidos por AES-GCM e uma chave derivada por HKDF da chave secreta compartilhada no pareamento.

Handles de arquivo, permissões do sistema de arquivos e o conteúdo do IndexedDB não são sincronizados.

## Exclusão e ciclo de vida

- remover uma chave executa `DELETE FROM kapivatar_dados WHERE chave = ?`;
- remover o perfil fecha o SQLite e remove o handle salvo no IndexedDB;
- ao abrir ou criar um banco, alterações pendentes são serializadas antes de trocar o handle ativo;
- gravações são enfileiradas para que escritas consecutivas não aconteçam concorrentemente;
- a sincronização ocorre somente enquanto o arquivo SQLite está aberto;
- o arquivo é persistido após cada criação de banco vazio, remoção ou gravação.
