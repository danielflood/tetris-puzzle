'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      setAnalyticsEnabled(consent === 'true');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setAnalyticsEnabled(true);
    setShowBanner(false);
    // Dispatch event for other components
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'false');
    setAnalyticsEnabled(false);
    setShowBanner(false);
    // Dispatch event for other components
    window.dispatchEvent(new Event('cookie-consent-changed'));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 shadow-lg z-50 rounded-lg max-w-[300px]">
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-snug">
          We use first-party cookies only to improve your experience. These cookies are not shared with any third parties.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleDecline}
            className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
} 