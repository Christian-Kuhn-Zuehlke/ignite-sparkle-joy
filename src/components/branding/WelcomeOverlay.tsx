import { useEffect, useState } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowRight, Package, Truck, AlertTriangle, CheckCircle, 
  Users, Building2, Clock, TrendingUp, UserPlus, ShieldAlert,
  BarChart3
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Customer summary - MUST match PersonalizedGreeting for consistency
interface DailySummary {
  openOrders: number;
  shippedToday: number;
  ordersToday: number;  // New orders received today (same as PersonalizedGreeting)
  slaAtRisk: number;
  slaOnTrack: number;
}

// CSM-specific summary for assigned customers
interface CSMSummary {
  assignedCompanies: number;
  totalOpenOrders: number;
  companiesAtRisk: { name: string; slaAtRisk: number }[];
  companiesOnTrack: number;
  pendingTasks: number;
}

// Admin-specific summary
interface AdminSummary {
  pendingRegistrations: number;
  totalActiveUsers: number;
  totalCompanies: number;
  recentLogins: number;
  systemAlerts: number;
}

// Operations summary
interface OpsSummary {
  totalOpenOrders: number;
  ordersToday: number;
  shipmentsToday: number;
  processingBacklog: number;
  avgProcessingTime: string;
}

type MSDRole = 'system_admin' | 'msd_csm' | 'msd_ma' | null;

export function WelcomeOverlay() {
  const { brand, showWelcome, dismissWelcome } = useBranding();
  const { profile, role } = useAuth();
  const [animationStage, setAnimationStage] = useState(0);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [csmSummary, setCSMSummary] = useState<CSMSummary | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null);
  const [opsSummary, setOpsSummary] = useState<OpsSummary | null>(null);

  // Determine if user is MSD staff and their role
  const getMSDRole = (): MSDRole => {
    if (role === 'system_admin') return 'system_admin';
    if (role === 'msd_csm') return 'msd_csm';
    if (role === 'msd_ma') return 'msd_ma';
    return null;
  };

  const msdRole = getMSDRole();
  const isMSDStaff = msdRole !== null;

  // Fetch CSM-specific data
  useEffect(() => {
    if (!showWelcome || msdRole !== 'msd_csm' || !profile?.user_id) return;

    const fetchCSMSummary = async () => {
      try {
        // Get assigned companies
        const { data: assignments } = await supabase
          .from('csm_assignments')
          .select('company_id')
          .eq('csm_user_id', profile.user_id);

        if (!assignments || assignments.length === 0) {
          setCSMSummary({
            assignedCompanies: 0,
            totalOpenOrders: 0,
            companiesAtRisk: [],
            companiesOnTrack: 0,
            pendingTasks: 0,
          });
          return;
        }

        const companyIds = assignments.map(a => a.company_id);

        // Get company details
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        // Get open orders per company
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const companiesAtRisk: { name: string; slaAtRisk: number }[] = [];
        let totalOpenOrders = 0;
        let companiesOnTrack = 0;

        for (const company of companies || []) {
          const { count: openOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship']);

          const { count: atRisk } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship'])
            .lt('order_date', threeDaysAgo.toISOString());

          totalOpenOrders += openOrders || 0;

          if ((atRisk || 0) > 0) {
            companiesAtRisk.push({ name: company.name, slaAtRisk: atRisk || 0 });
          } else {
            companiesOnTrack++;
          }
        }

        // Get pending registrations for assigned companies
        const { count: pendingTasks } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .in('company_id', companyIds)
          .eq('status', 'pending');

        setCSMSummary({
          assignedCompanies: companyIds.length,
          totalOpenOrders,
          companiesAtRisk: companiesAtRisk.slice(0, 3), // Top 3
          companiesOnTrack,
          pendingTasks: pendingTasks || 0,
        });
      } catch (error) {
        console.error('Error fetching CSM summary:', error);
      }
    };

    fetchCSMSummary();
  }, [showWelcome, msdRole, profile?.user_id]);

  // Fetch Admin-specific data
  useEffect(() => {
    if (!showWelcome || msdRole !== 'system_admin') return;

    const fetchAdminSummary = async () => {
      try {
        // Pending registrations
        const { count: pendingRegistrations } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Total active users (not deleted)
        const { count: totalActiveUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        // Total companies
        const { count: totalCompanies } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // Recent logins (last 24h)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const { count: recentLogins } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('last_login_at', oneDayAgo.toISOString());

        // System alerts (audit logs with errors in last 24h)
        const { count: systemAlerts } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo.toISOString())
          .or('action.eq.reject,action.eq.delete');

        setAdminSummary({
          pendingRegistrations: pendingRegistrations || 0,
          totalActiveUsers: totalActiveUsers || 0,
          totalCompanies: totalCompanies || 0,
          recentLogins: recentLogins || 0,
          systemAlerts: systemAlerts || 0,
        });
      } catch (error) {
        console.error('Error fetching admin summary:', error);
      }
    };

    fetchAdminSummary();
  }, [showWelcome, msdRole]);

  // Fetch Operations-specific data
  useEffect(() => {
    if (!showWelcome || msdRole !== 'msd_ma') return;

    const fetchOpsSummary = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Total open orders across all companies (not yet shipped)
        const { count: totalOpenOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship']);

        // Orders received today
        const { count: ordersToday } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .gte('order_date', today);

        // Shipments today
        const { count: shipmentsToday } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'shipped')
          .gte('posted_shipment_date', today);

        // Processing backlog (received but not yet picking)
        const { count: processingBacklog } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['received', 'putaway']);

        // Calculate avg processing time from order_events
        const { data: recentEvents } = await supabase
          .from('order_events')
          .select('metadata')
          .eq('event_type', 'status_change')
          .order('created_at', { ascending: false })
          .limit(100);

        let avgProcessingTime = '-';
        if (recentEvents && recentEvents.length > 0) {
          const validDurations = recentEvents.filter(e => (e.metadata as any)?.duration_seconds).map(e => (e.metadata as any).duration_seconds as number);
          if (validDurations.length > 0) {
            const avgSeconds = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
            const hours = Math.floor(avgSeconds / 3600);
            const minutes = Math.floor((avgSeconds % 3600) / 60);
            avgProcessingTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          }
        }

        setOpsSummary({
          totalOpenOrders: totalOpenOrders || 0,
          ordersToday: ordersToday || 0,
          shipmentsToday: shipmentsToday || 0,
          processingBacklog: processingBacklog || 0,
          avgProcessingTime,
        });
      } catch (error) {
        console.error('Error fetching ops summary:', error);
      }
    };

    fetchOpsSummary();
  }, [showWelcome, msdRole]);

  // Fetch customer summary (original - for non-MSD users)
  // IMPORTANT: Use same date format as PersonalizedGreeting for consistency
  useEffect(() => {
    if (showWelcome && profile?.company_id && !isMSDStaff) {
      const fetchSummary = async () => {
        const companyId = profile.company_id!;
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Open orders = orders that are NOT yet shipped or delivered
        const { count: openOrders } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship']);

        // Orders received TODAY (same logic as PersonalizedGreeting)
        const { count: ordersToday } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('order_date', today);

        // Shipped today (same logic as PersonalizedGreeting)
        const { count: shippedToday } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'shipped')
          .gte('posted_shipment_date', today);

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const { count: slaAtRisk } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship'])
          .lt('order_date', threeDaysAgo.toISOString());

        const totalOpen = openOrders || 0;
        const atRisk = slaAtRisk || 0;
        
        setSummary({
          openOrders: totalOpen,
          shippedToday: shippedToday || 0,
          ordersToday: ordersToday || 0,
          slaAtRisk: atRisk,
          slaOnTrack: Math.max(0, totalOpen - atRisk),
        });
      };
      
      fetchSummary();
    }
  }, [showWelcome, profile?.company_id, isMSDStaff]);

  useEffect(() => {
    if (showWelcome) {
      const timers = [
        setTimeout(() => setAnimationStage(1), 100),
        setTimeout(() => setAnimationStage(2), 400),
        setTimeout(() => setAnimationStage(3), 800),
        setTimeout(() => setAnimationStage(4), 1200),
        setTimeout(() => setAnimationStage(5), 1600),
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setAnimationStage(0);
    }
  }, [showWelcome]);

  useEffect(() => {
    if (!showWelcome) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        dismissWelcome();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, dismissWelcome]);

  if (!showWelcome) return null;

  // Role-specific title and tagline
  const getRoleTitle = () => {
    switch (msdRole) {
      case 'system_admin':
        return 'System Administrator';
      case 'msd_csm':
        return 'Customer Success';
      case 'msd_ma':
        return 'Operations';
      default:
        return brand.tagline;
    }
  };

  // Render CSM-specific content
  const renderCSMContent = () => {
    if (!csmSummary) return null;

    return (
      <div 
        className={`space-y-4 mb-8 sm:mb-10 transition-all duration-1000 delay-400 ${
          animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{csmSummary.assignedCompanies}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Zugewiesene Kunden</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{csmSummary.totalOpenOrders}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Offene Bestellungen</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-300 opacity-80" />
              <span className="text-2xl sm:text-3xl font-light">{csmSummary.companiesOnTrack}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Kunden im Plan</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserPlus className={`h-4 w-4 ${csmSummary.pendingTasks > 0 ? 'text-amber-300' : 'text-green-300'} opacity-80`} />
              <span className="text-2xl sm:text-3xl font-light">{csmSummary.pendingTasks}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Offene Aufgaben</p>
          </div>
        </div>

        {/* Companies at risk alert */}
        {csmSummary.companiesAtRisk.length > 0 && (
          <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg p-4 border border-amber-400/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-medium">SLA-Risiko bei:</span>
            </div>
            <div className="space-y-1">
              {csmSummary.companiesAtRisk.map((company, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="opacity-80">{company.name}</span>
                  <span className="text-amber-300">{company.slaAtRisk} Bestellungen</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Admin-specific content
  const renderAdminContent = () => {
    if (!adminSummary) return null;

    return (
      <div 
        className={`space-y-4 mb-8 sm:mb-10 transition-all duration-1000 delay-400 ${
          animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserPlus className={`h-4 w-4 ${adminSummary.pendingRegistrations > 0 ? 'text-amber-300' : 'opacity-70'}`} />
              <span className="text-2xl sm:text-3xl font-light">{adminSummary.pendingRegistrations}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Offene Anträge</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{adminSummary.totalActiveUsers}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Aktive Benutzer</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building2 className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{adminSummary.totalCompanies}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Unternehmen</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-300 opacity-80" />
              <span className="text-2xl sm:text-3xl font-light">{adminSummary.recentLogins}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Logins (24h)</p>
          </div>
        </div>

        {/* Action items */}
        {adminSummary.pendingRegistrations > 0 && (
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-300" />
              <span className="text-sm">
                <strong>{adminSummary.pendingRegistrations}</strong> Benutzer warten auf Freigabe
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Operations-specific content
  const renderOpsContent = () => {
    if (!opsSummary) return null;

    return (
      <div 
        className={`space-y-4 mb-8 sm:mb-10 transition-all duration-1000 delay-400 ${
          animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Package className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{opsSummary.totalOpenOrders}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Offene Bestellungen</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-300 opacity-80" />
              <span className="text-2xl sm:text-3xl font-light">{opsSummary.ordersToday}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Eingänge heute</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Truck className="h-4 w-4 opacity-70" />
              <span className="text-2xl sm:text-3xl font-light">{opsSummary.shipmentsToday}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Versand heute</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className={`h-4 w-4 ${opsSummary.processingBacklog > 50 ? 'text-amber-300' : 'opacity-70'}`} />
              <span className="text-2xl sm:text-3xl font-light">{opsSummary.processingBacklog}</span>
            </div>
            <p className="text-xs sm:text-sm opacity-60">Backlog</p>
          </div>
        </div>

        {/* Processing metrics */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 opacity-70" />
              <span className="text-sm opacity-80">Ø Bearbeitungszeit</span>
            </div>
            <span className="text-lg font-light">{opsSummary.avgProcessingTime}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render customer content (original)
  // IMPORTANT: Metrics here should match PersonalizedGreeting for consistency
  const renderCustomerContent = () => {
    if (!summary) return null;

    return (
      <div 
        className={`grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10 transition-all duration-1000 delay-400 ${
          animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Orders Today - same as PersonalizedGreeting */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Package className="h-4 w-4 opacity-70" />
            <span className="text-2xl sm:text-3xl font-light">{summary.ordersToday}</span>
          </div>
          <p className="text-xs sm:text-sm opacity-60">Bestellungen heute</p>
        </div>
        
        {/* Shipped Today - same as PersonalizedGreeting */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Truck className="h-4 w-4 opacity-70" />
            <span className="text-2xl sm:text-3xl font-light">{summary.shippedToday}</span>
          </div>
          <p className="text-xs sm:text-sm opacity-60">Heute versendet</p>
        </div>
        
        {/* Open Orders - additional context */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="h-4 w-4 opacity-70" />
            <span className="text-2xl sm:text-3xl font-light">{summary.openOrders}</span>
          </div>
          <p className="text-xs sm:text-sm opacity-60">Offene Bestellungen</p>
        </div>
        
        {/* SLA Status */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-1">
            {summary.slaAtRisk > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-300 opacity-80" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-300 opacity-80" />
            )}
            <span className="text-2xl sm:text-3xl font-light">
              {summary.slaAtRisk > 0 ? summary.slaAtRisk : summary.slaOnTrack}
            </span>
          </div>
          <p className="text-xs sm:text-sm opacity-60">
            {summary.slaAtRisk > 0 ? 'SLA gefährdet' : 'SLA im Plan'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden touch-manipulation"
      style={{
        background: isMSDStaff 
          ? 'linear-gradient(135deg, hsl(220 60% 20%) 0%, hsl(200 50% 30%) 100%)'
          : brand.gradient,
      }}
      onClick={dismissWelcome}
    >
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5 animate-float"
            style={{
              width: `${Math.random() * 120 + 60}px`,
              height: `${Math.random() * 120 + 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 15 + 15}s`,
            }}
          />
        ))}
      </div>

      {/* Elegant radial glow */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: isMSDStaff
            ? `radial-gradient(ellipse at 50% 30%, hsl(175 60% 50% / 0.25) 0%, transparent 60%)`
            : `radial-gradient(ellipse at 50% 30%, hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness + 15}% / 0.25) 0%, transparent 60%)`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center text-white px-6 sm:px-8 max-w-lg sm:max-w-2xl w-full">
        {/* Brand/Logo display */}
        <div 
          className={`flex flex-col items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 transition-all duration-1000 ${
            animationStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {isMSDStaff ? (
            <>
              <span className="font-heading text-4xl sm:text-6xl md:text-7xl font-light tracking-wide">
                MS DIRECT
              </span>
              <div className="flex items-center gap-3 opacity-60">
                <div className="h-px w-8 bg-white/40" />
                <span className="text-xs sm:text-sm tracking-widest uppercase">{getRoleTitle()}</span>
                <div className="h-px w-8 bg-white/40" />
              </div>
            </>
          ) : (
            <>
              {brand.logoUrl ? (
                <img 
                  src={brand.logoUrl} 
                  alt={brand.name}
                  loading="lazy"
                  decoding="async"
                  className="h-16 sm:h-24 md:h-28 w-auto object-contain max-w-full"
                />
              ) : (
                <span 
                  className="font-heading text-4xl sm:text-6xl md:text-7xl font-light tracking-wide"
                  style={{ fontStyle: 'italic' }}
                >
                  {brand.logoText}
                </span>
              )}
              <div className="flex items-center gap-3 opacity-60">
                <div className="h-px w-8 bg-white/40" />
                <span className="text-xs sm:text-sm tracking-widest uppercase">× MS Direct</span>
                <div className="h-px w-8 bg-white/40" />
              </div>
            </>
          )}
        </div>

        {/* Welcome message */}
        <h1 
          className={`font-heading text-2xl sm:text-3xl md:text-4xl font-light mb-2 sm:mb-3 transition-all duration-1000 delay-200 ${
            animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Guten {new Date().getHours() < 12 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}
        </h1>

        {/* User name */}
        <p 
          className={`text-lg sm:text-xl md:text-2xl opacity-80 mb-6 sm:mb-8 font-light transition-all duration-1000 delay-300 ${
            animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {profile?.full_name || (isMSDStaff ? 'MS Direct Team' : brand.name)}
        </p>

        {/* Role-specific content */}
        {msdRole === 'msd_csm' && renderCSMContent()}
        {msdRole === 'system_admin' && renderAdminContent()}
        {msdRole === 'msd_ma' && renderOpsContent()}
        {!isMSDStaff && renderCustomerContent()}

        {/* Tagline */}
        <p 
          className={`text-sm sm:text-base opacity-50 mb-8 sm:mb-10 tracking-wide transition-all duration-1000 delay-500 ${
            animationStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {isMSDStaff ? 'Fulfillment Excellence • Every Day' : `${brand.tagline} • Fulfillment Hub`}
        </p>

        {/* CTA Button */}
        <div 
          className={`transition-all duration-1000 delay-600 ${
            animationStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              dismissWelcome();
            }}
            size="lg"
            className="bg-white/10 backdrop-blur-sm text-white border border-white/30 hover:bg-white hover:text-gray-900 font-medium text-sm sm:text-base px-8 sm:px-10 py-5 sm:py-6 rounded-none tracking-wide transition-all duration-500 active:scale-95"
          >
            {isMSDStaff ? 'Los geht\'s' : 'Zum Dashboard'}
            <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
        </div>

        {/* Skip hint */}
        <p 
          className={`mt-6 sm:mt-8 text-xs opacity-40 tracking-wider transition-all duration-1000 delay-700 ${
            animationStage >= 5 ? 'opacity-40' : 'opacity-0'
          }`}
        >
          Tippe um fortzufahren
        </p>
      </div>
    </div>
  );
}
