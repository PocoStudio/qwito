import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiPost } from "@/services/apiService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CircleCheckIcon, CircleAlert, Loader, Eye, EyeOff, Pencil, Check, X, Info } from "lucide-react";
import { setUserOption, getUserOptions, deleteUserAccount } from "@/services/userService";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function SettingsView() {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  
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
        } catch (error) {
          console.error("Erreur lors du chargement des options utilisateur:", error);
        }
      };
      
      loadUserOptions();
      
      // Vérifier si l'utilisateur peut changer son nom d'utilisateur
      checkUsernameChangeEligibility();
    }
  }, [user]);
  
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
    if (!canChangeUsername || tempUsername.trim() === "") return;
    
    setIsLoading(true);
    setProfileMessage({ text: "", type: "" });
    
    try {
      const usernameResponse = await apiPost("/api/auth/update-username", { username: tempUsername });
      
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
    <div className="space-y-8 max-w-3xl mx-auto p-4">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-2">Gérez vos préférences et votre profil</p>
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
      <div className="border rounded-lg p-6 shadow-sm">
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


      
      {/* Section Changement de mot de passe */}
      <div className="border rounded-lg p-6 shadow-sm">
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
        <div className="border rounded-lg p-6 shadow-sm bg-red-50">
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
    </div>


  );

  
}

export default SettingsView;