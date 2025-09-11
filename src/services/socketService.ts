import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';

// Extend the Socket type to include our custom _channels property
interface CustomSocket extends Socket {
  _channels?: any[];
}

// Variable pour stocker l'instance du socket
let socket: CustomSocket | undefined;

/**
 * Initialise la connexion Socket.IO avec le serveur
 * @param token - Le token JWT pour l'authentification
 * @returns L'instance du socket
 */
export function initSocket(token: string): CustomSocket {
  // Si un socket existe déjà et est connecté, le retourner
  if (socket && socket.connected) {
    return socket;
  }
  
  // Si un socket existe mais n'est pas connecté, tenter de le reconnecter
  if (socket) {
    try {
      socket.connect();
      // Si la reconnexion réussit, retourner le socket existant
      if (socket.connected) {
        console.log('Socket reconnecté avec succès');
        return socket;
      }
      // Sinon, déconnecter proprement et créer un nouveau socket
      socket.disconnect();
    } catch (error) {
      console.error('Erreur lors de la tentative de reconnexion:', error);
    }
    socket = undefined;
  }
  
  // Extraire le domaine de base de l'API_BASE_URL pour la connexion Socket.IO
  const baseUrl = API_BASE_URL.replace(/\/api$/, '');
  
  // Créer une nouvelle connexion Socket.IO avec optimisations raisonnables
  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket', 'polling'], // Autoriser les deux pour la compatibilité
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  }) as CustomSocket;
  
  // Gestion des erreurs
  socket.on('connect_error', (error) => {
    console.error('Erreur de connexion Socket.IO:', error);
  });
  
  socket.on('error', (error) => {
    console.error('Erreur Socket.IO:', error);
  });
  
  // Gestion de la reconnexion
  socket.on('reconnect', (attempt) => {
    console.log(`Reconnecté au serveur après ${attempt} tentatives`);
    // Réinitialiser les salons après reconnexion
    if (socket?._channels) {
      joinChannels(socket._channels);
    }
  });
  
  // Ajouter un événement de connexion réussie
  socket.on('connect', () => {
    console.log('Socket.IO connecté avec succès');
  });
  
  // Stocker les canaux pour la reconnexion
  socket._channels = [];
  
  return socket;
}

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
 * Déconnecte le socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = undefined;
  }
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
  autoInitSocket();
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