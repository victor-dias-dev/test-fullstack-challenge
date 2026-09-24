# Por que o débito da carteira não deve ser HTTP

Uma aposta de crash game é uma escrita distribuída. O jogo precisa lembrar a aposta. A carteira precisa lembrar que a stake saiu do saldo. São dois bancos. O jogador espera um clique.

## O que um timeout significa

Suponha que o jogo chame `POST /wallets/debit` e o socket estoure o tempo. Três estados são possíveis:

1. A carteira nunca viu o pedido. A stake continua lá. Repetir é seguro.
2. A carteira commitou e a resposta se perdeu. Repetir debita duas vezes, a menos que a carteira lembre o pedido.
3. A carteira ainda está dentro da transação. Repetir agora corre contra a primeira tentativa.

O jogo não distingue esses casos pelo timeout. Se aceita a aposta, o jogador pode estar na rodada sem ter pago. Se rejeita, o jogador pode ter pago uma aposta que o jogo esqueceu. Os dois bugs são um saldo que não bate com a rodada.

Um cliente HTTP com retry não tira a ambiguidade. Só escolhe qual dos três bugs aparece mais.

## O que este repositório faz

`PlaceBetUseCase` não publica no RabbitMQ. `PrismaRoundRepository.createBetWithOutbox` insere a aposta `PENDING` e uma linha em `outbox_messages` na mesma transação. Se o unique `(roundId, userId)` dispara, os dois inserts voltam atrás e o jogador recebe "You already have a bet in this round".

`OutboxPublisher` lê `publishedAt IS NULL`. Publica `wallet.debit` e só então grava `publishedAt`. Se o processo morre antes do publish, a linha continua lá no próximo boot. Se morre depois do publish, a carteira vê uma duplicata. A troca é entrega at-least-once, paga com um inbox.

Na carteira, `applyDebit` pega `pg_advisory_xact_lock` na `correlationId`. Se `inbox_messages` já tem esse id, devolve o resultado guardado e não mexe no saldo. Senão executa:

```sql
UPDATE wallets
SET "balanceCents" = "balanceCents" - $amount
WHERE "userId" = $userId
  AND "balanceCents" >= $amount
```

Zero linhas significa carteira ausente ou stake que não cabe. O inbox guarda `REJECTED` com o motivo. Uma linha significa o lançamento e um inbox `APPLIED` commitados com o saldo. O consumer mapeia isso para `wallet.debited` ou `wallet.debit.failed` toda vez, inclusive no replay. O jogo ativa uma aposta `PENDING` no primeiro sucesso e ignora a segunda. Uma falha cancela a aposta `PENDING`.

O crédito usa o mesmo inbox. O replay de um cashout não paga duas vezes, e publica `wallet.credited` de novo.

## O que isso ainda não resolve

Publisher e consumer podem estar os dois fora. A aposta fica `PENDING` até voltarem. Esse estado é visível, não um débito silencioso. Não há segunda região, fila de poison message nem ferramenta de conciliação. Isso é de quem opera, não desta referência.

O padrão é o ponto. Persista a intenção, publique depois do commit, e faça a segunda entrega ser sem graça.
