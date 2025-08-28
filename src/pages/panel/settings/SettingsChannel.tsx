import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChannelDetails } from "@/services/channelService";
import { apiPost, apiDelete } from "@/services/apiService";
import { X, UserPlus, Trash2, Shield, Crown, LogOut, Edit2, Settings, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSocket } from "@/services/socketService";

interface Member {
  uniqueid: string;
  username: string;
  role: string;
  joined_at: string;
}

interface ChannelDetails {
  id: string;
  name: string;
  description: string;
  created_by: string;
  members_count: number;
}

function SettingsChannel() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteChannelName, setDeleteChannelName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  
  // État pour gérer l'affichage des actions des membres
  const [showMemberActions, setShowMemberActions] = useState<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    const fetchChannelDetails = async () => {
      if (!channelId || !user) return; // Vérifier que user existe
      
      try {
        setLoading(true);
        const response = await getChannelDetails(channelId);
        
        setChannel(response.channel);
        setMembers(response.members);
        
        // Déterminer le rôle de l'utilisateur actuel
        const currentUserId = user.uniqueid; // Utiliser l'ID de l'utilisateur connecté
        const currentMember = response.members.find((member: Member) => member.uniqueid === currentUserId);
        
        if (currentMember) {
          setUserRole(currentMember.role);
          setIsOwner(response.channel.created_by === currentUserId);
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des détails du salon:', error);
        setError("Impossible de charger les détails du salon. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchChannelDetails();
  }, [channelId, user]); // Ajouter user comme dépendance
  
  const handleDeleteChannel = async () => {
    if (!channel) return;
    
    if (deleteChannelName !== channel.name) {
      setDeleteError("Le nom du salon ne correspond pas.");
      return;
    }
    
    try {
      await apiDelete(`/api/channels/${channelId}`);
      navigate('/panel/channels');
      window.location.href = `/panel/channels`;
    } catch (error) {
      console.error('Erreur lors de la suppression du salon:', error);
      setDeleteError("Impossible de supprimer le salon. Veuillez réessayer plus tard.");
    }
  };

  const handleUpdateDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de la description
    if (newDescription.trim() !== "" && newDescription.length < 10) {
      setDescriptionError("La description doit contenir au moins 10 caractères");
      return;
    } else if (newDescription.length > 200) {
      setDescriptionError("La description ne peut pas dépasser 200 caractères");
      return;
    }
    
    try {
      await apiPost(`/api/channels/${channelId}/update-description`, { description: newDescription });
      
      // Mettre à jour l'état local
      setChannel(prev => prev ? { ...prev, description: newDescription } : null);
      setIsEditingDescription(false);
      setDescriptionError("");
    } catch (err) {
      const error = (err as Error).message;
      setDescriptionError(error || "Impossible de mettre à jour la description");
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    try {
      await apiPost(`/api/channels/${channelId}/remove-member`, { userId: memberId });
      
      // Mettre à jour la liste des membres
      setMembers(prev => prev.filter(member => member.uniqueid !== memberId));
      
      // Fermer le menu des actions
      setShowMemberActions(prev => ({ ...prev, [memberId]: false }));
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      setError("Impossible de supprimer le membre. Veuillez réessayer plus tard.");
    }
  };
  
  const handleToggleAdmin = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    try {
      await apiPost(`/api/channels/${channelId}/update-role`, { 
        userId: memberId,
        role: newRole
      });
      
      // Mettre à jour la liste des membres
      setMembers(prev => prev.map(member => {
        if (member.uniqueid === memberId) {
          return { ...member, role: newRole };
        }
        return member;
      }));
      
      // Fermer le menu des actions
      setShowMemberActions(prev => ({ ...prev, [memberId]: false }));
    } catch (error) {
      console.error('Erreur lors de la modification du rôle:', error);
      setError("Impossible de modifier le rôle. Veuillez réessayer plus tard.");
    }
  };
  
  const handleLeaveChannel = async () => {
    try {
      await apiPost(`/api/channels/${channelId}/leave`, {});
      navigate('/panel/channels');
      window.location.href = `/panel/channels`;
    } catch (error) {
      console.error('Erreur lors de la sortie du salon:', error);
      setError("Impossible de quitter le salon. Veuillez réessayer plus tard.");
    }
  };
  
  // Ajouter cet état dans la liste des états au début du composant
  const [isInviting, setIsInviting] = useState(false);
  
  const handleInviteMember = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!newMemberUsername.trim()) {
    setInviteError("Veuillez entrer un nom d'utilisateur.");
    return;
  }
  
  // Désactiver le bouton pendant le traitement
  setIsInviting(true);
  
  try {
    // Modifier cette ligne pour récupérer la réponse complète
    const response = await apiPost(`/api/channels/${channelId}/invite`, { username: newMemberUsername });
    setInviteSuccess(`Invitation envoyée à ${newMemberUsername}`);
    setNewMemberUsername("");
    setInviteError("");
    
    const socket = getSocket();
    if (socket) {
    // Modifier cette ligne pour utiliser le bon événement et envoyer l'ID utilisateur
    socket.emit('invite-user', { channelId, toUserId: response.toUserId });
    }
    
    // Effacer le message de succès après 3 secondes
    setTimeout(() => {
      setInviteSuccess("");
    }, 3000);
  } catch (err) {
    const error = (err as Error).message;
    console.error('Erreur lors de l\'invitation:', error);
    setInviteError(error || "Impossible d'inviter cet utilisateur.");
  } finally {
    // Réactiver le bouton après le traitement
    setIsInviting(false);
  }
};

// Puis modifier le bouton d'invitation pour utiliser cet état
<button 
  type="submit" 
  className="..." 
  disabled={isInviting}
>
  {isInviting ? "Invitation en cours..." : "Inviter"}
</button>

  const toggleMemberActions = (memberId: string) => {
    setShowMemberActions(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const canManageMember = (member: Member) => {
    // Le propriétaire peut gérer tous les membres sauf lui-même
    if (isOwner && member.uniqueid !== channel?.created_by) {
      return true;
    }
    
    // Les admins peuvent gérer les membres normaux (pas les autres admins ni le propriétaire)
    if (userRole === 'admin' && !isOwner && member.role !== 'admin' && member.uniqueid !== channel?.created_by) {
      return true;
    }
    
    return false;
  };
  
  if (loading) {
    return <LoadingSpinner fullHeight text="Chargement des paramètres du salon..." />;
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!channel) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertTitle>Salon non trouvé</AlertTitle>
        <AlertDescription>Le salon demandé n'existe pas ou vous n'y avez pas accès.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className={`${isMobile ? 'max-w-none mx-1' : 'max-w-4xl mx-auto'} ${isMobile ? 'p-1' : 'p-6'} space-y-8`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        <h1 className="text-3xl font-bold">Paramètres du salon</h1>
        <Button variant="outline" onClick={() => navigate(`/panel/channels/${channelId}`)}>
          Retour au salon
        </Button>
      </div>
      
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">#{isMobile && channel.name.length > 10
            ? `${channel.name.substring(0, 10)}...` 
            : channel.name}</h2>
        {(isOwner || userRole === 'admin') ? (
          isEditingDescription ? (
            <form onSubmit={handleUpdateDescription} className="space-y-4">
              <textarea
                value={newDescription}
                onChange={(e) => {
                  setNewDescription(e.target.value);
                  setDescriptionError("");
                }}
                placeholder="Description du salon (optionnelle)"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              
              {descriptionError && (
                <Alert variant="destructive">
                  <AlertDescription>{descriptionError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button type="submit">Enregistrer</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditingDescription(false);
                    setNewDescription(channel.description || "");
                    setDescriptionError("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start gap-2 mb-6">
              <p className="text-gray-600 flex-1">{channel.description || "Aucune description"}</p>
              <button 
                onClick={() => {
                  setIsEditingDescription(true);
                  setNewDescription(channel.description || "");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                title="Modifier la description"
              >
                <Edit2 size={16} />
              </button>
            </div>
          )
        ) : (
          <p className="text-gray-600 mb-6">{channel.description || "Aucune description"}</p>
        )}
      </div>
      
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex items-center justify-between'} mb-6`}>
          <h2 className="text-2xl font-semibold">Membres ({members.length})</h2>
          
          {(isOwner || userRole === 'admin') && (
            <form onSubmit={handleInviteMember} className={`flex ${isMobile ? 'flex-col w-full' : 'items-center'} gap-2`}>
              <input
                type="text"
                value={newMemberUsername}
                onChange={(e) => {
                  setNewMemberUsername(e.target.value);
                  setInviteError("");
                }}
                placeholder="Nom d'utilisateur"
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button type="submit" className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
                <UserPlus size={16} />
                Inviter
              </Button>
            </form>
          )}
        </div>
        
        {inviteError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{inviteError}</AlertDescription>
          </Alert>
        )}
        
        {inviteSuccess && (
          <Alert className="mb-4">
            <AlertDescription>{inviteSuccess}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.uniqueid} className={`${isMobile ? 'flex flex-col gap-2 p-3' : 'flex items-center justify-between p-3'} rounded-lg border hover:bg-gray-50`}>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                  {member.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{member.username}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className={`flex ${isMobile ? 'justify-end' : ''} items-center gap-2`}>
                {member.role === 'admin' && member.uniqueid !== channel.created_by && (!isMobile || !showMemberActions[member.uniqueid]) && (
                  <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs">
                    <Shield size={12} />
                    Admin
                  </div>
                )}
                
                {member.uniqueid === channel.created_by && (
                  <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs">
                    <Crown size={12} />
                    Propriétaire
                  </div>
                )}
                
                {canManageMember(member) && (
                  <div className="relative">
                    {!showMemberActions[member.uniqueid] ? (
                      <button
                        onClick={() => toggleMemberActions(member.uniqueid)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Actions"
                      >
                        <Settings size={16} />
                      </button>
                    ) : (
                      <div className={`flex items-center ${isMobile ? 'flex-wrap justify-end' : ''} gap-2`}>
                        {isOwner && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleToggleAdmin(member.uniqueid, member.role)}
                            className="text-xs h-8"
                          >
                            {member.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                          </Button>
                        )}
                        
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveMember(member.uniqueid)}
                          className="text-xs h-8"
                          title="Exclure ce membre"
                        >
                          <UserX size={14} />
                        </Button>
                        
                        <button
                          onClick={() => toggleMemberActions(member.uniqueid)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Section pour quitter ou supprimer le salon */}
        <div className="mt-8 border-t pt-6">
          {!isOwner && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Quitter le salon</h3>
              <p className="text-sm text-gray-500 mb-4">Vous ne serez plus membre de ce salon et n'aurez plus accès aux messages.</p>
              <Button variant="destructive" className={isMobile ? 'w-full' : ''} onClick={handleLeaveChannel}>
                <LogOut className="mr-2 h-4 w-4" /> Quitter le salon
              </Button>
            </div>
          )}
          
          {isOwner && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 text-red-600">Zone dangereuse</h3>
              <p className="text-sm text-gray-500 mb-4">La suppression d'un salon est définitive. Tous les messages seront perdus.</p>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className={isMobile ? 'w-full' : ''}>
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer le salon
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le salon</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tous les messages et données du salon seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">Pour confirmer, veuillez saisir le nom du salon : <strong>{channel.name}</strong></p>
            <input
              type="text"
              value={deleteChannelName}
              onChange={(e) => {
                setDeleteChannelName(e.target.value);
                setDeleteError("");
              }}
              placeholder="Nom du salon"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            
            {deleteError && (
              <p className="text-red-500 text-sm mt-2">{deleteError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteChannel}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsChannel;