# Seed determinístico para testes E2E (bônus)

Objetivo: ambiente reproduzível quando a stack (`bun run docker:up`) já está no ar.

## Pré-requisitos

- Postgres (`games`, `wallets`), RabbitMQ, Keycloak, Kong, games e wallets rodando.

## Passos sugeridos

1. **Token de teste** — obtenha um access token do realm `crash-game` (fluxo password ou browser). Exporte:
   ```bash
   export E2E_ACCESS_TOKEN="eyJ..."
   ```

2. **Carteira** — `POST http://localhost:8000/wallets/` com `Authorization: Bearer …` cria carteira com saldo inicial (ver serviço wallets).

3. **Rodada** — o games service inicia rodadas automaticamente; o crash point é derivado do provably fair no servidor. Para cenários fixos (ex.: crash em 1.5x) seria necessário injetar seed no `RoundLifecycleService` ou expor modo de teste — não incluído por padrão.

4. **Rodar E2E HTTP** (com serviços no ar):
   ```bash
   cd services/games && E2E_GAMES_URL=http://127.0.0.1:4001 bun test tests/e2e
   cd services/wallets && E2E_WALLETS_URL=http://127.0.0.1:4002 bun test tests/e2e
   ```

5. **Limpar estado** — `docker compose down -v` remove volumes Postgres/RabbitMQ para estado limpo.

Este documento cobre o **bônus "Seed determinística"** na forma de procedimento reproduzível; seeds numéricos fixos de crash exigiriam feature flag no engine.
