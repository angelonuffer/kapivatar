import { render, screen, fireEvent, waitFor } from "@testing-library/svelte"
import { describe, expect, it, vi } from "vitest"
import { tick } from "svelte"
import CriarPerfil from "../src/routes/(login)/perfil/criar/+page.svelte"

const callbacks = vi.hoisted(() => ({
  criar_arquivo_perfil: vi.fn(async () => {}),
  obter_diretorio: vi.fn(async () => ({})),
  gerar_chaves: vi.fn(async () => ({ privateKey: {} })),
  exportar_chave: vi.fn(async () => ({ kty: "EC" })),
  gerar_hash: vi.fn(async () => "hash"),
  escrever_arquivo: vi.fn(async () => {}),
  gravar_dado_sqlite: vi.fn(async () => {}),
  obter_dispositivo_local: vi.fn(async () => ({ id: "dispositivo", nome: "Este dispositivo" })),
  carregar_dispositivos_pareados: vi.fn(async () => []),
  goto: vi.fn(),
}))

vi.mock("../src/kapivatar.js", () => callbacks)
vi.mock("$app/navigation", () => ({ goto: callbacks.goto }))

describe("CriarPerfil", () => {
  it("exibe o campo de foto", () => {
    render(CriarPerfil)

    expect(screen.getByLabelText("Foto")).toHaveAttribute("type", "file")
    expect(screen.getByLabelText("Foto")).toHaveAttribute("accept", "image/*")
  })

  it("valida o campo obrigatório de nome", async () => {
    render(CriarPerfil)
    const formulario = screen.getByRole("button", { name: /Salvar Perfil/ }).closest("form")

    await fireEvent.submit(formulario)

    expect(screen.getByLabelText("Nome")).toBeInvalid()
  })

  it("salva o perfil e navega para a página de perfil", async () => {
    render(CriarPerfil)

    await fireEvent.input(screen.getByLabelText("Nome"), { target: { value: "Capivara" } })
    await fireEvent.input(screen.getByLabelText("Bio"), { target: { value: "Uma bio" } })
    await tick()
    await fireEvent.submit(screen.getByRole("button", { name: /Salvar Perfil/ }).closest("form"))

    expect(callbacks.criar_arquivo_perfil).toHaveBeenCalledWith("Capivara.kapivatar")
    await waitFor(() => {
      expect(callbacks.gravar_dado_sqlite).toHaveBeenCalled()
      expect(callbacks.goto).toHaveBeenCalledWith("/perfil")
    })
  })
})
