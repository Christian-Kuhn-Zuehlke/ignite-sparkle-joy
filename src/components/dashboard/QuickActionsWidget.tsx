import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Package, 
  Search, 
  FileText, 
  RotateCcw,
  TrendingUp,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
  color: string;
  popular?: boolean;
}

export function QuickActionsWidget() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: 'search-order',
      icon: <Search className="h-5 w-5" />,
      label: t('search.searchOrder'),
      description: t('search.findOrderQuick'),
      action: () => {
        // Trigger global search with Cmd+K
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          bubbles: true
        });
        document.dispatchEvent(event);
      },
      color: 'from-blue-500 to-blue-600',
      popular: true
    },
    {
      id: 'view-orders',
      icon: <Package className="h-5 w-5" />,
      label: t('nav.orders'),
      description: t('quickActions.viewAllOrders'),
      action: () => navigate('/orders'),
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'open-returns',
      icon: <RotateCcw className="h-5 w-5" />,
      label: t('returns.openReturns'),
      description: t('quickActions.manageReturns'),
      action: () => navigate('/returns'),
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'view-kpis',
      icon: <TrendingUp className="h-5 w-5" />,
      label: t('nav.kpis'),
      description: t('quickActions.viewPerformance'),
      action: () => navigate('/kpis'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'inventory',
      icon: <FileText className="h-5 w-5" />,
      label: t('nav.inventory'),
      description: t('quickActions.checkStock'),
      action: () => navigate('/inventory'),
      color: 'from-cyan-500 to-cyan-600'
    },
    {
      id: 'ai-assistant',
      icon: <Sparkles className="h-5 w-5" />,
      label: t('nav.aiHub'),
      description: t('quickActions.askAI'),
      action: () => navigate('/ai'),
      color: 'from-pink-500 to-rose-600',
      popular: true
    }
  ];

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <div className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
          </div>
          {t('quickActions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              className={cn(
                "relative group flex flex-col items-center sm:items-start p-2 sm:p-3 rounded-lg sm:rounded-xl border border-border",
                "bg-card hover:bg-accent/5 transition-all duration-200",
                "hover:border-accent/30 hover:shadow-md active:scale-95",
                hoveredAction === action.id && "sm:scale-[1.02]"
              )}
            >
              {action.popular && (
                <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                  ★
                </span>
              )}
              <div className={cn(
                "p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br text-white mb-1 sm:mb-2",
                action.color
              )}>
                <div className="h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center [&>svg]:h-full [&>svg]:w-full">
                  {action.icon}
                </div>
              </div>
              <span className="text-[10px] sm:text-sm font-medium text-foreground text-center sm:text-left line-clamp-2 leading-tight">
                {action.label}
              </span>
              <span className="text-[8px] sm:text-xs text-muted-foreground text-center sm:text-left line-clamp-1 mt-0.5 hidden sm:block">
                {action.description}
              </span>
              <ChevronRight className={cn(
                "absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/50",
                "transition-all duration-200 opacity-0 group-hover:opacity-100",
                "group-hover:translate-x-0.5 hidden sm:block"
              )} />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
