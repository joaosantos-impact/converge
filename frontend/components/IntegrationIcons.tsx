'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ExchangeIconDynamic = dynamic(
  () => import('@web3icons/react/dynamic').then((m) => m.ExchangeIcon),
  { ssr: false }
);

interface IconProps {
  className?: string;
  size?: number;
}

// Binance
export function BinanceIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <path fill="#F0B90B" d="M16 0l4.2 4.2-7 7-4.2-4.2zm7 7l4.2 4.2-11.2 11.2-4.2-4.2zM2.8 11.2L7 7l4.2 4.2-4.2 4.2zm18.4 0l4.2 4.2L16 24.8l-4.2-4.2zM7 18.2l4.2-4.2 4.2 4.2L7 26.6zm18 0l-4.2-4.2-4.2 4.2 4.2 4.2zM16 18.2l4.2 4.2L16 26.6l-4.2-4.2z"/>
    </svg>
  );
}

// Coinbase
export function CoinbaseIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#0052FF" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 6C10.48 6 6 10.48 6 16s4.48 10 10 10 10-4.48 10-10S21.52 6 16 6zm-1.8 14.5c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5c1.95 0 3.63 1.24 4.24 3h3.06c-.69-3.38-3.69-5.93-7.3-5.93-4.08 0-7.43 3.35-7.43 7.43s3.35 7.43 7.43 7.43c3.61 0 6.61-2.55 7.3-5.93h-3.06c-.61 1.76-2.29 3-4.24 3z"/>
    </svg>
  );
}

// Kraken
export function KrakenIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#5741D9" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M11 10h2.5l2.5 5.5L18.5 10H21l-4.5 9v5h-1V19z"/>
    </svg>
  );
}

// Bybit
export function BybitIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#F7A600" width="32" height="32" rx="0"/>
      <path fill="#fff" d="M8 10h5.5c2 0 3.5 1.2 3.5 3s-1.5 3-3.5 3H10.5v4H8V10zm2.5 4.2h2.8c.8 0 1.2-.5 1.2-1.2s-.4-1.2-1.2-1.2h-2.8v2.4zM18 10h2.5v6.5L24 10h2.8l-4.3 10H20z"/>
    </svg>
  );
}

// OKX
export function OKXIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#000" width="32" height="32" rx="0"/>
      <g fill="#fff">
        <rect x="6" y="6" width="6" height="6"/>
        <rect x="13" y="13" width="6" height="6"/>
        <rect x="20" y="6" width="6" height="6"/>
        <rect x="6" y="20" width="6" height="6"/>
        <rect x="20" y="20" width="6" height="6"/>
      </g>
    </svg>
  );
}

// KuCoin
export function KuCoinIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#23AF91" cx="16" cy="16" r="16"/>
      <g fill="#fff" transform="translate(8,8) scale(0.5)">
        <polygon points="16,2 8,10 16,18 24,10"/>
        <polygon points="8,14 2,20 8,26 14,20"/>
        <polygon points="24,14 18,20 24,26 30,20"/>
        <polygon points="16,22 10,28 16,34 22,28"/>
      </g>
    </svg>
  );
}

// MEXC
export function MEXCIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#2EBD85" width="32" height="32" rx="0"/>
      <path fill="#fff" d="M6 22V10l5 6 5-6 5 6 5-6v12h-2.5V15l-2.5 3-2.5-3-2.5 3-2.5-3v7z"/>
    </svg>
  );
}

// Gate.io
export function GateIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#2354E6" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8h-8v-2.5h5.5c-.7-2.6-3-4.5-5.5-4.5-3.3 0-6 2.7-6 6s2.7 6 6 6c2.5 0 4.7-1.6 5.5-3.8h2.6C23.3 22.7 19.9 25 16 25c-5 0-9-4-9-9s4-9 9-9c4.1 0 7.5 2.7 8.6 6.5H16V8z"/>
    </svg>
  );
}

// Bitstamp
export function BitstampIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#2DAC40" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M10 11h6c2.2 0 4 1.3 4 3.2 0 1.2-.7 2.2-1.8 2.8 1.4.5 2.3 1.7 2.3 3.2 0 2.1-1.8 3.8-4 3.8H10V11zm2.5 5h3c.8 0 1.5-.5 1.5-1.3s-.7-1.2-1.5-1.2h-3v2.5zm0 5.5h3.5c.9 0 1.5-.6 1.5-1.4s-.6-1.4-1.5-1.4h-3.5v2.8z"/>
    </svg>
  );
}

// Bitfinex
export function BitfinexIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#16B157" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 8l6 12H10z"/>
      <path fill="#fff" d="M16 14l4 8H12z" opacity="0.6"/>
    </svg>
  );
}

// Gemini
export function GeminiIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#00DCFA" cx="16" cy="16" r="16"/>
      <g fill="#000">
        <circle cx="12" cy="12" r="2.5"/>
        <circle cx="20" cy="12" r="2.5"/>
        <circle cx="12" cy="20" r="2.5"/>
        <circle cx="20" cy="20" r="2.5"/>
        <rect x="14" y="10" width="4" height="12" rx="1"/>
        <rect x="10" y="14" width="12" height="4" rx="1"/>
      </g>
    </svg>
  );
}

// HTX (Huobi)
export function HTXIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#2B71C1" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 6c-1.5 3-5 6-5 10 0 3.3 2.2 6 5 6s5-2.7 5-6c0-4-3.5-7-5-10z"/>
    </svg>
  );
}

// Bitget
export function BitgetIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#00F0FF" width="32" height="32" rx="0"/>
      <path fill="#000" d="M7 16l9-8v6h9l-9 8v-6z"/>
    </svg>
  );
}

// Crypto.com
export function CryptoComIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#002D74" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 7l7 4v10l-7 4-7-4V11z" stroke="#fff" strokeWidth="0.5" fillOpacity="0.15"/>
      <path fill="#fff" d="M16 9l5 3v8l-5 3-5-3v-8z"/>
    </svg>
  );
}

// Ethereum
export function EthereumIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#627EEA" cx="16" cy="16" r="16"/>
      <g fill="#fff">
        <path d="M16.5 4v8.9l7.5 3.3z" opacity="0.6"/>
        <path d="M16.5 4L9 16.2l7.5-3.3z"/>
        <path d="M16.5 22v6L24 17.6z" opacity="0.6"/>
        <path d="M16.5 28v-6L9 17.6z"/>
        <path d="M16.5 20.6l7.5-4.4-7.5-3.3z" opacity="0.2"/>
        <path d="M9 16.2l7.5 4.4v-7.7z" opacity="0.6"/>
      </g>
    </svg>
  );
}

// Bitcoin
export function BitcoinIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#F7931A" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M22.1 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.6-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.2v0l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .1 0l-.1 0-1.1 4.5c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3L8 20.7l2.2.5c.4.1.8.2 1.2.3l-.7 2.7 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.7c2.9.5 5 .3 5.9-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4 1-5.2.7l.9-3.7c1.2.3 4.9.9 4.3 3zm.5-5.3c-.5 1.9-3.4.9-4.3.7l.8-3.4c1 .2 4.1.7 3.5 2.7z"/>
    </svg>
  );
}

// Solana
export function SolanaIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#9945FF" cx="16" cy="16" r="16"/>
      <g fill="#fff">
        <path d="M9 20.5l2-2h12l-2 2z"/>
        <path d="M9 11.5l2 2h12l-2-2z"/>
        <path d="M9 16l2-2h12l-2 2z"/>
      </g>
    </svg>
  );
}

// Polygon
export function PolygonIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#8247E5" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M20.5 13.3c-.4-.2-.9-.2-1.3 0l-3 1.8-2 1.1-3 1.8c-.4.2-.9.2-1.3 0l-2.4-1.4c-.4-.2-.6-.6-.6-1.1v-2.7c0-.4.2-.9.6-1.1l2.3-1.3c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.6.6 1.1v1.8l2-1.2v-1.8c0-.4-.2-.9-.6-1.1l-4.3-2.5c-.4-.2-.9-.2-1.3 0l-4.4 2.5c-.4.3-.6.7-.6 1.1v5c0 .4.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l3-1.7 2-1.2 3-1.7c.4-.2.9-.2 1.3 0l2.3 1.3c.4.2.6.6.6 1.1v2.7c0 .4-.2.9-.6 1.1l-2.3 1.4c-.4.2-.9.2-1.3 0l-2.3-1.4c-.4-.2-.6-.6-.6-1.1v-1.7l-2 1.2v1.8c0 .4.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.3 0l4.3-2.5c.4-.2.6-.6.6-1.1v-5c0-.4-.2-.9-.6-1.1z"/>
    </svg>
  );
}

// Avalanche
export function AvalancheIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#E84142" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M20.5 21h3.5L16 9 8 21h3.5l4.5-7.8z"/>
      <path fill="#fff" d="M17 21h3l-4-6.9L12.5 21h3l.5-.8z" opacity="0.7"/>
    </svg>
  );
}

// Arbitrum
export function ArbitrumIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#28A0F0" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 8l-6 8 6 8 6-8z"/>
      <path fill="#28A0F0" d="M16 11l-3.5 5L16 21l3.5-5z"/>
    </svg>
  );
}

// Optimism
export function OptimismIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#FF0420" cx="16" cy="16" r="16"/>
      <circle fill="#fff" cx="16" cy="16" r="6"/>
    </svg>
  );
}

// BNB Chain
export function BNBChainIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#F0B90B" cx="16" cy="16" r="16"/>
      <g fill="#fff">
        <polygon points="16,6 19,9 13,15 10,12"/>
        <polygon points="20,10 23,13 17,19 14,16"/>
        <polygon points="24,14 27,17 21,23 18,20"/>
        <polygon points="12,10 15,13 9,19 6,16"/>
        <polygon points="16,14 19,17 13,23 10,20"/>
        <polygon points="16,22 19,25 16,28 13,25"/>
      </g>
    </svg>
  );
}

// Base
export function BaseIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#0052FF" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 6c-5.5 0-10 4.5-10 10s4.5 10 10 10c4.6 0 8.4-3.1 9.6-7.3h-5.3c-1 1.8-2.8 3-4.3 3-3 0-5.3-2.4-5.3-5.7s2.3-5.7 5.3-5.7c1.5 0 3.3 1.2 4.3 3h5.3C25.4 9.1 20.6 6 16 6z"/>
    </svg>
  );
}

// Cosmos
export function CosmosIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#2E3148" cx="16" cy="16" r="16"/>
      <circle fill="none" stroke="#fff" strokeWidth="1.5" cx="16" cy="16" r="8"/>
      <circle fill="none" stroke="#fff" strokeWidth="1.5" cx="16" cy="16" rx="3" ry="8" transform="rotate(60 16 16)"/>
      <circle fill="none" stroke="#fff" strokeWidth="1.5" cx="16" cy="16" rx="3" ry="8" transform="rotate(-60 16 16)"/>
      <circle fill="#fff" cx="16" cy="16" r="2"/>
    </svg>
  );
}

// Cardano
export function CardanoIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#0033AD" cx="16" cy="16" r="16"/>
      <g fill="#fff">
        <circle cx="16" cy="9" r="1.5"/>
        <circle cx="16" cy="23" r="1.5"/>
        <circle cx="10" cy="12.5" r="1.5"/>
        <circle cx="22" cy="12.5" r="1.5"/>
        <circle cx="10" cy="19.5" r="1.5"/>
        <circle cx="22" cy="19.5" r="1.5"/>
        <circle cx="16" cy="16" r="3"/>
      </g>
    </svg>
  );
}

// MetaMask
export function MetaMaskIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#E2761B" width="32" height="32" rx="0"/>
      <g transform="translate(4,5) scale(0.75)">
        <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="M27.2 1L16.7 8.8l1.9-4.6z"/>
        <path fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" d="M4.8 1l10.4 7.9-1.8-4.7z"/>
        <path fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" d="M23.5 21.8L20.7 26l5.9 1.6 1.7-5.8z"/>
        <path fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round" d="M3.7 21.8l-1.7 5.8L7.9 26l-2.8-4.2z"/>
        <path fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" d="M7.5 14l-1.7 2.5 5.9.3-.2-6.3z"/>
        <path fill="#C0AD9E" stroke="#C0AD9E" strokeLinecap="round" strokeLinejoin="round" d="M24.5 14l-4.1-3.6-.1 6.4 5.9-.3z"/>
      </g>
    </svg>
  );
}

// Phantom
export function PhantomIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#AB9FF2" width="32" height="32" rx="8"/>
      <g fill="#fff">
        <ellipse cx="12" cy="15" rx="2" ry="3"/>
        <ellipse cx="20" cy="15" rx="2" ry="3"/>
        <path d="M8 20c0-6.6 3.6-12 8-12s8 5.4 8 12c0 2-2 3-4 3h-8c-2 0-4-1-4-3z" opacity="0.3"/>
      </g>
    </svg>
  );
}

// Trust Wallet
export function TrustWalletIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#3375BB" cx="16" cy="16" r="16"/>
      <path fill="#fff" d="M16 7c3 2 6 3 9 3 0 7-3 14-9 17-6-3-9-10-9-17 3 0 6-1 9-3z" fillOpacity="0.9"/>
    </svg>
  );
}

// Ledger
export function LedgerIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#000" width="32" height="32" rx="0"/>
      <g fill="#fff">
        <rect x="7" y="7" width="8" height="2"/>
        <rect x="7" y="7" width="2" height="11"/>
        <rect x="7" y="23" width="18" height="2"/>
        <rect x="23" y="14" width="2" height="11"/>
        <rect x="17" y="23" width="2" height="2"/>
        <rect x="17" y="14" width="8" height="2"/>
      </g>
    </svg>
  );
}

// Trezor
export function TrezorIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#0F6148" width="32" height="32" rx="0"/>
      <path fill="#fff" d="M16 6c-3.3 0-6 2.7-6 6v2H8v12h16V14h-2v-2c0-3.3-2.7-6-6-6zm0 2.5c1.9 0 3.5 1.6 3.5 3.5v2h-7v-2c0-1.9 1.6-3.5 3.5-3.5z"/>
    </svg>
  );
}

// Rabby
export function RabbyIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#7C82FC" cx="16" cy="16" r="16"/>
      <g fill="#fff">
        <ellipse cx="12" cy="14" rx="3" ry="4"/>
        <ellipse cx="20" cy="14" rx="3" ry="4"/>
        <path d="M10 20c0 0 2 4 6 4s6-4 6-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

// Coinbase Wallet
export function CoinbaseWalletIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <circle fill="#0052FF" cx="16" cy="16" r="16"/>
      <circle fill="#fff" cx="16" cy="16" r="8"/>
      <rect fill="#0052FF" x="13" y="13" width="6" height="6"/>
    </svg>
  );
}

// Exodus
export function ExodusIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#1F1F3F" width="32" height="32" rx="0"/>
      <path fill="#8B5CF6" d="M6 8h14l-4 8 4 8H6l4-8z"/>
      <path fill="#A78BFA" d="M12 8h14l-4 8 4 8H12l4-8z" opacity="0.6"/>
    </svg>
  );
}

// Safe (Gnosis)
export function SafeIcon({ className, size = 24 }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect fill="#12FF80" width="32" height="32" rx="0"/>
      <rect fill="#000" x="8" y="8" width="16" height="16" rx="2"/>
      <rect fill="#12FF80" x="11" y="11" width="10" height="10" rx="1"/>
      <rect fill="#000" x="14" y="14" width="4" height="4"/>
    </svg>
  );
}

// Web3icons has exchange icons for these; id matches ExchangeIcon id
const WEB3_EXCHANGE_IDS = ['binance', 'bybit', 'kraken', 'okx', 'kucoin', 'coinbase'];

// Fallback SVG icons for exchanges not in web3icons (e.g. MEXC)
const FALLBACK_EXCHANGE_ICONS: Record<string, React.FC<IconProps>> = {
  mexc: MEXCIcon,
};

// Legacy icon map for non-exchange integrations (if ever needed)
const ICON_MAP: Record<string, React.FC<IconProps>> = {
  ...FALLBACK_EXCHANGE_ICONS,
  gateio: GateIcon,
  bitstamp: BitstampIcon,
  bitfinex: BitfinexIcon,
  gemini: GeminiIcon,
  htx: HTXIcon,
  bitget: BitgetIcon,
  crypto_com: CryptoComIcon,
  ethereum: EthereumIcon,
  bitcoin: BitcoinIcon,
  solana: SolanaIcon,
  polygon: PolygonIcon,
  avalanche: AvalancheIcon,
  arbitrum: ArbitrumIcon,
  optimism: OptimismIcon,
  bsc: BNBChainIcon,
  base: BaseIcon,
  cosmos: CosmosIcon,
  cardano: CardanoIcon,
  metamask: MetaMaskIcon,
  phantom: PhantomIcon,
  trust_wallet: TrustWalletIcon,
  ledger: LedgerIcon,
  trezor: TrezorIcon,
  rabby: RabbyIcon,
  coinbase_wallet: CoinbaseWalletIcon,
  exodus: ExodusIcon,
  safe: SafeIcon,
};

export function IntegrationIcon({ id, className, size = 24 }: { id: string } & IconProps) {
  if (WEB3_EXCHANGE_IDS.includes(id)) {
    // OKX: black by default → dark:invert for white in dark mode
    // Bybit: light by default → invert in light (black), dark:invert-0 in dark (stays white)
    const themeClass =
      id === 'okx'
        ? 'dark:invert'
        : id === 'bybit'
          ? 'invert dark:invert-0'
          : '';
    return (
      <ExchangeIconDynamic
        id={id}
        size={size}
        variant="branded"
        className={[className, themeClass].filter(Boolean).join(' ')}
        fallback={
          <div
            className="flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-bold"
            style={{ width: size, height: size }}
          >
            {id.slice(0, 2).toUpperCase()}
          </div>
        }
      />
    );
  }
  const Icon = FALLBACK_EXCHANGE_ICONS[id] ?? ICON_MAP[id];
  if (Icon) return <Icon className={className} size={size} />;
  return null;
}

export function hasIcon(id: string): boolean {
  return WEB3_EXCHANGE_IDS.includes(id) || id in FALLBACK_EXCHANGE_ICONS || id in ICON_MAP;
}
