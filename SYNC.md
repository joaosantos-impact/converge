# Sincronização de dados (SYNC)

Este documento descreve como funciona a sincronização de dados entre as exchanges e a aplicação Converge.

## Visão geral

A sincronização obtém **saldos spot** e **histórico de trades** das exchanges ligadas (via API) e grava tudo na base de dados. Os dados são usados no **Portfolio**, **Saldos Spot**, **Trades** e em métricas como PnL e snapshots de valor.

- **Saldos:** quantidades por ativo por conta (free, locked, total) e valor em USD calculado com preços da própria exchange.
- **Trades:** compras e vendas (símbolo, lado, preço, quantidade, custo, fee, data) para cada conta.
- **Snapshots:** valor total do portfolio em USD em cada sync, usado para evolução e gráficos de wealth.

A comunicação com as exchanges é feita através da biblioteca **CCXT**, usando as credenciais API (encriptadas) guardadas em `ExchangeAccount`.

---

## O que é sincronizado

### 1. Saldos (balances)

Para cada conta de exchange ativa:

1. Carrega os mercados disponíveis (`loadMarkets`) para validar a ligação.
2. Obtém todos os tickers (preços) numa única chamada (`fetchTickers`) para calcular valores em USD.
3. Obtém o balance spot (`fetchBalance`).
4. Para cada ativo com saldo &gt; 0:
   - Calcula o valor em USD (par USDT, ou USDC, ou via BTC/ETH se não houver par direto).
   - Faz **upsert** em `Balance`: um registo por `(exchangeAccountId, asset)`; se já existir, atualiza; senão, cria.
5. Remove da base os saldos de ativos que já não aparecem na exchange (posições a zero ou vendidas).

Assim, a tabela `Balance` reflete sempre o estado atual de cada conta.

### 2. Trades

Para cada conta:

1. Consulta o último trade guardado (por data) para essa conta.
2. **Primeira sincronização:** pede até **5 anos** de histórico (para impostos e FIFO).
3. **Sincronizações seguintes:** pede apenas trades **após** o último trade guardado (`since = lastTrade.timestamp + 1`).
4. Considera ativos a sincronizar: os que têm saldo atual **e** os que já tiveram trades (para capturar vendas de posições já a zero).
5. Para cada par relevante (base em USDT, USDC, BTC, ETH), chama `fetchMyTrades(symbol, since, limit)` em lotes (batch de 3 símbolos, 500 trades por símbolo).
6. Cada trade é guardado com **upsert** pela chave única `(exchangeAccountId, exchangeTradeId)` para evitar duplicados.

Os trades ficam em `Trade` e alimentam a página **Trades**, o histórico por asset e os cálculos de PnL.

### 3. Snapshot de portfolio

Após sincronizar pelo menos uma conta com sucesso:

- Calcula o **valor total em USD** do utilizador (soma de `Balance.usdValue` de todas as contas).
- Cria um registo em **PortfolioSnapshot** com `totalUsdValue`, e opcionalmente `totalPnl` e `totalPnlPercent` em relação ao snapshot anterior (se existir e for de há mais de 1 hora).

Isto permite gráficos de evolução do património e métricas de performance.

---

## Como disparar a sincronização

### Sincronização manual

- **API:** `POST /api/sync` (utilizador autenticado).
- **Frontend:** botão “Sincronizar” nas Integrações, no Portfolio ou no dashboard.
- Comportamento: corre `triggerSync(userId)` para esse utilizador (todas as contas ativas).
- **Cooldown:** não é possível disparar um novo sync manual antes de passarem **5 minutos** desde o início do último. Se tentar antes, a API devolve `429` com indicação do tempo de espera.

### Sincronização automática (cron)

- **Job:** `SyncCronService.handleCron()` com expressão `*/5 * * * *` (de 5 em 5 minutos).
- **Alcance:** todos os utilizadores que tenham pelo menos uma conta ativa (`isActive: true`).
- Para cada utilizador, chama a mesma lógica de sync por conta que o manual (saldos + trades); em seguida calcula o total USD e cria `PortfolioSnapshot` e `SyncLog` quando há pelo menos uma conta sincronizada com sucesso.
- **Proteção:** um lock em memória (`isRunning`) evita que dois crons corram em paralelo.
- **Erros de ligação à DB:** em caso de erro de conexão (ex.: Neon idle disconnect), o cron faz um retry após desligar e voltar a ligar o Prisma e uma pausa de 1 s.

---

## Fluxo por conta (syncAccount)

Para cada `ExchangeAccount` ativa:

1. **Criar cliente CCXT** a partir das credenciais desencriptadas (`createExchangeFromAccount`).
2. **Markets:** `exchange.loadMarkets()`; se falhar, o sync dessa conta falha (ex.: credenciais inválidas ou exchange em baixo).
3. **Tickers:** `fetchAllTickers(exchange)` → mapa símbolo → preço.
4. **Balances:** `fetchBalance(exchange)` → lista de `{ asset, free, locked, total }`.
5. Para cada saldo, calcular USD e fazer upsert em `Balance`; no fim, apagar saldos de ativos que já não vêm na resposta.
6. **Trades:** obter último trade guardado; definir `since` (primeira vez: 5 anos atrás; incremental: após o último). Construir lista de ativos (saldos + já negociados). `fetchAllTrades(exchange, assets, since)` em batches; upsert de cada trade por `(exchangeAccountId, exchangeTradeId)`.
7. Atualizar `ExchangeAccount.lastSyncAt` (e opcionalmente `lastSyncTradeCount`).

Se os trades falharem (ex.: rate limit), os saldos já ficaram gravados; o `lastSyncAt` é atualizado na mesma para não repetir saldos desnecessariamente. O próximo sync volta a tentar trades a partir do último conhecido.

---

## Cálculo do valor em USD (saldos)

O serviço CCXT expõe `getUsdValueFromTickers(tickerMap, asset, amount)`:

- **Estáveis** (USDT, USDC, USD, BUSD, DAI, TUSD, FDUSD): valor = quantidade.
- Caso contrário: tenta par `ASSET/USDT`; se não existir, `ASSET/USDC`; senão `ASSET/BTC` + `BTC/USDT`, ou `ASSET/ETH` + `ETH/USDT`. Se não houver cotação, o valor fica 0.

Os preços vêm dos tickers da exchange na altura do sync.

---

## Limpeza e retenção

- **SyncLog (manual):** após cada sync manual, um cleanup assíncrono mantém apenas os **últimos 50** registos por utilizador.
- **SyncLog (global, no cron):** o cron chama `globalCleanup()`, que mantém apenas os **últimos 20** sync logs por utilizador.
- **PortfolioSnapshot:** snapshots com mais de **7 dias** são agregados: por utilizador e por dia, mantém só o mais recente desse dia; os outros são apagados.

---

## Resposta da API de sync manual

- **GET /api/sync:** estado do último sync (`lastSync`, `canSync`, `nextSyncAt`, `cooldownMs`).
- **POST /api/sync:** em sucesso, devolve `{ success: true, synced, failed, totalValue }`. Se estiver em cooldown, `429` com `error` e `retryAfter` (ms).

---

## Resumo dos dados produzidos

| Dado | Descrição |
|------|-----------|
| **Balance** | Saldo por ativo por conta (free, locked, total, usdValue). |
| **Trade** | Um trade por conta + id da exchange (symbol, side, price, amount, cost, fee, timestamp). |
| **SyncLog** | Registo de cada execução de sync (manual ou cron): startedAt, finishedAt, status, synced, failed. |
| **PortfolioSnapshot** | Valor total em USD do portfolio no momento do sync (totalUsdValue, totalPnl, totalPnlPercent). |

A sincronização cobre apenas as **exchanges suportadas** (Binance, Bybit, MEXC, Kraken, OKX, KuCoin, Coinbase) e utiliza sempre **contas spot** (CCXT com `defaultType: 'spot'`).
