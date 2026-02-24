import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyMemberships } from '@/hooks/useMemberships';

export interface DemoModeState {
  isDemo: boolean;
  isPending: boolean;
  message: string;
}

/**
 * Hook to detect if user is in demo/pending mode
 * Returns demo state and mock data for pending users
 */
export const useDemoMode = (): DemoModeState => {
  const { user, memberships } = useAuth();
  const { data: myMemberships } = useMyMemberships();
  
  return useMemo(() => {
    if (!user) {
      return { isDemo: false, isPending: false, message: '' };
    }

    // Check if user has any approved memberships
    const approvedMemberships = (myMemberships || []).filter(
      m => m.status === 'approved'
    );
    
    const pendingMemberships = (myMemberships || []).filter(
      m => m.status === 'pending'
    );

    // If no approved memberships but has pending ones, show demo mode
    if (approvedMemberships.length === 0 && pendingMemberships.length > 0) {
      return {
        isDemo: true,
        isPending: true,
        message: 'Ihre Registrierung wird geprüft. In der Zwischenzeit können Sie die Demo erkunden!',
      };
    }

    // If no memberships at all, also demo mode
    if (approvedMemberships.length === 0 && memberships.length === 0) {
      return {
        isDemo: true,
        isPending: true,
        message: 'Ihre Registrierung wird von einem Admin geprüft.',
      };
    }

    return { isDemo: false, isPending: false, message: '' };
  }, [user, memberships, myMemberships]);
};

// Demo/Mock data for pending users
export const DEMO_DATA = {
  orders: {
    today: 42,
    todayChange: '+12%',
    open: 156,
    shipped: 38,
    picking: 12,
    packing: 8,
  },
  inventory: {
    totalSKUs: 1247,
    lowStock: 23,
    outOfStock: 5,
    inboundPending: 3,
  },
  returns: {
    thisWeek: 18,
    returnRate: 4.2,
    processing: 7,
    completed: 11,
  },
  sla: {
    fulfillmentRate: 98.5,
    avgShipTime: '1.2 Tage',
    onTimeDelivery: 96.8,
  },
  recentOrders: [
    { id: 'demo-1', source_no: 'ORD-2024-001', status: 'shipped', ship_to_name: 'Max Mustermann', updated_at: new Date().toISOString() },
    { id: 'demo-2', source_no: 'ORD-2024-002', status: 'packing', ship_to_name: 'Anna Schmidt', updated_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'demo-3', source_no: 'ORD-2024-003', status: 'picking', ship_to_name: 'Peter Müller', updated_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'demo-4', source_no: 'ORD-2024-004', status: 'received', ship_to_name: 'Lisa Weber', updated_at: new Date(Date.now() - 10800000).toISOString() },
    { id: 'demo-5', source_no: 'ORD-2024-005', status: 'shipped', ship_to_name: 'Thomas Bauer', updated_at: new Date(Date.now() - 14400000).toISOString() },
  ],
  featureDescriptions: {
    dashboard: {
      title: '📊 Dashboard',
      description: 'Ihre Kommandozentrale! Hier sehen Sie alle wichtigen KPIs auf einen Blick: Bestellungen, Versand-Status, SLA-Erfüllung und mehr.',
    },
    orders: {
      title: '📦 Bestellungen',
      description: 'Alle eingehenden Bestellungen in Echtzeit. Filtern Sie nach Status, Datum oder Kunde. Tracking-Links und Zeitstempel inklusive.',
    },
    inventory: {
      title: '🏭 Lagerbestand',
      description: 'Ihr aktueller Warenbestand: verfügbar, reserviert, Nachschub unterwegs. Mit Low-Stock-Warnungen und Bestandsprognosen.',
    },
    returns: {
      title: '↩️ Retouren',
      description: 'Retourenmanagement mit Statusverfolgung. Sehen Sie Gründe, Bearbeitungszeit und Trends auf einen Blick.',
    },
    quality: {
      title: '✅ Qualität',
      description: 'Qualitätskennzahlen: Fehlerquoten, häufige Probleme, Top-Fehler-SKUs. Für kontinuierliche Verbesserung.',
    },
    inbound: {
      title: '📥 Wareneingang',
      description: 'Erwartete Lieferungen, PO-Tracking und Wareneingangsprotokoll. Mit Abweichungs-Management.',
    },
    abcAnalysis: {
      title: '📈 ABC-Analyse',
      description: 'KI-gestützte Produktklassifizierung: A-Artikel (Top-Seller), B-Artikel (Mittelfeld), C-Artikel (Ladenhüter). Mit konkreten Handlungsempfehlungen!',
    },
    settings: {
      title: '⚙️ Einstellungen',
      description: 'Ihre Firmeneinstellungen: Branding, SLA-Regeln, Benutzer, Integrationen und mehr.',
    },
  },
};
