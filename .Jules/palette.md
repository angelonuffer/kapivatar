## 2025-05-15 - [Acessibilidade em Botões de Ícones e Navegação por Teclado]
**Learning:** O uso extensivo de Material Symbols para ações (menu, fechar, salvar) sem labels textuais cria barreiras para tecnologias assistivas. Além disso, a paleta de cores escura do Kapivatar exige um contraste de foco bem definido para usuários de teclado.
**Action:** Sempre incluir `aria-label` em botões que utilizam apenas ícones e implementar `:focus-visible` com um outline de alto contraste (usando `--cor-primaria-clara`) para garantir que o indicador de foco seja visível sobre o fundo escuro sem poluir a interface para usuários de mouse.
## 2024-05-22
- Learning: Form centered layout improves readability on larger screens. Custom file inputs with previews provide immediate visual feedback, enhancing the UX for profile creation.
- Action: Implemented centered form layout and custom file upload components with image previews in `www/kapivatar.js` and `www/kapivatar.css`.
