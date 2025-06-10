import { useState, useEffect } from 'react';
import { getSocket } from '@/services/socketService';

export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    // Initialiser l'état
    setIsConnected(socket.connected);
    
    // Gérer les changements d'état
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);
  
  return isConnected;
}