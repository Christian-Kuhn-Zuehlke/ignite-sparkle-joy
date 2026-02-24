import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PackageCheck, 
  Warehouse, 
  ShoppingCart, 
  Package, 
  Truck, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOrderPipeline } from '@/services/dataService';
import { useLanguage } from '@/contexts/LanguageContext';

interface PipelineStage {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
}

const stageIcons: Record<string, React.ReactNode> = {
  received: <PackageCheck className="h-4 w-4" />,
  putaway: <Warehouse className="h-4 w-4" />,
  picking: <ShoppingCart className="h-4 w-4" />,
  packing: <Package className="h-4 w-4" />,
  ready_to_ship: <Truck className="h-4 w-4" />,
  shipped: <CheckCircle2 className="h-4 w-4" />,
};

const stageColors: Record<string, string> = {
  received: 'bg-amber-500',
  putaway: 'bg-blue-500',
  picking: 'bg-purple-500',
  packing: 'bg-pink-500',
  ready_to_ship: 'bg-cyan-500',
  shipped: 'bg-status-shipped',
};

interface OrderPipelineProps {
  companyId?: string;
}

export function OrderPipeline({ companyId }: OrderPipelineProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const stageLabels: Record<string, string> = {
    received: t('status.received'),
    putaway: t('status.putaway'),
    picking: t('status.picking'),
    packing: t('status.packing'),
    ready_to_ship: t('status.readyToShip'),
    shipped: t('status.shipped'),
  };

  useEffect(() => {
    loadPipeline();
  }, [companyId]);

  const loadPipeline = async () => {
    try {
      const data = await fetchOrderPipeline(companyId);
      const pipelineStages = data.map(item => ({
        id: item.id,
        label: stageLabels[item.id] || item.id,
        count: item.count,
        icon: stageIcons[item.id] || <Package className="h-4 w-4" />,
      }));
      setStages(pipelineStages);
    } catch (error) {
      console.error('Error loading pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageClick = (stageId: string) => {
    navigate(`/orders?status=${stageId}`);
  };

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const totalOrders = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-secondary/30 to-transparent">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {t('widgets.orderPipeline')}
          </h3>
          <span className="text-sm text-muted-foreground">
            {totalOrders.toLocaleString('de-CH')} total
          </span>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {stages.map((stage) => {
            const percentage = (stage.count / maxCount) * 100;
            const isShipped = stage.id === 'shipped';
            const barColor = stageColors[stage.id] || 'bg-primary';
            
            return (
              <div 
                key={stage.id} 
                className="group cursor-pointer rounded-lg p-2 -mx-2 hover:bg-secondary/50 transition-colors"
                onClick={() => handleStageClick(stage.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    isShipped 
                      ? "bg-status-shipped/15 text-status-shipped"
                      : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {stage.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {stage.label}
                      </span>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        isShipped ? "text-status-shipped" : "text-foreground"
                      )}>
                        {stage.count.toLocaleString('de-CH')}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          barColor
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
