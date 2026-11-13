# EntregaJá Web

Interface web responsiva em React + TypeScript + Vite, separada da API Spring Boot.

## Requisitos
- Node.js 20.19+ ou 22.12+
- npm
- API EntregaJá em execução na porta 8080

## Executar
Forma mais rápida: na pasta do backend (`entrega-ja-backend`), execute `run-api.bat`.
Ele sobe a API (perfil `dev`, H2), sobe este front-end com `npm run dev` e abre o navegador em `http://localhost:5173` quando a página responde. O `Ctrl+C` encerra os dois serviços.

Ou manualmente:
```bash
npm install
npm run dev
```
Abra `http://localhost:5173`.

A URL da API pode ser alterada criando `.env` com:
```env
VITE_API_URL=http://localhost:8080/api
```

## Fluxos disponíveis
- Tela de acesso com **Entrar** e **Criar conta**, integrada aos endpoints `/api/auth/*` (senhas com hash BCrypt e token de sessão).
- Opção de continuar sem entrar; a sessão é restaurada ao recarregar a página.
- Página inicial com categorias, busca, filtros e lojas em destaque.
- Catálogo de produtos por loja.
- Botão **+** nos produtos adiciona à sacola; um aviso confirma a inclusão.
- Sacola com controle de quantidade e regra de uma loja por pedido.
- Checkout com nome, e-mail e endereço.
- Envio de pedido para a API, validação de estoque e confirmação.
- Consulta de pedidos pelo e-mail informado.
- Perfil com dados da conta, edição dos dados de entrega e logout.

## Responsividade
- Layout fluido de 320px até telas grandes, com grids adaptativos (1–4 colunas).
- Categorias e filtros com rolagem horizontal no celular.
- Sacola em painel lateral e checkout em modal.
- Áreas de toque confortáveis, inputs com 16px no celular (sem zoom no iOS) e suporte a `safe-area` (notch).

As imagens de catálogo são carregadas de URLs públicas do Unsplash. A interface utiliza pagamento na entrega apenas como simulação; nenhum pagamento é cobrado.
