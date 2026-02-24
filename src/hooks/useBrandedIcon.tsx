import { useBranding, IconTheme } from '@/contexts/BrandingContext';
import { 
  Package, 
  Mountain,
  Cpu,
  Plane,
  ShoppingBag,
  Leaf,
  TreePine,
} from 'lucide-react';


// ============================================
// Custom SVG icons for each theme
// ============================================

// Golf Icons
export function GolfBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="9" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="14" cy="8" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="11" cy="13" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="16" cy="13" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="7" cy="14" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="17" r="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function GolfFlagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="21" rx="5" ry="1.5" opacity="0.4" fill="currentColor" />
      <path d="M12 5 L12 21" />
      <path d="M12 5 L19 8 L12 11 Z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function GolfClubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 20 L14 6" />
      <path d="M14 6 L17 3 C18 2 20 2 21 3 C22 4 22 6 21 7 L18 10 L14 6" fill="currentColor" opacity="0.2" />
      <circle cx="4" cy="21" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function GolfTeeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 10 L12 21" />
      <path d="M9 21 L15 21" />
      <circle cx="12" cy="6" r="4" />
      <circle cx="10" cy="5" r="0.8" fill="currentColor" opacity="0.4" />
      <circle cx="14" cy="6" r="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// Jewelry Icons (for Aviano - Schmuck)
export function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3 L18 3 L22 9 L12 21 L2 9 L6 3" />
      <path d="M2 9 L22 9" />
      <path d="M12 3 L12 9" opacity="0.5" />
      <path d="M6 3 L9 9 L12 21" opacity="0.4" />
      <path d="M18 3 L15 9 L12 21" opacity="0.4" />
    </svg>
  );
}

export function RingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="15" rx="8" ry="5" />
      <ellipse cx="12" cy="15" rx="5" ry="3" opacity="0.4" />
      <path d="M10 6 L12 3 L14 6 L12 10 L10 6" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="5" r="2" />
    </svg>
  );
}

export function NecklaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 6 C4 12 8 16 12 20 C16 16 20 12 20 6" />
      <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

export function EarringIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8 L12 12" />
      <path d="M8 14 L16 14 L14 20 L10 20 L8 14" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="17" r="2" />
    </svg>
  );
}

// Fashion Icons (for GetSA - Kaschmir/Kleider)
// Dashboard - Sweater with V-neck pattern
export function SweaterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 4 L4 8 L4 11 L7 11 L7 20 L17 20 L17 11 L20 11 L20 8 L16 4" />
      <path d="M8 4 C8 4 10 6 12 6 C14 6 16 4 16 4" />
      {/* V-neck pattern */}
      <path d="M12 6 L12 12" opacity="0.4" strokeWidth="1.5" />
      <path d="M10 8 L12 10 L14 8" opacity="0.4" strokeWidth="1.5" />
    </svg>
  );
}

// Orders - Shopping bag with hanger
export function FashionBagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 6 L6 20 C6 21 7 22 8 22 L16 22 C17 22 18 21 18 20 L18 6" />
      <path d="M4 6 L20 6" />
      <path d="M9 6 L9 4 C9 2.5 10.5 2 12 2 C13.5 2 15 2.5 15 4 L15 6" />
      {/* Ribbon/bow */}
      <path d="M10 10 L12 12 L14 10" opacity="0.5" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

// Inventory - Clothing rack
export function ClothingRackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Rack frame */}
      <path d="M4 4 L20 4" />
      <path d="M6 4 L6 20" />
      <path d="M18 4 L18 20" />
      <path d="M4 20 L8 20" />
      <path d="M16 20 L20 20" />
      {/* Hangers with clothes */}
      <path d="M9 4 L9 7 L11 9 L13 9 L15 7 L15 4" opacity="0.5" />
      <path d="M10 9 L10 14 L14 14 L14 9" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

// Returns - Garment with return arrow
export function GarmentReturnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* T-shirt outline */}
      <path d="M9 3 L6 6 L6 8 L8 8 L8 14 L16 14 L16 8 L18 8 L18 6 L15 3" />
      <path d="M9 3 C9 3 10.5 4 12 4 C13.5 4 15 3 15 3" />
      {/* Return arrow */}
      <path d="M6 18 L4 20 L6 22" />
      <path d="M4 20 L12 20 C15 20 17 18 17 16" />
    </svg>
  );
}

// Legacy - Cashmere sweater (now an alias)
export function CashmereIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 4 L4 8 L4 11 L7 11 L7 20 L17 20 L17 11 L20 11 L20 8 L16 4" />
      <path d="M8 4 C8 4 10 6 12 6 C14 6 16 4 16 4" />
      {/* Soft wavy lines for cashmere texture */}
      <path d="M9 12 Q10 11 11 12 Q12 13 13 12 Q14 11 15 12" opacity="0.4" strokeWidth="1.5" />
      <path d="M9 15 Q10 14 11 15 Q12 16 13 15 Q14 14 15 15" opacity="0.4" strokeWidth="1.5" />
    </svg>
  );
}

// Legacy - T-shirt (now an alias)
export function TshirtIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3 L4 6 L4 9 L7 9 L7 21 L17 21 L17 9 L20 9 L20 6 L16 3" />
      <path d="M8 3 C8 3 10 5 12 5 C14 5 16 3 16 3" />
    </svg>
  );
}

// Kids/Outdoor Icons (for Namuk)
export function KidsJacketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 4 L3 7 L3 10 L5 10 L5 20 L19 20 L19 10 L21 10 L21 7 L17 4" />
      <path d="M7 4 C7 4 9 6 12 6 C15 6 17 4 17 4" />
      {/* Hood */}
      <path d="M5 4 Q5 2 7 2 L17 2 Q19 2 19 4" opacity="0.5" />
      {/* Zipper */}
      <path d="M12 6 L12 20" strokeWidth="1.5" />
      {/* Pocket */}
      <rect x="6" y="13" width="4" height="3" rx="0.5" opacity="0.3" fill="currentColor" />
      <rect x="14" y="13" width="4" height="3" rx="0.5" opacity="0.3" fill="currentColor" />
    </svg>
  );
}

export function SnowflakeKidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2 L12 22" />
      <path d="M2 12 L22 12" />
      <path d="M5 5 L19 19" />
      <path d="M19 5 L5 19" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
      {/* Small branches */}
      <path d="M12 5 L10 7 M12 5 L14 7" strokeWidth="1.5" />
      <path d="M12 19 L10 17 M12 19 L14 17" strokeWidth="1.5" />
      <path d="M5 12 L7 10 M5 12 L7 14" strokeWidth="1.5" />
      <path d="M19 12 L17 10 M19 12 L17 14" strokeWidth="1.5" />
    </svg>
  );
}

export function BackpackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="7" width="14" height="14" rx="3" />
      <path d="M8 7 L8 5 C8 3 10 2 12 2 C14 2 16 3 16 5 L16 7" />
      <rect x="8" y="11" width="8" height="5" rx="1" opacity="0.3" fill="currentColor" />
      <path d="M5 15 L3 15 L3 18 L5 18" />
      <path d="M19 15 L21 15 L21 18 L19 18" />
    </svg>
  );
}

export function MountainKidsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 20 L8 10 L12 14 L18 6 L22 20 Z" />
      <path d="M18 6 L15 11 L18 14" opacity="0.4" fill="currentColor" />
      {/* Sun */}
      <circle cx="5" cy="5" r="2" fill="currentColor" opacity="0.3" />
      <path d="M5 1 L5 2 M5 8 L5 9 M1 5 L2 5 M8 5 L9 5" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

// Outdoor Icons (generic)
export function MountainLeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 20 L10 8 L14 13 L21 3" />
      <path d="M21 3 L17 3 L21 7" />
      <path d="M3 20 L21 20" />
      <path d="M17 20 C17 16 14 14 12 14 C12 18 14 20 17 20" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

// ============================================
// Icon configuration per theme
// ============================================

interface ThemedIcons {
  logo: React.FC<{ className?: string }>;
  dashboard: React.FC<{ className?: string }>;
  orders: React.FC<{ className?: string }>;
  inventory: React.FC<{ className?: string }>;
  returns: React.FC<{ className?: string }>;
}

const themeIcons: Record<IconTheme, ThemedIcons> = {
  default: {
    logo: ({ className }) => <Package className={className} />,
    dashboard: ({ className }) => <Package className={className} />,
    orders: ({ className }) => <ShoppingBag className={className} />,
    inventory: ({ className }) => <Package className={className} />,
    returns: ({ className }) => <Package className={className} />,
  },
  golf: {
    logo: GolfBallIcon,
    dashboard: GolfFlagIcon,
    orders: GolfBallIcon,
    inventory: GolfClubIcon,
    returns: GolfTeeIcon,
  },
  fashion: {
    logo: CashmereIcon,
    dashboard: SweaterIcon,
    orders: FashionBagIcon,
    inventory: ClothingRackIcon,
    returns: GarmentReturnIcon,
  },
  jewelry: {
    logo: DiamondIcon,
    dashboard: DiamondIcon,
    orders: RingIcon,
    inventory: NecklaceIcon,
    returns: EarringIcon,
  },
  outdoor: {
    logo: ({ className }) => <Mountain className={className} />,
    dashboard: MountainLeafIcon,
    orders: ({ className }) => <Leaf className={className} />,
    inventory: ({ className }) => <TreePine className={className} />,
    returns: ({ className }) => <Mountain className={className} />,
  },
  kids: {
    logo: KidsJacketIcon,
    dashboard: MountainKidsIcon,
    orders: BackpackIcon,
    inventory: SnowflakeKidIcon,
    returns: KidsJacketIcon,
  },
  tech: {
    logo: ({ className }) => <Cpu className={className} />,
    dashboard: ({ className }) => <Cpu className={className} />,
    orders: ({ className }) => <ShoppingBag className={className} />,
    inventory: ({ className }) => <Cpu className={className} />,
    returns: ({ className }) => <Package className={className} />,
  },
  aviation: {
    logo: ({ className }) => <Plane className={className} />,
    dashboard: ({ className }) => <Plane className={className} />,
    orders: ({ className }) => <ShoppingBag className={className} />,
    inventory: ({ className }) => <Package className={className} />,
    returns: ({ className }) => <Package className={className} />,
  },
};

// ============================================
// Hook to get branded icons
// ============================================

export function useBrandedIcons() {
  const { brand } = useBranding();
  const theme = brand.iconTheme;
  const icons = themeIcons[theme] || themeIcons.default;
  
  return {
    LogoIcon: icons.logo,
    DashboardIcon: icons.dashboard,
    OrdersIcon: icons.orders,
    InventoryIcon: icons.inventory,
    ReturnsIcon: icons.returns,
    iconTheme: theme,
  };
}

// ============================================
// Branded icon components for direct use
// ============================================

export const BrandedIcons = {
  Logo: ({ className, theme }: { className?: string; theme?: IconTheme }) => {
    const icons = themeIcons[theme || 'default'];
    const Icon = icons.logo;
    return <Icon className={className} />;
  },
  
  Dashboard: ({ className, theme }: { className?: string; theme?: IconTheme }) => {
    const icons = themeIcons[theme || 'default'];
    const Icon = icons.dashboard;
    return <Icon className={className} />;
  },
  
  Orders: ({ className, theme }: { className?: string; theme?: IconTheme }) => {
    const icons = themeIcons[theme || 'default'];
    const Icon = icons.orders;
    return <Icon className={className} />;
  },
  
  Inventory: ({ className, theme }: { className?: string; theme?: IconTheme }) => {
    const icons = themeIcons[theme || 'default'];
    const Icon = icons.inventory;
    return <Icon className={className} />;
  },
  
  Returns: ({ className, theme }: { className?: string; theme?: IconTheme }) => {
    const icons = themeIcons[theme || 'default'];
    const Icon = icons.returns;
    return <Icon className={className} />;
  },
};
