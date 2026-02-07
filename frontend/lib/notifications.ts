'use client';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private swRegistration: ServiceWorkerRegistration | null = null;

  async init(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    this.permission = Notification.permission;

    // Get service worker registration
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.error('Service worker not ready:', err);
      }
    }

    return this.permission === 'granted';
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }

  isGranted(): boolean {
    return this.permission === 'granted';
  }

  isDenied(): boolean {
    return this.permission === 'denied';
  }

  async show(options: NotificationOptions): Promise<void> {
    if (!this.isGranted()) {
      console.log('Notification permission not granted');
      return;
    }

    const notificationOptions: NotificationOptions & { data?: { url: string } } = {
      ...options,
      icon: options.icon || '/icons/icon-192x192.png',
    };

    if (options.url) {
      notificationOptions.data = { url: options.url };
    }

    // Try to use service worker for better mobile support
    if (this.swRegistration) {
      try {
        // @ts-expect-error - showNotification options differ across browsers
        await this.swRegistration.showNotification(options.title, {
          body: options.body,
          icon: notificationOptions.icon,
          badge: '/icons/icon-72x72.png',
          tag: options.tag,
          data: notificationOptions.data,
        });
        return;
      } catch (err) {
        console.error('Service worker notification failed:', err);
      }
    }

    // Fallback to regular notification
    const notification = new Notification(options.title, {
      body: options.body,
      icon: notificationOptions.icon,
      tag: options.tag,
    });

    if (options.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = options.url!;
        notification.close();
      };
    }
  }

  // Price alert notification
  async showPriceAlert(asset: string, condition: 'above' | 'below', price: number): Promise<void> {
    const direction = condition === 'above' ? 'acima' : 'abaixo';
    await this.show({
      title: `Alerta de Preço: ${asset}`,
      body: `${asset} está ${direction} de $${price.toLocaleString()}`,
      url: '/alerts',
      tag: `price-alert-${asset}`,
    });
  }

  // Portfolio update notification
  async showPortfolioUpdate(change: number, changePercent: number): Promise<void> {
    const direction = change >= 0 ? 'subiu' : 'desceu';
    const emoji = change >= 0 ? '📈' : '📉';
    await this.show({
      title: `${emoji} Portfolio ${direction}`,
      body: `Variação de ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% ($${Math.abs(change).toLocaleString()})`,
      url: '/',
      tag: 'portfolio-update',
    });
  }

  // Sync complete notification
  async showSyncComplete(exchangeCount: number): Promise<void> {
    await this.show({
      title: '✅ Sincronização Completa',
      body: `${exchangeCount} exchange(s) sincronizada(s) com sucesso`,
      url: '/',
      tag: 'sync-complete',
    });
  }
}

export const notificationService = new NotificationService();

// React hook for notifications
import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const granted = await notificationService.init();
      setIsSupported(notificationService.isSupported());
      setIsGranted(granted);
      setIsDenied(notificationService.isDenied());
    };
    init();
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setIsGranted(granted);
    setIsDenied(notificationService.isDenied());
    return granted;
  }, []);

  const showNotification = useCallback(async (options: NotificationOptions) => {
    await notificationService.show(options);
  }, []);

  return {
    isSupported,
    isGranted,
    isDenied,
    requestPermission,
    showNotification,
    showPriceAlert: notificationService.showPriceAlert.bind(notificationService),
    showPortfolioUpdate: notificationService.showPortfolioUpdate.bind(notificationService),
    showSyncComplete: notificationService.showSyncComplete.bind(notificationService),
  };
}
