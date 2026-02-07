# Integrações do Converge

Este documento descreve as integrações disponíveis na aplicação e o modo de funcionamento de cada uma.

## Visão geral

- **Com suporte completo (sync):** apenas **exchanges** listadas na secção abaixo. Para estas, podes adicionar uma conta (API Key + Secret ± Passphrase), sincronizar saldos spot e histórico de trades, e ver dados em Saldos Spot e Trades.
- **Listadas na UI (sem sync):** a interface mostra outras exchanges, blockchains e wallets (ex.: Gate.io, Bitstamp, Ethereum, MetaMask, etc.). Estas opções não estão ainda ligadas ao backend: **só as 7 exchanges da tabela seguinte podem ser adicionadas e sincronizadas**.

---

## Exchanges com suporte completo

Estas são as únicas integrações que podes **adicionar** e que são **sincronizadas** (saldos e trades).

| Exchange   | Credenciais              | Passphrase | O que é sincronizado | Notas |
|-----------|---------------------------|------------|------------------------|--------|
| **Binance** | API Key, API Secret       | Não        | Saldos spot, histórico de trades | Maior exchange global. [Criar chaves](https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072). |
| **Bybit**   | API Key, API Secret       | Não        | Saldos spot, histórico de trades | Foco em derivativos e spot. [Ajuda API](https://www.bybit.com/en-US/help-center/bybitHC_Article?id=000001923). |
| **MEXC**    | API Key, API Secret       | Não        | Saldos spot, histórico de trades | Muitas altcoins e memecoins. |
| **Kraken**  | API Key, API Secret       | Não        | Saldos spot, histórico de trades | Exchange europeia. [Gerar API](https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair). |
| **OKX**     | API Key, API Secret       | **Sim**    | Saldos spot, histórico de trades | Passphrase obrigatório. |
| **KuCoin**  | API Key, API Secret       | **Sim**    | Saldos spot, histórico de trades | Passphrase obrigatório. |
| **Coinbase**| API Key, API Secret       | Não        | Saldos spot, histórico de trades | Exchange regulada. [API Key](https://help.coinbase.com/en/exchange/managing-my-account/how-to-create-an-api-key). |

### Como funciona cada uma

1. **Adicionar:** Em Integrações, escolhes a exchange, dás um nome à conta (ex.: "Binance Principal") e preenches API Key e API Secret (e Passphrase quando indicado). O backend valida a ligação (ex.: `fetchBalance`) antes de guardar; as credenciais são encriptadas (AES-256-GCM).
2. **Sincronizar:** Manualmente com o botão "Sincronizar" ou via cron em background. A sync:
   - Actualiza **saldos spot** por ativo (usados em Saldos Spot e no portfolio).
   - Importa **trades** (compras/vendas) para histórico e cálculos de PnL.
3. **Onde aparecem os dados:** Saldos em **Saldos Spot** (por exchange) e no **Portfolio**; trades em **Trades** / histórico.

### Segurança

- Só as 7 exchanges acima são aceites na API ao criar conta (`exchange` é validado pelo backend).
- Credenciais são armazenadas encriptadas; na UI mostram-se apenas pré-visualizações mascaradas.
- Ao **remover** uma integração, aparece uma modal de confirmação; após confirmar, a conta e os dados de sync associados deixam de ser usados.

---

## Outras opções na interface

Na página de Integrações podem aparecer mais itens (ex.: Gate.io, Bitstamp, Ethereum, MetaMask, etc.). Estes estão listados para expansão futura; **neste momento não é possível adicioná-los nem sincronizá-los**. Quando o backend passar a suportar mais exchanges ou outros tipos (blockchains, wallets), a documentação será actualizada.
