'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { twoFactor } from '@/lib/auth-client';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onStatusChange: () => void;
}

export function TwoFactorSetup({ isEnabled, onStatusChange }: TwoFactorSetupProps) {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const handleEnable2FA = async () => {
    if (!password) {
      toast.error('Introduz a password');
      return;
    }

    setLoading(true);
    try {
      const response = await twoFactor.enable({ password });

      if (response.error) {
        toast.error(response.error.message || 'Erro ao ativar 2FA');
        return;
      }

      if (response.data) {
        setTotpUri(response.data.totpURI);
        setBackupCodes(response.data.backupCodes);
        setSetupDialogOpen(false);
        setVerifyDialogOpen(true);
      }
    } catch (error) {
      const msg = error instanceof TypeError ? 'Erro de conexão. Tenta novamente.' : 'Erro ao ativar 2FA';
      toast.error(msg);
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const handleVerify2FA = async () => {
    if (totpCode.length !== 6) {
      toast.error('Código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await twoFactor.verifyTotp({ code: totpCode });

      if (response.error) {
        toast.error('Código inválido. Tenta novamente.');
        setTotpCode('');
        return;
      }

      toast.success('2FA ativado com sucesso');
      setVerifyDialogOpen(false);
      setTotpCode('');
      setTotpUri('');
      setBackupCodes([]);
      onStatusChange();
    } catch (error) {
      const msg = error instanceof TypeError ? 'Erro de conexão. Tenta novamente.' : 'Erro ao verificar código';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!password) {
      toast.error('Introduz a password');
      return;
    }

    setLoading(true);
    try {
      const response = await twoFactor.disable({ password });

      if (response.error) {
        toast.error(response.error.message || 'Erro ao desativar 2FA');
        return;
      }

      toast.success('2FA desativado');
      setDisableDialogOpen(false);
      setPassword('');
      onStatusChange();
    } catch (error) {
      const msg = error instanceof TypeError ? 'Erro de conexão. Tenta novamente.' : 'Erro ao desativar 2FA';
      toast.error(msg);
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    toast.success('Copiado');
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  return (
    <>
      <div className="p-4 border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Autenticação 2FA</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isEnabled ? 'Ativo — conta protegida' : 'Inativo — adiciona proteção extra'}
            </p>
          </div>
          {isEnabled ? (
            <Button variant="destructive" size="sm" onClick={() => setDisableDialogOpen(true)}>
              Desativar
            </Button>
          ) : (
            <Button size="sm" onClick={() => setSetupDialogOpen(true)}>
              Ativar
            </Button>
          )}
        </div>
      </div>

      {/* Enable Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar 2FA</DialogTitle>
            <DialogDescription>Introduz a password para continuar.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnable2FA} disabled={loading}>
              {loading ? 'A processar...' : 'Continuar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Authenticator</DialogTitle>
            <DialogDescription>Escaneia o QR code com Google Authenticator ou similar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {totpUri && (
              <div className="flex justify-center p-4 bg-white">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpUri)}`}
                  alt="QR Code"
                  width={176}
                  height={176}
                  unoptimized
                />
              </div>
            )}

            {backupCodes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Códigos de backup</Label>
                  <button 
                    onClick={copyBackupCodes}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedBackup ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-3 bg-muted font-mono text-xs">
                  {backupCodes.map((code, i) => (
                    <span key={i}>{code}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Guarda num local seguro.
                </p>
              </div>
            )}

            <div>
              <Label>Código da app</Label>
              <Input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-2 text-center text-xl tracking-widest font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleVerify2FA} disabled={loading || totpCode.length !== 6} className="w-full">
              {loading ? 'A verificar...' : 'Verificar e Ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar 2FA</DialogTitle>
            <DialogDescription>A conta ficará menos segura.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
              {loading ? 'A processar...' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
