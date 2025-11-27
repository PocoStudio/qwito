import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { createChannel, inviteUserToChannel } from "@/services/channelService";
import { checkUsernameAvailability } from "@/services/userService";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSocket } from "@/services/socketService";

function NewChannel() {
  const navigate = useNavigate();
  const [channelData, setChannelData] = useState({
    name: "",
    description: ""
  });
  const isMobile = useIsMobile();
  const [userInput, setUserInput] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({
    name: "",
    description: "",
    user: ""
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setChannelData(prev => ({ ...prev, [name]: value }));
    
    // Validation du nom du salon
    if (name === "name") {
      if (value.trim() === "") {
        setValidationErrors(prev => ({ ...prev, name: "Le nom du salon est obligatoire" }));
      } else if (value.length < 5) {
        setValidationErrors(prev => ({ ...prev, name: "Le nom du salon doit contenir au moins 5 caractères" }));
      } else if (value.length > 28) {
        setValidationErrors(prev => ({ ...prev, name: "Le nom du salon ne peut pas dépasser 28 caractères" }));
      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        setValidationErrors(prev => ({ ...prev, name: "Le nom du salon ne peut contenir que des lettres, des chiffres et des _" }));
      } else {
        setValidationErrors(prev => ({ ...prev, name: "" }));
      }
    }
    
    // Validation de la description
    if (name === "description") {
      if (value.length > 200) {
        setValidationErrors(prev => ({ ...prev, description: "La description ne peut pas dépasser 200 caractères" }));
      } else {
        setValidationErrors(prev => ({ ...prev, description: "" }));
      }
    }
  };
  
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
    setValidationErrors(prev => ({ ...prev, user: "" }));
  };
  
  const handleAddUser = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && userInput.trim() !== "") {
      e.preventDefault();
      
      try {
        // Vérifier si l'utilisateur existe
        const response = await checkUsernameAvailability(userInput.trim());
        
        if (response.available === false) {
          // L'utilisateur existe
          if (!selectedUsers.includes(userInput.trim())) {
            setSelectedUsers(prev => [...prev, userInput.trim()]);
          }
          setUserInput("");
          setValidationErrors(prev => ({ ...prev, user: "" }));
        } else {
          // L'utilisateur n'existe pas
          setValidationErrors(prev => ({ ...prev, user: "Cet utilisateur n'existe pas" }));
          setUserInput("");
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du nom d\'utilisateur:', err);
        setValidationErrors(prev => ({ ...prev, user: "Erreur lors de la vérification de l'utilisateur" }));
      }
    }
  };
  
  const handleRemoveUser = (userToRemove: string) => {
    setSelectedUsers(prev => prev.filter(user => user !== userToRemove));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation avant soumission
    let isValid = true;
    const newValidationErrors = { name: "", description: "", user: "" };
    
    if (channelData.name.trim() === "") {
      newValidationErrors.name = "Le nom du salon est obligatoire";
      isValid = false;
    } else if (channelData.name.length < 5) {
      newValidationErrors.name = "Le nom du salon doit contenir au moins 5 caractères";
      isValid = false;
    } else if (channelData.name.length > 28) {
      newValidationErrors.name = "Le nom du salon ne peut pas dépasser 28 caractères";
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(channelData.name)) {
      newValidationErrors.name = "Le nom du salon ne peut contenir que des lettres, des chiffres et des _";
      isValid = false;
    }
    
    // if (channelData.description.trim() === "") {
    //   newValidationErrors.description = "La description est obligatoire";
    //   isValid = false;
    // } 
    if (channelData.description.trim() !== "" && channelData.description.length < 10) {
      newValidationErrors.description = "La description doit contenir au moins 10 caractères";
      isValid = false;
    } else if (channelData.description.length > 200) {
      newValidationErrors.description = "La description ne peut pas dépasser 200 caractères";
      isValid = false;
    }
    
    setValidationErrors(newValidationErrors);
    
    if (!isValid) {
      return;
    }
    
    setLoading(true);
    setError("");
    
    // Dans la fonction handleSubmit, après la création du canal
    try {
    // Créer le canal
    const response = await createChannel(channelData);
    const channelId = response.channelId;
    
    // Émettre un événement pour notifier la création du canal
    const socket = getSocket();
    if (socket) {
      socket.emit('new-channel', { channelId });
    }
    
    // Inviter les utilisateurs sélectionnés
    if (selectedUsers.length > 0) {
      const invitePromises = selectedUsers.map(username => 
        inviteUserToChannel(channelId, username)
      );

    
        const inviteResponses = await Promise.all(invitePromises);
  
          const socket = getSocket();
        if (socket) {
          // Émettre un événement pour chaque utilisateur invité
          inviteResponses.forEach(response => {
            if (response && response.toUserId) {
              socket.emit('invite-user', { 
                channelId, 
                toUserId: response.toUserId 
              });
            }
          });
        }
      }
    
    // Rediriger vers le nouveau canal
    navigate(`/panel/channels/${channelId}`);
    window.location.href = `/panel/channels/${channelId}`;
    } catch (err) {
      console.error('Erreur lors de la création du canal:', err);
      setError('Une erreur est survenue lors de la création du canal');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={`${isMobile ? 'space-y-6 p-6' : 'space-y-6'}`}>
      <div>
        <h1 className="text-3xl font-bold">Créer un nouveau salon</h1>
        <p className="text-muted-foreground mt-2">Définissez les informations de votre nouveau salon de discussion</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Nom du salon
          </label>
          <input
            id="name"
            name="name"
            value={channelData.name}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="ex: Général"
          />
          {validationErrors.name && (
            <p className="text-sm text-destructive">{validationErrors.name}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={channelData.description}
            onChange={handleChange}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Décrivez l'objectif de ce salon"
          />
          {validationErrors.description && (
            <p className="text-sm text-destructive">{validationErrors.description}</p>
          )}
        </div>
        
        {/* Nouvelle section pour la sélection d'utilisateurs */}
        <div className="space-y-2">
          <label htmlFor="users" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Inviter des utilisateurs
          </label>
          <div className="flex flex-col space-y-2">
            <div className="flex flex-wrap gap-2 p-2 border border-input rounded-md bg-background min-h-10">
              {selectedUsers.map(user => (
                <div 
                  key={user} 
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                >
                  <span>{user}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveUser(user)}
                    className="text-primary hover:text-primary/80"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <input
                id="users"
                value={userInput}
                onChange={handleUserInputChange}
                onKeyDown={handleAddUser}
                className="flex-grow min-w-[120px] bg-transparent border-0 outline-none text-sm"
                placeholder="Entrez un nom d'utilisateur et appuyez sur Entrée"
              />
            </div>
            <p className="text-xs text-muted-foreground">Appuyez sur Entrée après chaque nom d'utilisateur pour l'ajouter</p>
            {validationErrors.user && (
              <p className="text-sm text-destructive">{validationErrors.user}</p>
            )}
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-2 justify-end">
          <button 
            type="button"
            onClick={() => navigate("/panel/channels")}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
            disabled={loading}
          >
            Annuler
          </button>
          <button 
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer le salon'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewChannel;