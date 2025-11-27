import { useState, useEffect } from "react";
import { getUserInvitations, respondToInvitation } from "@/services/invitationService";
import { getBlockedUsers, unblockUser, blockAndRejectInvitation } from "@/services/blockService";
import { Check, X, Ban, UserX, Loader } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/services/socketService";

// Définition de l'interface pour les invitations
interface Invitation {
  id: string;
  channel_name: string;
  from_username: string;
  channel_id: string;
  status: string;
}

// Définition de l'interface pour les utilisateurs bloqués
interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_username: string;
  created_at: string;
}

function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("invitations");
  const isMobile = useIsMobile();
  
  // États pour les actions avec indicateur de chargement
  const [loadingActions, setLoadingActions] = useState<{[key: string]: boolean}>({});
  
  // État pour la boîte de dialogue de confirmation de blocage
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [invitationToBlock, setInvitationToBlock] = useState<{id: string, username: string} | null>(null);
  
  useEffect(() => {
    if (activeTab === "invitations") {
      fetchInvitations();
    } else if (activeTab === "blocked") {
      fetchBlockedUsers();
    }
  }, [activeTab]);

  // Effet pour écouter les événements socket
  useEffect(() => {
    const socket = getSocket();
    
    if (socket) {
      // Écouter l'événement invite-user pour mettre à jour la liste
      
      const handleInviteUser = () => {
        console.log('Écoute de l\'événement invite-user');
        // Rafraîchir la liste des invitations si l'onglet est actif
        if (activeTab === "invitations") {
          fetchInvitations();
        }
      };
      
      socket.on('new-invitation', handleInviteUser);
      
      // Nettoyer l'écouteur lors du démontage du composant
      return () => {
        socket.off('new-invitation', handleInviteUser);
      };
    }
  }, [activeTab]); // Dépendance sur activeTab pour s'assurer qu'on rafraîchit seulement si nécessaire

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await getUserInvitations();
      setInvitations(response.invitations || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des invitations:', err);
      setError(err.message || 'Une erreur est survenue');
      if (err.message.includes('Authentification') || err.message.includes('non autorisé')) {
        console.log('Problème d\'authentification détecté');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      const response = await getBlockedUsers();
      setBlockedUsers(response.blockedUsers || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs bloqués:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoadingBlocked(false);
    }
  };
  
  const handleInvitationResponse = async (invitationId: string, accept: boolean, channelId: string) => {
    try {
      // Activer l'indicateur de chargement pour ce bouton spécifique
      setLoadingActions(prev => ({ ...prev, [`response_${invitationId}_${accept}`]: true }));
      
      await respondToInvitation(invitationId, accept);
      // Mettre à jour la liste des invitations
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Émettre un événement pour mettre à jour le compteur d'invitations
      const socket = getSocket();
      if (socket) {
        socket.emit('invitation-processed');
      }
      
      // Rediriger uniquement si l'invitation est acceptée
      if (accept) {
        window.location.href = `/panel/channels/${channelId}`;
      }
    } catch (err) {
      console.error('Erreur lors de la réponse à l\'invitation:', err);
      setError('Une erreur est survenue');
    } finally {
      // Désactiver l'indicateur de chargement
      setLoadingActions(prev => ({ ...prev, [`response_${invitationId}_${accept}`]: false }));
    }
  };
  
  const openBlockDialog = (invitationId: string, username: string) => {
    setInvitationToBlock({ id: invitationId, username });
    setBlockDialogOpen(true);
  };
  
  const handleBlockUser = async (invitationId: string) => {
    try {
      // Activer l'indicateur de chargement pour ce bouton
      setLoadingActions(prev => ({ ...prev, [`block_${invitationId}`]: true }));
      
      await blockAndRejectInvitation(invitationId);
      // Mettre à jour la liste des invitations
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      // Rafraîchir la liste des utilisateurs bloqués si l'onglet est actif
      if (activeTab === "blocked") {
        fetchBlockedUsers();
      }
      
      // Fermer la boîte de dialogue
      setBlockDialogOpen(false);
      setInvitationToBlock(null);
    } catch (err) {
      console.error('Erreur lors du blocage de l\'utilisateur:', err);
      setError('Une erreur est survenue');
    } finally {
      // Désactiver l'indicateur de chargement
      setLoadingActions(prev => ({ ...prev, [`block_${invitationId}`]: false }));
    }
  };
  
  const handleUnblockUser = async (blockedUserId: string) => {
    try {
      // Activer l'indicateur de chargement pour ce bouton
      setLoadingActions(prev => ({ ...prev, [`unblock_${blockedUserId}`]: true }));
      
      await unblockUser(blockedUserId);
      // Mettre à jour la liste des utilisateurs bloqués
      setBlockedUsers(prev => prev.filter(user => user.blocked_user_id !== blockedUserId));
    } catch (err) {
      console.error('Erreur lors du déblocage de l\'utilisateur:', err);
      setError('Une erreur est survenue');
    } finally {
      // Désactiver l'indicateur de chargement
      setLoadingActions(prev => ({ ...prev, [`unblock_${blockedUserId}`]: false }));
    }
  };
  
  return (
    <div className={`${isMobile ? 'space-y-6 p-6' : 'space-y-6'}`}>
      <div>
        <h1 className="text-3xl font-bold">Invitations</h1>
        <p className="text-muted-foreground mt-2">Gérez vos invitations aux salons de discussion</p>
      </div>
      
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
      
      <Tabs defaultValue="invitations" onValueChange={setActiveTab}>
        <TabsList className={`${isMobile ? 'grid w-full mx-auto grid-cols-2' : 'grid w-100 mx-auto grid-cols-2'}`}>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="blocked">Bloqués</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invitations" className="space-y-4 mt-4">
          {loading ? (
            <LoadingSpinner />
          ) : invitations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Vous n'avez aucune invitation en attente.
            </div>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{isMobile && invitation.channel_name.length > 6
            ? `${invitation.channel_name.substring(0, 6)}...` 
            : invitation.channel_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Invitation de {invitation.from_username}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, true, invitation.channel_id)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                      disabled={loadingActions[`response_${invitation.id}_true`]}
                    >
                      {loadingActions[`response_${invitation.id}_true`] ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      {isMobile ? '' : 'Accepter'}
                    </button>
                    <button
                      onClick={() => handleInvitationResponse(invitation.id, false, invitation.channel_id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                      disabled={loadingActions[`response_${invitation.id}_false`]}
                    >
                      {loadingActions[`response_${invitation.id}_false`] ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      {isMobile ? '' : 'Refuser'}
                    </button>
                    <button
                      onClick={() => openBlockDialog(invitation.id, invitation.from_username)}
                      className="bg-gray-500 text-white hover:bg-gray-600 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                      title="Bloquer cet utilisateur"
                      disabled={loadingActions[`block_${invitation.id}`]}
                    >
                      {loadingActions[`block_${invitation.id}`] ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4 mr-1" />
                      )}
                      {isMobile ? '' : 'Bloquer'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="blocked" className="space-y-4 mt-4">
          {loadingBlocked ? (
            <LoadingSpinner />
          ) : blockedUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Vous n'avez bloqué aucun utilisateur.
            </div>
          ) : (
            blockedUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{user.blocked_username}</h3>
                    <p className="text-sm text-muted-foreground">
                      Bloqué le {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => handleUnblockUser(user.blocked_user_id)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                      disabled={loadingActions[`unblock_${user.blocked_user_id}`]}
                    >
                      {loadingActions[`unblock_${user.blocked_user_id}`] ? (
                        <Loader className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4 mr-1" />
                      )}
                      Débloquer
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Boîte de dialogue de confirmation pour le blocage */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquer l'utilisateur</DialogTitle>
            <DialogDescription>
              {invitationToBlock && (
                <>
                  Vous êtes sur le point de bloquer <strong>{invitationToBlock.username}</strong>. 
                  Les invitations de cet utilisateur seront désormais refusées automatiquement et 
                  les invitations actuelles seront supprimées.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setBlockDialogOpen(false);
                setInvitationToBlock(null);
              }}
              className="sm:order-1"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => invitationToBlock && handleBlockUser(invitationToBlock.id)}
              disabled={loadingActions[`block_${invitationToBlock?.id}`]}
              className="sm:order-2"
            >
              {loadingActions[`block_${invitationToBlock?.id}`] ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Blocage en cours...
                </>
              ) : (
                <>Bloquer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvitationsList;