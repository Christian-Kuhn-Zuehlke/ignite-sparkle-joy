import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// VAPID public key for push notifications
const VAPID_PUBLIC_KEY = 'BA3jni0vVZzwZQOufjDkQvXkcz7D5DBKAAfFEpMdn8ik_ez3YjLhnfV_4hZzIMCvR8eP0fk2wx3_-J7-n3vvivQ';

export interface NotificationSettings {
  id?: string;
  push_enabled: boolean;
  push_subscription: PushSubscription | null;
  notify_order_created: boolean;
  notify_order_shipped: boolean;
  notify_order_delivered: boolean;
  notify_low_stock: boolean;
  notify_sla_warning: boolean;
  notify_returns: boolean;
  email_enabled: boolean;
}

const defaultSettings: NotificationSettings = {
  push_enabled: false,
  push_subscription: null,
  notify_order_created: true,
  notify_order_shipped: true,
  notify_order_delivered: true,
  notify_low_stock: true,
  notify_sla_warning: true,
  notify_returns: true,
  email_enabled: false,
};

export function usePushNotifications() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load settings from database
  useEffect(() => {
    const companyId = profile?.company_id;
    if (!user || !companyId) {
      setIsLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            id: data.id,
            push_enabled: data.push_enabled ?? false,
            push_subscription: data.push_subscription as unknown as PushSubscription,
            notify_order_created: data.notify_order_created ?? true,
            notify_order_shipped: data.notify_order_shipped ?? true,
            notify_order_delivered: data.notify_order_delivered ?? true,
            notify_low_stock: data.notify_low_stock ?? true,
            notify_sla_warning: data.notify_sla_warning ?? true,
            notify_returns: data.notify_returns ?? true,
            email_enabled: data.email_enabled ?? false,
          });
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, profile?.company_id]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push-Benachrichtigungen werden nicht unterstützt');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Benachrichtigungen aktiviert');
        return true;
      } else if (result === 'denied') {
        toast.error('Benachrichtigungen wurden blockiert');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Fehler beim Anfordern der Berechtigung');
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    const companyId = profile?.company_id;
    if (!user || !companyId) return null;

    try {
      const registration = await registerServiceWorker();
      if (!registration) throw new Error('Service Worker not registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Save subscription to database
      const subscriptionData = subscription.toJSON();
      
      const { error } = await (supabase as any)
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          company_id: companyId,
          push_enabled: true,
          push_subscription: subscriptionData,
          notify_order_created: settings.notify_order_created,
          notify_order_shipped: settings.notify_order_shipped,
          notify_order_delivered: settings.notify_order_delivered,
          notify_low_stock: settings.notify_low_stock,
          notify_sla_warning: settings.notify_sla_warning,
          notify_returns: settings.notify_returns,
        } as any, {
          onConflict: 'company_id,user_id'
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        push_enabled: true,
        push_subscription: subscription,
      }));

      toast.success('Push-Benachrichtigungen aktiviert');
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Fehler beim Aktivieren der Benachrichtigungen');
      return null;
    }
  }, [user, profile?.company_id, registerServiceWorker, settings]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    const companyId = profile?.company_id;
    if (!user || !companyId) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Update database
      const { error } = await (supabase as any)
        .from('notification_settings')
        .update({
          push_enabled: false,
          push_subscription: null,
        })
        .eq('user_id', user.id)
        .eq('company_id', companyId);

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        push_enabled: false,
        push_subscription: null,
      }));

      toast.success('Push-Benachrichtigungen deaktiviert');
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Fehler beim Deaktivieren der Benachrichtigungen');
    }
  }, [user, profile?.company_id]);

  // Update notification preferences
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const companyId = profile?.company_id;
    if (!user || !companyId) return;

    try {
      const { error } = await (supabase as any)
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          company_id: companyId,
          push_enabled: newSettings.push_enabled ?? settings.push_enabled,
          notify_order_created: newSettings.notify_order_created ?? settings.notify_order_created,
          notify_order_shipped: newSettings.notify_order_shipped ?? settings.notify_order_shipped,
          notify_order_delivered: newSettings.notify_order_delivered ?? settings.notify_order_delivered,
          notify_low_stock: newSettings.notify_low_stock ?? settings.notify_low_stock,
          notify_sla_warning: newSettings.notify_sla_warning ?? settings.notify_sla_warning,
          notify_returns: newSettings.notify_returns ?? settings.notify_returns,
        } as any, {
          onConflict: 'company_id,user_id'
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Fehler beim Speichern');
    }
  }, [user, profile?.company_id, settings]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (permission !== 'granted') {
      toast.error('Bitte erst Berechtigung erteilen');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Test-Benachrichtigung', {
        body: 'Dies ist eine Test-Benachrichtigung vom Fulfillment Hub!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
      toast.success('Test-Benachrichtigung gesendet');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Fehler beim Senden der Test-Benachrichtigung');
    }
  }, [permission]);

  return {
    settings,
    isSupported,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    updateSettings,
    sendTestNotification,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
