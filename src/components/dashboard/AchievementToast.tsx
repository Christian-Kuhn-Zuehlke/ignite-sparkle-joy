import { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Target, Award, Flame, Crown } from '@/components/icons';
import { cn } from '@/lib/utils';

export type AchievementType = 
  | 'first_order'
  | 'orders_100'
  | 'orders_500'
  | 'orders_1000'
  | 'sla_streak_7'
  | 'sla_streak_30'
  | 'perfect_week'
  | 'speed_demon'
  | 'zero_returns';

interface Achievement {
  type: AchievementType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const achievements: Record<AchievementType, Achievement> = {
  first_order: {
    type: 'first_order',
    title: 'Erster Auftrag!',
    description: 'Willkommen an Bord! Dein erstes Paket ist unterwegs.',
    icon: <Star className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
    rarity: 'common'
  },
  orders_100: {
    type: 'orders_100',
    title: '100 Club',
    description: '100 Bestellungen erfolgreich versendet!',
    icon: <Trophy className="h-6 w-6" />,
    color: 'from-emerald-500 to-green-500',
    rarity: 'common'
  },
  orders_500: {
    type: 'orders_500',
    title: 'High Volume Hero',
    description: '500 Bestellungen! Du rockst das!',
    icon: <Zap className="h-6 w-6" />,
    color: 'from-purple-500 to-pink-500',
    rarity: 'rare'
  },
  orders_1000: {
    type: 'orders_1000',
    title: 'Fulfillment Legend',
    description: '1.000 Bestellungen! Absoluter Wahnsinn!',
    icon: <Crown className="h-6 w-6" />,
    color: 'from-amber-500 to-orange-500',
    rarity: 'legendary'
  },
  sla_streak_7: {
    type: 'sla_streak_7',
    title: 'Woche der Perfektion',
    description: '7 Tage in Folge 100% SLA erfüllt!',
    icon: <Target className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-500',
    rarity: 'common'
  },
  sla_streak_30: {
    type: 'sla_streak_30',
    title: 'Monat der Exzellenz',
    description: '30 Tage perfekte SLA-Erfüllung!',
    icon: <Award className="h-6 w-6" />,
    color: 'from-amber-500 to-yellow-500',
    rarity: 'epic'
  },
  perfect_week: {
    type: 'perfect_week',
    title: 'Perfekte Woche',
    description: 'Alle Bestellungen pünktlich, keine Retouren!',
    icon: <Star className="h-6 w-6" />,
    color: 'from-pink-500 to-rose-500',
    rarity: 'rare'
  },
  speed_demon: {
    type: 'speed_demon',
    title: 'Speed Demon',
    description: 'Durchschnittliche Bearbeitungszeit unter 2 Stunden!',
    icon: <Flame className="h-6 w-6" />,
    color: 'from-red-500 to-orange-500',
    rarity: 'epic'
  },
  zero_returns: {
    type: 'zero_returns',
    title: 'Zero Returns',
    description: 'Diese Woche keine einzige Retoure!',
    icon: <Target className="h-6 w-6" />,
    color: 'from-cyan-500 to-blue-500',
    rarity: 'rare'
  }
};

const rarityStyles: Record<string, string> = {
  common: 'ring-2 ring-blue-500/30',
  rare: 'ring-2 ring-purple-500/50 shadow-purple-500/20',
  epic: 'ring-2 ring-amber-500/50 shadow-amber-500/30',
  legendary: 'ring-4 ring-amber-400/60 shadow-amber-400/40 animate-pulse-subtle'
};

interface AchievementToastProps {
  type: AchievementType;
  onClose: () => void;
}

export function AchievementToast({ type, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const achievement = achievements[type];

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 50);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!achievement) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-[100] max-w-sm",
        "transform transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
      )}
    >
      <div 
        className={cn(
          "relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl",
          rarityStyles[achievement.rarity]
        )}
        onClick={onClose}
      >
        {/* Animated background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-10",
          achievement.color
        )} />
        
        {/* Shine effect for legendary */}
        {achievement.rarity === 'legendary' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
        )}

        <div className="relative p-4 flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            "shrink-0 p-3 rounded-xl bg-gradient-to-br text-white shadow-lg",
            achievement.color
          )}>
            {achievement.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Achievement freigeschaltet!
              </span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                achievement.rarity === 'common' && "bg-blue-500/20 text-blue-500",
                achievement.rarity === 'rare' && "bg-purple-500/20 text-purple-500",
                achievement.rarity === 'epic' && "bg-amber-500/20 text-amber-500",
                achievement.rarity === 'legendary' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              )}>
                {achievement.rarity}
              </span>
            </div>
            <h3 className="font-bold text-foreground">
              {achievement.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {achievement.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to show achievement toasts
export function useAchievementToast() {
  const [activeAchievement, setActiveAchievement] = useState<AchievementType | null>(null);

  const showAchievement = (type: AchievementType) => {
    setActiveAchievement(type);
  };

  const hideAchievement = () => {
    setActiveAchievement(null);
  };

  return {
    activeAchievement,
    showAchievement,
    hideAchievement,
    AchievementToastComponent: activeAchievement ? (
      <AchievementToast type={activeAchievement} onClose={hideAchievement} />
    ) : null
  };
}
