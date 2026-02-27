import { ReactNode, useState, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageHeader, BreadcrumbItem } from './PageHeader';
import { MobileSidebar } from './MobileSidebar';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { OfflineIndicator } from './OfflineIndicator';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { FeatureTour } from '@/components/demo/FeatureTooltip';
import { useDemoMode } from '@/hooks/useDemoMode';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function MainLayout({ children, title, subtitle, breadcrumbs, actions }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { isDemo, message } = useDemoMode();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Sheet */}
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Demo Banner */}
        {isDemo && (
          <DemoBanner 
            message={message} 
            onStartTour={() => setShowTour(true)} 
          />
        )}
        
        {/* Header — thin app bar */}
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        
        {/* Page Header — breadcrumbs + title */}
        <PageHeader 
          title={title} 
          subtitle={subtitle} 
          breadcrumbs={breadcrumbs}
          actions={actions}
        />
        
        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      
      <ScrollToTop threshold={400} />
      <KeyboardShortcutsModal />
      <OfflineIndicator />
      <FeatureTour isOpen={showTour} onClose={() => setShowTour(false)} />
    </div>
  );
}

export type { BreadcrumbItem };
