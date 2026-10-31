import React from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
        <span>
          <strong>Offline Mode Active:</strong> You can continue creating bills and checking follow-ups. All data is saved securely on this device and will synchronize when connection restores.
        </span>
      </div>
    </div>
  );
};
