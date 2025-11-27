import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';

// Extend the Socket type to include our custom _channels property
interface CustomSocket extends Socket {
  _channels?: any[];
}

// Types pour la gestion du statut
export type SocketStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

// Variables globales pour la gestion des sockets
let socket: CustomSocket | undefined;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectDelay = 1000;
let isIntentionalDisconnect = false;
let connectionCheckInterval: NodeJS.Timeout | undefined;
let lastActivity = Date.now();
let currentStatus: SocketStatus = 'disconnected';

// Gestionnaire de statut
const statusCallbacks: Set<(status: SocketStatus) => void> = new Set();

// Émettre un changement de statut
const emitStatusChange = (status: SocketStatus) => {
  currentStatus = status;
  statusCallbacks.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Erreur dans le callback de statut:', error);
    }
  });
};

// Fonction pour s'abonner aux changements de statut
export const onStatusChange = (callback: (status: SocketStatus) => void) => {
  statusCallbacks.add(callback);
  // Émettre immédiatement le statut actuel
  callback(currentStatus);
  
  // Retourner une fonction de désabonnement
  return () => {
    statusCallbacks.delete(callback);
  };
};

// Obtenir le statut actuel
export const getSocketStatus = (): SocketStatus => currentStatus;

// Mettre à jour l'activité
const updateActivity = () => {
  lastActivity = Date.now();
};

/**
 * Initialise la connexion Socket.IO avec le serveur
 * @param token - Le token JWT pour l'authentification
 * @returns L'instance du socket
 */
export function initSocket(token: string): CustomSocket {
  // Si un socket existe déjà et est connecté, le retourner
  if (socket && socket.connected) {
    emitStatusChange('connected');
    return socket;
  }
  
  // Marquer comme tentative de connexion
  emitStatusChange('connecting');
  isIntentionalDisconnect = false;
  
  // Si un socket existe mais n'est pas connecté, nettoyer d'abord
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = undefined;
  }
  
  // Extraire le domaine de base de l'API_BASE_URL pour la connexion Socket.IO
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  
  // Créer une nouvelle connexion Socket.IO avec optimisations raisonnables
  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: maxReconnectAttempts,
    reconnectionDelay: reconnectDelay,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    forceNew: true
  }) as CustomSocket;
  
  // Gestion de la connexion réussie
  socket.on('connect', () => {
    console.log('Socket.IO connecté avec succès');
    reconnectAttempts = 0;
    emitStatusChange('connected');
    updateActivity();
    
    // Rejoindre les canaux stockés
    if (socket?._channels) {
      joinChannels(socket._channels);
    }
  });
  
  // Gestion de la déconnexion
  socket.on('disconnect', (reason) => {
    console.log('Socket déconnecté:', reason);
    
    if (isIntentionalDisconnect) {
      emitStatusChange('disconnected');
      return;
    }
    
    // Si c'est une déconnexion du serveur ou un problème de transport
    if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
      emitStatusChange('reconnecting');
      scheduleReconnection(token);
    } else {
      emitStatusChange('disconnected');
    }
  });
  
  // Gestion des erreurs de connexion
  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.IO:', error);
    reconnectAttempts++;
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      emitStatusChange('error');
    } else {
      emitStatusChange('reconnecting');
      scheduleReconnection(token);
    }
  });
  
  // Gestion de la reconnexion automatique
  socket.on('reconnect', (attempt) => {
    console.log(`Reconnecté au serveur après ${attempt} tentatives`);
    reconnectAttempts = 0;
    emitStatusChange('connected');
    updateActivity();
  });
  
  socket.on('reconnecting', (attempt) => {
    console.log(`Tentative de reconnexion ${attempt}...`);
    emitStatusChange('reconnecting');
  });
  
  socket.on('reconnect_error', (error) => {
    console.error('Erreur de reconnexion:', error);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('Échec de toutes les tentatives de reconnexion');
    emitStatusChange('error');
  });
  
  // Stocker les canaux pour la reconnexion
  socket._channels = [];
  
  return socket;
}

// Fonction de reconnexion programmée
const scheduleReconnection = (token: string) => {
  if (isIntentionalDisconnect || reconnectAttempts >= maxReconnectAttempts) {
    return;
  }
  
  const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), 30000);
  console.log(`Reconnexion programmée dans ${delay}ms`);
  
  setTimeout(() => {
    if (!socket?.connected && !isIntentionalDisconnect) {
      console.log('Tentative de reconnexion manuelle...');
      initSocket(token);
    }
  }, delay);
};

// Nouvelle fonction pour rejoindre les canaux de manière sécurisée
export function joinChannelsSafe(channels: any[]): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket) {
      console.error('Socket non initialisé. Impossible de rejoindre les canaux.');
      resolve(false);
      return;
    }
    
    if (socket.connected) {
      // Si déjà connecté, rejoindre immédiatement
      socket.emit('join-channels', channels);
      resolve(true);
    } else {
      // Attendre la connexion avant de rejoindre
      socket.on('connect', () => {
        socket?.emit('join-channels', channels);
        resolve(true);
      });
      
      // Définir un timeout pour éviter d'attendre indéfiniment
      setTimeout(() => {
        if (!socket?.connected) {
          console.error('Timeout: Impossible de se connecter au serveur Socket.IO');
          resolve(false);
        }
      }, 5000); // 5 secondes de timeout
    }
  });
}

/**
 * Récupère l'instance actuelle du socket
 * @returns L'instance du socket ou undefined si non initialisé
 */
export function getSocket(): CustomSocket | undefined {
  return socket;
}

/**
 * Rejoint les canaux spécifiés
 * @param channels - Liste des canaux à rejoindre
 */
export function joinChannels(channels: any[]): void {
  if (!socket) {
    console.error('Socket non initialisé. Impossible de rejoindre les canaux.');
    return;
  }
  
  // Stocker les canaux pour la reconnexion
  socket._channels = channels;
  
  if (socket.connected) {
    socket.emit('join-channels', channels);
    console.log('Canaux rejoints:', channels.map(c => c.id).join(', '));
  } else {
    console.warn('Socket non connecté. Les canaux seront rejoints après connexion.');
    // La connexion sera gérée par l'événement 'connect'
  }
}

/**
 * Envoie un message dans un canal
 * @param channelId - ID du canal
 * @param content - Contenu du message
 * @param files - Fichiers attachés au message (optionnel)
 */
export function sendMessage(channelId: string, content: string, files?: any[]): void {
  if (!socket || !socket.connected) {
    console.error('Socket non connecté. Impossible d\'envoyer le message.');
    return;
  }

  // Émission simple et directe
  socket.emit('send-message', { 
    channelId, 
    content, 
    files,
    clientTimestamp: Date.now()
  });
}

/**
 * Invite un utilisateur dans un canal
 * @param channelId - ID du canal
 * @param toUserId - ID de l'utilisateur à inviter
 */
export function inviteUser(channelId: string, toUserId: string): void {
  if (socket && socket.connected) {
    socket.emit('invite-user', { channelId, toUserId });
  } else {
    console.error('Socket non connecté. Impossible d\'envoyer l\'invitation.');
  }
}

/**
 * S'assurer que la connexion socket est active
 */
export async function ensureSocketConnection(token: string): Promise<boolean> {
  try {
    // Si déconnexion intentionnelle, ne pas reconnecter
    if (isIntentionalDisconnect) {
      console.log('Déconnexion intentionnelle, pas de reconnexion');
      return false;
    }
    
    if (!socket || !socket.connected) {
      console.log('Initialisation de la connexion socket...');
      emitStatusChange('connecting');
      socket = initSocket(token);
      
      // Attendre un court moment pour la connexion
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          if (socket && socket.connected) {
            resolve(true);
          } else {
            console.log('Connexion toujours en cours...');
            resolve(false);
          }
        }, 3000);
        
        if (socket) {
          socket.once('connect', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          socket.once('connect_error', () => {
            clearTimeout(timeout);
            resolve(false);
          });
        }
      });
    }
    
    updateActivity();
    return socket.connected;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du socket:', error);
    emitStatusChange('error');
    return false;
  }
}

/**
 * Déconnecte le socket
 * @param intentional - Indique si la déconnexion est intentionnelle (logout, navigation)
 */
export function disconnectSocket(intentional: boolean = true): void {
  isIntentionalDisconnect = intentional;
  
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = undefined;
  }
  
  if (socket) {
    if (intentional) {
      socket.removeAllListeners();
      emitStatusChange('disconnected');
    }
    socket.disconnect();
    socket = undefined;
  }
  
  reconnectAttempts = 0;
}


// Fonction pour initialiser automatiquement le socket
export function autoInitSocket(): CustomSocket | undefined {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    console.error('Aucun token trouvé pour initialiser le socket');
    return undefined;
  }
  
  return initSocket(token);
}

// Tentative d'initialisation automatique
try {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    autoInitSocket();
    setupSocketLifecycleManagement(token);
  }
} catch (error) {
  console.error('Erreur lors de l\'initialisation automatique du socket:', error);
}

export function leaveChannel(channelId: string): void {
  if (socket && socket.connected) {
    socket.emit('leave-channel', { channelId });
    console.log('Canal quitté:', channelId);
  }
}

/**
 * Émet un événement pour supprimer un message
 * @param channelId 
 * @param messageId 
 */
export function deleteMessage(channelId: string, messageId: string): void {
  if (socket && socket.connected) {
    socket.emit('delete-message', { channelId, messageId });
  } else {
    console.error('Socket non connecté. Impossible de supprimer le message.');
  }
}



/**
 * Gestion intelligente du lifecycle de l'application
 */
export function setupSocketLifecycleManagement(token: string): () => void {
  // Gestion de la visibilité de la page
  const handleVisibilityChange = () => {
    updateActivity();
    
    if (document.visibilityState === 'visible') {
      // Page redevient visible - vérifier la connexion immédiatement
      console.log('Page visible, vérification de la connexion socket...');
      
      // Vérifier si la connexion est active
      setTimeout(() => {
        if (!isIntentionalDisconnect) {
          const currentlyConnected = socket && socket.connected;
          
          if (!currentlyConnected) {
            console.log('Socket déconnecté détecté, reconnexion...');
            emitStatusChange('reconnecting');
            ensureSocketConnection(token);
          } else {
            console.log('Socket toujours connecté');
          }
        }
      }, 500);
    }
  };

  // Gestion du focus de la fenêtre
  const handleFocus = () => {
    updateActivity();
    if (!isIntentionalDisconnect && (!socket || !socket.connected)) {
      console.log('Fenêtre en focus, vérification du socket...');
      emitStatusChange('reconnecting');
      setTimeout(() => {
        ensureSocketConnection(token);
      }, 500);
    }
  };

  // Vérification périodique de la connexion (optimisée)
  const startConnectionCheck = () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      // Augmenter l'intervalle si inactif pour économiser les ressources
      const isRecentActivity = timeSinceLastActivity < 30000;
      const shouldCheck = isRecentActivity && 
                         document.visibilityState === 'visible' && 
                         !isIntentionalDisconnect;
      
      if (shouldCheck && (!socket || !socket.connected)) {
        console.log('Connexion perdue détectée, reconnexion...');
        emitStatusChange('reconnecting');
        ensureSocketConnection(token);
      }
    }, 15000); // Vérification toutes les 15 secondes pour réduire l'impact
  };

  // Gestion de la fermeture de la page
  const handleBeforeUnload = () => {
    disconnectSocket(true);
  };

  // Interactions utilisateur pour maintenir l'activité
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  const activityHandler = () => updateActivity();

  // Ajouter tous les écouteurs
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  activityEvents.forEach(event => {
    document.addEventListener(event, activityHandler, { passive: true });
  });

  startConnectionCheck();

  // Retourner une fonction de nettoyage
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    
    activityEvents.forEach(event => {
      document.removeEventListener(event, activityHandler);
    });
    
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = undefined;
    }
  };
}