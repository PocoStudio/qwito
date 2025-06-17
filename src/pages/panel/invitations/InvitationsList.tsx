import { useState, useEffect } from "react";
import { getUserInvitations, respondToInvitation } from "@/services/invitationService";
import { Check, X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useIsMobile } from "@/hooks/use-mobile";

// Définition de l'interface pour les invitations
interface Invitation {
  id: string;
  channel_name: string;
  from_username: string;
  channel_id: string;
  status: string;
}

function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
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
    
    fetchInvitations();
  }, []);
  
  const handleInvitationResponse = async (invitationId: string, accept: boolean, channelId: string) => {
    try {
      await respondToInvitation(invitationId, accept);
      // Mettre à jour la liste des invitations
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      // Rediriger uniquement si l'invitation est acceptée
      if (accept) {
        window.location.href = `/panel/channels/${channelId}`;
      }
    } catch (err) {
      console.error('Erreur lors de la réponse à l\'invitation:', err);
      // setError(err.message || 'Une erreur est survenue');
      setError('Une erreur est survenue');
    }
  };
  
  if (loading) {
    return <LoadingSpinner fullHeight />;
  }
  
  return (
    <div className={`${isMobile ? 'space-y-6 p-5' : 'space-y-6'}`}>
      <div>
        <h1 className="text-3xl font-bold">Invitations</h1>
        <p className="text-muted-foreground mt-2">Gérez vos invitations aux salons de discussion</p>
      </div>
      
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        {invitations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Vous n'avez aucune invitation en attente.
          </div>
        ) : (
          invitations.map((invitation) => (
            <div key={invitation.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{invitation.channel_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invitation de {invitation.from_username}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, true, invitation.channel_id)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(invitation.id, false, invitation.channel_id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 px-3 py-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default InvitationsList;