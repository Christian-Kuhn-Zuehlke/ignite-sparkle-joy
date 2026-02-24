import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Mail, Calendar, Send, Loader2, Clock } from 'lucide-react';

interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  email: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
}

export function EmailReportSettings() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [schedule, setSchedule] = useState<ReportSchedule>({
    enabled: false,
    frequency: 'weekly',
    email: profile?.email || '',
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
  });
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSendTestReport = async () => {
    if (!schedule.email) {
      toast.error(t('emailReport.enterEmail'));
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-scheduled-report', {
        body: {
          companyId: profile?.company_id || 'DEMO',
          recipientEmail: schedule.email,
          recipientName: profile?.full_name,
          reportType: schedule.frequency,
          language,
        },
      });

      if (error) throw error;
      toast.success(t('emailReport.testSent'));
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error(t('emailReport.sendError'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save to a schedules table
      // For now, just show success
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(t('emailReport.scheduleSaved'));
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const weekDays = [
    { value: 0, label: t('common.sunday') },
    { value: 1, label: t('common.monday') },
    { value: 2, label: t('common.tuesday') },
    { value: 3, label: t('common.wednesday') },
    { value: 4, label: t('common.thursday') },
    { value: 5, label: t('common.friday') },
    { value: 6, label: t('common.saturday') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t('emailReport.title')}
        </CardTitle>
        <CardDescription>{t('emailReport.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('emailReport.enableScheduled')}</Label>
            <p className="text-sm text-muted-foreground">{t('emailReport.enableDescription')}</p>
          </div>
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(checked) => setSchedule(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="report-email">{t('emailReport.recipientEmail')}</Label>
          <Input
            id="report-email"
            type="email"
            value={schedule.email}
            onChange={(e) => setSchedule(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@example.com"
          />
        </div>

        {/* Frequency Selection */}
        <div className="space-y-2">
          <Label>{t('emailReport.frequency')}</Label>
          <Select 
            value={schedule.frequency} 
            onValueChange={(v) => setSchedule(prev => ({ ...prev, frequency: v as 'daily' | 'weekly' | 'monthly' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('emailReport.daily')}
                </div>
              </SelectItem>
              <SelectItem value="weekly">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('emailReport.weekly')}
                </div>
              </SelectItem>
              <SelectItem value="monthly">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('emailReport.monthly')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Day Selection (for weekly/monthly) */}
        {schedule.frequency === 'weekly' && (
          <div className="space-y-2">
            <Label>{t('emailReport.sendDay')}</Label>
            <Select 
              value={schedule.dayOfWeek?.toString()} 
              onValueChange={(v) => setSchedule(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {schedule.frequency === 'monthly' && (
          <div className="space-y-2">
            <Label>{t('emailReport.dayOfMonth')}</Label>
            <Select 
              value={schedule.dayOfMonth?.toString()} 
              onValueChange={(v) => setSchedule(prev => ({ ...prev, dayOfMonth: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}. {t('emailReport.ofMonth')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Report Contents Info */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <h4 className="font-medium text-sm">{t('emailReport.reportContains')}</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t('emailReport.orderSummary')}</Badge>
            <Badge variant="secondary">{t('emailReport.shipmentStats')}</Badge>
            <Badge variant="secondary">{t('emailReport.returnAnalysis')}</Badge>
            <Badge variant="secondary">{t('emailReport.carrierBreakdown')}</Badge>
            <Badge variant="secondary">{t('emailReport.lowStockAlerts')}</Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleSendTestReport}
            disabled={isSending || !schedule.email}
            className="flex-1"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('emailReport.sending')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('emailReport.sendTest')}
              </>
            )}
          </Button>
          <Button
            onClick={handleSaveSchedule}
            disabled={isSaving || !schedule.email}
            className="flex-1"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {t('emailReport.saveSchedule')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
