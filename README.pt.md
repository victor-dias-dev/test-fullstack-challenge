# Crash Game

Referência educacional de um crash game multiplayer: o multiplicador sobe a partir de 1,00x e para num ponto escolhido antes da rodada. O jogador aposta na janela de apostas e saca antes do crash, ou perde a stake.

Isto não é um cassino e não movimenta dinheiro real. Saldos são centavos inteiros num Postgres local. Não aponte isto para um sistema de pagamento real.

English: [README.md](README.md).

## Por que a carteira não é uma chamada HTTP

A aposta precisa parecer instantânea: o jogador clica, a carteira debita, a aposta é aceita. O jogo e a carteira são serviços separados, com bancos separados. Uma chamada HTTP acoplaria a disponibilidade dos dois e deixaria um timeout ambíguo (o dinheiro saiu?).

O jogo grava a aposta e a mensagem de débito na mesma transação. Um publisher só envia ao RabbitMQ o que já foi commitado. A carteira altera o saldo com um `UPDATE` condicional e guarda o resultado num inbox pela `correlationId`. Uma entrega repetida republica o mesmo resultado e não mexe no dinheiro de novo.

```mermaid
sequenceDiagram
  participant Game
  participant Outbox
  participant Broker
  participant Wallet
  participant Inbox
  Game->>Outbox: mesma transação da aposta
  Outbox->>Broker: publisher só envia o que já commitou
  Broker->>Wallet: wallet.debit
  Wallet->>Inbox: saldo e resultado na mesma transação
  Wallet->>Broker: republica se a correlationId já existe
```

A versão longa está em [docs/why-not-http.pt.md](docs/why-not-http.pt.md).

## Dinheiro e provably fair

Stakes, saldos e payouts são centavos inteiros. O crash point e o multiplicador do cashout são centésimos inteiros (`100` é `1,00x`). O payout é `amountCents * multiplierHundredths / 100`, truncado para baixo. Não há float em saldo nem em payout.

Um por cento do espaço de 52 bits do HMAC crashea em exatamente `1,00x`. A fórmula, o vetor de teste e o `verify` ficam em [`packages/provably-fair`](packages/provably-fair) (`@crash/provably-fair`). Publique esse pacote com `bun publish` no diretório dele, depois de `bun run build`. Os apps deste repositório continuam privados.

Limites de aposta: mínimo `100` centavos, máximo `100_000` centavos (1,00 a 1.000,00).

## Forma

| Peça | Papel |
| --- | --- |
| `services/games` | Rodadas, apostas, crash point provably fair, WebSocket, outbox |
| `services/wallets` | Uma carteira por jogador, débito e crédito atômicos, inbox |
| `packages/provably-fair` | Crash point e payout inteiro |
| RabbitMQ | Débito e crédito entre os dois serviços |
| Kong | Gateway HTTP para `/games` e `/wallets` |
| Keycloak | OIDC. O WebSocket liga direto no serviço de jogo |
| `frontend` | React, Vite, TanStack Query, Zustand, Socket.IO |

Camadas em cada serviço: `domain`, `application`, `infrastructure`, `presentation`.

| Escolha | O que compra | O que custa |
| --- | --- | --- |
| Exceções HTTP do Nest nos use cases | Encaixa em pipes, filters e Swagger | Erros de domínio viajam menos para fora do Nest |
| Outbox transacional no broker | Uma queda entre a aposta e o publish não perde o débito | Latência, mais um publisher e consumers idempotentes |
| WebSocket fora do Kong | Sem configurar upgrade no gateway | O cliente usa outra URL de socket |
| Imagem de produção do frontend | O mesmo artefato que você implantaria | Sem hot reload; `VITE_*` fica fixo no build |

As decisões estão em [docs/adr](docs/adr).

## Rodar

Requisitos: Docker Compose v2, e [Bun](https://bun.sh) se quiser testes ou serviços fora do Docker.

Na raiz do repositório:

```bash
bun run docker:up
```

Isso constrói e sobe Postgres, RabbitMQ, Keycloak, Kong, os dois serviços e o frontend. Os logs ficam no primeiro plano. Em segundo plano:

```bash
bun run docker:up:detached
```

Se o Postgres inicializou uma vez e falhou, apague o volume e suba de novo:

```bash
docker compose down -v
bun run docker:up
```

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Kong | http://localhost:8000 |
| Games | http://localhost:4001 |
| Wallets | http://localhost:4002 |
| Keycloak | http://localhost:8080 (realm `crash-game`) |

Jogador de teste: `player` / `player123`.

O repositório usa Bun (`bun.lock`). O CI instala com `bun install --frozen-lockfile`, faz typecheck, lint com Biome, testes unitários e testes de integração contra Postgres e RabbitMQ.

### Fora do Docker

Deixe Postgres, RabbitMQ e Keycloak no Compose, copie os exemplos de env, faça o build do pacote fair e suba cada app com Bun:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
cp frontend/.env.example frontend/.env
bun run --cwd packages/provably-fair build
```

```bash
cd services/games && bun install && bun run dev
cd services/wallets && bun install && bun run dev
cd frontend && bun install && bun run dev
```

### Verificar uma rodada

Depois do crash, `GET /games/rounds/:roundId/verify` devolve a server seed, a client seed, o nonce e o crash point em centésimos. Recalcule com `verify` de `@crash/provably-fair`. O hash da server seed era público antes da rodada. Uma seed diferente não bate com esse hash.

### Testes

```bash
bun run test
bun run typecheck
bun run lint
```

Os testes de integração precisam de dois bancos (os serviços não compartilham histórico de migration) e do RabbitMQ:

```bash
export GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
export WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
export RABBITMQ_URL=amqp://guest:guest@localhost:5672
bun run test:integration
```

Checagens HTTP contra a stack no ar ficam locais:

```bash
cd services/games && bun run test:e2e
cd services/wallets && bun run test:e2e
```

O enunciado original do exercício está em [docs/original-brief.md](docs/original-brief.md).
