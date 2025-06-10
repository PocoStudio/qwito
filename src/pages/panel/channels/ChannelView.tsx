import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, User, Users, Settings, Smile, AlertCircle } from "lucide-react";
import { getChannelDetails, getChannelMessageBatch, getChannelMessageBatchCount } from "@/services/channelService";
import { sendMessage as sendSocketMessage, leaveChannel } from "@/services/socketService";
import { getSocket } from "@/services/socketService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSocketStatus } from '@/hooks/useSocketStatus';
import EmojiPicker from 'emoji-picker-react';
import { getUserOptions } from "@/services/userService";
import ConfettiExplosion from 'react-confetti-explosion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Define interfaces for our data structures
interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: string;
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
}

function ChannelView() {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
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
  
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(1);
  const [userOptions, setUserOptions] = useState<{showStatus?: string}>({});
  const isSocketConnected = useSocketStatus();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Fonction pour défiler vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setMessages(formattedMessages);
      setCurrentBatch(1);
      setHasMoreMessages(batchResponse.totalBatches > 1);
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
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      // Filtrer les messages pour éviter les doublons
      setMessages(prev => {
        const existingIds = new Set(prev.map(msg => msg.id));
        const newMessages = formattedMessages.filter((msg: Message) => !existingIds.has(msg.id));
        return [...newMessages, ...prev];
      });
      
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
  
  // Gestionnaire de défilement pour détecter quand l'utilisateur atteint le haut
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 100 && !loadingMore && hasMoreMessages) {
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
          setMessages(prev => {
            // Éviter les doublons en vérifiant si le message existe déjà
            const messageExists = prev.some(msg => msg.id === message.id);
            if (messageExists) {
              return prev;
            }
            
            return [...prev, {
              id: message.id,
              user: message.username,
              content: message.content,
              timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }];
          });
          // Défiler vers le bas après réception d'un nouveau message
          setTimeout(scrollToBottom, 100);
        }
      });
      
      // Ajouter un écouteur pour les erreurs de message
      socket.on('error-message', (error: any) => {
        console.error('Erreur de message reçue:', error);
        setErrorMessage(error.message || 'Une erreur est survenue lors du traitement du message');
        setShowErrorDialog(true);
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
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !channelId) return;
    
    // Vérifier si le message dépasse 5000 caractères
    if (newMessage.length > 5000) {
      setShowLongMessageDialog(true);
      return;
    }
    
    // Vérifier si le message est "Parcourstup"
    if (newMessage.trim().toLowerCase() === "parcourstup") {
      setIsExploding(true);
      // Arrêter l'effet de confettis après quelques secondes
      setTimeout(() => {
        setIsExploding(false);
      }, 3000); // Durée de l'animation en millisecondes
    }
    
    try {
      // Envoyer le message via Socket.IO
      sendSocketMessage(channelId, newMessage);
      setNewMessage("");
      // Le défilement se fera automatiquement grâce à l'effet useEffect
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setErrorMessage(error.message || 'Une erreur est survenue lors de l\'envoi du message');
      setShowErrorDialog(true);
    }
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
  
  if (loading) {
    return <LoadingSpinner fullHeight />;
  }
  
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
      {/* Header fixe en haut */}
      <div className="flex-shrink-0 border-b p-3 bg-background rounded-lg z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">#{channelInfo.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">{channelInfo.members_count || 0} membres</span>
            </div>
            {/* Afficher le statut de connexion uniquement si l'utilisateur a activé cette option */}
            {userOptions.showStatus === "true" && (
              <div className={`flex items-center gap-1 ${isSocketConnected ? 'text-green-500' : 'text-red-500'}`}>
                <div className={`h-2 w-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs">{isSocketConnected ? 'Connecté' : 'Déconnecté'}</span>
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
        className="flex-1 min-h-0 overflow-y-auto py-2 px-3 space-y-3" 
        style={{
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitScrollbar: 'none'
        } as React.CSSProperties}
      >
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
        
        {/* Le reste du code pour afficher les messages */}
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 rounded-lg bg-gray-50">
            Aucun message dans ce canal. Soyez le premier à écrire !
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start gap-3 hover:bg-gray-50 p-2 rounded-lg border border-gray-100">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{message.user}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  <p className="text-sm mt-1 break-words" style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
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
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 h-10 resize-none overflow-hidden"
                rows={1}
              />
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Smile className="h-5 w-5 text-gray-500" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-10 shadow-lg rounded-lg overflow-hidden">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            <button 
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
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
    </div>
  );
}

export default ChannelView;