'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INTEGRATIONS } from '@/lib/integrations';
import { IntegrationIcon, hasIcon } from '@/components/IntegrationIcons';
import { toast } from 'sonner';

interface OnboardingProps {
  userName?: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'preferences' | 'integration' | 'connect' | 'done';

const STEPS: Step[] = ['welcome', 'preferences', 'integration', 'connect', 'done'];

const POPULAR_EXCHANGES = INTEGRATIONS.filter(i => 
  ['binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin', 'mexc'].includes(i.id)
);

const POPULAR_WALLETS = INTEGRATIONS.filter(i => 
  ['metamask', 'phantom', 'ledger', 'trezor', 'trust_wallet'].includes(i.id)
);

export function Onboarding({ userName, onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [currency, setCurrency] = useState('EUR');
  const [country, setCountry] = useState('PT');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    apiKey: '',
    apiSecret: '',
    apiPassphrase: '',
    address: '',
  });

  const handleConnect = async () => {
    if (!selectedIntegration) return;
    const integration = INTEGRATIONS.find(i => i.id === selectedIntegration);
    if (!integration) return;

    if (!form.name) { toast.error('Introduz um nome'); return; }

    setConnecting(true);
    try {
      const response = await fetch('/api/exchange-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          exchange: integration.id,
          apiKey: form.apiKey || form.address || 'wallet',
          apiSecret: form.apiSecret || 'n/a',
          apiPassphrase: form.apiPassphrase || undefined,
        }),
      });

      if (response.ok) {
        toast.success(`${integration.name} ligado!`);
        setStep('done');
      } else {
        toast.error('Erro ao ligar. Verifica os dados.');
      }
    } catch {
      toast.error('Erro de ligação');
    } finally {
      setConnecting(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem('preferred-currency', currency);
    localStorage.setItem('user-country', country);
    setStep('integration');
  };

  const integration = selectedIntegration 
    ? INTEGRATIONS.find(i => i.id === selectedIntegration) 
    : null;

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      {/* Fixed size container for consistent layout */}
      <div className="w-full max-w-lg flex flex-col h-[90dvh] max-h-[600px]">

        {/* Top bar: step indicator + skip/close button */}
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <div className="flex gap-1 flex-1">
            {STEPS.map((s, i) => (
              <div 
                key={s}
                className={`h-0.5 flex-1 transition-all duration-500 ${
                  stepIndex >= i ? 'bg-foreground' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onComplete}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1"
            aria-label="Saltar configuração"
          >
            Saltar
          </button>
        </div>

        {/* Content area - scrollable, takes remaining space */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Welcome */}
          {step === 'welcome' && (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <h1 className="text-3xl font-medium tracking-tight">
                  Bem-vindo{userName ? `, ${userName}` : ''}
                </h1>
                <p className="text-muted-foreground mt-2 mb-8">
                  Vamos configurar o teu Converge em poucos passos.
                </p>

                <div className="space-y-3">
                  {[
                    { n: '01', t: 'Preferências', d: 'Moeda e país para cálculos fiscais' },
                    { n: '02', t: 'Ligar conta', d: 'Importa os teus dados automaticamente' },
                    { n: '03', t: 'Pronto', d: 'Começa a acompanhar o teu portfolio' },
                  ].map(item => (
                    <div key={item.n} className="flex items-start gap-4 p-4 border border-border">
                      <span className="text-xs text-muted-foreground font-mono mt-0.5">{item.n}</span>
                      <div>
                        <p className="font-medium text-sm">{item.t}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences */}
          {step === 'preferences' && (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <h1 className="text-2xl font-medium tracking-tight">Preferências</h1>
                <p className="text-muted-foreground mt-1 mb-8">Configura as tuas opções base.</p>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>Moeda de exibição</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR — Euro</SelectItem>
                        <SelectItem value="USD">USD — Dólar</SelectItem>
                        <SelectItem value="BTC">BTC — Bitcoin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>País (para impostos)</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PT">Portugal</SelectItem>
                        <SelectItem value="BR">Brasil</SelectItem>
                        <SelectItem value="ES">Espanha</SelectItem>
                        <SelectItem value="DE">Alemanha</SelectItem>
                        <SelectItem value="FR">França</SelectItem>
                        <SelectItem value="US">EUA</SelectItem>
                        <SelectItem value="UK">Reino Unido</SelectItem>
                        <SelectItem value="OTHER">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integration selection */}
          {step === 'integration' && (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <h1 className="text-2xl font-medium tracking-tight">Liga uma conta</h1>
                <p className="text-muted-foreground mt-1 mb-6">Escolhe a tua exchange ou wallet principal.</p>

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Exchanges</p>
                  <div className="grid grid-cols-2 gap-2">
                    {POPULAR_EXCHANGES.map(i => (
                      <button
                        key={i.id}
                        onClick={() => { setSelectedIntegration(i.id); setForm({ ...form, name: i.name }); }}
                        className={`flex items-center gap-3 p-3 border transition-all cursor-pointer text-left ${
                          selectedIntegration === i.id 
                            ? 'border-foreground bg-muted' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        {hasIcon(i.id) ? <IntegrationIcon id={i.id} size={24} /> : (
                          <div className="w-6 h-6 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: i.color }}>{i.letter}</div>
                        )}
                        <span className="font-medium text-sm">{i.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Wallets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {POPULAR_WALLETS.map(i => (
                      <button
                        key={i.id}
                        onClick={() => { setSelectedIntegration(i.id); setForm({ ...form, name: i.name }); }}
                        className={`flex items-center gap-3 p-3 border transition-all cursor-pointer text-left ${
                          selectedIntegration === i.id 
                            ? 'border-foreground bg-muted' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        {hasIcon(i.id) ? <IntegrationIcon id={i.id} size={24} /> : (
                          <div className="w-6 h-6 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: i.color }}>{i.letter}</div>
                        )}
                        <span className="font-medium text-sm">{i.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connect form */}
          {step === 'connect' && integration && (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  {hasIcon(integration.id) ? (
                    <IntegrationIcon id={integration.id} size={36} />
                  ) : (
                    <div className="w-9 h-9 flex items-center justify-center text-white font-bold" style={{ backgroundColor: integration.color }}>{integration.letter}</div>
                  )}
                  <div>
                    <h1 className="text-2xl font-medium tracking-tight">{integration.name}</h1>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" />
                  </div>

                  {integration.requiresApiKey && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">API Key</Label>
                      <Input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="Chave pública" className="h-10" />
                    </div>
                  )}

                  {integration.requiresApiSecret && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">API Secret</Label>
                      <Input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder="Chave secreta" className="h-10" />
                    </div>
                  )}

                  {integration.requiresPassphrase && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Passphrase</Label>
                      <Input type="password" value={form.apiPassphrase} onChange={(e) => setForm({ ...form, apiPassphrase: e.target.value })} className="h-10" />
                    </div>
                  )}

                  {integration.requiresAddress && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Endereço público</Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x..." className="h-10 font-mono text-sm" />
                    </div>
                  )}

                  {integration.requiresApiKey && (
                    <p className="text-xs text-muted-foreground">
                      Usa apenas API keys de leitura. As chaves são encriptadas com AES-256.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col h-full items-center justify-center text-center">
              <div className="w-14 h-14 bg-foreground flex items-center justify-center mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-background">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-medium tracking-tight">Tudo pronto</h1>
              <p className="text-muted-foreground mt-2 max-w-xs">
                O Converge vai sincronizar os teus dados automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons - ALWAYS at the bottom, consistent position */}
        <div className="shrink-0 pt-6 space-y-3">
          {step === 'welcome' && (
            <Button onClick={() => setStep('preferences')} className="w-full h-10">
              Começar
            </Button>
          )}

          {step === 'preferences' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('welcome')} className="flex-1 h-10">
                Voltar
              </Button>
              <Button onClick={savePreferences} className="flex-1 h-10">
                Continuar
              </Button>
            </div>
          )}

          {step === 'integration' && (
            <>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('preferences')} className="flex-1 h-10">
                  Voltar
                </Button>
                <Button 
                  onClick={() => selectedIntegration ? setStep('connect') : toast.error('Seleciona uma integração')} 
                  className="flex-1 h-10"
                  disabled={!selectedIntegration}
                >
                  Continuar
                </Button>
              </div>
              <button onClick={onComplete} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">
                Saltar
              </button>
            </>
          )}

          {step === 'connect' && (
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('integration')} className="flex-1 h-10">
                Voltar
              </Button>
              <Button onClick={handleConnect} disabled={connecting} className="flex-1 h-10">
                {connecting ? 'A ligar...' : 'Ligar'}
              </Button>
            </div>
          )}

          {step === 'done' && (
            <Button onClick={onComplete} className="w-full h-10">
              Ir para o Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
