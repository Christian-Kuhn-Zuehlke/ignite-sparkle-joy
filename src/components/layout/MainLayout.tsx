import { ReactNode, useState, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
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
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const { isDemo, message } = useDemoMode();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar - hidden on mobile via CSS */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Sheet */}
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Demo Banner for pending users */}
        {isDemo && (
          <DemoBanner 
            message={message} 
            onStartTour={() => setShowTour(true)} 
          />
        )}
        
        <Header 
          title={title} 
          subtitle={subtitle} 
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main ref={mainRef} className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      
      {/* Scroll to top button */}
      <ScrollToTop threshold={400} />
      
      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsModal />
      
      {/* Offline indicator */}
      <OfflineIndicator />
      
      {/* Feature tour for demo mode */}
      <FeatureTour isOpen={showTour} onClose={() => setShowTour(false)} />
    </div>
  );
}
