import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CircleCheckIcon, CircleAlert, Loader } from "lucide-react";
import { API_BASE_URL } from '@/config/api';

function VerifAuthGoogle() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const tempTokenParam = params.get('tempToken');
    
    if (!emailParam || !tempTokenParam) {
      navigate('/login');
      return;
    }
    
    setEmail(emailParam);
    setTempToken(tempTokenParam);
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/link-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          tempToken
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setMessage({ text: 'Compte lié avec succès!', type: 'success' });
        setTimeout(() => {
          navigate('/account');
        }, 2000);
      } else {
        setMessage({ text: data.message || 'Mot de passe incorrect', type: 'error' });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erreur lors de la liaison du compte:', error);
      setMessage({ text: 'Erreur de connexion au serveur', type: 'error' });
      setIsLoading(false);
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

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-4xl font-bold text-foreground text-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <span className="block">Lier votre</span>
                <span className="block mt-2">
                  Compte <span style={{ color: '#4285F4' }}>G</span><span style={{ color: '#EA4335' }}>o</span><span style={{ color: '#FBBC05' }}>o</span><span style={{ color: '#4285F4' }}>g</span><span style={{ color: '#34A853' }}>l</span><span style={{ color: '#EA4335' }}>e</span>
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Un compte existe déjà avec l'adresse email: <span className="font-medium">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Veuillez saisir votre mot de passe pour lier votre compte Google
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            <div>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>
            
            <Button type="submit" className="w-full">
              {isLoading ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                "Lier mon compte"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VerifAuthGoogle;