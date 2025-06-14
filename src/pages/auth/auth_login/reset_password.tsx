import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleCheckIcon, CircleAlert, Loader } from "lucide-react";
import { API_BASE_URL } from '@/config/api';

function ResetPassword() {
  const [step, setStep] = useState(1); // 1: demande de réinitialisation, 2: saisie du nouveau mot de passe
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Vérifier si on a un token dans l'URL (étape 2)
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    
    if (tokenParam && emailParam) {
      setResetToken(tokenParam);
      setEmail(emailParam);
      setStep(2);
    }
  }, [location]);

  // Validation du format de l'email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation du mot de passe
  const validatePassword = (value: string): string => {
    if (value.length < 8 || value.length > 45) {
      return 'Le mot de passe doit contenir entre 8 et 45 caractères';
    }
    return '';
  };

  // Étape 1: Demande de réinitialisation
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setIsLoading(true);
    
    // Validation de l'email
    if (!isValidEmail(email)) {
      setMessage({ text: 'Veuillez entrer une adresse email valide', type: 'error' });
      setIsLoading(false);
      return;
    }
    
    try {
      await fetch(`${API_BASE_URL}/api/auth/request-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      setMessage({ 
        text: 'Si un compte existe avec cette adresse, un email de réinitialisation a été envoyé.', 
        type: 'success' 
      });
      
      // Rediriger vers la page de connexion après un délai
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      console.error('Erreur lors de la demande de réinitialisation:', error);
      setMessage({ text: 'Une erreur est survenue, veuillez réessayer plus tard', type: 'error' });
      setIsLoading(false);
    }
  };

  // Étape 2: Réinitialisation du mot de passe
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setIsLoading(true);
    
    // Validation du mot de passe
    const passwordError = validatePassword(password);
    if (passwordError) {
      setMessage({ text: passwordError, type: 'error' });
      setIsLoading(false);
      return;
    }
    
    // Vérification de la correspondance des mots de passe
    if (password !== confirmPassword) {
      setMessage({ text: 'Les mots de passe ne correspondent pas', type: 'error' });
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          password,
          resetToken 
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ text: 'Mot de passe réinitialisé avec succès!', type: 'success' });
        
        // Rediriger vers la page de connexion après un délai
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMessage({ text: data.message || 'Erreur lors de la réinitialisation', type: 'error' });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      setMessage({ text: 'Une erreur est survenue, veuillez réessayer plus tard', type: 'error' });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ text: '', type: '' });
      }, 3000);
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
              <h1 className="text-3xl font-bold text-foreground">
                {step === 1 ? 'Réinitialisation du mot de passe' : 'Nouveau mot de passe'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === 1 
                  ? 'Entrez votre adresse e-mail pour recevoir un lien de réinitialisation' 
                  : 'Veuillez entrer votre nouveau mot de passe'}
              </p>
            </div>
            
            {step === 1 ? (
              <form onSubmit={handleRequestReset} className="space-y-6 mt-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={50}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Entrez votre adresse e-mail"
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6 mt-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Nouveau mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    maxLength={45}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Entrez votre nouveau mot de passe"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    maxLength={45}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Confirmez votre nouveau mot de passe"
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    "Réinitialiser le mot de passe"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;