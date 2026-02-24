import confetti from 'canvas-confetti';
import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useCelebrationThresholds } from './useCelebrationSettings';
import { useAuth } from '@/contexts/AuthContext';

type MilestoneType = 'shipments_100' | 'sla_streak_30' | 'orders_50' | 'perfect_day';

interface MilestoneConfig {
  key: string;
  confettiConfig: confetti.Options;
  getMessage: (threshold: number, language: string) => string;
}

interface MilestoneData {
  ordersShipped?: number;
  slaStreak?: number;
  ordersToday?: number;
  allOrdersOnTime?: boolean;
}

const milestoneConfigs: Record<MilestoneType, MilestoneConfig> = {
  shipments_100: {
    key: 'milestone_shipments',
    confettiConfig: {
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
    },
    getMessage: (threshold, language) =>
      language === 'de'
        ? `🚀 ${threshold}+ Sendungen heute erreicht!`
        : `🚀 ${threshold}+ shipments reached today!`,
  },
  sla_streak_30: {
    key: 'milestone_sla_streak',
    confettiConfig: {
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
    },
    getMessage: (threshold, language) =>
      language === 'de'
        ? `🏆 ${threshold} Tage SLA-Streak erreicht!`
        : `🏆 ${threshold} day SLA streak achieved!`,
  },
  orders_50: {
    key: 'milestone_orders',
    confettiConfig: {
      particleCount: 100,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
    },
    getMessage: (threshold, language) =>
      language === 'de'
        ? `📦 ${threshold}+ Bestellungen heute!`
        : `📦 ${threshold}+ orders today!`,
  },
  perfect_day: {
    key: 'milestone_perfect_day',
    confettiConfig: {
      particleCount: 250,
      spread: 160,
      origin: { y: 0.4 },
      colors: ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#10b981', '#fbbf24'],
    },
    getMessage: (_threshold, language) =>
      language === 'de'
        ? `✨ Perfect Day! Alle Bestellungen pünktlich versendet!`
        : `✨ Perfect Day! All orders shipped on time!`,
  },
};

// Get today's date key for localStorage
const getTodayKey = () => new Date().toISOString().split('T')[0];

export function useConfetti(companyId?: string, language: string = 'de') {
  const triggeredRef = useRef<Set<string>>(new Set());
  const { profile } = useAuth();
  
  // Get company-specific thresholds
  const effectiveCompanyId = companyId || profile?.company_id || undefined;
  const { enabled, showToast, thresholds, isLoading } = useCelebrationThresholds(effectiveCompanyId);

  // Load already triggered milestones from localStorage
  useEffect(() => {
    const todayKey = getTodayKey();
    const stored = localStorage.getItem(`confetti_${todayKey}`);
    if (stored) {
      triggeredRef.current = new Set(JSON.parse(stored));
    } else {
      // Clear old days
      Object.keys(localStorage)
        .filter((key) => key.startsWith('confetti_') && key !== `confetti_${todayKey}`)
        .forEach((key) => localStorage.removeItem(key));
    }
  }, []);

  const triggerConfetti = useCallback((config: confetti.Options) => {
    // Fire confetti from multiple origins for more impact
    confetti({
      ...config,
      zIndex: 9999,
    });

    // Add some side bursts for extra celebration
    setTimeout(() => {
      confetti({
        ...config,
        particleCount: Math.floor((config.particleCount || 100) / 2),
        angle: 60,
        origin: { x: 0, y: 0.6 },
        zIndex: 9999,
      });
      confetti({
        ...config,
        particleCount: Math.floor((config.particleCount || 100) / 2),
        angle: 120,
        origin: { x: 1, y: 0.6 },
        zIndex: 9999,
      });
    }, 150);
  }, []);

  const checkAndTriggerMilestone = useCallback(
    (type: MilestoneType, data: MilestoneData): boolean => {
      // Don't trigger if disabled or still loading settings
      if (!enabled || isLoading) {
        return false;
      }

      const config = milestoneConfigs[type];
      const todayKey = getTodayKey();
      const milestoneKey = `${config.key}_${todayKey}`;

      // Check if already triggered today
      if (triggeredRef.current.has(milestoneKey)) {
        return false;
      }

      // Check milestone conditions based on company thresholds
      let shouldTrigger = false;
      let thresholdValue = 0;

      switch (type) {
        case 'shipments_100':
          thresholdValue = thresholds.shipments;
          shouldTrigger = (data.ordersShipped || 0) >= thresholdValue;
          break;
        case 'sla_streak_30':
          thresholdValue = thresholds.slaStreak;
          shouldTrigger = (data.slaStreak || 0) >= thresholdValue;
          break;
        case 'orders_50':
          thresholdValue = thresholds.ordersToday;
          shouldTrigger = (data.ordersToday || 0) >= thresholdValue;
          break;
        case 'perfect_day':
          shouldTrigger = thresholds.perfectDay && data.allOrdersOnTime === true;
          break;
      }

      if (shouldTrigger) {
        // Trigger confetti
        triggerConfetti(config.confettiConfig);

        // Show achievement toast if enabled
        if (showToast) {
          toast.success(config.getMessage(thresholdValue, language), {
            duration: 5000,
          });
        }

        // Mark as triggered
        triggeredRef.current.add(milestoneKey);
        localStorage.setItem(
          `confetti_${todayKey}`,
          JSON.stringify(Array.from(triggeredRef.current))
        );

        return true;
      }

      return false;
    },
    [enabled, isLoading, thresholds, showToast, language, triggerConfetti]
  );

  const checkAllMilestones = useCallback(
    (data: MilestoneData) => {
      const triggered: MilestoneType[] = [];

      (Object.keys(milestoneConfigs) as MilestoneType[]).forEach((type) => {
        if (checkAndTriggerMilestone(type, data)) {
          triggered.push(type);
        }
      });

      return triggered;
    },
    [checkAndTriggerMilestone]
  );

  // Manual confetti trigger for custom celebrations
  const celebrate = useCallback(
    (intensity: 'small' | 'medium' | 'large' = 'medium') => {
      if (!enabled) return;

      const configs = {
        small: { particleCount: 50, spread: 60 },
        medium: { particleCount: 100, spread: 100 },
        large: { particleCount: 200, spread: 160 },
      };

      triggerConfetti({
        ...configs[intensity],
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'],
      });
    },
    [enabled, triggerConfetti]
  );

  return {
    checkAndTriggerMilestone,
    checkAllMilestones,
    celebrate,
    isEnabled: enabled,
    isLoading,
  };
}
