import { useState } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEMO_DATA } from '@/hooks/useDemoMode';
import { cn } from '@/lib/utils';

interface FeatureTooltipProps {
  featureKey: keyof typeof DEMO_DATA.featureDescriptions;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export function FeatureTooltip({ featureKey, position = 'bottom', children }: FeatureTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const feature = DEMO_DATA.featureDescriptions[featureKey];

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <div 
        className="relative cursor-pointer group"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
            <HelpCircle className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
      
      {isOpen && (
        <Card className={cn(
          "absolute z-50 w-72 shadow-lg border-amber-200 bg-amber-50/95 backdrop-blur-sm",
          positionClasses[position]
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-amber-800">
              {feature.description}
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FeatureTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureTour({ isOpen, onClose }: FeatureTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const features = Object.entries(DEMO_DATA.featureDescriptions);
  const [, feature] = features[currentIndex];

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < features.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} von {features.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardTitle className="text-xl">{feature.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{feature.description}</p>
          
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {features.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === currentIndex ? "bg-amber-500" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              {currentIndex === features.length - 1 ? 'Fertig' : 'Weiter'}
              {currentIndex < features.length - 1 && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Import for the Sparkles icon used in FeatureTour
import { Sparkles } from 'lucide-react';
