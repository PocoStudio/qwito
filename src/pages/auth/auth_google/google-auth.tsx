import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function GoogleAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Ajouter des logs pour déboguer
    console.log('URL complète:', window.location.href);
    console.log('Location search:', location.search);
    
    // Essayer d'abord de récupérer le token depuis l'URL actuelle
    const params = new URLSearchParams(location.search);
    let token = params.get('token');
    
    // Si aucun token n'est trouvé dans l'URL actuelle, vérifier s'il y a un token dans le hash
    // Cela peut arriver après une redirection 404 de GitHub Pages
    if (!token && window.location.hash) {
      // Le hash peut contenir des paramètres après une redirection
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      token = hashParams.get('token');
    }
    
    console.log('Token récupéré:', token);
    
    if (token) {
      // Stocker le token et rediriger vers le panel
      localStorage.setItem('token', token);
      navigate('/panel', { replace: true });
    } else {
      // En cas d'erreur, rediriger vers la page de connexion
      console.error('Aucun token trouvé dans l\'URL');
      navigate('/login?error=auth_failed', { replace: true });
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