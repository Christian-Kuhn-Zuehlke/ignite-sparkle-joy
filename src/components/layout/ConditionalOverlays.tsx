import { useLocation } from 'react-router-dom';
import { WelcomeOverlay } from '@/components/branding/WelcomeOverlay';
import { VersionFooter } from '@/components/layout/VersionFooter';
import { FulfillmentChatbot } from '@/components/ai/FulfillmentChatbot';

const EXCLUDED_ROUTES = ['/auth', '/reset-password'];

export function ConditionalOverlays() {
  const location = useLocation();
  
  const shouldShow = !EXCLUDED_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  if (!shouldShow) return null;

  return (
    <>
      <WelcomeOverlay />
      <VersionFooter />
      <FulfillmentChatbot />
    </>
  );
}
