# INSTRUCOES — Como Aplicar no GitHub

## O que foi feito (resumo)

O app foi refatorado para usar PostgreSQL de verdade:

1. **RPC Functions** — 10 funcoes SQL no PostgreSQL substituem queries complexas do JS
2. **Audit Triggers** — O banco detecta e alerta automaticamente quando prefixo/posicao/horario mudam
3. **Supabase Realtime** — WebSocket substitui o polling de 10 segundos (alertas instantaneos)
4. **Tabela de Alertas** — Notificacoes visuais no app quando a malha externa muda
5. **Cache inteligente** — Evita re-fetch desnecessario

---

## Arquivos NOVOS (copiar para o repo)

```
supabase/migrations/001_rpc_functions.sql      <- Funcoes SQL (executar no Supabase)
supabase/migrations/002_audit_triggers.sql     <- Triggers de auditoria (executar no Supabase)
src/lib/supabase.ts                             <- Cliente Supabase configurado
src/services/supabaseService.ts                 <- Servico refatorado com RPC
src/hooks/useRealtime.ts                        <- Hook de WebSocket (substitui polling)
src/hooks/useDatabaseSync.ts                    <- REMOVIDO (nao precisa mais)
.env.example                                    <- Variaveis de ambiente
```

---

## Arquivos MODIFICADOS

```
src/App.tsx      <- Adicionado Realtime, toasts, painel de alertas, indicador DB
```

---

## Passo a Passo para Aplicar

### 1. No Supabase (SQL Editor)

Abra o SQL Editor do Supabase e execute NA ORDEM:

1. `001_rpc_functions.sql` — Cria as 10 funcoes RPC
2. `002_audit_triggers.sql` — Cria tabela de alertas, snapshots e triggers

### 2. No Seu Repo GitHub

Copie os arquivos novos listados acima para as mesmas pastas no seu repo.

Substitua o `src/App.tsx` pelo novo.

### 3. Variaveis de Ambiente

No Cloudflare Pages (ou .env local), adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 4. Dependencias

No package.json, adicione se nao tiver:
```json
"@supabase/supabase-js": "^2.x"
```

### 5. Deploy

Commite, push pro GitHub. O Cloudflare faz o resto.

---

## Como Funciona Depois

| Cenario | Antes (localStorage) | Depois (PostgreSQL + Realtime) |
|---------|---------------------|-------------------------------|
| Operador abre app | Carrega do localStorage | Carrega do PostgreSQL via RPC |
| Malha muda prefixo | Nao detecta | Trigger insere alerta → Toast instantaneo |
| Outro LT muda voo | So ve ao dar F5 | Ve em tempo real via WebSocket |
| Relatorio | JS calcula | PostgreSQL calcula (mais rapido) |

---

## Proximo Passo (n8n)

Quando quiser automatizar as planilhas LATAM/GOL:

1. Instale n8n no Railway (gratis): https://railway.app
2. Importe o workflow que vou te fornecer
3. Conecte Google Sheets + Excel Online
4. O n8n chama a funcao `save_mesh_snapshot()` no Supabase
5. O trigger `compare_mesh_with_snapshot()` detecta mudancas
6. O app mostra alerta em tempo real

