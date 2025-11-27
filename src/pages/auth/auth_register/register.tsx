import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheckIcon, CircleAlert, Loader } from "lucide-react";
import { API_BASE_URL } from '@/config/api';
import { checkUsernameAvailability } from '@/services/userService';
import capiomontLogo from '@/assets/logo.png';

// Déclaration pour étendre l'interface Window
declare global {
  interface Window {
    turnstile?: any;
    onTurnstileCallback?: (token: string) => void;
  }
}

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  // Référence pour le widget Turnstile
  const turnstileRef = useRef(null);
  // État pour stocker la réponse du widget Turnstile
  const [turnstileToken, setTurnstileToken] = useState('');
  // État pour contrôler l'affichage du widget Turnstile
  const [showTurnstile, setShowTurnstile] = useState(false);
  
  // Ajouter un état pour contrôler l'affichage du champ de confirmation
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Fonction pour charger le script Turnstile
  useEffect(() => {
    // Vérifier si le script est déjà en cours de chargement ou chargé
    if (!window.turnstile && !document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.id = 'turnstile-script'; // Ajouter un ID pour pouvoir le vérifier
      document.head.appendChild(script);
    }
  
    return () => {
      // Nettoyer le token Turnstile lors du démontage du composant
      setTurnstileToken('');
    };
  }, []);

  // Fonction de rappel pour Turnstile
  const onTurnstileCallback = (token: string) => {
    setTurnstileToken(token);
  };

  const validateUsername = (value: string) => {
    if (!/^[a-zA-Z0-9]{5,15}$/.test(value)) {
      return 'Le nom doit contenir entre 5 et 15 caractères alphanumériques';
    }
    return '';
  };

  const validateEmail = (value: string) => {
    if (value.length < 4 || value.length > 50) {
      return 'L\'email doit contenir entre 4 et 50 caractères';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Veuillez entrer une adresse email valide';
    }
    return '';
  };

  const validatePassword = (value: string) => {
    if (value.length < 8 || value.length > 45) {
      return 'Le mot de passe doit contenir entre 8 et 45 caractères';
    }
    return '';
  };

  // Fonction pour vérifier si tous les champs sont valides
  const checkAllFieldsValid = (formData: any) => {
    return (
      formData.username && !validateUsername(formData.username) &&
      formData.email && !validateEmail(formData.email) &&
      formData.password && !validatePassword(formData.password) &&
      formData.confirmPassword && formData.password === formData.confirmPassword
    );
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Récupérer le domaine actuel
    const currentDomain = window.location.origin;
    // Stocker le domaine dans sessionStorage pour la vérification après redirection
    sessionStorage.setItem('auth_origin', currentDomain);
    
    setTimeout(() => {
      window.location.href = `${API_BASE_URL}/api/auth/google`;
    }, 500);
  };

  // Ajouter ces états dans le composant Register
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  // Modifier la fonction handleBlur
  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    switch (name) {
      case 'username':
        setErrors(prev => ({ ...prev, username: validateUsername(value) }));
        
        // Vérifier la disponibilité du nom d'utilisateur
        if (value && !validateUsername(value)) {
          setCheckingUsername(true);
          try {
            const response = await checkUsernameAvailability(value);
            setUsernameAvailable(response.available);
            if (!response.available) {
              setUsernameSuggestions(response.suggestions || []);
            } else {
              setUsernameSuggestions([]);
            }
          } catch (error) {
            console.error('Erreur lors de la vérification du nom d\'utilisateur:', error);
            setUsernameAvailable(null);
            setUsernameSuggestions([]);
          } finally {
            setCheckingUsername(false);
          }
        } else {
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        }
        break;
      case 'email':
        setErrors(prev => ({ ...prev, email: validateEmail(value) }));
        break;
      case 'password':
        setErrors(prev => ({ ...prev, password: validatePassword(value) }));
        // Vérifier aussi la confirmation du mot de passe
        if (formData.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: value !== formData.confirmPassword ? 'Les mots de passe ne correspondent pas' : ''
          }));
        }
        break;
      case 'confirmPassword':
        const passwordsMatch = value === formData.password;
        setErrors(prev => ({
          ...prev,
          confirmPassword: !passwordsMatch ? 'Les mots de passe ne correspondent pas' : ''
        }));
        
        // Vérifier si tous les champs sont valides pour afficher Turnstile
        const updatedFormData = { ...formData, confirmPassword: value };
        if (passwordsMatch && checkAllFieldsValid(updatedFormData)) {
          setShowTurnstile(true);
        }
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(updatedFormData);

    // Effacer l'erreur lorsque l'utilisateur commence à modifier le champ
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    
    // Afficher le champ de confirmation du mot de passe si l'utilisateur commence à saisir un mot de passe
    if (name === 'password' && value.length > 0 && !showConfirmPassword) {
      setShowConfirmPassword(true);
    }
    
    // Vérifier si tous les champs sont valides pour afficher le widget Turnstile
    // Seulement si le champ de confirmation est visible
    if (showConfirmPassword || name === 'confirmPassword') {
      if (checkAllFieldsValid(updatedFormData)) {
        setShowTurnstile(true);
      } else {
        // Masquer Turnstile si les conditions ne sont plus remplies
        setShowTurnstile(false);
        setTurnstileToken('');
      }
    }
  };

  // Fonction pour vérifier si le formulaire est valide
  const isFormValid = () => {
    return (
      formData.username && !validateUsername(formData.username) &&
      formData.email && !validateEmail(formData.email) &&
      formData.password && !validatePassword(formData.password) &&
      formData.confirmPassword && formData.password === formData.confirmPassword &&
      turnstileToken // Vérifier que le widget Turnstile a été validé
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Activer l'état de chargement
    setIsLoading(true);
    
    // Validation avant soumission - MISE À JOUR ICI
    const usernameError = validateUsername(formData.username);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = formData.password !== formData.confirmPassword ? 
      'Les mots de passe ne correspondent pas' : '';

    // Mettre à jour TOUTES les erreurs en même temps
    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmPasswordError
    });

    if (usernameError || emailError || passwordError || confirmPasswordError) {
      setIsLoading(false); // Désactiver l'état de chargement
      return;
    }

    // Vérifier si le token Turnstile est présent
    if (!turnstileToken) {
      setMessage({ text: 'Veuillez compléter la vérification de sécurité', type: 'error' });
      setIsLoading(false); // Désactiver l'état de chargement
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          turnstileToken: turnstileToken, // Ajouter le token Turnstile
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Ne pas stocker le token tout de suite
        // Rediriger vers la page de vérification d'email avec les paramètres nécessaires
        navigate(`/check-mail?email=${encodeURIComponent(formData.email)}&tempToken=${encodeURIComponent(data.tempToken)}`);
      } else {
        setMessage({ text: data.message || 'Erreur d\'inscription', type: 'error' });
        
        // Vérifier si l'erreur concerne un email déjà utilisé
        if (data.message && (data.message.toLowerCase().includes('email') && 
            (data.message.toLowerCase().includes('utilisé') || 
             data.message.toLowerCase().includes('existe') || 
             data.message.toLowerCase().includes('already') ||
             data.message.toLowerCase().includes('taken')))) {
          // Afficher l'erreur dans le champ email
          setErrors(prev => ({
            ...prev,
            email: 'Cette adresse email est déjà utilisée'
          }));
          
          // Réinitialiser le champ email
          setFormData(prev => ({
            ...prev,
            email: ''
          }));
          // Masquer Turnstile et réinitialiser le token
          setShowTurnstile(false);
          setTurnstileToken('');
        }
        
        // Réinitialiser le chargement après 3 secondes et reset le Turnstile
        setTimeout(() => {
          setIsLoading(false);
          setTurnstileToken('');
          resetTurnstileWidget();
        }, 3000); 
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      setMessage({ text: 'Erreur de connexion au serveur', type: 'error' });
      // Réinitialiser le chargement après 3 secondes et reset le Turnstile
      setTimeout(() => {
        setIsLoading(false); // Réinitialiser l'état de chargement
        setTurnstileToken('');
        setShowTurnstile(false); // Masquer Turnstile en cas d'erreur serveur
        resetTurnstileWidget();
      }, 3000); 
    }
  };
  
  // Fonction pour réinitialiser le widget Turnstile
  const resetTurnstileWidget = () => {
    if (window.turnstile) {
      try {
        // Supprimer l'ancien widget
        window.turnstile.remove('#turnstile-widget');
        
        // Recréer le widget après un court délai
        setTimeout(() => {
          if (showTurnstile) {
            window.turnstile.render('#turnstile-widget', {
              sitekey: '0x4AAAAAABeno8eA53MNIyxd',
              callback: function(token: string) {
                onTurnstileCallback(token);
              },
              'refresh-expired': 'auto'
            });
          }
        }, 100);
      } catch (e) {
        console.error('Erreur lors de la réinitialisation du widget Turnstile:', e);
      }
    }
  };

  // Exposer la fonction de callback dans l'objet window
  useEffect(() => {
    // Exposer la fonction de callback pour Turnstile
    window.onTurnstileCallback = onTurnstileCallback;
    
    return () => {
      // Nettoyer lors du démontage
      window.onTurnstileCallback = undefined;
    };
  }, []);

  // Ajouter un useEffect pour initialiser le widget Turnstile lorsqu'il doit être affiché
  useEffect(() => {
    // Initialiser le widget Turnstile lorsque showTurnstile devient true et que le script est chargé
    if (showTurnstile && window.turnstile && turnstileRef.current) {
      // Vérifier si un widget existe déjà dans le conteneur avant de tenter de le supprimer
      const container = document.getElementById('turnstile-widget');
      if (container && container.innerHTML.trim() !== '') {
        try {
          window.turnstile.remove('#turnstile-widget');
        } catch (e) {
          console.log('Erreur lors de la suppression du widget Turnstile:', e);
        }
      }
      
      // Attendre un court instant pour s'assurer que le DOM est mis à jour
      setTimeout(() => {
        try {
          // Rendre explicitement le widget avec la fonction callback directement
          window.turnstile.render('#turnstile-widget', {
            sitekey: '0x4AAAAAABeno8eA53MNIyxd',
            callback: function(token: string) {
              onTurnstileCallback(token);
            },
            'refresh-expired': 'auto'
          });
        } catch (e) {
          console.error('Erreur lors du rendu du widget Turnstile:', e);
        }
      }, 100);
    }
  }, [showTurnstile]);

  // Déplacer l'effet de message en dehors du rendu
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  return (
    <div className="min-h-svh bg-background relative">
      {message.text && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="mx-auto max-w-md p-4 animate-in fade-in-0 slide-in-from-top-4 duration-300">
            <div className={`rounded-md border px-4 py-3 bg-white ${message.type === 'error' ? 'border-red-500/50 text-red-600' : 'border-emerald-500/50 text-emerald-600'}`}>
              <p className="text-sm">
                {message.type === 'error' ? (
                  <CircleAlert
                    className="me-3 -mt-0.5 inline-flex opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <CircleCheckIcon
                    className="me-3 -mt-0.5 inline-flex opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {message.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <div className="rounded-lg border bg-card p-6 shadow-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img 
                  src={capiomontLogo} 
                  alt="Capiomont Logo" 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-3xl font-bold bg-gradient-to-br from-[#3C8CC8] via-[#64B4E6] to-[#1E64A0] bg-clip-text text-transparent opacity-90">Talk</span>
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-foreground/30 to-transparent"></div>
                <h1 className="text-3xl font-bold text-foreground">S'inscrire</h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Inscrivez-vous pour accéder à toutes les fonctionnalités
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-foreground">
                    Nom d'utilisateur
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`mt-1 block w-full rounded-md border ${errors.username ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                    placeholder="Créez votre nom d'utilisateur"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-destructive">{errors.username}</p>
                  )}
                  
                  {checkingUsername && (
                    <div className="mt-1 flex items-center text-sm text-muted-foreground">
                      <Loader className="h-3 w-3 mr-2 animate-spin" />
                      Vérification de la disponibilité...
                    </div>
                  )}
                  
                  {!checkingUsername && usernameAvailable === true && formData.username && (
                    <div className="mt-1 flex items-center text-sm text-green-600">
                      <CircleCheckIcon className="h-3 w-3 mr-2" />
                      Votre nom d'utilisateur est disponible
                    </div>
                  )}
                  
                  {!checkingUsername && usernameAvailable === false && (
                    <div className="mt-1">
                      <div className="flex items-center text-sm text-destructive">
                        <CircleAlert className="h-3 w-3 mr-2" />
                        Ce nom d'utilisateur est déjà pris
                      </div>
                      
                      {usernameSuggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Suggestions disponibles :</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {usernameSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    username: suggestion
                                  }));
                                  setUsernameAvailable(true);
                                  setUsernameSuggestions([]);
                                }}
                                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`mt-1 block w-full rounded-md border ${errors.email ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                    placeholder="Entrez votre adresse e-mail"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`mt-1 block w-full rounded-md border ${errors.password ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                    placeholder="Créez un mot de passe"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                
                {/* Champ de confirmation du mot de passe avec animation */}
                {showConfirmPassword && (
                  <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700 ease-in-out transition-all">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`mt-1 block w-full rounded-md border ${errors.confirmPassword ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
                      placeholder="Confirmez votre mot de passe"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                )}
                
                {/* Widget Cloudflare Turnstile */}
                {showTurnstile && (
                  <div className="mt-4 flex flex-col items-center justify-center animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
                    {!turnstileToken && (
                      <p className="mb-2 text-sm text-center text-muted-foreground">Veuillez compléter la vérification pour continuer</p>
                    )}
                    <div style={{display: "block", flexFlow: "row"}}>
                      <div 
                        id="turnstile-widget"
                        ref={turnstileRef}
                        className="mx-auto"
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              

              <Button 
                type="button" 
                className={`w-full ${!isFormValid() ? 'opacity-95 cursor-not-allowed' : ''}`}
                disabled={isLoading} // Ajout de cette ligne pour désactiver le bouton pendant le chargement
                onClick={(e) => {
                  e.preventDefault();
                  if (isFormValid()) {
                    handleSubmit(e as any);
                  } else {
                    // Validation et affichage des erreurs - MISE À JOUR ICI
                    const usernameError = formData.username ? validateUsername(formData.username) : 'Le nom est requis';
                    const emailError = formData.email ? validateEmail(formData.email) : 'L\'email est requis';
                    const passwordError = formData.password ? validatePassword(formData.password) : 'Le mot de passe est requis';
                    const confirmPasswordError = formData.confirmPassword ? 
                      (formData.password !== formData.confirmPassword ? 'Les mots de passe ne correspondent pas' : '') : 
                      'La confirmation du mot de passe est requise';
                    
                    // Mettre à jour toutes les erreurs
                    setErrors({
                      username: usernameError,
                      email: emailError,
                      password: passwordError,
                      confirmPassword: confirmPasswordError
                    });
                    
                    // Afficher un message d'erreur global approprié
                    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
                      setMessage({ text: 'Merci de remplir tous les champs', type: 'error' });
                    } else if (usernameError || emailError || passwordError || confirmPasswordError) {
                      setMessage({ text: 'Certains champs contiennent des erreurs', type: 'error' });
                    } else if (!turnstileToken) {
                      setMessage({ text: 'Veuillez compléter la vérification de sécurité', type: 'error' });
                    }
                  }
                }}
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  "S'inscrire"
                )}
              </Button>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Ou</span>
                </div>
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      <path d="M1 1h22v22H1z" fill="none"/>
                    </svg>
                    S'inscrire avec Google
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Vous avez déjà un compte?{' '}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;