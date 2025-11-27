import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Settings,
  Bell,
  Plus,
  Minus,
  LogOut,
  BadgeCheck,
  ChevronsUpDown,
} from "lucide-react";
import capiomontLogo from '@/assets/logo.png';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu as SidebarMenuGroup,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Hooks et services
import { useAuth } from "@/hooks/useAuth";
import { getUserChannels } from "@/services/channelService";
import { getUserInvitations } from "@/services/invitationService";
import { initSocket, joinChannelsSafe } from "@/services/socketService";
import { getFullAvatarUrl } from "@/utils/imageUtils";

// Définition des interfaces
interface UserData {
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  platinum?: boolean;
}

interface Channel {
  id: string;
  name: string;
  url: string;
}

// Clé pour le localStorage
const CHANNELS_COLLAPSED_KEY = 'channels-section-collapsed';

function PanelLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { user } = useAuth(); // Nous gardons cette référence pour les données utilisateur
  const [channels, setChannels] = useState<Channel[]>([]);
  const [_loadingChannels, setLoadingChannels] = useState(true);
  const [invitationCount, setInvitationCount] = useState(0);
  
  // État pour contrôler si la section des salons est dépliée
  const [isChannelsSectionOpen, setIsChannelsSectionOpen] = useState(() => {
    const saved = localStorage.getItem(CHANNELS_COLLAPSED_KEY);
    // Par défaut ouvert (true), sauf si explicitement fermé
    return saved ? JSON.parse(saved) : true;
  });
  
  // Sauvegarder l'état dans le localStorage quand il change
  useEffect(() => {
    localStorage.setItem(CHANNELS_COLLAPSED_KEY, JSON.stringify(isChannelsSectionOpen));
  }, [isChannelsSectionOpen]);
  
  useEffect(() => {
    const fetchInvitationCount = async () => {
      try {
        const response = await getUserInvitations();
        setInvitationCount(response.invitations.length);
      } catch (error) {
        console.error('Erreur lors du chargement des invitations:', error);
      }
    };
    
    const fetchChannels = async () => {
      try {
        setLoadingChannels(true);
        const response = await getUserChannels();
        const channelsWithUrl = response.channels.map((channel: Channel) => ({
          ...channel,
          url: `/panel/channels/${channel.id}`
        }));
        setChannels(channelsWithUrl);
        // Initialiser Socket.IO et rejoindre les canaux
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const socket = initSocket(token);
          
          // Utiliser la nouvelle fonction qui attend la connexion
          const joined = await joinChannelsSafe(response.channels);
          if (joined) {
            console.log('Canaux rejoints avec succès');
          }
          
          // Écouter les nouvelles invitations
          socket.on('new-invitation', () => {
            console.log('Nouvelle invitation reçue');
            // Mettre à jour le compteur d'invitations
            fetchInvitationCount();
          });
          
          socket.on('invitation-processed', () => {
            console.log('Invitation traitée (acceptée ou refusée)');
            // Mettre à jour le compteur d'invitations
            fetchInvitationCount();
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des canaux:', error);
      } finally {
        setLoadingChannels(false);
      }
    };
    
    // Nous pouvons maintenant appeler ces fonctions directement
    // car nous savons que l'utilisateur est connecté grâce à ProtectedRoute
    fetchChannels();
    fetchInvitationCount();
  }, []);
  
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

  // Vérifier quelle section est active
  const isSettingsActive = location.pathname.includes("/panel/settings");
  const isInvitationsActive = location.pathname.includes("/panel/invitations");

  const handleLogout = () => {
    // Supprimer le token d'authentification
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    // Rediriger vers la page de connexion
    navigate("/login");
  };
  
  // Fonction pour naviguer et fermer la sidebar sur mobile
  const navigateAndCloseSidebar = (path: string) => {
    navigate(path);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Classes conditionnelles basées sur l'état de la sidebar
  const isCollapsed = state === "collapsed";
  const gapClass = isCollapsed ? "gap-0" : "gap-2";
  const groupGapClass = isCollapsed ? "gap-0" : "gap-1";
  const paddingClass = isCollapsed ? "pb-0 pt-0" : "";
  const labelClass = isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto";
  const textTransitionClass = "transition-all duration-700 ease-in-out";

  
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar sans le trigger */}
      <Sidebar variant="sidebar" collapsible="icon" className="border-r md:block">
        <SidebarRail />
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage 
                        src={getFullAvatarUrl(userInfo.avatar)} 
                        alt={userInfo.name} 
                      />
                      <AvatarFallback className="rounded-lg">
                        {(userInfo.name || '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`grid flex-1 text-left text-sm leading-tight ${textTransitionClass} ${labelClass}`}>
                      <div className="flex items-center gap-1">
                      <span className={`truncate font-medium ${userInfo.platinum ? 'translate-y-[-1px]' : ''}`}>
                          {userInfo.name}
                        </span>
                        {userInfo.platinum && (
                          <BadgeCheck className="h-4 w-4 text-black-500 my-auto" />
                        )}
                      </div>
                      <span className="truncate text-xs">{userInfo.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "start" : "end"}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage 
                      src={getFullAvatarUrl(userInfo.avatar)} 
                      alt={userInfo.name} />
                    <AvatarFallback className="rounded-lg">
                      {(userInfo.name || '').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                      <div className="flex items-center gap-1">
                        <span className={`truncate font-medium ${userInfo.platinum ? 'translate-y-[-1px]' : ''}`}>
                          {userInfo.name}
                        </span>
                        {userInfo.platinum && (
                          <BadgeCheck className="h-4 w-4 text-black-500" />
                        )}
                      </div>
                      <span className="truncate text-xs">{userInfo.email}</span>
                    </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigateAndCloseSidebar("/panel/settings")}>
                      <BadgeCheck />
                      Mon compte
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        
        {/* Contenu de la sidebar avec espacement ajusté */}
        <SidebarContent className={`flex-col ${gapClass}`}>
          {/* Section des salons de discussion */}
          <SidebarGroup className={`${groupGapClass} ${paddingClass} border-none`}>
            <SidebarGroupLabel className={`${textTransitionClass} ${labelClass}`}>
              Salons de discussion
            </SidebarGroupLabel>
            <SidebarMenuGroup className={groupGapClass}>
              <Collapsible 
                asChild 
                open={isChannelsSectionOpen}
                onOpenChange={setIsChannelsSectionOpen}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    tooltip="Salons"
                    onClick={() => navigateAndCloseSidebar("/panel/channels")}
                    className="gap-3"
                  >
                    <div className="flex items-center cursor-pointer">
                      <MessageSquare />
                      <span className={`${textTransitionClass} ${labelClass}`}>Salons</span>
                    </div>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction>
                      {isChannelsSectionOpen ? <Minus /> : <Plus />}
                      <span className="sr-only">
                        {isChannelsSectionOpen ? "Réduire les salons" : "Développer les salons"}
                      </span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className={groupGapClass}>
                      {channels.map((channel) => (
                        <SidebarMenuSubItem key={channel.id}>
                          <SidebarMenuSubButton 
                            asChild
                            className={location.pathname === channel.url ? "bg-accent" : ""}
                          >
                          <div 
                            className="cursor-pointer w-full"
                            onClick={() => navigateAndCloseSidebar(channel.url)}
                          >
                            <span className={textTransitionClass}># {channel.name}</span>
                          </div>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <div 
                            className="cursor-pointer w-full text-muted-foreground hover:text-foreground"
                            onClick={() => navigateAndCloseSidebar("/panel/channels/new")}
                          >
                            <span className={textTransitionClass}>+ Créer un salon</span>
                          </div>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenuGroup>
          </SidebarGroup>

          {/* Section des paramètres et invitations */}
          <SidebarGroup className={`${groupGapClass} ${paddingClass}`}>
            <SidebarGroupLabel className={`${textTransitionClass} ${labelClass}`}>
              Gestion
            </SidebarGroupLabel>
            <SidebarMenuGroup className={groupGapClass}>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Invitations"
                  className={`gap-3 ${isInvitationsActive ? "bg-accent" : ""}`}
                  onClick={() => navigateAndCloseSidebar("/panel/invitations")}
                >
                  <div className="flex items-center cursor-pointer">
                    <Bell />
                    <span className={`${textTransitionClass} ${labelClass}`}>Invitations</span>
                    {invitationCount > 0 && (
                    <div className="ml-auto bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium">
                      {invitationCount}
                    </div>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Paramètres"
                  className={`gap-3 ${isSettingsActive ? "bg-accent" : ""}`}
                  onClick={() => navigateAndCloseSidebar("/panel/settings")}
                >
                  <div className="flex items-center cursor-pointer">
                    <Settings />
                    <span className={`${textTransitionClass} ${labelClass}`}>Paramètres</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenuGroup>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className={groupGapClass}>
          <SidebarMenu className={groupGapClass}>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip="Membres"
                onClick={() => navigateAndCloseSidebar("/panel")}
                className="gap-3"
              >
                <div className="flex items-center cursor-pointer">
                  <img src={capiomontLogo} alt="Accueil" className="w-5 h-5" />
                  <span className={`${textTransitionClass} ${labelClass}`}>Accueil</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      {/* Zone principale avec le trigger repositionné */}
      <div className="flex-1 flex flex-col">
        {/* Header avec le trigger */}
        <div className="flex items-center h-12 border-b bg-background px-4">
          <SidebarTrigger className="h-8 w-8" />
        </div>
        
        {/* Contenu principal */}
        <main className={`${isMobile ? 'flex-1 overflow-auto' : 'flex-1 overflow-auto p-6'}`}>
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function PanelLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <PanelLayoutContent />
    </SidebarProvider>
  );
}

export default PanelLayout;