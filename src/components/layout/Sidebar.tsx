import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RotateCcw,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  Target,
  Brain,
  Briefcase,
  PackageOpen,
  Users,
  ShieldCheck,
  PackageCheck,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Clock,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useBrandedIcons } from '@/hooks/useBrandedIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeatureToggles, FEATURE_KEYS } from '@/hooks/useFeatureToggles';


type NavItem = {
  nameKey: string;
  displayName: string;
  href: string;
  iconKey: 'dashboard' | 'orders' | 'inventory' | 'returns' | null;
  fallbackIcon?: React.FC<{ className?: string }>;
  badgeKey?: string;
  featureKey?: string; // Optional feature toggle key
  children?: NavItem[]; // Sub-items for nested navigation
};

// Static navigation is now built dynamically in the component based on role

// Define static key for navigation label
const NAV_LABEL_KEY = 'nav.navigation';

// localStorage key for persisting collapse state
const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

export function Sidebar() {
  const location = useLocation();
  const { profile, roles, signOut, activeCompanyName, hasRole, isMsdStaff } = useAuth();
  const { brand, isCustomBranded } = useBranding();
  const { LogoIcon, DashboardIcon, OrdersIcon, InventoryIcon, ReturnsIcon, iconTheme } = useBrandedIcons();
  const { t } = useLanguage();
  const { isFeatureEnabled } = useFeatureToggles();

  // Collapse state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // localStorage not available (private browsing, etc.)
      }
      return next;
    });
  };

  // Build navigation dynamically based on roles (multi-role aware)
  // MSD Management/System Admin see Executive Dashboard instead of regular Dashboard
  const isMsdExecutive = hasRole('msd_management') || hasRole('system_admin');

  // Executive users get Executive Dashboard, others get regular Dashboard
  const dashboardNav: NavItem = isMsdExecutive
    ? { nameKey: 'nav.executive', displayName: 'Executive', href: '/executive', iconKey: 'dashboard', fallbackIcon: Briefcase }
    : { nameKey: 'nav.dashboard', displayName: 'Dashboard', href: '/dashboard', iconKey: 'dashboard', fallbackIcon: LayoutDashboard };

  const mainNavigation: NavItem[] = [
    { nameKey: 'nav.orders', displayName: 'Orders', href: '/orders', iconKey: 'orders', fallbackIcon: Package, featureKey: FEATURE_KEYS.NAV_ORDERS },
    { nameKey: 'nav.inbound', displayName: 'Inbound', href: '/inbound', iconKey: null, fallbackIcon: PackageOpen, featureKey: FEATURE_KEYS.NAV_INBOUND },
    { nameKey: 'nav.inventory', displayName: 'Inventory', href: '/inventory', iconKey: 'inventory', fallbackIcon: Warehouse, featureKey: FEATURE_KEYS.NAV_INVENTORY },
    { nameKey: 'nav.returns', displayName: 'Returns', href: '/returns', iconKey: 'returns', fallbackIcon: RotateCcw, featureKey: FEATURE_KEYS.NAV_RETURNS },
    { nameKey: 'nav.clarificationCases', displayName: 'Klärfälle', href: '/clarification-cases', iconKey: null, fallbackIcon: AlertTriangle, featureKey: FEATURE_KEYS.NAV_CLARIFICATION },
    { nameKey: 'nav.quality', displayName: 'Qualität', href: '/quality', iconKey: null, fallbackIcon: ShieldCheck, featureKey: FEATURE_KEYS.NAV_QUALITY },
    { nameKey: 'nav.packaging', displayName: 'Packaging', href: '/packaging', iconKey: null, fallbackIcon: PackageCheck, featureKey: FEATURE_KEYS.NAV_PACKAGING },
    { nameKey: 'nav.customers', displayName: 'Kunden', href: '/customer-cockpit', iconKey: null, fallbackIcon: Users, featureKey: FEATURE_KEYS.NAV_CUSTOMERS },
    { nameKey: 'nav.aiHub', displayName: 'AI Hub', href: '/ai', iconKey: null, fallbackIcon: Brain, badgeKey: 'common.new', featureKey: FEATURE_KEYS.NAV_AI_HUB },
    // Intelligence section at the end with KPIs as sub-item
    {
      nameKey: 'nav.intelligence',
      displayName: 'Intelligence',
      href: '/abc-analysis',
      iconKey: null,
      fallbackIcon: Lightbulb,
      featureKey: FEATURE_KEYS.NAV_INTELLIGENCE,
      children: [
        { nameKey: 'nav.abcAnalysis', displayName: 'ABC-Analyse', href: '/abc-analysis', iconKey: null, fallbackIcon: BarChart3 },
        { nameKey: 'nav.aging', displayName: 'Aging', href: '/order-aging', iconKey: null, fallbackIcon: Clock },
        { nameKey: 'nav.forecast', displayName: 'Prognosen', href: '/forecast', iconKey: null, fallbackIcon: TrendingUp },
        { nameKey: 'nav.kpis', displayName: 'KPIs', href: '/kpis', iconKey: null, fallbackIcon: Target },
      ]
    },
  ];

  // Filter navigation based on feature toggles for non-MSD users
  const userIsMsdStaff = isMsdStaff();
  const filteredNavigation = mainNavigation.filter((item) => {
    // MSD staff always sees all navigation items
    if (userIsMsdStaff) return true;

    // If no feature key, always show
    if (!item.featureKey) return true;

    // Check if feature is enabled for this company
    return isFeatureEnabled(item.featureKey);
  });

  const navigation: NavItem[] = [
    dashboardNav,
    ...filteredNavigation,
  ];

  // Map icon keys to actual icon components
  const iconMap = {
    dashboard: DashboardIcon,
    orders: OrdersIcon,
    inventory: InventoryIcon,
    returns: ReturnsIcon,
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Use active company name or profile company name
  const displayCompany = activeCompanyName || profile?.company_name || t('common.unknown');

  // Display all roles for multi-role users using translations
  const displayRoles = roles.length > 0
    ? roles.map(r => t(`roles.${r}`)).join(' + ')
    : t('common.loading');

  const initials = displayCompany.substring(0, 2).toUpperCase();

  // Check if we have custom branded icons
  const hasCustomIcons = iconTheme !== 'default';

  // Is the settings route active?
  const isSettingsActive = location.pathname === '/settings';

  return (
    <div
      className={cn(
        'flex h-screen flex-col bg-sidebar transition-all duration-300 overflow-hidden',
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
      )}
    >
      {/* ── Logo ── clickable Home Button */}
      <Link
        to={isMsdExecutive ? '/executive' : '/dashboard'}
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-sidebar-border hover:bg-white/5 transition-all duration-200 group',
          isCollapsed ? 'justify-center px-0' : 'gap-3 px-6'
        )}
        title={t('nav.dashboard')}
      >
        {/* Icon square — always visible */}
        {brand.logoUrl && !isCollapsed ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            loading="lazy"
            decoding="async"
            className="h-8 max-w-[140px] object-contain group-hover:scale-105 transition-transform duration-200"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        ) : (
          <>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary transition-all duration-500 group-hover:scale-105"
            >
              {hasCustomIcons ? (
                <LogoIcon className="h-5 w-5 text-sidebar-primary-foreground" />
              ) : (
                <Package className="h-5 w-5 text-sidebar-primary-foreground" />
              )}
            </div>
            {/* Text block — expanded only */}
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-sidebar-foreground truncate">
                    {isCustomBranded ? brand.logoText : 'MS DIRECT'}
                  </span>
                  {isCustomBranded && (
                    <Sparkles className="h-3 w-3 text-sidebar-primary animate-pulse shrink-0" />
                  )}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  {isCustomBranded ? '× Fulfillment Hub' : 'Fulfillment Hub'}
                </span>
              </div>
            )}
          </>
        )}
      </Link>

      {/* ── User Info ── */}
      <div
        className={cn(
          'border-b border-sidebar-border py-4 shrink-0',
          isCollapsed ? 'flex justify-center px-0' : 'px-4'
        )}
      >
        <div
          className={cn(
            'flex items-center rounded-lg transition-colors duration-500',
            !isCollapsed && 'gap-3 px-3 py-2.5'
          )}
          style={
            !isCollapsed
              ? {
                  background: isCustomBranded
                    ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.15)`
                    : 'hsl(var(--sidebar-accent) / 0.5)'
                }
              : undefined
          }
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-500"
            title={isCollapsed ? `${displayCompany} — ${displayRoles}` : undefined}
            style={{
              background: isCustomBranded
                ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.3)`
                : 'hsl(var(--sidebar-primary) / 0.2)',
              color: 'hsl(var(--sidebar-primary))'
            }}
          >
            {initials}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {displayCompany}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60" title={displayRoles}>
                {displayRoles}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Navigation — Scrollable ── */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-0">
          {/* Category label — expanded only */}
          {!isCollapsed && (
            <p className="mb-2 px-6 text-sm font-normal text-white/40">
              {t(NAV_LABEL_KEY)}
            </p>
          )}

          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children?.some(child =>
              location.pathname === child.href || location.pathname.startsWith(child.href)
            );
            const isExpanded = isActive || isChildActive;

            // ALWAYS use branded icons when available for the iconKey
            const IconComponent = item.iconKey
              ? iconMap[item.iconKey]
              : item.fallbackIcon || LayoutDashboard;

            // Get translated name
            const displayName = t(item.nameKey);
            const badge = item.badgeKey ? t(item.badgeKey) : undefined;

            return (
              <div key={item.nameKey}>
                <Link
                  to={item.href}
                  title={isCollapsed ? displayName : undefined}
                  className={cn(
                    'group flex h-14 w-full items-center transition-all duration-200',
                    isCollapsed ? 'justify-center px-6' : 'gap-4 pl-6 pr-4',
                    (isActive || isChildActive)
                      ? 'bg-white/10 text-white'
                      : 'border-b border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <IconComponent className={cn(
                    'h-6 w-6 shrink-0 transition-colors',
                    (isActive || isChildActive) ? 'text-white' : 'text-white/70 group-hover:text-white'
                  )} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-base whitespace-nowrap overflow-hidden font-normal">
                        {displayName}
                      </span>
                      {badge && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shrink-0">
                          {badge}
                        </span>
                      )}
                      {hasChildren ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
                        )
                      ) : (
                        isActive && <ChevronRight className="h-4 w-4 shrink-0 text-white" />
                      )}
                    </>
                  )}
                </Link>

                {/* Sub-items — only render when expanded sidebar AND section is open */}
                {hasChildren && isExpanded && !isCollapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-4">
                    {item.children?.map((child) => {
                      const isChildItemActive = location.pathname === child.href;
                      const ChildIcon = child.fallbackIcon || LayoutDashboard;
                      const childDisplayName = t(child.nameKey);

                      return (
                        <Link
                          key={child.nameKey}
                          to={child.href}
                          className={cn(
                            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            isChildItemActive
                              ? 'bg-white/15 text-white'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <ChildIcon className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isChildItemActive ? 'text-white' : 'text-white/60 group-hover:text-white'
                          )} />
                          <span className="flex-1">{childDisplayName}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Secondary Navigation ── */}
      <div className="border-t border-sidebar-border shrink-0">
        {/* Settings */}
        <Link
          to="/settings"
          title={isCollapsed ? t('nav.settings') : undefined}
          className={cn(
            'group flex h-14 w-full items-center transition-colors hover:bg-white/10',
            isCollapsed ? 'justify-center px-6' : 'gap-4 pl-6 pr-4',
            isSettingsActive
              ? 'bg-white/10 text-white'
              : 'border-b border-white/10 text-white/70 hover:text-white'
          )}
        >
          <Settings className={cn(
            'h-6 w-6 shrink-0 transition-colors',
            isSettingsActive ? 'text-white' : 'text-white/70 group-hover:text-white'
          )} />
          {!isCollapsed && (
            <span className="flex-1 text-base font-normal whitespace-nowrap overflow-hidden">
              {t('nav.settings')}
            </span>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={handleSignOut}
          title={isCollapsed ? t('auth.logout') : undefined}
          className={cn(
            'group flex h-14 w-full items-center transition-colors hover:bg-white/10',
            isCollapsed ? 'justify-center px-6' : 'gap-4 pl-6 pr-4',
            'border-b border-white/10 text-white/70 hover:text-white'
          )}
        >
          <LogOut className="h-6 w-6 shrink-0 text-white/70 group-hover:text-white transition-colors" />
          {!isCollapsed && (
            <span className="flex-1 text-base font-normal whitespace-nowrap overflow-hidden">
              {t('auth.logout')}
            </span>
          )}
        </button>

        {/* Collapse / Expand toggle — Figma "Collapse menu" button */}
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? t('nav.expandMenu') : undefined}
          aria-label={isCollapsed ? t('nav.expandMenu') : t('nav.collapseMenu')}
          className={cn(
            'group flex h-14 w-full items-center transition-colors hover:bg-white/10 text-white/70 hover:text-white',
            isCollapsed ? 'justify-center px-6' : 'gap-4 pl-6 pr-4'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-6 w-6 shrink-0 transition-colors group-hover:text-white" />
          ) : (
            <>
              <ChevronLeft className="h-6 w-6 shrink-0 transition-colors group-hover:text-white" />
              <span className="flex-1 text-base font-normal whitespace-nowrap overflow-hidden">
                {t('nav.collapseMenu')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
