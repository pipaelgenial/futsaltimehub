# Futsal Time Hub — PRD

## Problem Statement
Aplicação para monitorizar tempos de jogadores numa partida de futsal (tempos totais, parciais, substituições). Pixel-perfect clone do `futsal-load-hub`. Expandido para incluir golos, assistências, faltas, cartões, regra dos 2 minutos para vermelho, gestão de equipas, fluxo de aprovação por administrador, recuperação de password e exportação de estatísticas.

## Architecture
- **Frontend**: React + TailwindCSS + shadcn/ui
- **Backend**: FastAPI + MongoDB (Motor Async) + JWT
- **Auth**: JWT custom (default admin: pedrompsantos84@gmail.com)
- **Emails**: Resend (`onboarding@resend.dev` em modo teste — só entrega ao owner da conta Resend até o domínio `futsal-time-hub.pt` ser verificado)
- **Exports**: jsPDF + jspdf-autotable (PDF) + CSV nativo

## Implemented (Changelog)
- 2026-06-22 → MVP frontend com localStorage (timers, substituições, parciais)
- 2026-06-23 → Eventos: golos, assistências, faltas, cartões + regras de futsal
- 2026-06-24 → Migração para backend FastAPI + MongoDB + JWT
- 2026-06-25 → Painel admin de aprovação de utilizadores
- 2026-06-26 → Recuperação de password (Resend) + correção do sender para `onboarding@resend.dev`
- 2026-06-26 → **Exportação de estatísticas CSV + PDF** (por jogo e da época) na página `/estatisticas`

## Key Endpoints
- `POST /api/auth/login`, `register`, `forgot-password`, `reset-password`
- `GET/POST /api/team`, `/api/athletes`, `/api/matches`
- `GET /api/admin/users`, `PUT /api/admin/users/{id}/status`, `POST /api/admin/users/{id}/password`

## Backlog (P1/P2)
- 🟡 **P1** Criar conta de teste `treinador@futsal.pt` / `treinador123` (pendente)
- 🟢 **P2** Verificar domínio `futsal-time-hub.pt` no Resend
- 🟢 **P2** Refactor de `Monitor.jsx` (~1500 linhas)
- 🟢 **P2** Partilha pública de resumo de jogo (link partilhável)

## Test Credentials
Ver `/app/memory/test_credentials.md`
