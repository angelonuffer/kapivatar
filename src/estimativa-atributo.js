const modelo_descricao_imagem = "Xenova/vit-gpt2-image-captioning"
const modelo_estimativa = "onnx-community/Qwen2.5-0.5B-Instruct"

let carregar_descritor
let carregar_estimador

const obter_pipeline = async (modelo, tipo, dtype = "q4") => {
  const { pipeline } = await import("@huggingface/transformers")
  return pipeline(tipo, modelo, { dtype })
}

const obter_descritor = () => {
  carregar_descritor ??= obter_pipeline(modelo_descricao_imagem, "image-to-text", "q8")
    .catch((erro) => {
      carregar_descritor = null
      throw erro
    })
  return carregar_descritor
}

const obter_estimador = () => {
  carregar_estimador ??= obter_pipeline(modelo_estimativa, "text-generation")
    .catch((erro) => {
      carregar_estimador = null
      throw erro
    })
  return carregar_estimador
}

const descrever_imagem = async (arquivo) => {
  const descritor = await obter_descritor()
  const url = URL.createObjectURL(arquivo)
  try {
    const resultado = await descritor(url, { max_new_tokens: 50, num_beams: 3 })
    const descricao = resultado?.[0]?.generated_text?.trim()
    if (!descricao) throw new Error("O modelo não conseguiu descrever a imagem.")
    return descricao
  } finally {
    URL.revokeObjectURL(url)
  }
}

const valor_saida = (resultado, prompt) => {
  let texto = resultado?.[0]?.generated_text
  if (Array.isArray(texto)) texto = texto.at(-1)?.content
  if (typeof texto !== "string") throw new Error("O modelo não retornou um valor.")
  return (texto.startsWith(prompt) ? texto.slice(prompt.length) : texto)
    .replace(/```(?:text)?/gi, "")
    .trim()
}

const normalizar_valor = (texto, tipo) => {
  if (tipo === "numero") {
    const numero = texto.replace(",", ".").match(/[-+]?(?:\d+\.?\d*|\.\d+)/)?.[0]
    if (numero === undefined || !Number.isFinite(Number(numero))) {
      throw new Error("A IA não gerou um valor numérico válido.")
    }
    return numero
  }
  if (tipo === "logico") {
    const valor = texto.trim().toLocaleLowerCase("pt-BR")
    if (/^(true|verdadeiro|sim)\b/.test(valor)) return "true"
    if (/^(false|falso|não|nao)\b/.test(valor)) return "false"
    throw new Error("A IA não gerou um valor lógico válido.")
  }
  const valor = texto.replace(/^["'“”]+|["'“”]+$/g, "").trim()
  if (!valor) throw new Error("A IA não gerou um valor de texto.")
  return valor
}

export const montar_prompt_estimativa = ({
  nota,
  descricao_imagem,
  atributos,
  atributo_atual,
}) => {
  const tipo = {
    texto: "texto",
    numero: "número",
    logico: "lógico (responda apenas true ou false)",
  }[atributo_atual.tipo]
  const outros_atributos = atributos
    .filter((atributo) => atributo.id !== atributo_atual.id
      && atributo.nome.trim()
      && atributo.valor !== "")
    .map(({ nome, tipo: tipo_atributo, valor }) => `- ${nome} (${tipo_atributo}): ${valor}`)
  return [
    "Estime o valor de um atributo com base apenas nas informações fornecidas.",
    "Responda somente com o valor, sem explicações.",
    `Nota: ${nota.trim() || "não informada"}`,
    `Descrição da imagem: ${descricao_imagem || "não informada"}`,
    `Outros atributos preenchidos:\n${outros_atributos.length ? outros_atributos.join("\n") : "nenhum"}`,
    `Nome do atributo a estimar: ${atributo_atual.nome.trim()}`,
    `Tipo esperado: ${tipo}`,
    atributo_atual.tipo === "numero"
      ? "Para números, responda somente com um número, usando ponto decimal."
      : "",
  ].filter(Boolean).join("\n\n")
}

export const estimar_valor_atributo = async ({
  nota,
  imagem,
  atributos,
  atributo_atual,
}) => {
  const descricao_imagem = imagem ? await descrever_imagem(imagem) : ""
  const prompt = montar_prompt_estimativa({
    nota,
    descricao_imagem,
    atributos,
    atributo_atual,
  })
  const estimador = await obter_estimador()
  const resultado = await estimador([{ role: "user", content: prompt }], {
    max_new_tokens: 80,
    do_sample: false,
  })
  return normalizar_valor(valor_saida(resultado, prompt), atributo_atual.tipo)
}
