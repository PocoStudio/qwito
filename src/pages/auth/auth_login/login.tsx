import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CircleCheckIcon, CircleAlert, Loader } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from '@/config/api';
import { useIsMobile } from "@/hooks/use-mobile";
import capiomontLogo from '@/assets/logo.png';

function Login() {
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ajouter un état pour le chargement
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  // Vérifier les paramètres d'URL et l'état de navigation
  useEffect(() => {
    // Vérifier si le paramètre accountsupress est présent dans l'URL
    const params = new URLSearchParams(location.search);
    if (params.has('accountsupress150321')) {
      setMessage({ 
        text: "Votre compte a été supprimé avec succès", 
        type: "success" 
      });
    }
    
    // Vérifier si un message est passé via l'état de navigation
    if (location.state?.message) {
      setMessage(location.state.message);
      // Nettoyer l'état pour éviter que le message ne réapparaisse après une navigation
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'email' && value.length > 35) {
      return;
    }
    
    if (name === 'password' && value.length > 45) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Fonction pour valider le format de l'email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Récupérer le domaine actuel
    const currentDomain = window.location.origin;
    // Stocker le domaine dans sessionStorage pour la vérification après redirection
    sessionStorage.setItem('auth_origin', currentDomain);
    
    const googleAuthUrl = `${API_BASE_URL}/api/auth/google`;
    
    setTimeout(() => {
      // Utiliser une redirection directe dans tous les cas pour éviter les problèmes
      // d'onglets ouverts sur mobile et dans les PWA
      // La page google-auth se chargera de la redirection après authentification
      window.location.href = googleAuthUrl;
    }, 500);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si déjà en chargement, ne rien faire
    if (isLoading) return;
    
    // Activer l'état de chargement
    setIsLoading(true);
    
    // Vérification du format de l'email
    if (!isValidEmail(formData.email)) {
      setMessage({ text: 'Format de l\'email invalide', type: 'error' });
      setIsLoading(false); // Désactiver l'état de chargement
      return;
    }
    
    // Vérification si le mot de passe est vide
    if (!formData.password) {
      setMessage({ text: 'Email ou mot de passe incorrect', type: 'error' });
      setIsLoading(false); // Désactiver l'état de chargement
      return;
    }
    
    // Vérification de la longueur du mot de passe
    if (formData.password.length > 45) {
      setMessage({ text: 'Email ou mot de passe incorrect', type: 'error' });
      setIsLoading(false); // Désactiver l'état de chargement
      return;
    }
    
    try {
      const startTime = Date.now(); // Enregistrer le temps de début
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe
        }),
      });
      
      const data = await response.json();
      
      // Calculer le temps écoulé
      const elapsedTime = Date.now() - startTime;
      
      // Si moins d'une seconde s'est écoulée, attendre le reste
      const remainingTime = Math.max(0, 1000 - elapsedTime);
      
      if (response.ok) {
        if (formData.rememberMe) {
          localStorage.setItem('token', data.token);
        } else {
          sessionStorage.setItem('token', data.token);
        }
        
        // Afficher un message de succès
        setMessage({ text: 'Connexion réussie!', type: 'success' });
        
        // Attendre au moins 1 seconde au total avant de rediriger
        setTimeout(() => {
          navigate('/panel');
        }, 1000 + remainingTime); // 2 secondes + le temps restant pour atteindre 1 seconde
      } else {
        // Attendre au moins 1 seconde au total avant d'afficher l'erreur
        setTimeout(() => {
          // Afficher le message d'erreur
          setMessage({ text: data.message || 'Erreur de connexion', type: 'error' });
          setIsLoading(false); // Désactiver l'état de chargement
        }, remainingTime);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      
      // Attendre au moins 1 seconde avant d'afficher l'erreur
      setTimeout(() => {
        setMessage({ text: 'Erreur de connexion au serveur', type: 'error' });
        setIsLoading(false); // Désactiver l'état de chargement
      }, 1000);
    }
  };

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
          <div className="rounded-lg border bg-card p-6 shadow-lg relative overflow-hidden">
            
            <div className="text-center relative z-10">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img 
                  src={capiomontLogo} 
                  alt="Capiomont Logo" 
                  className="w-10 h-10 object-contain"
                />
                <span className="text-3xl font-bold bg-gradient-to-br from-[#3C8CC8] via-[#64B4E6] to-[#1E64A0] bg-clip-text text-transparent opacity-90">Talk</span>
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-foreground/30 to-transparent"></div>
                <h1 className="text-3xl font-bold text-foreground">Connexion</h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Connectez-vous à votre compte
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 mt-6 relative z-10">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    maxLength={35}
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Entrez votre adresse e-mail"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    maxLength={45}
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Entrez votre mot de passe"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, rememberMe: checked === true }))
                      }
                      className="border-gray-400 hover:border-gray-500"
                    />
                    <label htmlFor="rememberMe" className="text-sm text-muted-foreground">
                      Se souvenir de moi
                    </label>
                  </div>
                  
                  <div className="text-sm">
                    <Link to="/reset-password" className="font-medium text-primary hover:underline">
                      {isMobile ? "Mdp oublié?" : "Mot de passe oublié?"}
                    </Link>
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full">
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  "Se connecter"
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
                    Se connecter avec Google
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Vous n'avez pas de compte?{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    S'inscrire
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

export default Login;