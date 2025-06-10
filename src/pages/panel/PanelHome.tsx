import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Settings, Bell } from "lucide-react";
import { getUserInvitations } from "@/services/invitationService";

function PanelHome() {
  const navigate = useNavigate();
  const [invitationCount, setInvitationCount] = useState(0);
  const [_loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await getUserInvitations();
        setInvitationCount(response.invitations?.length || 0);
      } catch (err) {
        console.error('Erreur lors du chargement des invitations:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvitations();
  }, []);
  
  return (
    <div className="space-y-6 w-full"> {/* Ajout de w-full pour utiliser toute la largeur disponible */}
      <div>
        <h1 className="text-3xl font-bold">Bienvenue dans votre espace</h1>
        <p className="text-muted-foreground mt-2">Gérez vos salons de discussion et vos paramètres</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <div 
          className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/panel/channels")}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Salons de discussion</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Accédez à vos salons de discussion ou créez-en de nouveaux</p>
        </div>
        
        <div 
          className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/panel/settings")}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Paramètres</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Configurez votre profil et vos préférences</p>
        </div>
        
        <div 
          className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate("/panel/invitations")}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Invitations</h3>
            {invitationCount > 0 && (
              <div className="ml-auto bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                {invitationCount}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Gérez les invitations aux salons de discussion</p>
        </div>
      </div>
    </div>
  );
}

export default PanelHome;