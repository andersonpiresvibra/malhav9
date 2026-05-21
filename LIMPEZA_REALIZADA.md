# Relatorio de Limpeza — Codigo Morto Removido

## Arquivos Deletados (codigo morto)

### UI Components nunca usados (21 arquivos)
- accordion.tsx, aspect-ratio.tsx, breadcrumb.tsx, button-group.tsx
- calendar.tsx, carousel.tsx, command.tsx, context-menu.tsx
- drawer.tsx, dropdown-menu.tsx, hover-card.tsx, input-group.tsx
- input-otp.tsx, menubar.tsx, navigation-menu.tsx, pagination.tsx
- progress.tsx, resizable.tsx, scroll-area.tsx, slider.tsx
- sonner.tsx, toggle-group.tsx

### Backend nao mais usado (migrado para Supabase)
- api/ (diretorio completo com routers, middleware, boot)
- contracts/ (tipos compartilhados do tRPC)
- db/ (schema Drizzle, relations, seed)
- src/providers/trpc.tsx (provider tRPC)
- src/pages/ (diretorio vazio)
- src/sections/ (diretorio vazio)
- src/components/ui/chart.tsx (1 ref, nao usado no app principal)
- src/components/ui/empty.tsx (1 ref, nao usado no app principal)
- src/components/ui/sidebar.tsx (shadcn sidebar, nao usado)
- src/hooks/use-mobile.ts (só usado pelo sidebar shadcn)

### Config backend
- tsconfig.server.json
- drizzle.config.ts
- Dockerfile, .dockerignore
- vitest.config.ts

## Arquivos Atualizados

- vite.config.ts — removidos aliases @contracts, @db, devServer
- tsconfig.json — removidas refs ao server.json e paths mortos
- tsconfig.app.json — removidos paths @contracts, @db
- src/main.tsx — removido TRPCProvider
- package.json — removidos scripts de backend (esbuild, drizzle, start)

## Arquivo Restaurado (erro meu na limpeza)

- src/hooks/useOnClickOutside.ts — usado por FlightDetailsModal.tsx

## Resultado

Antes: ~95 arquivos | Depois: ~68 arquivos
Reducao de 28% no tamanho da codebase

Build: OK
