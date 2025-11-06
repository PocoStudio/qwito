import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export function UpdateNotification() {
  const { hasUpdate, newVersion, reloadApp } = useAppUpdate();
  const [isVisible, setIsVisible] = useState(true);

  if (!hasUpdate || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              Nouvelle version disponible !
            </p>
            <p className="text-xs opacity-90 mt-1">
              Version {newVersion?.version}
            </p>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              onClick={reloadApp}
              className="bg-white text-blue-600 hover:bg-gray-100 h-7 px-2 text-xs"
            >
              Actualiser
            </Button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-gray-200 p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variante compacte pour la barre de navigation
export function UpdateBadge() {
  const { hasUpdate, reloadApp } = useAppUpdate();

  if (!hasUpdate) {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={reloadApp}
      className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-1 h-6 animate-pulse"
    >
      <RefreshCw className="w-3 h-3 mr-1" />
      MAJ
    </Button>
  );
}