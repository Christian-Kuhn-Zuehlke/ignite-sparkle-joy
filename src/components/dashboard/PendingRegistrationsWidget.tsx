import { UserPlus, CheckCircle, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export function PendingRegistrationsWidget() {
  const { pendingRegistrations, pendingCount, isLoading, canViewPending } = usePendingRegistrations();
  const navigate = useNavigate();

  // Don't render for non-admins
  if (!canViewPending) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no pending registrations
  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-status-exception/30 bg-status-exception/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-exception/20">
              <UserPlus className="h-4 w-4 text-status-exception" />
            </div>
            <span>Ausstehende Registrierungen</span>
            <Badge variant="destructive" className="ml-1">
              {pendingCount}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-xs"
            onClick={() => navigate('/settings?tab=pending')}
          >
            Alle anzeigen
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-3">
            {pendingRegistrations.slice(0, 5).map((registration) => (
              <div 
                key={registration.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {registration.full_name || 'Unbekannt'}
                    </p>
                    <Badge variant="outline" className="text-xs bg-status-warning/10 text-status-warning border-status-warning/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {registration.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Firma: <span className="font-medium text-foreground">{registration.requested_company_name || 'Nicht angegeben'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      · {formatDistanceToNow(new Date(registration.created_at), { addSuffix: true, locale: de })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-status-success hover:text-status-success hover:bg-status-success/10"
                    onClick={() => navigate('/settings?tab=pending')}
                    title="Freigeben"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => navigate('/settings?tab=pending')}
                    title="Ablehnen"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {pendingCount > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{pendingCount - 5} weitere ausstehende Registrierungen
          </p>
        )}
      </CardContent>
    </Card>
  );
}
