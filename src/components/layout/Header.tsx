import { useState } from 'react';
import { HelpCircle, Menu, Package, Sparkles, Search } from '@/components/icons';

import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { GlobalSearch } from '@/components/search/GlobalSearch';

import { NotificationsPopover } from './NotificationsPopover';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { brand, isCustomBranded } = useBranding();
  const [searchOpen, setSearchOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="flex h-14 md:h-16 items-center border-b border-border bg-card px-4 md:px-6 gap-4">
        {/* Left: Menu + Brand Logo + Title */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Menu Button - visible only on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Mobile Brand Logo - visible only on mobile */}
          <div className="flex items-center gap-2 shrink-0 md:hidden">
            {brand.logoUrl ? (
              <img 
                src={brand.logoUrl} 
                alt={brand.name}
                loading="lazy"
                decoding="async"
                className="h-7 max-w-[100px] object-contain"
              />
            ) : (
              <>
                <div 
                  className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                  style={{
                    background: isCustomBranded 
                      ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)`
                      : 'hsl(var(--primary))',
                  }}
                >
                  <Package className="h-4 w-4 text-primary-foreground" />
                </div>
                {isCustomBranded && (
                  <Sparkles 
                    className="h-3 w-3 animate-pulse shrink-0"
                    style={{ color: `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)` }}
                  />
                )}
              </>
            )}
          </div>
          
          {/* Title & Subtitle */}
          <div>
            <h1 className="font-heading text-base md:text-xl font-semibold text-foreground whitespace-nowrap">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-muted-foreground hidden md:block whitespace-nowrap">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 flex justify-center max-w-md mx-auto hidden md:flex">
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="relative h-9 w-full justify-start bg-muted/50 text-sm font-normal text-muted-foreground shadow-none pr-12"
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
              <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
            </kbd>
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 md:hidden"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Actions - smaller on mobile */}
          <div className="hidden sm:flex">
            <ThemeToggle />
          </div>
          <LanguageSelector />
          <div className="hidden sm:flex">
            <NotificationsPopover />
          </div>
          <Button variant="ghost" size="icon" className="hidden md:flex">
            <HelpCircle className="h-[18px] w-[18px] text-muted-foreground" />
          </Button>
        </div>
      </header>
    </>
  );
}