import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Settings, Bell } from "lucide-react";
import { getUserInvitations } from "@/services/invitationService";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

interface UserData {
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  platinum?: boolean;
}

function PanelHome() {
  const navigate = useNavigate();
  const [invitationCount, setInvitationCount] = useState(0);
  const [_loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { user } = useAuth(); 

   const userInfo: UserData = user ? {
    name: (user as UserData).username || (user as UserData).name || '',
    email: (user as UserData).email || '',
    avatar: (user as UserData).avatar || "",
    platinum: (user as UserData).platinum || false
  } : {
    name: "Chargement...",
    email: "",
    avatar: ""
  };

  const Username = userInfo.name ?? ""
  const Uppername = Username.charAt(0).toUpperCase() + Username.slice(1) ;
  
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
    <div className={`${isMobile ? 'space-y-6 w-full p-6' : 'space-y-6 w-full'}`}>
      <div>
        <h1 className="text-3xl font-bold">Bienvenue, {Uppername}</h1>
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
      </div>
    </div>
  );
}

export default PanelHome;