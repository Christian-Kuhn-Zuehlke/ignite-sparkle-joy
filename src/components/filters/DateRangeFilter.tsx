import { Calendar, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { DateRangePreset, DATE_RANGE_PRESETS, DateRange } from '@/hooks/useDateRangeFilter';
import { format } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { useState } from 'react';

interface DateRangeFilterProps {
  preset: DateRangePreset;
  dateRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomRangeChange?: (from: Date, to: Date) => void;
  onClear?: () => void;
  showClearButton?: boolean;
  compact?: boolean;
  className?: string;
}

const localeMap: Record<string, typeof de> = {
  de,
  en: enUS,
  fr,
  it,
  es,
};

export function DateRangeFilter({
  preset,
  dateRange,
  onPresetChange,
  onCustomRangeChange,
  onClear,
  showClearButton = true,
  compact = false,
  className = '',
}: DateRangeFilterProps) {
  const { t, language } = useLanguage();
  const locale = localeMap[language] || de;
  
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange.from ?? undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange.to ?? undefined);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  
  // Get translated label for preset
  const getPresetLabel = (presetId: DateRangePreset): string => {
    switch (presetId) {
      case 'current_year':
        return t('filters.currentYear');
      case 'last_30_days':
        return t('filters.last30Days');
      case 'last_90_days':
        return t('filters.last90Days');
      case 'last_6_months':
        return t('filters.last6Months');
      case 'last_year':
        return t('filters.lastYear');
      case 'all_time':
        return t('filters.allTime');
      case 'custom':
        return t('filters.custom');
      default:
        return presetId;
    }
  };
  
  // Format date range for display
  const formatDateRange = (): string => {
    if (preset === 'all_time') {
      return t('filters.allTime');
    }
    
    if (dateRange.from && dateRange.to) {
      const fromStr = format(dateRange.from, 'dd.MM.yyyy', { locale });
      const toStr = format(dateRange.to, 'dd.MM.yyyy', { locale });
      return `${fromStr} - ${toStr}`;
    }
    
    if (dateRange.from) {
      return `${t('common.from')} ${format(dateRange.from, 'dd.MM.yyyy', { locale })}`;
    }
    
    if (dateRange.to) {
      return `${t('common.to')} ${format(dateRange.to, 'dd.MM.yyyy', { locale })}`;
    }
    
    return getPresetLabel(preset);
  };
  
  const isActive = preset !== 'all_time';
  
  const handlePresetSelect = (selectedPreset: DateRangePreset) => {
    if (selectedPreset === 'custom') {
      // Initialize with current date range if available
      setCustomFrom(dateRange.from ?? new Date());
      setCustomTo(dateRange.to ?? new Date());
      setShowCustomDialog(true);
    } else {
      onPresetChange(selectedPreset);
    }
  };
  
  const handleApplyCustomRange = () => {
    if (customFrom && customTo && onCustomRangeChange) {
      onCustomRangeChange(customFrom, customTo);
      onPresetChange('custom');
    }
    setShowCustomDialog(false);
  };
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={isActive ? "secondary" : "outline"} 
            size={compact ? "sm" : "default"}
            className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
          >
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className={compact ? "hidden xs:inline sm:inline" : ""}>
              {getPresetLabel(preset)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-popover z-50">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('filters.dateRange')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {DATE_RANGE_PRESETS.map((presetOption) => (
            <DropdownMenuItem
              key={presetOption.id}
              onClick={() => handlePresetSelect(presetOption.id)}
              className={preset === presetOption.id ? 'bg-accent' : ''}
            >
              <span className="flex-1">{getPresetLabel(presetOption.id)}</span>
              {preset === presetOption.id && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {t('common.active')}
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Custom Date Range Option */}
          <DropdownMenuItem
            onClick={() => handlePresetSelect('custom')}
            className={preset === 'custom' ? 'bg-accent' : ''}
          >
            <span className="flex-1">{t('filters.custom')}</span>
            {preset === 'custom' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {t('common.active')}
              </Badge>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Custom Date Range Dialog - Mobile optimized */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('filters.selectDateRange')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 py-4">
            {/* From Date */}
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-foreground">{t('common.from')}</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  locale={locale}
                  className="rounded-md border pointer-events-auto scale-90 sm:scale-100 origin-top"
                />
              </div>
            </div>
            
            {/* To Date */}
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-foreground">{t('common.to')}</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  locale={locale}
                  disabled={(date) => customFrom ? date < customFrom : false}
                  className="rounded-md border pointer-events-auto scale-90 sm:scale-100 origin-top"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleApplyCustomRange}
              disabled={!customFrom || !customTo}
              className="w-full sm:w-auto"
            >
              {t('common.apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Show date range badge when active - hidden on very small screens */}
      {isActive && !compact && (
        <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs hidden xs:flex">
          {formatDateRange()}
        </Badge>
      )}
      
      {/* Clear button */}
      {showClearButton && isActive && onClear && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          onClick={onClear}
          title={t('common.clear')}
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      )}
    </div>
  );
}
