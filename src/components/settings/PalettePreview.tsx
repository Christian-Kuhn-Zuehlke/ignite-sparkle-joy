import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Package, BarChart3, Settings, Users, Bell } from "@/components/icons";

// Curated palettes from BrandingContext
const CURATED_PALETTES = {
  default: {
    name: 'Standard',
    description: 'Professionell & Vielseitig',
    keywords: ['logistics', 'fulfillment', 'warehouse'],
    sidebar: { h: 220, s: 60, l: 20 },
    accent: { h: 175, s: 60, l: 40 },
    sidebarHover: { h: 220, s: 50, l: 28 },
  },
  golf: {
    name: 'Golf',
    description: 'Elegantes Waldgrün',
    keywords: ['golf', 'fairway', 'green'],
    sidebar: { h: 150, s: 45, l: 18 },
    accent: { h: 140, s: 55, l: 45 },
    sidebarHover: { h: 150, s: 40, l: 25 },
  },
  fashion: {
    name: 'Fashion',
    description: 'Elegantes Anthrazit',
    keywords: ['mode', 'fashion', 'cashmere'],
    sidebar: { h: 0, s: 0, l: 15 },
    accent: { h: 340, s: 65, l: 55 },
    sidebarHover: { h: 0, s: 0, l: 22 },
  },
  jewelry: {
    name: 'Schmuck',
    description: 'Reiches Burgund & Gold',
    keywords: ['schmuck', 'diamant', 'gold'],
    sidebar: { h: 340, s: 40, l: 18 },
    accent: { h: 45, s: 70, l: 50 },
    sidebarHover: { h: 340, s: 35, l: 25 },
  },
  outdoor: {
    name: 'Outdoor',
    description: 'Natürliche Erdtöne',
    keywords: ['outdoor', 'hiking', 'nature'],
    sidebar: { h: 30, s: 35, l: 18 },
    accent: { h: 85, s: 50, l: 45 },
    sidebarHover: { h: 30, s: 30, l: 25 },
  },
  tech: {
    name: 'Tech',
    description: 'Modernes Dunkelblau',
    keywords: ['tech', 'software', 'digital'],
    sidebar: { h: 230, s: 50, l: 15 },
    accent: { h: 200, s: 90, l: 50 },
    sidebarHover: { h: 230, s: 45, l: 22 },
  },
  aviation: {
    name: 'Aviation',
    description: 'Stahlblau & Bernstein',
    keywords: ['aviation', 'flight', 'aerospace'],
    sidebar: { h: 210, s: 35, l: 20 },
    accent: { h: 35, s: 85, l: 50 },
    sidebarHover: { h: 210, s: 30, l: 27 },
  },
  kids: {
    name: 'Kids',
    description: 'Verspieltes Violett',
    keywords: ['kids', 'kinder', 'spielzeug'],
    sidebar: { h: 250, s: 45, l: 22 },
    accent: { h: 45, s: 90, l: 55 },
    sidebarHover: { h: 250, s: 40, l: 30 },
  },
};

const hsl = (color: { h: number; s: number; l: number }) => 
  `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

// Dark mode adjusted colors
const darkModeAdjust = (color: { h: number; s: number; l: number }) => ({
  h: color.h,
  s: Math.max(color.s - 10, 0),
  l: Math.max(color.l - 5, 5),
});

interface PaletteCardProps {
  id: string;
  palette: typeof CURATED_PALETTES.default;
  isDarkMode: boolean;
}

function MiniSidebar({ palette, isDarkMode }: { palette: typeof CURATED_PALETTES.default; isDarkMode: boolean }) {
  const sidebar = isDarkMode ? darkModeAdjust(palette.sidebar) : palette.sidebar;
  const hover = isDarkMode ? darkModeAdjust(palette.sidebarHover) : palette.sidebarHover;
  const accent = palette.accent;

  const menuItems = [
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Package, label: 'Orders', active: false },
    { icon: BarChart3, label: 'Analytics', active: false },
    { icon: Users, label: 'Users', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div 
      className="w-40 h-48 rounded-lg overflow-hidden flex flex-col"
      style={{ backgroundColor: hsl(sidebar) }}
    >
      {/* Header */}
      <div className="p-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: hsl(accent) }}
          >
            {palette.name.charAt(0)}
          </div>
          <span className="text-white/90 text-xs font-medium truncate">
            {palette.name} Co
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 p-1.5 space-y-0.5">
        {menuItems.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors"
            style={{ 
              backgroundColor: item.active ? hsl(hover) : 'transparent',
              color: item.active ? 'white' : 'rgba(255,255,255,0.7)'
            }}
          >
            <item.icon className="w-3 h-3" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-white/20" />
          <span className="text-white/60 text-xs">Admin</span>
        </div>
      </div>
    </div>
  );
}

function AccentPreview({ palette }: { palette: typeof CURATED_PALETTES.default }) {
  return (
    <div className="flex flex-col gap-2 justify-center">
      <Button 
        size="sm" 
        className="text-xs h-7"
        style={{ 
          backgroundColor: hsl(palette.accent),
          color: 'white'
        }}
      >
        <Bell className="w-3 h-3 mr-1" />
        Primary CTA
      </Button>
      <Badge 
        className="text-xs justify-center"
        style={{ 
          backgroundColor: `hsl(${palette.accent.h}, ${palette.accent.s}%, ${palette.accent.l}%, 0.15)`,
          color: hsl(palette.accent),
          border: `1px solid hsl(${palette.accent.h}, ${palette.accent.s}%, ${palette.accent.l}%, 0.3)`
        }}
      >
        Status Badge
      </Badge>
      <div 
        className="h-1 rounded-full"
        style={{ backgroundColor: hsl(palette.accent) }}
      />
    </div>
  );
}

function PaletteCard({ palette, isDarkMode }: Omit<PaletteCardProps, 'id'>) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{palette.name}</span>
          <span className="text-xs text-muted-foreground font-normal">
            {palette.description}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex gap-4">
          <MiniSidebar palette={palette} isDarkMode={isDarkMode} />
          <AccentPreview palette={palette} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {palette.keywords.map((kw) => (
            <Badge key={kw} variant="outline" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PalettePreviewProps {
  isDarkMode?: boolean;
}

export function PalettePreview({ isDarkMode = false }: PalettePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Kuratierte Industry-Paletten
        </h2>
        <Badge variant={isDarkMode ? "secondary" : "outline"}>
          {isDarkMode ? "Dark Mode" : "Light Mode"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(CURATED_PALETTES).map(([paletteId, palette]) => (
          <PaletteCard
            key={paletteId}
            palette={palette}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
}

export function PalettePreviewDual() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Branding Paletten Vorschau</h1>
        <p className="text-muted-foreground">
          Alle kuratierten Paletten werden automatisch basierend auf Industry-Keywords zugewiesen.
          Die Sidebar nutzt immer die kuratierte Palette für optimale Lesbarkeit.
        </p>
      </div>
      
      {/* Light Mode Preview */}
      <div className="p-4 bg-background rounded-xl border">
        <PalettePreview isDarkMode={false} />
      </div>
      
      {/* Dark Mode Preview */}
      <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
        <div className="dark">
          <PalettePreview isDarkMode={true} />
        </div>
      </div>
    </div>
  );
}
