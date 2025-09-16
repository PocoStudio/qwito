import { useState, useEffect } from 'react';
import { onStatusChange, getSocketStatus, type SocketStatus } from '@/services/socketService';

export function useSocketStatus() {
  const [status, setStatus] = useState<SocketStatus>(() => getSocketStatus());
  
  useEffect(() => {
    // S'abonner aux changements de statut
    const unsubscribe = onStatusChange((newStatus: SocketStatus) => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, []);
  
  // Retourner un boolean pour la compatibilité avec l'ancien code
  return status === 'connected';
}

// Hook alternatif qui retourne le statut complet
export function useSocketFullStatus() {
  const [status, setStatus] = useState<SocketStatus>(() => getSocketStatus());
  
  useEffect(() => {
    const unsubscribe = onStatusChange(setStatus);
    return unsubscribe;
  }, []);
  
  return status;
}