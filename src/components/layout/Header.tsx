import { useState } from 'react';
import { HelpCircle, Menu, Package, Search, LogOut, Sparkles } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { NotificationsPopover } from './NotificationsPopover';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { brand, isCustomBranded } = useBranding();
  const { profile, activeCompanyName, signOut } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const displayCompany = activeCompanyName || profile?.company_name || '';
  const displayName = profile?.full_name || profile?.email || '';
  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : 'U';

  return (
    <>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <header className="flex h-14 items-center border-b border-border bg-card px-4 md:px-6 gap-4">
        {/* Left: Menu (mobile) + Logo + Company */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Mobile Brand Logo */}
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
              <div 
                className="flex h-8 w-8 items-center justify-center rounded-sm shrink-0"
                style={{
                  background: isCustomBranded 
                    ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)`
                    : 'hsl(var(--primary))',
                }}
              >
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Mandant / Company name — desktop */}
          {displayCompany && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Mandant:</span>
              <span className="font-bold text-secondary">{displayCompany}</span>
              {isCustomBranded && (
                <Sparkles 
                  className="h-3 w-3 animate-pulse shrink-0"
                  style={{ color: `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Center: Global Search — desktop only */}
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

        {/* Right: User info + Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
          {/* Mobile search */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 md:hidden"
          >
            <Search className="h-4 w-4" />
          </Button>

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

          {/* User display — desktop */}
          <div className="hidden md:flex items-center gap-2 ml-2 border-l border-border pl-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Angemeldet als:</span>
            <span className="text-xs font-medium text-foreground whitespace-nowrap max-w-[120px] truncate">{displayName}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shrink-0">
              {initials}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="h-8 w-8 shrink-0"
              title="Abmelden"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
