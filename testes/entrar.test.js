import { render, screen, fireEvent } from "@testing-library/svelte"
import { describe, expect, it, vi } from "vitest"
import Entrar from "../src/entrar.svelte"

const props = () => ({
  url_logo: "/logo.svg",
  url_capivara: "/capivara.svg",
  abrir_perfil: vi.fn(),
  navegar: vi.fn(),
  criar_arquivo_perfil: vi.fn(),
  obter_diretorio: vi.fn(),
  gerar_chaves: vi.fn(),
  exportar_chave: vi.fn(),
  gerar_id_perfil: vi.fn(),
  gerar_hash: vi.fn(),
  escrever_arquivo: vi.fn(),
  ler_arquivo: vi.fn(),
  gravar_dado_sqlite: vi.fn(),
  obter_dispositivo_local: vi.fn(),
  carregar_dispositivos_pareados: vi.fn(() => []),
})

describe("Entrar", () => {
  it("oferece abrir perfil, criar perfil e perfil de outro dispositivo", () => {
    render(Entrar, { props: props() })

    expect(screen.getByRole("button", { name: /Abrir perfil/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Criar perfil/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Perfil de outro dispositivo/ })).toBeInTheDocument()
  })

  it("abre o formulário ao criar perfil", async () => {
    render(Entrar, { props: props() })

    await fireEvent.click(screen.getByRole("button", { name: /Criar perfil/ }))

    expect(screen.getByLabelText("Nome")).toBeInTheDocument()
    expect(screen.getByLabelText("Bio")).toBeInTheDocument()
  })

  it("navega para parear outro dispositivo", async () => {
    const callbacks = props()
    render(Entrar, { props: callbacks })

    await fireEvent.click(screen.getByRole("button", { name: /Perfil de outro dispositivo/ }))

    expect(callbacks.navegar).toHaveBeenCalledWith("/dispositivos/parear/receber")
  })
})
