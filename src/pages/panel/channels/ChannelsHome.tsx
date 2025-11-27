import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, PlusCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getUserChannels } from "@/services/channelService";
import { useIsMobile } from "@/hooks/use-mobile";

interface Channel {
  id: string;
  name: string;
  description: string;
  member_count?: number;
}

interface ChannelInfo {
  name: string;
  description: string;
  members_count?: number;
}

function ChannelsHome() {
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const response = await getUserChannels();
        // Transformer les données pour correspondre à l'interface Channel
        const transformedChannels = response.channels.map((channel: ChannelInfo) => ({
          ...channel,
          member_count: channel.members_count
        })) || [];
        setChannels(transformedChannels);
      } catch (err) {
        console.error('Erreur lors du chargement des canaux:', err);
        setError("Impossible de charger les canaux. Veuillez réessayer plus tard.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchChannels();
  }, []);
  
  if (loading) {
    return <LoadingSpinner text="Chargement des salons..." />;
  }
  
  return (
    <div className={`${isMobile ? 'space-y-6 p-6' : 'space-y-6'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salons de discussion</h1>
          <p className="text-muted-foreground mt-2">Gérez vos salons de discussion</p>
        </div>
        <button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
          onClick={() => navigate("/panel/channels/new")}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nouveau salon
        </button>
      </div>
      
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md">
          {error}
        </div>
      )}
      
      {channels.length === 0 && !loading && !error ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">Aucun salon disponible. Créez votre premier salon !</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <div 
              key={channel.id}
              className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/panel/channels/${channel.id}`)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h3 className="text-lg font-semibold">#{isMobile && channel.name.length > 10
            ? `${channel.name.substring(0, 10)}...` 
            : channel.name}</h3>
                <div className="ml-auto text-sm text-muted-foreground">
                  {channel.member_count || 0} membres
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{channel.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ChannelsHome;