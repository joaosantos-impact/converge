export type IntegrationType = 'exchange' | 'blockchain' | 'wallet' | 'service';

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  color: string;       // brand color for avatar
  letter: string;      // letter to display in avatar
  requiresApiKey: boolean;
  requiresApiSecret: boolean;
  requiresPassphrase: boolean;
  requiresAddress: boolean;
  docsUrl?: string;
  description: string;
}

export const INTEGRATIONS: Integration[] = [
  // --- Exchanges ---
  {
    id: 'binance', name: 'Binance', type: 'exchange',
    color: '#F0B90B', letter: 'B',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    docsUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
    description: 'Maior exchange de crypto do mundo',
  },
  {
    id: 'coinbase', name: 'Coinbase', type: 'exchange',
    color: '#0052FF', letter: 'C',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    docsUrl: 'https://help.coinbase.com/en/exchange/managing-my-account/how-to-create-an-api-key',
    description: 'Exchange regulada nos EUA',
  },
  {
    id: 'kraken', name: 'Kraken', type: 'exchange',
    color: '#5741D9', letter: 'K',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    docsUrl: 'https://support.kraken.com/hc/en-us/articles/360000919966-How-to-generate-an-API-key-pair',
    description: 'Exchange europeia de referência',
  },
  {
    id: 'bybit', name: 'Bybit', type: 'exchange',
    color: '#F7A600', letter: 'By',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    docsUrl: 'https://www.bybit.com/en-US/help-center/bybitHC_Article?id=000001923',
    description: 'Exchange de derivativos e spot',
  },
  {
    id: 'okx', name: 'OKX', type: 'exchange',
    color: '#000000', letter: 'O',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: true, requiresAddress: false,
    description: 'Exchange global de crypto',
  },
  {
    id: 'kucoin', name: 'KuCoin', type: 'exchange',
    color: '#23AF91', letter: 'Ku',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: true, requiresAddress: false,
    description: 'Exchange popular de altcoins',
  },
  {
    id: 'mexc', name: 'MEXC', type: 'exchange',
    color: '#2EBD85', letter: 'M',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange de altcoins e memecoins',
  },
  {
    id: 'gateio', name: 'Gate.io', type: 'exchange',
    color: '#2354E6', letter: 'G',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange com grande variedade de tokens',
  },
  {
    id: 'bitstamp', name: 'Bitstamp', type: 'exchange',
    color: '#2DAC40', letter: 'Bs',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange europeia desde 2011',
  },
  {
    id: 'bitfinex', name: 'Bitfinex', type: 'exchange',
    color: '#16B157', letter: 'Bf',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange profissional',
  },
  {
    id: 'gemini', name: 'Gemini', type: 'exchange',
    color: '#00DCFA', letter: 'Ge',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange regulada Winklevoss',
  },
  {
    id: 'htx', name: 'HTX', type: 'exchange',
    color: '#2B71C1', letter: 'H',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Huobi Global (agora HTX)',
  },
  {
    id: 'bitget', name: 'Bitget', type: 'exchange',
    color: '#00F0FF', letter: 'Bg',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: true, requiresAddress: false,
    description: 'Exchange de copy trading',
  },
  {
    id: 'crypto_com', name: 'Crypto.com', type: 'exchange',
    color: '#002D74', letter: 'Cr',
    requiresApiKey: true, requiresApiSecret: true, requiresPassphrase: false, requiresAddress: false,
    description: 'Exchange e cartão crypto',
  },

  // --- Blockchains ---
  {
    id: 'ethereum', name: 'Ethereum (ETH)', type: 'blockchain',
    color: '#627EEA', letter: 'Ξ',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço ou ENS da rede Ethereum',
  },
  {
    id: 'bitcoin', name: 'Bitcoin (BTC)', type: 'blockchain',
    color: '#F7931A', letter: '₿',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço ou xpub Bitcoin',
  },
  {
    id: 'solana', name: 'Solana (SOL)', type: 'blockchain',
    color: '#9945FF', letter: 'S',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço público Solana',
  },
  {
    id: 'polygon', name: 'Polygon (MATIC)', type: 'blockchain',
    color: '#8247E5', letter: 'P',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Polygon / MATIC',
  },
  {
    id: 'avalanche', name: 'Avalanche (AVAX)', type: 'blockchain',
    color: '#E84142', letter: 'A',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço C-Chain Avalanche',
  },
  {
    id: 'arbitrum', name: 'Arbitrum', type: 'blockchain',
    color: '#28A0F0', letter: 'Ar',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Arbitrum L2',
  },
  {
    id: 'optimism', name: 'Optimism', type: 'blockchain',
    color: '#FF0420', letter: 'Op',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Optimism L2',
  },
  {
    id: 'bsc', name: 'BNB Chain (BSC)', type: 'blockchain',
    color: '#F0B90B', letter: 'Bn',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Binance Smart Chain',
  },
  {
    id: 'base', name: 'Base', type: 'blockchain',
    color: '#0052FF', letter: 'Ba',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Base L2 (Coinbase)',
  },
  {
    id: 'cosmos', name: 'Cosmos (ATOM)', type: 'blockchain',
    color: '#2E3148', letter: 'Co',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Cosmos Hub',
  },
  {
    id: 'cardano', name: 'Cardano (ADA)', type: 'blockchain',
    color: '#0033AD', letter: 'Ca',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Endereço Cardano',
  },

  // --- Wallets ---
  {
    id: 'metamask', name: 'MetaMask', type: 'wallet',
    color: '#E2761B', letter: '🦊',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Hot wallet Ethereum e EVM chains',
  },
  {
    id: 'phantom', name: 'Phantom', type: 'wallet',
    color: '#AB9FF2', letter: 'Ph',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Wallet Solana, Ethereum e Bitcoin',
  },
  {
    id: 'trust_wallet', name: 'Trust Wallet', type: 'wallet',
    color: '#3375BB', letter: 'T',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Multi-chain mobile wallet',
  },
  {
    id: 'ledger', name: 'Ledger', type: 'wallet',
    color: '#000000', letter: 'L',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Hardware wallet - xpub ou endereço',
  },
  {
    id: 'trezor', name: 'Trezor', type: 'wallet',
    color: '#0F6148', letter: 'Tr',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Hardware wallet - xpub ou endereço',
  },
  {
    id: 'rabby', name: 'Rabby', type: 'wallet',
    color: '#7C82FC', letter: 'R',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Wallet EVM com proteção integrada',
  },
  {
    id: 'coinbase_wallet', name: 'Coinbase Wallet', type: 'wallet',
    color: '#0052FF', letter: 'Cw',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Wallet self-custody da Coinbase',
  },
  {
    id: 'exodus', name: 'Exodus', type: 'wallet',
    color: '#1F1F3F', letter: 'Ex',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Wallet desktop e mobile multi-chain',
  },
  {
    id: 'safe', name: 'Safe (Gnosis)', type: 'wallet',
    color: '#12FF80', letter: 'Sa',
    requiresApiKey: false, requiresApiSecret: false, requiresPassphrase: false, requiresAddress: true,
    description: 'Multi-sig wallet Ethereum',
  },

];

export function getIntegrationById(id: string): Integration | undefined {
  return INTEGRATIONS.find(i => i.id === id);
}

export function getIntegrationsByType(type: IntegrationType): Integration[] {
  return INTEGRATIONS.filter(i => i.type === type);
}
