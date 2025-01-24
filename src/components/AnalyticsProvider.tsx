'use client';

import { Analytics } from '@vercel/analytics/react';
import { useState, useEffect } from 'react';

export default function AnalyticsProvider() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Initial check
    const consent = localStorage.getItem('cookie-consent');
    setIsEnabled(consent === 'true');

    // Listen for changes in consent
    const handleStorageChange = () => {
      const currentConsent = localStorage.getItem('cookie-consent');
      setIsEnabled(currentConsent === 'true');
    };

    // Listen for custom event from CookieBanner
    window.addEventListener('cookie-consent-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('cookie-consent-changed', handleStorageChange);
    };
  }, []);

  // Only render Analytics component if explicitly enabled
  if (!isEnabled) return null;

  return <Analytics />;
} 