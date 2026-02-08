'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AssetIcon } from '@/components/AssetIcon';

// Distinct palette for allocation pie — easy to differentiate on dark background
const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#a855f7', // purple
];

interface SharedPortfolio {
  user: { name: string; image?: string };
  portfolio: {
    totalValue: number | null;
    balances: Array<{
      asset: string;
      amount?: number;
      usdValue?: number;
      percent?: number;
      exchange?: string;
    }>;
    allocation: Array<{ asset: string; usdValue: number; percent: number }>;
    showValues: boolean;
    assetCount: number;
    exchangeCount: number;
  };
  stats: {
    totalPnlPercent: number | null;
    monthlyPnlPercent: number | null;
    totalTrades: number;
    winRate: number | null;
  };
  tradeActivity: Array<{ date: string; buys: number; sells: number; volume: number }>;
  memberSince: string;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SharedPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/portfolio/share/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  const formatEUR = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value * 0.92);

  // Top 5 assets for pie, rest grouped as "Outros"
  const chartData = useMemo(() => {
    if (!data) return [];
    const alloc = data.portfolio.allocation;
    if (alloc.length <= 6) return alloc.map(a => ({ name: a.asset, value: a.percent }));
    const top = alloc.slice(0, 5);
    const rest = alloc.slice(5).reduce((s, a) => s + a.percent, 0);
    return [...top.map(a => ({ name: a.asset, value: a.percent })), { name: 'Outros', value: rest }];
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-sm">A carregar portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white">Portfolio não encontrado</h1>
          <p className="text-white/50 mt-2 text-sm">Este link pode ter expirado ou sido revogado.</p>
          <Link href="/" className="inline-block mt-6 text-sm text-white/60 hover:text-white underline underline-offset-4">
            Voltar ao Converge
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header bar */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium tracking-tight text-white/80 hover:text-white">
            CONVERGE
          </Link>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">
            Portfolio Público
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Profile header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 bg-white/10 flex items-center justify-center text-lg font-medium">
            {data.user.image ? (
              <Image src={data.user.image} alt="" width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              data.user.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-medium">{data.user.name}</h1>
            <p className="text-sm text-white/40 mt-0.5">
              Membro desde {new Date(data.memberSince).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-10">
          {data.portfolio.showValues && data.portfolio.totalValue !== null && (
            <MetricCard
              label="Valor Total"
              value={formatEUR(data.portfolio.totalValue)}
            />
          )}
          <MetricCard label="Assets" value={String(data.portfolio.assetCount)} />
          <MetricCard label="Exchanges" value={String(data.portfolio.exchangeCount)} />
          {data.stats.totalPnlPercent !== null && (
            <MetricCard
              label="P&L Total"
              value={`${data.stats.totalPnlPercent >= 0 ? '+' : ''}${data.stats.totalPnlPercent.toFixed(1)}%`}
              negative={data.stats.totalPnlPercent < 0}
            />
          )}
          {data.stats.monthlyPnlPercent !== null && (
            <MetricCard
              label="P&L Mensal"
              value={`${data.stats.monthlyPnlPercent >= 0 ? '+' : ''}${data.stats.monthlyPnlPercent.toFixed(1)}%`}
              negative={data.stats.monthlyPnlPercent < 0}
            />
          )}
          {data.stats.winRate !== null && (
            <MetricCard label="Win Rate" value={`${data.stats.winRate.toFixed(0)}%`} />
          )}
          <MetricCard label="Trades" value={String(data.stats.totalTrades)} />
        </div>

        {/* Charts section */}
        <div className="grid gap-6 md:grid-cols-2 mb-10">
          {/* Allocation Pie */}
          {chartData.length > 0 && (
            <div className="border border-white/10 p-6">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">Alocação</p>
              <div className="flex items-center gap-6">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1">
                  {chartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {item.name !== 'Outros' ? (
                          <AssetIcon symbol={item.name} size={20} className="shrink-0 [&_img]:rounded-none" />
                        ) : (
                          <div className="w-5 h-5 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        )}
                        <span className="text-white/70">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trade Activity */}
          {data.tradeActivity.length > 0 && (
            <div className="border border-white/10 p-6">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-4">
                Atividade de Trading (90d)
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tradeActivity} barGap={0} barCategoryGap="20%">
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 0,
                        fontSize: 12,
                        color: '#fff',
                      }}
                      labelFormatter={(v) => new Date(String(v)).toLocaleDateString('pt-PT')}
                      formatter={(value) => [`$${Number(value).toFixed(0)}`, '']}
                    />
                    <Bar dataKey="buys" fill="rgba(255,255,255,0.6)" name="Compras" />
                    <Bar dataKey="sells" fill="rgba(239,68,68,0.6)" name="Vendas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Holdings table */}
        <div className="border border-white/10 mb-10">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Holdings</p>
            <p className="text-[10px] text-white/40">{data.portfolio.balances.length} ativos</p>
          </div>
          
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
            <div className="col-span-4">Ativo</div>
            <div className="col-span-3 text-right">
              {data.portfolio.showValues ? 'Quantidade' : ''}
            </div>
            <div className="col-span-3 text-right">
              {data.portfolio.showValues ? 'Valor' : 'Alocação'}
            </div>
            <div className="col-span-2 text-right">%</div>
          </div>

          <div className="divide-y divide-white/5">
            {data.portfolio.balances.map((balance, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-white/[0.02] transition-colors">
                <div className="col-span-4 flex items-center gap-3">
                  <AssetIcon symbol={balance.asset} size={32} className="shrink-0 [&_img]:rounded-none" />
                  <div>
                    <span className="text-sm font-medium">{balance.asset}</span>
                    {balance.exchange && (
                      <p className="text-[10px] text-white/30">{balance.exchange}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-3 text-right text-sm text-white/60">
                  {data.portfolio.showValues && balance.amount !== undefined
                    ? balance.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })
                    : ''}
                </div>
                <div className="col-span-3 text-right text-sm font-medium">
                  {data.portfolio.showValues && balance.usdValue
                    ? formatEUR(balance.usdValue)
                    : `${(balance.percent || 0).toFixed(1)}%`}
                </div>
                <div className="col-span-2 text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-12 h-1 bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-white/40"
                        style={{ width: `${Math.min(balance.percent || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-white/50">{(balance.percent || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-8 border-t border-white/5">
          <p className="text-[11px] text-white/30">
            Dados atualizados em tempo real via exchanges
          </p>
          <Link href="/" className="text-[11px] text-white/30 hover:text-white transition-colors">
            Partilhado via <span className="font-medium">Converge</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="border border-white/10 p-4">
      <p className="text-[10px] text-white/40 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-medium mt-1 ${negative ? 'text-red-500' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
