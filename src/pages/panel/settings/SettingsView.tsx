import { useState, useEffect} from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/services/apiService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CircleCheckIcon, CircleAlert, Loader, Eye, EyeOff, Pencil, Check, X, Info} from "lucide-react";
import { setUserOption, getUserOptions, deleteUserAccount, uploadAvatar, deleteAvatar } from "@/services/userService";
import { useNavigate , useLocation} from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AvatarUpload } from "@/components/avatar-upload";
import { activatePlatinum, checkPlatinumStatus } from '../../../services/userService';
import capiomontLogo from '@/assets/logo.png';

function SettingsView() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // États pour les données utilisateur et les préférences
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    uniqueid: "",
    createdAt: "",
    showStatus: false,
    theme: "light"
  });
  
  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // États pour les messages de succès/erreur
  const [message, setMessage] = useState({ text: "", type: "" });
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  
  // État pour le chargement
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // État pour le changement de nom d'utilisateur
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  
  // État pour afficher/masquer les mots de passe
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  // supression du compte
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [showDeleteAccountPassword, setShowDeleteAccountPassword] = useState(false);
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState({ text: "", type: "" });
  
  // États pour l'avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState({ text: "", type: "" });

  const [isPlatinum, setIsPlatinum] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [platinumMessage, setPlatinumMessage] = useState({ text: '', type: '' });
  const [loadingPlatinum, setLoadingPlatinum] = useState(false);

  const loadPlatinumStatus = async () => {
    try {
      const response = await checkPlatinumStatus();
      setIsPlatinum(response.isPlatinum);
    } catch (error) {
      console.error('Erreur lors du chargement du statut Platinum:', error);
    }
  };
  
  // Effet pour charger les données utilisateur et les options
  useEffect(() => {
    if (user) {
      // Charger les options utilisateur
      const loadUserOptions = async () => {
        try {
          const options = await getUserOptions();
          
          setUserData({
            username: user.username || "",
            email: user.email || "",
            uniqueid: user.uniqueid || "",
            createdAt: user.createdAt || "",
            showStatus: options.showStatus === "true" || false,
            theme: options.theme || user.theme || "light"
          });
          
          setTempUsername(user.username || "");
          
          // Initialiser l'aperçu de l'avatar s'il existe
          if (user.avatar) {
            setAvatarPreview(user.avatar);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des options utilisateur:", error);
        }
      };
      
      loadUserOptions();
      loadPlatinumStatus();
      // Vérifier si l'utilisateur peut changer son nom d'utilisateur
      checkUsernameChangeEligibility();
      
    }
  }, [user]);

  useEffect(() => {
    // Attendre que le composant soit complètement chargé
    if (!loading) {
      // Vérifier si un hash est présent dans l'URL
      if (location.hash) {
        // Extraire l'ID de la section à partir du hash (sans le #)
        const sectionId = location.hash.substring(1);
        
        // Trouver l'élément correspondant
        const element = document.getElementById(sectionId);
        
        // Si l'élément existe, faire défiler jusqu'à lui
        if (element) {
          // Ajouter un petit délai pour s'assurer que tout est rendu
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      }
    }
  }, [location.hash, loading]);

  const handleActivatePlatinum = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client pour le code d'activation
    if (!/^[a-zA-Z0-9-]{1,17}$/.test(activationCode)) {
      setPlatinumMessage({
        text: 'Le code d\'activation doit contenir uniquement des lettres, chiffres et tirets (maximum 17 caractères)',
        type: 'error'
      });
      return;
    }
    
    if (loadingPlatinum) return;
    setLoadingPlatinum(true);
    setPlatinumMessage({ text: '', type: '' });
    
    try {
      const response = await activatePlatinum(activationCode);
      
      // Ajouter un délai de 2 secondes avant d'afficher le message de succès
      setTimeout(() => {
        setPlatinumMessage({
          text: response.message || 'Activation réussie !',
          type: 'success'
        });
        loadPlatinumStatus();
        setActivationCode('');
        setLoadingPlatinum(false);
      }, 2000);
    
    } catch (error) {
      // Ajouter un délai de 2 secondes avant d'afficher le message d'erreur
      setTimeout(() => {
        let errorMessage = 'Erreur lors de l\'activation';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          errorMessage = String((error as { message: unknown }).message);
        }
        
        // Vérifier si l'erreur contient "invalid" pour afficher "Code erroné"
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('invalide')) {
          errorMessage = 'Hmm… le code saisi est inconnu';
        }
        
        setPlatinumMessage({
          text: errorMessage,
          type: 'error'
        });
        setLoadingPlatinum(false);
      }, 2000);
    }
  };
  
  // Fonction pour vérifier si l'utilisateur peut changer son nom d'utilisateur
  const checkUsernameChangeEligibility = async () => {
    try {
      const response = await apiPost("/api/auth/can-change-username", {});
      setCanChangeUsername(response.canChange);
      setDaysLeft(response.daysLeft || 0);
    } catch (error) {
      console.error("Erreur lors de la vérification de l'éligibilité au changement de nom d'utilisateur:", error);
    }
  };
  
  // Gestionnaire pour les changements dans les champs de formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setUserData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword) {
      setDeleteAccountMessage({ text: "Veuillez entrer votre mot de passe", type: "error" });
      return;
    }
    
    setIsDeleteAccountLoading(true);
    setDeleteAccountMessage({ text: "", type: "" });
    
    try {
      await deleteUserAccount(deleteAccountPassword);
      
      // Supprimer le token d'authentification
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      
      // Rediriger vers la page de connexion
      navigate("/login?accountsupress150321", { 
        state: { 
          message: {
            text: "Votre compte a été supprimé avec succès", 
            type: "success"
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du compte:", error);
      setDeleteAccountMessage({
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
    } finally {
      setIsDeleteAccountLoading(false);
    }
  };
  
  // Gestionnaire pour les changements dans les champs de mot de passe
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  
  // Gestionnaire pour basculer l'affichage des mots de passe
  const togglePasswordVisibility = (field: 'oldPassword' | 'newPassword' | 'confirmPassword') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveAvatar = async () => {
    if (!avatarPreview) return;
    
    setIsUploadingAvatar(true);
    setAvatarMessage({ text: "", type: "" });
    
    try {
      await uploadAvatar(avatarPreview);
      
      // Rafraîchir les données utilisateur
      await refreshUser();
      
      // Rediriger avec un paramètre de succès au lieu de recharger la page
      window.location.href = window.location.pathname + "?avatar_updated=success";
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'avatar:", error);
      setAvatarMessage({ 
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
      setIsUploadingAvatar(false);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('avatar_updated') === 'success') {
    setAvatarMessage({ text: "Avatar mis à jour avec succès !", type: "success" });
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Gestionnaire pour supprimer l'avatar
  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarMessage({ text: "", type: "" });
    
    try {
      await deleteAvatar();
      
      // Réinitialiser l'aperçu de l'avatar
      setAvatarPreview(null);
      
      // Rafraîchir les données utilisateur
      await refreshUser();
      
      // Afficher le message de succès
      setAvatarMessage({ text: "Avatar supprimé avec succès !", type: "success" });
      
    } catch (error) {
      console.error("Erreur lors de la suppression de l'avatar:", error);
      setAvatarMessage({ 
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCancelAvatar = () => {
    window.dispatchEvent(new CustomEvent('resetAvatarUpload'));
    setAvatarPreview(user?.avatar || null);
    setAvatarMessage({ text: "", type: "" });
  };
  
  // Gestionnaire pour la soumission du formulaire de préférences
  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    
    try {
      // Mettre à jour les préférences une par une
      const showStatusResponse = await setUserOption("showStatus", userData.showStatus.toString());
      const themeResponse = await setUserOption("theme", userData.theme);
      
      if (!showStatusResponse.success || !themeResponse.success) {
        throw new Error("Erreur lors de la mise à jour des préférences");
      }
      
      // Appliquer le thème
      document.documentElement.setAttribute("data-theme", userData.theme);
      localStorage.setItem("theme", userData.theme);
      
      // Rafraîchir les données utilisateur
      await refreshUser();
      
      setMessage({ text: "Préférences sauvegardées avec succès !", type: "success" });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des préférences:", error);
      setMessage({ 
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gestionnaire pour la soumission du formulaire de changement de mot de passe
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordLoading(true);
    setPasswordMessage({ text: "", type: "" });
    
    // Validation des mots de passe
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ text: "Les nouveaux mots de passe ne correspondent pas", type: "error" });
      setIsPasswordLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 8 || passwordData.newPassword.length > 45) {
      setPasswordMessage({ text: "Le mot de passe doit contenir entre 8 et 45 caractères", type: "error" });
      setIsPasswordLoading(false);
      return;
    }
    
    try {
      const response = await apiPost("/api/auth/change-password", {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      // Réinitialiser les champs de mot de passe
      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      setPasswordMessage({ text: response.message || "Mot de passe changé avec succès !", type: "success" });
    } catch (error) {
      console.error("Erreur lors du changement de mot de passe:", error);
      setPasswordMessage({ 
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  // Gestionnaire pour la mise à jour du nom d'utilisateur
  const handleUpdateUsername = async () => {
    if (!/^[a-zA-Z0-9]{5,15}$/.test(tempUsername)) {
      setProfileMessage({
        text: 'Le nom d\'utilisateur doit contenir entre 5 et 15 caractères alphanumériques',
        type: 'error'
      });
      return;
    }
    
    if (!canChangeUsername || tempUsername.trim() === "") return;
    
    setIsLoading(true);
    setProfileMessage({ text: "", type: "" });
    
    try {
      const usernameResponse = await apiPost("/api/auth/update-username", { username: tempUsername });
      
      if (usernameResponse.message && usernameResponse.message.includes('déjà pris')) {
        setProfileMessage({
          text: usernameResponse.message,
          type: 'error'
        });
        return;
      }
      
      setUserData(prev => ({ ...prev, username: tempUsername }));
      setIsEditingUsername(false);
      
      // Mettre à jour l'état de changement de nom d'utilisateur
      setCanChangeUsername(false);
      setDaysLeft(5); // Nouveau délai de 5 jours
      
      // Rafraîchir les données utilisateur
      await refreshUser();
      
      setProfileMessage({ text: usernameResponse.message || "Nom d'utilisateur mis à jour avec succès !", type: "success" });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom d'utilisateur:", error);
      setProfileMessage({
        text: error instanceof Error ? error.message : "Une erreur est survenue", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Formater la date de création
  const formattedCreatedAt = userData.createdAt 
    ? format(new Date(userData.createdAt), "dd MMMM yyyy à HH:mm", { locale: fr })
    : "";
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="animate-spin" />
        <span className="ml-2">Chargement des paramètres...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 max-w-3xl mx-auto p-2">
    <div>
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <p className="text-muted-foreground mt-2">Gérez vos préférences et votre profil</p>
      
      {/* Menu de navigation */}
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
      <button
        onClick={() => document.getElementById('section-profil')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-4 py-2 border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md transform"
      >
        Profil
      </button>
      <button
        onClick={() => document.getElementById('section-preferences')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-4 py-2 border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md transform"
      >
        Préférences
      </button>
      <button
        onClick={() => document.getElementById('section-platinum')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-4 py-2 border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md transform"
      >
        Abonnement
      </button>
      <button
        onClick={() => document.getElementById('section-password')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-4 py-2 border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md transform"
      >
        Sécurité du compte
      </button>
      {/* <button
        onClick={() => document.getElementById('section-delete')?.scrollIntoView({ behavior: 'smooth' })}
        className="px-4 py-2 border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-md transform"
      >
        Clôture du compte
      </button> */}
    </div>
    </div>
      
      {/* Section Profil */}
      <div className="border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Profil</h2>
        
        {/* Message de succès/erreur pour le profil */}
        {profileMessage.text && profileMessage.type === "success" && (
          <div className="p-3 rounded-md flex items-center mb-4 bg-green-100 text-green-800 text-sm">
            <CircleCheckIcon className="mr-2 h-4 w-4" />
            <span>{profileMessage.text}</span>
          </div>
        )}
        
        {profileMessage.text && profileMessage.type === "error" && (
          <div className="p-3 rounded-md flex items-center mb-4 bg-red-100 text-red-800 text-sm">
            <CircleAlert className="mr-2 h-4 w-4" />
            <span>{profileMessage.text}</span>
          </div>
        )}
        
        {/* Section Avatar */}
        <div className="mb-6">
          <label className="text-sm font-medium leading-none mb-2 block">Avatar</label>
          
          {/* Message de succès/erreur pour l'avatar */}
          {avatarMessage.text && avatarMessage.type === "success" && (
            <div className="p-3 rounded-md flex items-center mb-4 bg-green-100 text-green-800 text-sm">
              <CircleCheckIcon className="mr-2 h-4 w-4" />
              <span>{avatarMessage.text}</span>
            </div>
          )}
          
          {avatarMessage.text && avatarMessage.type === "error" && (
            <div className="p-3 rounded-md flex items-center mb-4 bg-red-100 text-red-800 text-sm">
              <CircleAlert className="mr-2 h-4 w-4" />
              <span>{avatarMessage.text}</span>
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center w-full">
          <AvatarUpload
            initialAvatar={user?.avatar}
            size="lg"
            username={user?.username}
            onAvatarChange={(dataUrl) => {
              setAvatarPreview(dataUrl);
              if (!dataUrl) {
                setAvatarMessage({ 
                  text: "Le fichier dépasse la taille maximale de 5MB.", 
                  type: "error" 
                });
              } else {
                setAvatarMessage({ text: "", type: "" });
              }
            }}
            onAvatarRemove={handleDeleteAvatar}
            isEditing={avatarPreview !== user?.avatar && avatarPreview !== null}
          />
            {avatarPreview && avatarPreview !== user?.avatar && (
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleSaveAvatar}
                  className="bg-black text-white hover:bg-gray-800 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-3 py-2"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Sauvegarde en cours...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Sauvegarder
                    </>
                  )}
                </button>
                <button
                type="button"
                onClick={handleCancelAvatar}
                className="bg-gray-200 text-gray-800 hover:bg-gray-300 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-9 px-3 py-2"
              >
                <X className="mr-2 h-4 w-4" />
                Annuler
              </button>
              </div>
            )}
            
            {/* Afficher le message de format uniquement en mode édition */}
            {avatarPreview !== user?.avatar && avatarPreview !== null && (
              <div className="p-3 rounded-md flex items-start bg-blue-50 text-blue-800 text-xs mb-4">
              <Info className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Formats acceptés : JPG, PNG, GIF. Taille maximale : 5MB. Conseil : 220x220 ou 500x500 pixels.</span>
            </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Nom d'utilisateur avec icône de stylo */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium leading-none">
              Nom d'utilisateur
            </label>
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <input
                  id="tempUsername"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button 
                  type="button"
                  onClick={handleUpdateUsername}
                  disabled={isLoading}
                  className="p-2 rounded-full bg-green-100 text-green-800 hover:bg-green-200"
                >
                  <Check size={16} />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditingUsername(false);
                    setTempUsername(userData.username);
                  }}
                  className="p-2 rounded-full bg-red-100 text-red-800 hover:bg-red-200"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  id="username"
                  name="username"
                  value={userData.username}
                  readOnly
                  className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background pr-10 cursor-default select-none pointer-events-none"
                />
                {canChangeUsername && (
                  <button 
                    type="button"
                    onClick={() => setIsEditingUsername(true)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 pointer-events-auto"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
            )}
            {isEditingUsername && (
              <p className="text-xs text-gray-600 mt-1">
                Le nom d'utilisateur doit contenir entre 5 et 15 caractères alphanumériques.
              </p>
            )}
            {canChangeUsername && (
              <div className="p-3 rounded-md flex items-start bg-blue-50 text-blue-800 text-xs mb-4">
              <Info className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Attention. Vous pouvez changer votre nom d'utilisateur tous les 5 jours.</span>
            </div>
            )}
            {!canChangeUsername && (
              <div className="p-3 rounded-md flex items-start bg-blue-50 text-blue-800 text-xs mb-4">
                <Info className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Votre nom d'utilisateur à été modifié, vous devez attendre {daysLeft} jours pour le changer à nouveau.</span>
              </div>
            )}
          </div>
          
          {/* Email (non modifiable) */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={userData.email}
              readOnly
              className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background cursor-default select-none pointer-events-none"
            />
          </div>
          
          {/* ID unique */}
          <div className="space-y-2">
            <label htmlFor="uniqueid" className="text-sm font-medium leading-none">
              ID unique
            </label>
            <input
              id="uniqueid"
              name="uniqueid"
              value={userData.uniqueid}
              readOnly
              className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background cursor-default select-none pointer-events-none"
            />
          </div>
          
          {/* Date de création */}
          <div className="space-y-2">
            <label htmlFor="createdAt" className="text-sm font-medium leading-none">
              Date de création du compte
            </label>
            <input
              id="createdAt"
              name="createdAt"
              value={formattedCreatedAt}
              readOnly
              className="flex h-10 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background cursor-default select-none pointer-events-none"
            />
          </div>
        </div>
      </div>
      
      {/* Section Préférences */}
      <div id="section-preferences" className="border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Préférences</h2>
        
        {/* Messages de succès/erreur pour les préférences (seulement si il y a un message) */}
        {message.text && message.type === "success" && (
          <div className="p-3 rounded-md flex items-center mb-4 bg-green-100 text-green-800 text-sm">
            <CircleCheckIcon className="mr-2 h-4 w-4" />
            <span>{message.text}</span>
          </div>
        )}
        
        {message.text && message.type === "error" && (
          <div className="p-3 rounded-md flex items-center mb-4 bg-red-100 text-red-800 text-sm">
            <CircleAlert className="mr-2 h-4 w-4" />
            <span>{message.text}</span>
          </div>
        )}
        
        <form onSubmit={handlePreferencesSubmit} className="space-y-4">
          {/* Statut de connexion */}
          <div className="flex items-center space-x-2">
            <input
              id="showStatus"
              name="showStatus"
              type="checkbox"
              checked={userData.showStatus}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="showStatus" className="text-sm font-medium leading-none">
              Afficher le statut de connexion au salon
            </label>
          </div>
          
          {/* Thème */}
          <div className="space-y-2">
            <label htmlFor="theme" className="text-sm font-medium leading-none">
              Thème
            </label>
            <select
              id="theme"
              name="theme"
              value={userData.theme}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="system">Système</option>
            </select>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                "Sauvegarder"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section Membre Platinum */}
      <div id="section-platinum" className="border-2 border-amber-500 rounded-lg p-6 shadow-md bg-gradient-to-r from-amber-50 to-white">
        <h2 className="text-xl font-semibold mb-4 text-amber-700">Membre Platinum</h2>
        


        {!isPlatinum && (
            <div className="p-4 rounded-md mb-4 bg-amber-50 border border-amber-200">
              <h3 className="font-semibold text-amber-800 mb-2">Avantages Platinum :</h3>
              <ul className="list-disc ml-5 text-amber-700">
                <li>Badge sur le profil</li>
                <li>Partager des fichiers dans les conversations</li>
              </ul>
            </div>
            )}
        
        {isPlatinum ? (
          <div className="p-4 rounded-md flex items-center mb-4 bg-amber-100 text-amber-800">
            <div className="mr-3 p-1 bg-amber-500 rounded-full">
              <CircleCheckIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold">Vous êtes membre Platinum !</p>
              <p className="text-sm">Profitez de vos avantages exclusifs.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleActivatePlatinum} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="activationCode" className="text-sm font-medium leading-none">
                Code d'activation
              </label>
              <input
                type="text"
                id="activationCode"
                value={activationCode}
                onChange={(e) => {
                  // Validation: uniquement lettres, chiffres et tirets
                  const value = e.target.value;
                  if (value === '' || /^[a-zA-Z0-9-]{0,17}$/.test(value)) {
                    setActivationCode(value);
                  }
                }}
                placeholder="XXXX-XXXX-XXXX-XW"
                maxLength={17}
                required
                className="flex h-10 w-full rounded-md border border-amber-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              />
              {/* <p className="text-xs text-amber-600 mt-1">
                Le code doit contenir uniquement des lettres, chiffres et tirets (maximum 17 caractères).
              </p> */}
            </div>
            
            {platinumMessage.text && (
              <div className={`p-3 rounded-md flex items-center mb-4 text-sm ${platinumMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                {platinumMessage.type === "error" ? (
                  <CircleAlert className="mr-2 h-4 w-4" />
                ) : (
                  <CircleCheckIcon className="mr-2 h-4 w-4" />
                )}
                <span>{platinumMessage.text}</span>
              </div>
            )}
            
            <div className="flex justify-end">
              <button 
                type="submit" 
                className="bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loadingPlatinum}
              >
                {loadingPlatinum ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  "Activer"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section Changement de mot de passe */}
      <div id="section-password" className="border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Changer le mot de passe</h2>
        
        {/* Information pour les comptes Google */}
        <div className="p-3 rounded-md flex items-start bg-blue-50 text-blue-800 text-xs mb-4">
          <Info className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Si votre compte a été créé à partir d'un compte Google, vous devez changer le mot de passe en le réinitialisant avec l'adresse mail de votre compte via{" "}
            <a 
              href="/reset-password" 
              className="underline hover:no-underline font-medium"
            >
              mot de passe oublié
            </a>.
          </span>
        </div>
        
        {/* Message de succès/erreur pour le mot de passe */}
        {passwordMessage.text && (
          <div className={`p-3 rounded-md flex items-center mb-4 text-sm ${passwordMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {passwordMessage.type === "success" ? (
              <CircleCheckIcon className="mr-2 h-4 w-4" />
            ) : (
              <CircleAlert className="mr-2 h-4 w-4" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}
        
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {/* Ancien mot de passe */}
          <div className="space-y-2">
            <label htmlFor="oldPassword" className="text-sm font-medium leading-none">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                id="oldPassword"
                name="oldPassword"
                type={showPasswords.oldPassword ? "text" : "password"}
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("oldPassword")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPasswords.oldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium leading-none">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPasswords.newPassword ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("newPassword")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPasswords.newPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Le mot de passe doit contenir entre 8 et 45 caractères</p>
          </div>
          
          {/* Confirmation du nouveau mot de passe */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords.confirmPassword ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirmPassword")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPasswords.confirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={isPasswordLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPasswordLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                "Changer le mot de passe"
              )}
            </button>
          </div>
        </form>
      </div>

          {/* Section Suppression de compte */}
        <div id="section-delete" className="border rounded-lg p-6 shadow-sm bg-red-50">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Supprimer le compte</h2>
          
          <div className="p-3 rounded-md flex items-start bg-red-100 text-red-800 text-xs mb-4">
            <CircleAlert className="mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Attention ! La suppression de votre compte est irréversible. Cette action supprimera :
              <ul className="list-disc ml-5 mt-2">
                <li>Votre profil et toutes vos données personnelles</li>
                <li>Votre appartenance à tous les groupes</li>
                <li>Les groupes dont vous êtes propriétaire</li>
                <li>Tous vos messages</li>
              </ul>
            </span>
          </div>
          
          <button 
            onClick={() => setShowDeleteAccountDialog(true)}
            className="bg-red-600 text-white hover:bg-red-700 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
          >
            Supprimer mon compte
          </button>
          
          {/* Boîte de dialogue de confirmation */}
          <Dialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmer la suppression du compte 🥺</DialogTitle>
                <DialogDescription>
                  Pour confirmer la suppression de votre compte, veuillez entrer votre mot de passe.
                </DialogDescription>
              </DialogHeader>
              
              {deleteAccountMessage.text && (
                <div className={`p-3 rounded-md flex items-center text-sm ${deleteAccountMessage.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {deleteAccountMessage.type === "success" ? (
                    <CircleCheckIcon className="mr-2 h-4 w-4" />
                  ) : (
                    <CircleAlert className="mr-2 h-4 w-4" />
                  )}
                  <span>{deleteAccountMessage.text}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showDeleteAccountPassword ? "text" : "password"}
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccountPassword(!showDeleteAccountPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showDeleteAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountDialog(false);
                      setDeleteAccountPassword("");
                      setDeleteAccountMessage({ text: "", type: "" });
                    }}
                    className="bg-gray-100 text-gray-900 hover:bg-gray-200 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleteAccountLoading}
                    className="bg-red-600 text-white hover:bg-red-700 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleteAccountLoading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Suppression en cours...
                      </>
                    ) : (
                      "Supprimer définitivement"
                    )}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Section Crédits */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Crédits</h2>
          
          <div className="bg-gradient-to-br from-[#C8E6FA] via-[#64B4E6] to-[#1E64A0] rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-lg shadow-md">
                <img src={capiomontLogo} alt="Capiomont Logo" className="w-12 h-12" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">Talk Capiomont</h3>
                <p className="text-white/90 text-sm mt-1">
                  Créé par <span className="font-semibold">Capiomont.fr</span> NC | {new Date().getFullYear()}. Tous droits réservés. 
                    <div>Et boosté par l'IA 😉</div>
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>


  );

  
}

export default SettingsView;
