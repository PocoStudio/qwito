import { useState, useEffect } from 'react';
import updateService, { type VersionInfo } from '@/services/updateService';

interface UpdateState {
  hasUpdate: boolean;
  newVersion?: VersionInfo;
  isChecking: boolean;
}

export function useAppUpdate() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    hasUpdate: false,
    isChecking: false
  });

  useEffect(() => {
    // S'abonner aux mises à jour
    const unsubscribe = updateService.onUpdate((hasUpdate, newVersion) => {
      setUpdateState({
        hasUpdate,
        newVersion,
        isChecking: false
      });
    });

    // Vérification initiale
    setUpdateState(prev => ({ ...prev, isChecking: true }));
    updateService.checkForUpdates().finally(() => {
      setUpdateState(prev => ({ ...prev, isChecking: false }));
    });

    return unsubscribe;
  }, []);

  const reloadApp = () => {
    updateService.reloadApp();
  };

  const getCurrentVersion = () => {
    return updateService.getCurrentVersion();
  };

  const checkForUpdates = async () => {
    setUpdateState(prev => ({ ...prev, isChecking: true }));
    try {
      const hasUpdate = await updateService.checkForUpdates();
      return hasUpdate;
    } finally {
      setUpdateState(prev => ({ ...prev, isChecking: false }));
    }
  };

  return {
    ...updateState,
    reloadApp,
    getCurrentVersion,
    checkForUpdates
  };
}