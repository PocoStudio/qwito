import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, User, Users, Settings, Smile, AlertCircle, Paperclip, XIcon, Crown, Copy, MoreVertical, Trash2, X } from "lucide-react";
import { getChannelDetails, getChannelMessageBatch, getChannelMessageBatchCount } from "@/services/channelService";
import { sendMessage as sendSocketMessage, leaveChannel } from "@/services/socketService";
import { getSocket, ensureSocketConnection } from "@/services/socketService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSocketStatus } from '@/hooks/useSocketStatus';
import EmojiPicker from 'emoji-picker-react';
import { getUserOptions } from "@/services/userService";
import ConfettiExplosion from 'react-confetti-explosion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getFullAvatarUrl } from "@/utils/imageUtils";
import { useAuth } from "@/hooks/useAuth";
import { useFileUpload } from "@/hooks/use-file-upload";
import { checkPlatinumStatus } from "@/services/userService";
import { apiUploadFiles } from "@/services/apiService";
import { Progress } from "@/components/ui/progress";
import { deleteMessage as deleteSocketMessage } from "@/services/socketService";
import { API_BASE_URL } from "@/config/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { openFileInNewTab, downloadFileWithAuth } from '@/services/fileService';
import { formatMessageDate } from "@/utils/dateUtils";

// Define interfaces for our data structures
interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: string;
  avatar?: string | null;
  files?: MessageFile[];
  isTemporary?: boolean;
}

interface MessageFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
}

interface ChannelInfo {
  name: string;
  description: string;
  members_count?: number;
}

interface MessageResponse {
  id: string;
  username: string;
  content: string;
  created_at: string;
  channel_id: string;
  avatar: string | null;
  files?: MessageFile[];
  clientTimestamp?: number;
  serverProcessingTime?: string;
  dbProcessingTime?: string;
  networkLatency?: string;
  isTemporary?: boolean;
  tempId?: string;
}

function ChannelView() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const isMobile = useIsMobile();
  const [newMessage, setNewMessage] = useState("");
  // Ajout de l'état pour le sélecteur d'emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo>({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  // Ajout de l'état pour les confettis
  const [isExploding, setIsExploding] = useState(false);
  
  // Nouveaux états pour les popups et les erreurs
  const [showLongMessageDialog, setShowLongMessageDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Ajout pour la gestion des fichiers
  const { user } = useAuth();
  const [isPlatinum, setIsPlatinum] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [{ files, errors, isProcessing }, { removeFile, openFileDialog, getInputProps, clearFiles }] = useFileUpload({
  accept: "*/*",
  maxSize: 1024 * 1024 * 1024, // 10MB
  multiple: true,
  maxFiles: 5,
  onFilesAdded: (addedFiles) => {
    // Quand les fichiers sont ajoutés, on désactive l'indicateur de sélection
    setIsSelectingFiles(false);
    console.log('Fichiers ajoutés:', addedFiles.length);
  },
  onError: (_error) => {
    // Quand il y a des erreurs, on désactive l'indicateur de sélection
    setIsSelectingFiles(false);
    // On active l'affichage des erreurs
    setShowErrors(true);
    // On fait disparaître l'erreur après 3 secondes
    setTimeout(() => {
      setShowErrors(false);
    }, 3000);
  }
});
  
  // Fonction modifiée pour ouvrir le sélecteur de fichiers
  const handleOpenFileDialog = () => {
    if (isPlatinum) {
      setIsSelectingFiles(true); // Activer l'indicateur de sélection
      setTimeout(() => {
        openFileDialog();
      }, 100); // Petit délai pour s'assurer que l'état est mis à jour avant d'ouvrir le dialogue
    } else {
      setShowPlatinumInviteDialog(true);
    }
  };
  const [currentBatch, setCurrentBatch] = useState(1);
  const [isSelectingFiles, setIsSelectingFiles] = useState(false);
  const [totalBatches, setTotalBatches] = useState(1);
  const [userOptions, setUserOptions] = useState<{showStatus?: string}>({});
  const isSocketConnected = useSocketStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [showPlatinumInviteDialog, setShowPlatinumInviteDialog] = useState(false);

  const [fileProgress, setFileProgress] = useState<{ [key: string]: number }>({});
  const [secureImageUrls, setSecureImageUrls] = useState<{ [key: string]: string }>({});
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: 'loading' | 'loaded' | 'error' }>({});
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // Fonction pour vérifier si un fichier est une image
  const isImageFile = (filename: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif'];
    const extension = filename.toLowerCase().split('.').pop();
    return extension ? imageExtensions.includes(`.${extension}`) : false;
  };

  // Fonction pour générer une URL sécurisée pour l'affichage d'image
  const generateSecureImageUrl = async (fileUrl: string, channelId: string): Promise<string> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        console.error('Token d\'authentification manquant');
        return '';
      }

      const response = await fetch(`${API_BASE_URL}/api/files/secure-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileUrl, channelId, action: 'open' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur API:', errorData.message || 'Erreur lors de la génération de l\'URL sécurisée');
        return '';
      }

      const { secureUrl } = await response.json();
      return secureUrl;
    } catch (error) {
      console.error('Erreur lors de la génération de l\'URL sécurisée:', error);
      return '';
    }
  };

  // Fonction pour charger les URLs sécurisées des images
  const loadSecureImageUrls = async (messages: Message[]) => {
    if (!channelId) return;

    const imageFiles: { fileId: string; fileUrl: string }[] = [];
    
    messages.forEach(message => {
      if (message.files) {
        message.files.forEach(file => {
          if (isImageFile(file.filename)) {
            imageFiles.push({ fileId: file.id, fileUrl: file.url });
            // Marquer l'image comme en cours de chargement
            setImageLoadingStates(prev => ({ ...prev, [file.id]: 'loading' }));
          }
        });
      }
    });

    const urlPromises = imageFiles.map(async ({ fileId, fileUrl }) => {
      try {
        const secureUrl = await generateSecureImageUrl(fileUrl, channelId);
        if (secureUrl) {
          setImageLoadingStates(prev => ({ ...prev, [fileId]: 'loaded' }));
        } else {
          setImageLoadingStates(prev => ({ ...prev, [fileId]: 'error' }));
        }
        return { fileId, secureUrl };
      } catch (error) {
        console.error(`Erreur lors du chargement de l'URL sécurisée pour ${fileId}:`, error);
        setImageLoadingStates(prev => ({ ...prev, [fileId]: 'error' }));
        return { fileId, secureUrl: '' };
      }
    });

    const results = await Promise.all(urlPromises);
    const urlMap: { [key: string]: string } = {};
    
    results.forEach(({ fileId, secureUrl }) => {
      if (secureUrl) {
        urlMap[fileId] = secureUrl;
      }
    });

    setSecureImageUrls(prev => ({ ...prev, ...urlMap }));
  };

  const scrollToBottom = () => {
    // Attendre un peu plus longtemps pour que les images se chargent
    setTimeout(() => {
      if (isMobile) {
        // Sur mobile, on utilise scrollIntoView avec alignToTop pour éviter de descendre trop bas
        messagesEndRef.current?.scrollIntoView({ block: "end", inline: "nearest" });
      } else {
        // Sur desktop, on garde le comportement actuel
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

const handleFileAccess = async (fileUrl: string, action: 'open' | 'download' = 'open') => {
  if (!channelId) return;
  
  try {
    if (action === 'open') {
      await openFileInNewTab(fileUrl, channelId);
    } else {
      await downloadFileWithAuth(fileUrl, channelId);
    }
  } catch (error) {
    console.error('Erreur lors de l\'accès au fichier:', error);
    setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'accès au fichier');
    setShowErrorDialog(true);
  }
};
  
  // Fonction pour charger les messages initiaux
  const fetchInitialMessages = async () => {
    if (!channelId) return;
    
    try {
      setLoading(true);
      
      // Charger les détails du canal
      const channelResponse = await getChannelDetails(channelId);
      setChannelInfo({
        name: channelResponse.channel.name,
        description: channelResponse.channel.description,
        members_count: channelResponse.channel.members_count || 0
      });
      
      // Récupérer le nombre total de lots
      const batchCountResponse = await getChannelMessageBatchCount(channelId);
      setTotalBatches(batchCountResponse.totalBatches);
      
      // Récupérer le premier lot (messages les plus récents)
      const batchResponse = await getChannelMessageBatch(channelId, 1);
      
      // Formater les messages
      const formattedMessages = batchResponse.messages.map((msg: MessageResponse) => ({
        id: msg.id,
        user: msg.username,
        content: msg.content,
        timestamp: formatMessageDate(msg.created_at),
        avatar: msg.avatar,
        files: msg.files 
      }));
      
      setMessages(formattedMessages);
      setCurrentBatch(1);
      setHasMoreMessages(batchResponse.totalBatches > 1);
      
      // Charger les URLs sécurisées pour les images
      await loadSecureImageUrls(formattedMessages);
    } catch (error) {
      console.error('Erreur lors du chargement des données du canal:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction pour charger plus de messages
  const loadMoreMessages = async () => {
    if (!channelId || loadingMore || !hasMoreMessages) {
      return;
    }
    
    try {
      setLoadingMore(true);
      
      // Sauvegarder la position de défilement actuelle
      const scrollContainer = messagesContainerRef.current;
      const scrollHeight = scrollContainer?.scrollHeight || 0;
      
      // Revérifier le nombre total de lots avant de charger
      const batchCountResponse = await getChannelMessageBatchCount(channelId);
      const updatedTotalBatches = batchCountResponse.totalBatches;
      setTotalBatches(updatedTotalBatches);
      
      // Vérifier s'il y a encore des messages à charger
      if (currentBatch >= updatedTotalBatches) {
        setHasMoreMessages(false);
        setLoadingMore(false);
        return;
      }
      
      // Récupérer le lot suivant
      const nextBatch = currentBatch + 1;
      const batchResponse = await getChannelMessageBatch(channelId, nextBatch);
      
      // Formater les nouveaux messages
      const formattedMessages = batchResponse.messages.map((msg: MessageResponse) => ({
        id: msg.id,
        user: msg.username,
        content: msg.content,
        timestamp: formatMessageDate(msg.created_at),
        avatar: msg.avatar || undefined,
        files: msg.files 
      }));
      
      // Filtrer les messages pour éviter les doublons
      setMessages(prev => {
        const existingIds = new Set(prev.map(msg => msg.id));
        const newMessages = formattedMessages.filter((msg: Message) => !existingIds.has(msg.id));
        return [...newMessages, ...prev];
      });
      
      // Charger les URLs sécurisées pour les nouvelles images
      await loadSecureImageUrls(formattedMessages);
      
      setCurrentBatch(nextBatch);
      setHasMoreMessages(nextBatch < updatedTotalBatches);
      
      // Restaurer la position de défilement après le rendu
      setTimeout(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          scrollContainer.scrollTop = newScrollHeight - scrollHeight;
        }
      }, 50);
      
      console.log(`Lot ${nextBatch}/${updatedTotalBatches} chargé, ${formattedMessages.length} messages, total batches mis à jour: ${updatedTotalBatches}`);
    } catch (error) {
      console.error('Erreur lors du chargement des messages supplémentaires:', error);
    } finally {
      setTimeout(() => {
        setLoadingMore(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (!isProcessing && isSelectingFiles) {
      setIsSelectingFiles(false);
    }
  }, [isProcessing]);
  
  // Gestionnaire de défilement pour détecter quand l'utilisateur atteint le haut
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Charger plus de messages si on est en haut
    if (container.scrollTop < 100 && !loadingMore && hasMoreMessages) {
      console.log('Chargement de messages supplémentaires déclenché');
      loadMoreMessages();
    }
  }, [loadingMore, hasMoreMessages]);

  useEffect(() => {
    const loadUserOptions = async () => {
      try {
        const options = await getUserOptions();
        setUserOptions(options);
      } catch (error) {
        console.error('Erreur lors du chargement des options utilisateur:', error);
      }
    };
    
    loadUserOptions();
  }, []);

  // Effet pour charger les données initiales
  useEffect(() => {
    fetchInitialMessages();
    
    // Configurer l'écoute des nouveaux messages via Socket.IO
    const socket = getSocket();
    if (socket) {
      socket.off('new-message');
      socket.off('error-message');
      
      socket.on('new-message', (message: MessageResponse) => {
        if (message.channel_id.toString() === channelId) {
          const receiveTime = Date.now();
          const clientSendTime = message.clientTimestamp || receiveTime;
          const totalLatency = receiveTime - clientSendTime;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`⚡ Message received: ${totalLatency}ms${message.isTemporary ? ' (INSTANT)' : ' (CONFIRMED)'}`);
          }

          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === message.id);
            if (messageExists) return prev;
            
            const newMessage = {
              id: message.id,
              user: message.username,
              content: message.content,
              timestamp: formatMessageDate(message.created_at),
              avatar: message.avatar,
              files: message.files,
              isTemporary: message.isTemporary
            };
            
            // Charger les URLs sécurisées pour les nouvelles images
            if (newMessage.files && newMessage.files.length > 0) {
              loadSecureImageUrls([newMessage]);
            }
            
            return [...prev, newMessage];
          });
          
          setTimeout(scrollToBottom, 10);
        }
      });

      // Gestion des confirmations de messages
      socket.on('message-confirmed', (message: any) => {
        if (message.channel_id.toString() === channelId) {
          setMessages(prev => prev.map(msg => 
            msg.id === message.tempId 
              ? { ...msg, id: message.id, isTemporary: false }
              : msg
          ));
        }
      });

      // Gestion des erreurs de messages
      socket.on('message-error', (data: any) => {
        setMessages(prev => prev.filter(msg => msg.id !== data.tempId));
        setErrorMessage(data.error || 'Erreur lors de l\'envoi du message');
        setShowErrorDialog(true);
      });
      
      // Ajouter un écouteur pour les erreurs de message
      socket.on('error-message', (error: any) => {
        console.error('Erreur de message reçue:', error);
        setErrorMessage(error.message || 'Une erreur est survenue lors du traitement du message');
        setShowErrorDialog(true);
      });

      socket.on('message-deleted', (data) => {
        if (data.channelId === channelId) {
          // Supprimer le message de la liste des messages
          setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
          // Retirer le message de la liste des messages en cours de suppression
          setDeletingMessages(prev => prev.filter(id => id !== data.messageId));
        }
      });
      
      // Vérifier si le socket est connecté
      if (!socket.connected) {
        console.log('Socket non connecté, tentative de rejoindre le canal après connexion...');
        socket.on('connect', () => {
          // Rejoindre explicitement le canal actuel
          if (channelId) {
            socket.emit('join-channels', [{ id: channelId }]);
            console.log('Canal rejoint après reconnexion:', channelId);
          }
        });
      } else {
        // S'assurer que le canal est bien rejoint
        socket.emit('join-channels', [{ id: channelId }]);
      }
      
      // Dans le useEffect
      return () => {
        socket.off('new-message');
        socket.off('error-message'); 
        socket.off('connect');
        socket.off('message-deleted');
        if (channelId) {
          leaveChannel(channelId);
        }
      };
    }
  }, [channelId]);
  
  // Effet pour ajouter l'écouteur de défilement
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);
  
  // Effet pour défiler vers le bas quand les messages changent initialement
  useEffect(() => {
    if (!loadingMore && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading]);
  
  // Effet pour gérer la visibilité de la page et reconnecter le socket si nécessaire
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page channel visible, vérification de la connexion socket...');
        
        // Vérifier si le socket est connecté
        const socket = getSocket();
        if (!socket || !socket.connected) {
          console.log('Socket déconnecté détecté sur la page channel, reconnexion...');
          
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            ensureSocketConnection(token).then(connected => {
              if (connected && channelId) {
                // Rejoindre le canal après reconnexion
                const reconnectedSocket = getSocket();
                if (reconnectedSocket) {
                  reconnectedSocket.emit('join-channels', [{ id: channelId }]);
                  console.log('Canal rejoint après reconnexion:', channelId);
                }
              }
            });
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [channelId]);
  
  const [deletingMessages, setDeletingMessages] = useState<string[]>([]);

  
  // Fonction pour télécharger les fichiers
  const uploadFiles = async () => {
    if (files.length === 0) return null;
    
    try {
      setUploadingFiles(true);
      
      // Initialiser la progression à 0 pour tous les fichiers
      const initialProgress: { [key: string]: number } = {};
      files.forEach(fileObj => {
        if ('file' in fileObj && fileObj.file instanceof File) {
          initialProgress[fileObj.file.name] = 0;
        }
      });
      setFileProgress(initialProgress);
      
      const formData = new FormData();
      files.forEach(fileObj => {
        if ('file' in fileObj && fileObj.file instanceof File) {
          formData.append('files', fileObj.file);
        }
      });
      
      // Utiliser la nouvelle URL avec channelId dans le chemin et suivre la progression
      const result = await apiUploadFiles(
        `/api/channels/${channelId}/upload`, 
        formData,
        (progress) => {
          setFileProgress(progress);
        }
      );
      return result.files;
      
    } catch (error) {
      console.error('Erreur lors du téléchargement des fichiers:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors du téléchargement des fichiers');
      setShowErrorDialog(true);
      return null;
    } finally {
      setUploadingFiles(false);
      clearFiles();
      // Réinitialiser la progression
      setFileProgress({});
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() === '' && files.length === 0) return;
    
    if (newMessage.length > 5000) {
      setShowLongMessageDialog(true);
      return;
    }
    
    try {
      // Télécharger les fichiers si nécessaire
      let uploadedFiles = null;
      if (files.length > 0) {
        if (!isPlatinum) {
          setErrorMessage('Seuls les membres Platinum peuvent envoyer des fichiers');
          setShowErrorDialog(true);
          return;
        }
        
        uploadedFiles = await uploadFiles();
        if (!uploadedFiles && files.length > 0) return; // Arrêter si l'upload a échoué
      }
      
      // Envoyer le message avec les fichiers
      const messageContent = newMessage.trim();
      const hasContent = messageContent.length > 0;
      const hasFiles = uploadedFiles && uploadedFiles.length > 0;
      
      // Ne pas envoyer si il n'y a ni contenu ni fichiers
      if (!hasContent && !hasFiles) {
        return;
      }
      
      // Envoyer avec le contenu approprié
      sendSocketMessage(channelId || '', hasContent ? messageContent : '', uploadedFiles);
      setNewMessage('');
      
      if (messageContent.toLowerCase().includes('hello world')) {
        setIsExploding(true);
        setTimeout(() => setIsExploding(false), 3000);
      }
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setErrorMessage('Erreur lors de l\'envoi du message. Veuillez réessayer.');
      setShowErrorDialog(true);
    }
  };
  
  useEffect(() => {
    const handleFileDialogCancelled = () => {
      setIsSelectingFiles(false);
    };
    
    window.addEventListener('fileDialogCancelled', handleFileDialogCancelled);
    
    return () => {
      window.removeEventListener('fileDialogCancelled', handleFileDialogCancelled);
    };
  }, []);

  const handleDeleteMessage = (messageId: string) => {
    if (!channelId) return;
    
    // Ajouter le message à la liste des messages en cours de suppression
    setDeletingMessages(prev => [...prev, messageId]);
    
    // Émettre l'événement de suppression
    deleteSocketMessage(channelId, messageId);
  };
  
  // Fonction pour gérer l'ajout d'emoji
  const handleEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  // Fonction pour gérer les touches spéciales (Shift+Enter) - CORRIGÉE
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      setNewMessage(prev => prev + '\n');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };
  
  useEffect(() => {
    const checkPlatinumUser = async () => {
      try {
        const response = await checkPlatinumStatus();
        setIsPlatinum(response.isPlatinum);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut Platinum:', error);
      }
    };
    
    if (user) {
      checkPlatinumUser();
    }
  }, [user]);
  
  if (loading) {
    return <LoadingSpinner fullHeight />;
  }
  
return (
    <div className="flex flex-col overflow-hidden" style={{ height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 110px)' }}>
      {/* Header fixe en haut */}
      <div className="flex-shrink-0 border-b p-3 bg-background rounded-lg z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">#{isMobile && channelInfo.name.length > 6 
            ? `${channelInfo.name.substring(0, 6)}...` 
            : channelInfo.name}
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">{channelInfo.members_count || 0} membres</span>
            </div>
            {/* Afficher le statut de connexion uniquement si l'utilisateur a activé cette option */}
            {userOptions.showStatus === "true" && (
              <div className={`flex items-center gap-1 ${isSocketConnected ? 'text-green-500' : 'text-red-500'}`}>
                <div className={`h-2 w-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {!isMobile && (
                  <span className="text-xs">{isSocketConnected ? 'Connecté' : 'Déconnecté'}</span>
                )}
              </div>
            )}
            <button 
              onClick={() => navigate(`/panel/settings/channel/${channelId}`)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Paramètres du salon"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        {channelInfo.description && channelInfo.description.trim() !== "" && (
          <p className="text-muted-foreground text-sm rounded-md bg-gray-50 p-2 mt-2">{channelInfo.description}</p>
        )}
      </div>
      
      {/* Zone des messages avec défilement contrôlé - prend l'espace restant */}
      <div 
        ref={messagesContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto py-2 space-y-3 relative ${
          isMobile ? 'px-2' : 'px-3'
        }`} 
        style={{
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitScrollbar: 'none'
        } as React.CSSProperties}
      >
        {/* Indicateur de sélection de fichiers - position fixed pour couvrir tout l'écran */}
        {isSelectingFiles && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50" style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
            <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
              <LoadingSpinner size="lg" compact={true} />         
              <p className="mt-3 text-base font-medium">Chargement du fichier...</p>
              <p className="text-sm text-gray-500 mt-1">Veuillez patienter</p>
            </div>
          </div>
        )}
        
        {/* Indicateur de chargement pour plus de messages - plus visible */}
        {loadingMore && (
          <div className="text-center py-3 sticky top-0 bg-background z-10 shadow-sm rounded-md">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
            <span className="ml-2 text-sm font-medium">Chargement des messages...</span>
          </div>
        )}
        
        {!loadingMore && hasMoreMessages && (
          <div className="text-center py-2 cursor-pointer hover:bg-accent/50 rounded-md" onClick={loadMoreMessages}>
            <span className="text-sm text-primary font-medium">Charger plus de messages</span>
          </div>
        )}
        
        {!loadingMore && !hasMoreMessages && currentBatch >= totalBatches && messages.length > 15 && (
          <div className="text-center py-2">
            <span className="text-sm text-muted-foreground">Début de la conversation...</span>
          </div>
        )}
        
        {/* Affichage des messages */}
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 rounded-lg bg-gray-50">
            Aucun message dans ce canal. Soyez le premier à écrire !
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex items-start hover:bg-gray-50 rounded-lg border border-gray-100 group relative ${
                isMobile ? 'gap-2 p-1.5' : 'gap-3 p-2'
              }`}
              onContextMenu={(e) => {
                if (message.user === user?.username) {
                  e.preventDefault();
                  
                  // Supprimer tout menu contextuel existant
                  const existingMenu = document.getElementById('context-menu');
                  if (existingMenu) {
                    document.body.removeChild(existingMenu);
                  }
                  
                  // Créer un menu contextuel à l'endroit exact du clic droit
                  const contextMenu = document.createElement('div');
                  contextMenu.id = 'context-menu';
                  contextMenu.className = 'fixed bg-white shadow-md rounded-md z-50';
                  contextMenu.style.left = `${e.clientX}px`;
                  contextMenu.style.top = `${e.clientY}px`;
                  
                  // Créer le bouton de suppression
                  const deleteButton = document.createElement('button');
                  deleteButton.className = 'flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full';
                  deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>Supprimer`;
                  
                  // Ajouter l'événement de clic pour supprimer le message
                  deleteButton.addEventListener('click', () => {
                    handleDeleteMessage(message.id);
                    if (document.body.contains(contextMenu)) {
                      document.body.removeChild(contextMenu);
                    }
                  });
                  
                  contextMenu.appendChild(deleteButton);
                  document.body.appendChild(contextMenu);
                  
                  // Fermer le menu contextuel lors d'un clic ailleurs
                  const closeContextMenu = (event: MouseEvent) => {
                    if (!contextMenu.contains(event.target as Node)) {
                      if (document.body.contains(contextMenu)) {
                        document.body.removeChild(contextMenu);
                      }
                      document.removeEventListener('click', closeContextMenu as EventListener);
                    }
                  };
                  
                  // Fermer automatiquement après 2 secondes
                  setTimeout(() => {
                    if (document.body.contains(contextMenu)) {
                      document.body.removeChild(contextMenu);
                      document.removeEventListener('click', closeContextMenu as EventListener);
                    }
                  }, 2000);
                  
                  // Ajouter un délai pour éviter que le menu ne se ferme immédiatement
                  setTimeout(() => {
                    document.addEventListener('click', closeContextMenu as EventListener);
                  }, 100);
                }
              }}
            >
              {message.avatar ? (
                <Avatar className="h-8 w-8 rounded-full overflow-hidden">
                  <AvatarImage 
                    src={getFullAvatarUrl(message.avatar)} 
                    alt={message.user} 
                    className="object-cover w-full h-full" 
                  />
                </Avatar>
              ) : (
                <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className={`min-w-0 flex-1 relative ${isMobile ? 'max-w-full overflow-hidden' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.user}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                </div>
                <div className="text-sm mt-1 break-words overflow-x-auto" 
                   style={{ 
                     whiteSpace: 'pre-wrap', 
                     overflowWrap: 'break-word', 
                     wordBreak: 'break-word',
                     maxWidth: '100%' 
                   }}>
                  {message.content.split(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu).map((part, index) => {
                    // Vérifier si la partie est un emoji
                    if (/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu.test(part)) {
                      return <span key={index} className="text-xl inline-block">{part}</span>;
                    }
                    return <span key={index}>{part}</span>;
                  })}
                </div>
                
                {/* AFFICHAGE DES FICHIERS AVEC AUTHENTIFICATION */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 space-y-3">
                    {message.files.map((file) => (
                      <div 
                        key={file.id} 
                        className={`border rounded-lg overflow-hidden bg-card ${
                          isMobile ? 'max-w-full w-full' : 'max-w-md'
                        }`}
                        style={{ 
                          maxWidth: isMobile ? '100%' : '500px'
                        }}
                      >
                        {/* Aperçu de l'image si c'est une image */}
                        {isImageFile(file.filename) ? (
                          <div className="relative">
                            {imageLoadingStates[file.id] === 'loading' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-t-lg">
                                <LoadingSpinner />
                                <span className="ml-2 text-muted-foreground">Chargement de l'image...</span>
                              </div>
                            )}
                            {imageLoadingStates[file.id] === 'error' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-t-lg">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                                <span className="ml-2 text-destructive">Erreur de chargement</span>
                              </div>
                            )}
                            {secureImageUrls[file.id] && (
                              <img
                                src={secureImageUrls[file.id]}
                                alt={file.filename}
                                className={`object-contain bg-background rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity ${
                                  isMobile 
                                    ? 'w-full max-h-32' 
                                    : 'w-full max-w-md max-h-80'
                                }`}
                                style={{ 
                                  maxWidth: isMobile ? '100%' : '500px',
                                  width: isMobile ? '100%' : 'auto'
                                }}
                                onClick={() => setSelectedImageUrl(secureImageUrls[file.id])}
                                onLoad={() => {
                                  setImageLoadingStates(prev => ({ ...prev, [file.id]: 'loaded' }));
                                  // Scroll automatique après chargement de l'image
                                  setTimeout(scrollToBottom, 50);
                                }}
                                onError={() => {
                                  console.error('Erreur de chargement de l\'image:', file.filename);
                                  setImageLoadingStates(prev => ({ ...prev, [file.id]: 'error' }));
                                }}
                              />
                            )}
                            {/* Informations et bouton télécharger pour les images */}
                            <div className={`border-t ${isMobile ? 'p-2' : 'p-3'}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(0)} KB
                                </span>
                                <Button
                                  onClick={() => handleFileAccess(file.url, 'download')}
                                  variant="outline"
                                  size="sm"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7,10 12,15 17,10"/>
                                    <line x1="12" x2="12" y1="15" y2="3"/>
                                  </svg>
                                  {isMobile ? 'Télécharger' : 'Télécharger'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Affichage pour les fichiers non-image */
                          <div className="p-3 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium truncate">{isMobile && file.filename.length > 12
                              ? `${file.filename.substring(0, 12)}...` 
                              : file.filename}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                            
                            {/* Boutons d'action pour les fichiers non-image */}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleFileAccess(file.url, 'download')}
                                variant="default"
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7,10 12,15 17,10"/>
                                  <line x1="12" x2="12" y1="15" y2="3"/>
                                </svg>
                                Télécharger
                              </Button>
                              <Button
                                onClick={() => handleFileAccess(file.url, 'open')}
                                variant="outline"
                                size="sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15,3 21,3 21,9"/>
                                  <line x1="10" x2="21" y1="14" y2="3"/>
                                </svg>
                                Ouvrir
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Menu de suppression - repositionné au milieu à droite et visible au survol */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-0">
                      {/* Bouton de copie pour tous les messages */}
                      <button 
                        onClick={() => {
                          // Copier le contenu du message dans le presse-papier
                          navigator.clipboard.writeText(message.content);
                          
                          // Afficher une notification simple
                          const notification = document.createElement('div');
                          notification.className = 'fixed bottom-4 right-4 bg-grey-100 border border-green-200 text-green-800 px-4 py-2 rounded-lg shadow-md z-50 flex items-center gap-2';
                          notification.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Message copié</span>
                          `;
                          document.body.appendChild(notification);
                          
                          // Supprimer la notification après 2 secondes
                          setTimeout(() => {
                            if (document.body.contains(notification)) {
                              document.body.removeChild(notification);
                            }
                          }, 2000);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                        Copier
                      </button>
                      
                      {/* Bouton de suppression - uniquement pour les messages de l'utilisateur */}
                      {message.user === user?.username && (
                        <button 
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessages.includes(message.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {deletingMessages.includes(message.id) ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-red-600 border-r-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Supprimer
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          ))
        )}
        {/* Élément invisible pour le défilement automatique */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Footer fixe en bas pour l'envoi de messages */}
      <div className="bg-background border-t p-3 rounded-lg">
        <form onSubmit={handleSendMessage}>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message... "
                className={`flex w-full rounded-lg border border-input bg-background px-3 ${isMobile ? 'py-1' : 'py-2'} text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 ${isMobile ? 'h-8' : 'h-10'} resize-none overflow-hidden pr-16`}
                rows={1}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <button 
                  type="button" 
                  onClick={handleOpenFileDialog}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="Joindre un fichier (Membres Platinum uniquement)"
                  disabled={isSelectingFiles}
                >
                  <Paperclip className="h-5 w-5 text-gray-500" />
                </button>
                <button 
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <Smile className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              {showEmojiPicker && (
                <div className={`absolute ${isMobile ? 'bottom-12 right-0 max-w-[90vw] max-h-[40vh]' : 'bottom-full right-0 mb-2'} z-10 shadow-lg rounded-lg overflow-hidden`}>
                  <div className={isMobile ? 'scale-75 origin-bottom-right' : ''}>
                    <EmojiPicker 
                      onEmojiClick={handleEmojiClick} 
                      lazyLoadEmojis={true}
                      searchDisabled={isMobile}
                      skinTonesDisabled={isMobile}
                      width={isMobile ? 280 : 320}
                      height={isMobile ? 320 : 400}
                    />
                  </div>
                </div>
              )}
            </div>
            <button 
              type="submit"
              className={`bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors ${isMobile ? 'h-8 px-3' : 'h-10 px-4'} py-2`}
              disabled={uploadingFiles}
            >
              {uploadingFiles ? (
                <LoadingSpinner size="sm" compact={true} />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* Input caché pour l'upload de fichiers */}
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Télécharger des fichiers"
            tabIndex={-1}
          />
          
          {/* Affichage des fichiers sélectionnés */}
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((file) => {
                const fileName = 'file' in file && file.file instanceof File ? file.file.name : 'Fichier';
                
                return (
                  <div key={file.id} className="flex flex-col w-full max-w-[200px] bg-gray-100 rounded-lg p-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate max-w-[150px]">{fileName}</span>
                      {!uploadingFiles && (
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Afficher la taille du fichier */}
                    {'file' in file && file.file instanceof File && (
                      <span className="text-gray-500 text-xs">
                        {(file.file.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                    
                    {/* Indicateur de chargement */}
                    {uploadingFiles && (
                      <div className="mt-1">
                        <Progress value={fileProgress[fileName] || 0} className="h-1" />
                        <span className="text-xs text-gray-500 mt-1">
                          {Math.round(fileProgress[fileName] || 0)}% téléchargé
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Affichage des erreurs */}
          {showErrors && errors.length > 0 && (
            <p className="text-red-500 text-xs mt-1">{errors[0]}</p>
          )}
        </form>
      </div>

      {/* Ajout du composant de confettis */}
      {isExploding && (
        <ConfettiExplosion
          force={0.6}
          duration={3000}
          particleCount={100}
          width={1600}
          colors={['#FF5733', '#33FF57', '#5733FF', '#FF33A8', '#33A8FF']}
        />
      )}
    
    {/* Dialogue pour message trop long */}
    <Dialog open={showLongMessageDialog} onOpenChange={setShowLongMessageDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Message trop long
          </DialogTitle>
          <DialogDescription>
            Votre message dépasse la limite de 5000 caractères. Veuillez le raccourcir avant de l'envoyer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button 
            onClick={() => setShowLongMessageDialog(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
          >
            Compris
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={showPlatinumInviteDialog} onOpenChange={setShowPlatinumInviteDialog}>
      <DialogContent className="border-2 border-amber-400 bg-gradient-to-b from-white to-amber-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <Crown className="h-5 w-5 text-amber-500" />
            Fonctionnalité Premium
          </DialogTitle>
          <DialogDescription className="text-center">
            <p className="mb-4 text-amber-800 font-medium">Cette fonctionnalité est réservée aux membres Platinum</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button 
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-10 px-4 py-2 w-full"
            onClick={() => {
              setShowPlatinumInviteDialog(false);
              navigate('/panel/settings#section-platinum');
            }}
          >
            Découvrir l'offre Platinum
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Dialogue pour erreur backend */}
    <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Erreur
          </DialogTitle>
          <DialogDescription>
            {errorMessage}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button 
            onClick={() => setShowErrorDialog(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
          >
            Fermer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal d'agrandissement d'image */}
    {selectedImageUrl && (
      <div 
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={() => setSelectedImageUrl(null)}
      >
        <div className="relative max-w-full max-h-full">
          <img
            src={selectedImageUrl}
            alt="Image agrandie"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImageUrl(null)}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    )}
    </div>
  );
}

export default ChannelView;