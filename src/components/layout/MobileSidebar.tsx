import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  RotateCcw,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  PackageOpen,
  Users,
  Target,
  Brain,
  Briefcase,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CompanySwitcher } from './CompanySwitcher';
import { useFeatureToggles, FEATURE_KEYS } from '@/hooks/useFeatureToggles';
import { useState } from 'react';

// Golf-inspired icons for Golfyr branding
function GolfBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="8" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="11" cy="13" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function GolfFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="20" rx="6" ry="2" />
      <path d="M12 4 L12 20" />
      <path d="M12 4 L20 7 L12 10" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function GolfClubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 21 L12 8" />
      <path d="M12 8 L18 4" />
      <circle cx="18" cy="4" r="2" />
    </svg>
  );
}

function GolfTeeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 8 L12 20" />
      <path d="M9 20 L15 20" />
      <circle cx="12" cy="5" r="3" />
    </svg>
  );
}

type NavItem = {
  nameKey: string;
  href: string;
  icon: LucideIcon | React.FC<{ className?: string }>;
  golfIcon?: React.FC<{ className?: string }>;
  badgeKey?: string;
  featureKey?: string;
  children?: NavItem[];
};

// Base navigation items matching Desktop Sidebar - complete navigation
const mainNavigation: NavItem[] = [
  { nameKey: 'nav.orders', href: '/orders', icon: Package, golfIcon: GolfBallIcon },
  { nameKey: 'nav.inbound', href: '/inbound', icon: PackageOpen },
  { nameKey: 'nav.inventory', href: '/inventory', icon: Warehouse, golfIcon: GolfClubIcon },
  { nameKey: 'nav.returns', href: '/returns', icon: RotateCcw, golfIcon: GolfTeeIcon },
  { nameKey: 'nav.clarificationCases', href: '/clarification-cases', icon: AlertTriangle },
  { nameKey: 'nav.quality', href: '/quality', icon: ShieldCheck, featureKey: FEATURE_KEYS.QUALITY_DASHBOARD },
  { nameKey: 'nav.packaging', href: '/packaging', icon: PackageCheck, featureKey: FEATURE_KEYS.PACKAGING_DASHBOARD },
  { nameKey: 'nav.customers', href: '/customer-cockpit', icon: Users },
  { nameKey: 'nav.aiHub', href: '/ai', icon: Brain, badgeKey: 'common.new' },  // No feature key - always visible
  // Intelligence section with sub-items
  { 
    nameKey: 'nav.intelligence', 
    href: '/abc-analysis', 
    icon: Lightbulb,
    children: [
      { nameKey: 'nav.abcAnalysis', href: '/abc-analysis', icon: BarChart3 },
      { nameKey: 'nav.forecast', href: '/forecast', icon: TrendingUp },
      { nameKey: 'nav.kpis', href: '/kpis', icon: Target },
    ]
  },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const { profile, role, signOut, getRoleLabel, memberships, activeCompanyName, hasRole, isMsdStaff } = useAuth();
  const { brand, isCustomBranded } = useBranding();
  const { t } = useLanguage();
  const { isFeatureEnabled } = useFeatureToggles();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Build navigation dynamically based on roles (like Desktop Sidebar)
  const isMsdExecutive = hasRole('msd_management') || hasRole('system_admin');
  
  const dashboardNav: NavItem = isMsdExecutive
    ? { nameKey: 'nav.executive', href: '/executive', icon: Briefcase }
    : { nameKey: 'nav.dashboard', href: '/', icon: LayoutDashboard, golfIcon: GolfFlagIcon };
  
  // Filter navigation based on feature toggles
  const userIsMsdStaff = isMsdStaff();
  const filteredNavigation = mainNavigation.filter((item) => {
    if (userIsMsdStaff) return true;
    if (!item.featureKey) return true;
    return isFeatureEnabled(item.featureKey);
  });
  
  const navigation: NavItem[] = [dashboardNav, ...filteredNavigation];

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };
  
  const toggleSection = (nameKey: string) => {
    setExpandedSections(prev => 
      prev.includes(nameKey) 
        ? prev.filter(k => k !== nameKey)
        : [...prev, nameKey]
    );
  };

  const displayCompany = activeCompanyName || profile?.company_name || 'Unbekannt';
  const displayRole = role ? getRoleLabel(role) : 'Laden...';
  const initials = displayCompany.substring(0, 2).toUpperCase();
  
  // Show company switcher for users with multiple memberships or MSD staff
  const showCompanySwitcher = memberships.length > 1 || role === 'msd_csm' || role === 'msd_ma' || role === 'system_admin';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-72 p-0 border-r-0"
        hideCloseButton
        style={{
          background: isCustomBranded 
            ? `hsl(${brand.primaryHue} ${brand.primarySaturation}% ${brand.primaryLightness}%)`
            : 'hsl(var(--sidebar))',
        }}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border/30 px-4">
            <div className="flex items-center gap-3">
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background: isCustomBranded 
                    ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)`
                    : 'hsl(var(--sidebar-primary))',
                }}
              >
                {brand.iconTheme === 'golf' ? (
                  <GolfBallIcon className="h-4 w-4 text-white" />
                ) : (
                  <Package className="h-4 w-4 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-white">
                    {isCustomBranded ? brand.logoText : 'MS DIRECT'}
                  </span>
                  {isCustomBranded && (
                    <Sparkles className="h-3 w-3 text-white/70 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                  {isCustomBranded ? '× Fulfillment Hub' : 'Fulfillment Hub'}
                </span>
              </div>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {/* Company Switcher */}
            {showCompanySwitcher && (
              <div className="border-b border-sidebar-border/30 px-4 py-3">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {t('nav.activeCustomer')}
                </p>
                <CompanySwitcher />
              </div>
            )}

            {/* User Info */}
            <div className="border-b border-sidebar-border/30 px-4 py-3">
              <div 
                className="flex items-center gap-3 rounded-lg px-3 py-2"
                style={{
                  background: isCustomBranded 
                    ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.2)`
                    : 'hsl(var(--sidebar-accent) / 0.5)'
                }}
              >
                <div 
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{
                    background: isCustomBranded 
                      ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.4)`
                      : 'hsl(var(--sidebar-primary) / 0.3)',
                  }}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {displayCompany}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {displayRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1 px-3 py-3">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {t('nav.navigation')}
              </p>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                const hasChildren = item.children && item.children.length > 0;
                const isChildActive = hasChildren && item.children?.some(child => 
                  location.pathname === child.href || location.pathname.startsWith(child.href)
                );
                const isExpanded = expandedSections.includes(item.nameKey) || isActive || isChildActive;
                const IconComponent = brand.iconTheme === 'golf' && item.golfIcon ? item.golfIcon : item.icon;
                const badge = item.badgeKey ? t(item.badgeKey) : undefined;
                
                return (
                  <div key={item.nameKey}>
                    {hasChildren ? (
                      // Collapsible section
                      <button
                        onClick={() => toggleSection(item.nameKey)}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          (isActive || isChildActive)
                            ? 'bg-white/20 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <IconComponent className={cn(
                          'h-5 w-5 transition-colors',
                          (isActive || isChildActive) ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                        )} />
                        <span className="flex-1 text-left">{t(item.nameKey)}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-white" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white/50" />
                        )}
                      </button>
                    ) : (
                      // Regular link
                      <Link
                        to={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <IconComponent className={cn(
                          'h-5 w-5 transition-colors',
                          isActive ? 'text-white' : 'text-white/50 group-hover:text-white/70'
                        )} />
                        <span className="flex-1">{t(item.nameKey)}</span>
                        {badge && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                            {badge}
                          </span>
                        )}
                      </Link>
                    )}
                    
                    {/* Sub-items */}
                    {hasChildren && isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-4">
                        {item.children?.map((child) => {
                          const isChildItemActive = location.pathname === child.href;
                          const ChildIcon = child.icon;
                          
                          return (
                            <Link
                              key={child.nameKey}
                              to={child.href}
                              onClick={() => onOpenChange(false)}
                              className={cn(
                                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                                isChildItemActive
                                  ? 'bg-white/15 text-white'
                                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                              )}
                            >
                              <ChildIcon className={cn(
                                'h-4 w-4 flex-shrink-0 transition-colors',
                                isChildItemActive ? 'text-white' : 'text-white/50 group-hover:text-white'
                              )} />
                              <span className="flex-1">{t(child.nameKey)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Secondary Navigation - Fixed at bottom */}
          <div className="shrink-0 border-t border-sidebar-border/30 px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Link
              to="/settings"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5 text-white/50" />
              <span>{t('nav.settings')}</span>
            </Link>
            <button 
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-5 w-5 text-white/50" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MobileMenuTrigger({ onClick }: { onClick: () => void }) {
  const { brand, isCustomBranded } = useBranding();
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onClick}
      className="md:hidden"
      style={{
        color: isCustomBranded ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)` : undefined
      }}
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
}
