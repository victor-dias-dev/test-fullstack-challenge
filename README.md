# Crash Game — Full-stack Challenge

## Instruções de setup

### Pré-requisitos

- [Bun](https://bun.sh) >= 1.x (ou Node + `pnpm` / `npm` conforme o teu fluxo)
- Docker Desktop (Compose v2)

### Subir a stack completa

Na raiz do repositório (com [Bun](https://bun.sh) ou `npm`/`pnpm`; só precisas de **Docker** a correr):

```bash
bun run docker:up
```

Isto executa `docker compose up --build`: **reconstrói imagens** quando o `Dockerfile` ou o código mudam e sobe todos os serviços em primeiro plano (logs no terminal). Para segundo plano:

```bash
bun run docker:up:detached
```

Se o Postgres já tiver um volume antigo de uma init falhada, antes: `bun run docker:prune` ou `docker compose down -v`, depois `bun run docker:up` outra vez.

### Primeira vez ou Postgres a falhar (exit 126 / bases em falta)

O PostgreSQL cria as bases `games` e `wallets` via `postgres-init-databases.sql` no primeiro arranque com volume vazio. Se o init falhou antes, recria o volume:

```bash
docker compose down -v
pnpm run docker:up
```

### Desenvolvimento local (fora do Docker)

1. Infra: Postgres, RabbitMQ e Keycloak podem continuar nos containers; expõe as portas definidas no `docker-compose.yml`.
2. Copia os exemplos de ambiente:

   ```bash
   cp services/games/.env.example services/games/.env
   cp services/wallets/.env.example services/wallets/.env
   cp frontend/.env.example frontend/.env
   ```

3. Ajusta URLs (`localhost` e portas 5432, 5672, 8080, etc.) conforme o teu `.env`.
4. Frontend: `cd frontend && pnpm dev` (Vite, porta 3000 por defeito).
5. Serviços: em cada pasta `services/games` e `services/wallets`, instala dependências e `pnpm run dev` (ou o script definido no `package.json`).

### Testes (games / wallets)

Os testes usam **Vitest**; não é obrigatório ter o **Bun** instalado. Em cada serviço:

```bash
cd services/games   # ou services/wallets
npm install
npm run test        # unitários
npm run test:e2e    # HTTP E2E (sobe o stack ou define SKIP_E2E=1 para saltar)
```

Com Bun: `bun install` e `bun run test` também funcionam.

### URLs úteis (desenvolvimento)

| Serviço   | URL |
| --------- | --- |
| Kong API  | `http://localhost:8000` (`/games/*`, `/wallets/*`) |
| Games     | `http://localhost:4001` |
| Wallets   | `http://localhost:4002` |
| Keycloak  | `http://localhost:8080` (realm `crash-game`, client público com PKCE) |
| Frontend  | `http://localhost:3000` (Docker: `vite preview`; local: `vite dev`) |

### Nota sobre o frontend no Docker

O `Dockerfile` e o `docker-compose.yml` passam os mesmos `VITE_*` que o `frontend/.env.example` (Kong + URLs diretas a games/wallets + Keycloak). O `vite dev` continua a ler `frontend/.env` local.

### Evitar artefactos `.js` em `frontend/src`

Não commits ficheiros `.js` gerados ao lado de `.ts`/`.tsx`: o bundler no Docker pode resolver o `.js` e o ecrã fica diferente do `pnpm dev`. O `frontend/.gitignore` ignora `src/**/*.js`.

---

## Decisões de arquitetura

- **Dois serviços (bounded contexts)** — **games** (rodadas, apostas, provably fair, WebSocket) e **wallets** (saldo em centavos), com PostgreSQL **separado** por serviço (`games` / `wallets`).
- **Comunicação assíncrona** — RabbitMQ com routing keys estáveis; o wallet debita/credita em resposta a mensagens; o jogo publica pedidos e consome o resultado.
- **API Gateway** — Kong em modo declarativo (`docker/kong/kong.yml`) para `/games` e `/wallets`; o WebSocket do jogo costuma ir **direto** à porta do games (Socket.IO não passa pelo Kong neste desenho).
- **Identidade** — Keycloak (OIDC), JWT validado nos serviços com JWKS e issuer configuráveis.
- **Camadas no backend** — `domain` (entidades, contratos de repositório), `application` (casos de uso e serviços de orquestração), `infrastructure` (Prisma, RabbitMQ), `presentation` (HTTP, WebSocket). Onde faz sentido, **portos** (ex.: barramento de mensagens) desacoplam a aplicação da implementação concreta de fila.
- **Leituras** — Queries dedicadas em vez de injetar repositórios nos controllers para endpoints só de leitura.
- **Dinheiro** — Valores em **centavos** (`bigint` / inteiros), sem `float` para saldo ou apostas.
- **Frontend** — React + Vite, TanStack Query para dados remotos, Zustand para estado do jogo, Socket.IO para eventos em tempo real.

---

## Trade-offs

| Escolha | Benefício | Custo |
| -------- | ---------- | ----- |
| NestJS e exceções HTTP nos casos de uso | Integração simples com pipes, filtros e Swagger | Menos “framework-agnostic” do que erros de domínio puros mapeados no boundary |
| Mensageria síncrona na perceção do jogador (aposta → débito) | Modelo claro para integração carteira | Latência e necessidade de idempotência / correlação nas mensagens |
| WebSocket fora do Kong | Menos configuração de upgrade no gateway | URL do socket diferente da API base no cliente (`VITE_SOCKET_URL`) |
| Imagem Docker do frontend com build de produção | Paridade com deploy estático | Sem HMR; variáveis `VITE_*` fixas no build; rebuild para mudar env |
| Init SQL em ficheiro na raiz (`postgres-init-databases.sql`) | Evita scripts `.sh` com CRLF no Windows no Docker | Caminho de montagem explícito no compose em vez de só `docker/postgres/` |
| Limite de aposta elevado no código (ex.: R$ 10.000) | Flexível para testes e demo | Deve alinhar com risco de produto e regras reais se isto fosse produção |

---

Para requisitos completos do desafio (regras do jogo, critérios de avaliação, bónus), consulta o material enviado pela empresa ou o `documentation-rules.md` se existir no repositório.
