# Crash Game

[English](README.md)

[![CI](https://github.com/victor-dias-dev/test-fullstack-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/victor-dias-dev/test-fullstack-challenge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Um crash game multiplayer: o multiplicador sobe a partir de 1,00x e para num ponto escolhido antes da rodada. O jogador aposta na janela de apostas e saca antes do crash, ou perde a stake.

Saldos, stakes e payouts são centavos inteiros. O jogo e a carteira são serviços separados. O débito entra num outbox na mesma transação da aposta e só então vai para o RabbitMQ. Isto é uma referência local, não um cassino. Não ligue isto a dinheiro real.

![Login](docs/screenshots/login.png)
![Jogo](docs/screenshots/game.png)
![Rodada ao vivo](docs/screenshots/round.png)

## O que o app cobre

- Login no Keycloak e uma carteira por jogador
- Multiplicador ao vivo, janela de apostas e cash out
- Histórico de rodadas e ranking por lucro
- Crash point provably fair, verificável depois da rodada
- Débito e crédito entre jogo e carteira via RabbitMQ

## Requisitos

- Docker Compose v2
- [Bun](https://bun.sh), para testes ou serviços fora do Docker

## Como subir

```bash
bun run docker:up
```

Isso constrói e sobe Postgres, RabbitMQ, Keycloak, Kong, os dois serviços e o frontend. Os logs ficam no primeiro plano. Em segundo plano: `bun run docker:up:detached`.

Se o Postgres inicializou uma vez e falhou:

```bash
docker compose down -v
bun run docker:up
```

O jogador de teste é `player` / `player123`.

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Kong | http://localhost:8000 |
| Games | http://localhost:4001 |
| Wallets | http://localhost:4002 |
| Keycloak | http://localhost:8080 (realm `crash-game`) |

Fora do Docker, deixe Postgres, RabbitMQ e Keycloak no Compose, copie os exemplos de env, faça o build de `@crash/provably-fair` e suba cada app:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
bun run --cwd packages/provably-fair build
```

| Variável | Função |
| --- | --- |
| `DATABASE_URL` | Postgres daquele serviço |
| `RABBITMQ_URL` | URL do broker |
| `KEYCLOAK_JWKS_URI` | Certificados do realm |
| `KEYCLOAK_ISSUER` | Emissor esperado do token |
| `VITE_API_URL` | URL base do Kong no frontend |
| `VITE_SOCKET_URL` | WebSocket do jogo. Não passa pelo Kong |
| `VITE_KEYCLOAK_URL` | URL base do Keycloak |

Os valores `VITE_*` ficam fixos no build da imagem do frontend.

## Verificação

```bash
bun run test
bun run lint
bun run typecheck
```

Os testes de integração precisam de dois bancos e do RabbitMQ. Os serviços não compartilham histórico de migration.

```bash
export GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
export WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
bun run test:integration
```

Checagens HTTP contra a stack no ar ficam locais: `bun run test:e2e` dentro de `services/games` e `services/wallets`.

## Repositório

```text
services/games          Rodadas, apostas, crash point, WebSocket, outbox
services/wallets        Carteira, débito e crédito atômicos, inbox
packages/provably-fair  Crash point e payout inteiro
frontend                React, Vite, TanStack Query, Zustand
```

Por que a carteira não é uma chamada HTTP: [docs/why-not-http.pt.md](docs/why-not-http.pt.md). Decisões: [docs/adr](docs/adr). O pacote da fórmula: [packages/provably-fair](packages/provably-fair). O enunciado original está em [docs/original-brief.md](docs/original-brief.md).

Depois do crash, `GET /games/rounds/:roundId/verify` devolve as seeds e o crash point em centésimos (`100` é `1,00x`). Recalcule com `verify` de `@crash/provably-fair`. Um por cento dos sorteios crasheia em exatamente `1,00x`. O payout é `amountCents * multiplierHundredths / 100`, truncado para baixo. A aposta vai de 1,00 a 1.000,00.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Relatos de segurança vão por [aviso privado](https://github.com/victor-dias-dev/test-fullstack-challenge/security/advisories/new), descrito em [SECURITY.md](SECURITY.md).

Licenciado sob a [licença MIT](LICENSE).
