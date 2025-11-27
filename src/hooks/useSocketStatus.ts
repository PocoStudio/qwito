import { useState, useEffect } from 'react';
import { onStatusChange, getSocketStatus, ensureSocketConnection, type SocketStatus } from '@/services/socketService';

export function useSocketStatus() {
  const [status, setStatus] = useState<SocketStatus>(() => getSocketStatus());
  
  useEffect(() => {
    // S'abonner aux changements de statut
    const unsubscribe = onStatusChange((newStatus: SocketStatus) => {
      setStatus(newStatus);
    });
    
    return unsubscribe;
  }, []);
  
  // Effet pour reconnexion automatique quand le statut devient déconnecté ou en erreur
  useEffect(() => {
    if (status === 'disconnected' || status === 'error') {
      console.log('Détection de déconnexion, tentative de reconnexion automatique...');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        // Attendre un court délai avant de tenter la reconnexion
        const reconnectTimer = setTimeout(() => {
          ensureSocketConnection(token);
        }, 2000);
        
        return () => clearTimeout(reconnectTimer);
      }
    }
  }, [status]);
  
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