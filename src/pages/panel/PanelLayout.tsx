import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare,
  Settings,
  Bell,
  Users,
  PlusCircle,
  LogOut,
  BadgeCheck,
  ChevronsUpDown,
} from "lucide-react";

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

// Définition des interfaces
interface UserData {
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  url: string;
}


import { LoadingSpinner } from "@/components/ui/loading-spinner";

function PanelLayoutContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const { user, loading: authLoading } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [_loadingChannels, setLoadingChannels] = useState(true);
  const [invitationCount, setInvitationCount] = useState(0);
  
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
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des canaux:', error);
      } finally {
        setLoadingChannels(false);
      }
    };
    
    if (user) {
      fetchChannels();
      fetchInvitationCount();
    }
  }, [user]);
  
  const userInfo: UserData = user ? {
    name: (user as UserData).username || (user as UserData).name || '',
    email: (user as UserData).email || '',
    avatar: (user as UserData).avatar || ""
  } : {
    name: "Chargement...",
    email: "",
    avatar: ""
  };

  // Vérifier quelle section est active
  const isChannelsActive = location.pathname.includes("/panel/channels");
  const isSettingsActive = location.pathname.includes("/panel/settings");
  const isInvitationsActive = location.pathname.includes("/panel/invitations");

  const handleLogout = () => {
    // Supprimer le token d'authentification
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    // Rediriger vers la page de connexion
    navigate("/login");
  };

  // Classes conditionnelles basées sur l'état de la sidebar
  const isCollapsed = state === "collapsed";
  const gapClass = isCollapsed ? "gap-0" : "gap-2";
  const groupGapClass = isCollapsed ? "gap-0" : "gap-1";
  const paddingClass = isCollapsed ? "pb-0 pt-0" : "";
  const labelClass = isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto";
  const textTransitionClass = "transition-all duration-700 ease-in-out";

  // Afficher un état de chargement si nécessaire
  if (authLoading) {
    return <LoadingSpinner fullHeight text="Chargement..." />;
  }

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
                      <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                      <AvatarFallback className="rounded-lg">
                        {(userInfo.name || '').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`grid flex-1 text-left text-sm leading-tight ${textTransitionClass} ${labelClass}`}>
                      <span className="truncate font-medium">{userInfo.name}</span>
                      <span className="truncate text-xs">{userInfo.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side="right"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                        <AvatarFallback className="rounded-lg">
                          {(userInfo.name || '').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{userInfo.name}</span>
                        <span className="truncate text-xs">{userInfo.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate("/panel/settings")}>
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
              <Collapsible asChild defaultOpen={isChannelsActive}>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    tooltip="Salons"
                    onClick={() => navigate("/panel/channels")}
                    className="gap-3"
                  >
                    <div className="flex items-center">
                      <MessageSquare />
                      <span className={`${textTransitionClass} ${labelClass}`}>Salons</span>
                    </div>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <PlusCircle />
                      <span className="sr-only">Ajouter un salon</span>
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
                            onClick={() => navigate(channel.url)}
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
                            onClick={() => navigate("/panel/channels/new")}
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
                  tooltip="Paramètres"
                  className={`gap-3 ${isSettingsActive ? "bg-accent" : ""}`}
                  onClick={() => navigate("/panel/settings")}
                >
                  <div className="flex items-center">
                    <Settings />
                    <span className={`${textTransitionClass} ${labelClass}`}>Paramètres</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Invitations"
                  className={`gap-3 ${isInvitationsActive ? "bg-accent" : ""}`}
                  onClick={() => navigate("/panel/invitations")}
                >
                  <div className="flex items-center">
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
            </SidebarMenuGroup>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter className={groupGapClass}>
          <SidebarMenu className={groupGapClass}>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip="Membres"
                onClick={() => navigate("/panel/members")}
                className="gap-3"
              >
                <div className="flex items-center">
                  <Users />
                  <span className={`${textTransitionClass} ${labelClass}`}>Membres</span>
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
        <main className="flex-1 overflow-auto p-6">
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