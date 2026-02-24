import { Bell, Package, Truck, CheckCircle, AlertTriangle, RotateCcw, TestTube, Smartphone, Mail, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function NotificationSettings() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  
  const {
    settings,
    isSupported,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    updateSettings,
    sendTestNotification,
  } = usePushNotifications();

  useEffect(() => {
    if (settings?.email_enabled !== undefined) {
      setEmailEnabled(settings.email_enabled);
    }
  }, [settings]);

  const handleEmailToggle = async (enabled: boolean) => {
    if (!user || !profile?.company_id) return;
    
    setEmailLoading(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          company_id: profile.company_id,
          email_enabled: enabled,
        }, { onConflict: 'user_id,company_id' });

      if (error) throw error;
      
      setEmailEnabled(enabled);
      toast.success(enabled ? t('notifSettings.emailEnabled') : t('notifSettings.emailDisabled'));
    } catch (error) {
      console.error('Error updating email settings:', error);
      toast.error(t('notifSettings.saveError'));
    } finally {
      setEmailLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!profile?.company_id) return;
    
    try {
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          companyId: profile.company_id,
          notificationType: 'notify_order_created',
          title: 'Test Email',
          body: 'Test email notification',
          url: '/settings',
        },
      });

      if (error) throw error;
      toast.success(t('notifSettings.testEmailSent'));
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(t('notifSettings.testEmailError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const notificationTypes = [
    {
      key: 'notify_order_created',
      label: t('notifSettings.newOrders'),
      description: t('notifSettings.newOrdersDesc'),
      icon: Package,
      value: settings.notify_order_created,
    },
    {
      key: 'notify_order_shipped',
      label: t('notifSettings.shipping'),
      description: t('notifSettings.shippingDesc'),
      icon: Truck,
      value: settings.notify_order_shipped,
    },
    {
      key: 'notify_order_delivered',
      label: t('notifSettings.delivery'),
      description: t('notifSettings.deliveryDesc'),
      icon: CheckCircle,
      value: settings.notify_order_delivered,
    },
    {
      key: 'notify_low_stock',
      label: t('notifSettings.lowStock'),
      description: t('notifSettings.lowStockDesc'),
      icon: AlertTriangle,
      value: settings.notify_low_stock,
    },
    {
      key: 'notify_sla_warning',
      label: t('notifSettings.slaWarning'),
      description: t('notifSettings.slaWarningDesc'),
      icon: AlertTriangle,
      value: settings.notify_sla_warning,
    },
    {
      key: 'notify_returns',
      label: t('notifSettings.returns'),
      description: t('notifSettings.returnsDesc'),
      icon: RotateCcw,
      value: settings.notify_returns,
    },
  ];

  const getActiveLabel = () => settings.push_enabled ? t('kpis.active') : t('kpis.inactive');
  const getEmailActiveLabel = () => emailEnabled ? t('kpis.active') : t('kpis.inactive');

  return (
    <div className="space-y-6">
      {/* Push Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notifSettings.pushTitle')}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('notifSettings.pushDesc')}
              </CardDescription>
            </div>
            <Badge variant={settings.push_enabled ? 'default' : 'secondary'}>
              {getActiveLabel()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSupported ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {t('notifSettings.notSupported')}
              </span>
            </div>
          ) : (
            <>
              {/* Permission Status */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${
                    permission === 'granted' 
                      ? 'bg-status-success/10 text-status-success' 
                      : permission === 'denied'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t('notifSettings.browserPermission')}</p>
                    <p className="text-sm text-muted-foreground">
                      {permission === 'granted' 
                        ? t('notifSettings.permissionGranted')
                        : permission === 'denied'
                        ? t('notifSettings.permissionDenied')
                        : t('notifSettings.permissionDefault')}
                    </p>
                  </div>
                </div>
                
                {permission === 'default' && (
                  <Button onClick={requestPermission} variant="outline" size="sm">
                    {t('notifSettings.grantPermission')}
                  </Button>
                )}
                {permission === 'denied' && (
                  <p className="text-xs text-muted-foreground max-w-[200px] text-right">
                    {t('notifSettings.enableInBrowser')}
                  </p>
                )}
              </div>

              {/* Push Subscription Toggle */}
              {permission === 'granted' && (
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      settings.push_enabled 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t('notifSettings.pushTitle')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('notifSettings.sendToDevice')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {settings.push_enabled && (
                      <Button 
                        onClick={sendTestNotification} 
                        variant="ghost" 
                        size="sm"
                        className="gap-2"
                      >
                        <TestTube className="h-4 w-4" />
                        {t('notifSettings.test')}
                      </Button>
                    )}
                    <Switch
                      checked={settings.push_enabled}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          subscribe();
                        } else {
                          unsubscribe();
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('notifSettings.emailTitle')}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('notifSettings.emailDesc').replace('{email}', profile?.email || '')}
              </CardDescription>
            </div>
            <Badge variant={emailEnabled ? 'default' : 'secondary'}>
              {getEmailActiveLabel()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${
                emailEnabled 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('notifSettings.emailTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('notifSettings.sendToEmail')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {emailEnabled && (
                <Button 
                  onClick={sendTestEmail} 
                  variant="ghost" 
                  size="sm"
                  className="gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {t('notifSettings.test')}
                </Button>
              )}
              <Switch
                checked={emailEnabled}
                onCheckedChange={handleEmailToggle}
                disabled={emailLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp/SMS Teaser Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('notifSettings.whatsappSms')}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t('notifSettings.whatsappSmsDesc')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-background">
              {t('notifSettings.comingSoon')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* WhatsApp Teaser */}
            <div className="flex items-center gap-4 rounded-lg border border-border p-4 opacity-60">
              <div className="rounded-full p-2 bg-[#25D366]/10 text-[#25D366]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{t('notifSettings.whatsapp')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('notifSettings.whatsappDesc')}
                </p>
              </div>
              <Switch disabled checked={false} />
            </div>

            {/* SMS Teaser */}
            <div className="flex items-center gap-4 rounded-lg border border-border p-4 opacity-60">
              <div className="rounded-full p-2 bg-blue-500/10 text-blue-500">
                <Phone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{t('notifSettings.sms')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('notifSettings.smsDesc')}
                </p>
              </div>
              <Switch disabled checked={false} />
            </div>
          </div>
          
          <p className="mt-4 text-xs text-muted-foreground text-center">
            {t('notifSettings.futureNote')}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('notifSettings.typesTitle')}</CardTitle>
          <CardDescription>
            {t('notifSettings.typesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <div 
                key={type.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <type.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor={type.key} className="text-sm font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={type.key}
                  checked={type.value}
                  onCheckedChange={(checked) => {
                    updateSettings({ [type.key]: checked } as any);
                  }}
                  disabled={!settings.push_enabled && !emailEnabled}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
