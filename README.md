# Stockly

PDV para varejo e moda com controle de estoque e emissão simulada de NF-e.

## Stack
Vite + React + TypeScript, SCSS Modules, Zustand (UI), Dexie/IndexedDB (persistência), Zod (validação), React Hook Form, React Router, Vitest.

## Camadas
- `src/domain/` regras puras (sem React, sem Dexie). Dinheiro em centavos inteiros.
  - `product/` produto-pai e variações cor × tamanho, geração de SKU.
  - `stock/` estoque por movimentos (event-sourced). Saldo = soma.
  - `sales/` venda, totais, pagamento, troco.
  - `fiscal/` perfil tributário por NCM, cálculo de ICMS, XML NF-e **simulado**.
  - `ports.ts` contratos de repositório.
- `src/infra/db/` implementação Dexie dos contratos. Trocar por API = nova implementação.
- `src/store/` estado de UI (carrinho). Não contém regra de negócio.
- `src/features/` telas (caixa, estoque, vendas), consomem domínio via repositórios.
- `src/app/` shell, rotas e layout.

## Regras de ouro
1. Estoque nunca é editado: só entram movimentos. Saldo é derivado.
2. Item de venda guarda snapshot (preço, SKU, NCM) no momento da venda.
3. Venda só finaliza se `assertAvailable` passar para todos os itens e o pagamento cobrir o total.
4. Fiscal é simulado. Nada é transmitido à SEFAZ.

## Comandos
- `npm install`
- `npm run dev`
- `npm run build` (tsc --noEmit + vite build)
- `npm test`
