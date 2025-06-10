import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function GoogleAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      // Stocker le token dans localStorage (session longue durée)
      localStorage.setItem('token', token);
      
      // Rediriger vers la page du compte
      navigate('/panel');
    } else {
      // En cas d'erreur, rediriger vers la page de connexion
      navigate('/login?error=auth_failed');
    }
  }, [navigate, location]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authentification en cours...</h2>
        <p className="text-muted-foreground">Veuillez patienter pendant que nous vous connectons.</p>
      </div>
    </div>
  );
}

export default GoogleAuth;