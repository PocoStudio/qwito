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
      // Vérifier si on est dans une popup (fenêtre ouverte par window.open)
      const isPopup = window.opener && window.opener !== window;
      
      if (isPopup) {
        // Envoyer le token à la fenêtre parent
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            token: token
          }, window.location.origin);
        } catch (error) {
          console.error('Erreur lors de l\'envoi du message à la fenêtre parent:', error);
        }
        
        // Fermer la popup immédiatement
        setTimeout(() => {
          window.close();
        }, 100); // Petit délai pour s'assurer que le message est envoyé
      } else {
        // Comportement normal - stocker le token et rediriger
        localStorage.setItem('token', token);
        navigate('/panel');
      }
    } else {
      // En cas d'erreur
      const isPopup = window.opener && window.opener !== window;
      
      if (isPopup) {
        // Envoyer l'erreur à la fenêtre parent
        try {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'Aucun token trouvé dans l\'URL'
          }, window.location.origin);
        } catch (error) {
          console.error('Erreur lors de l\'envoi du message d\'erreur:', error);
        }
        
        // Fermer la popup immédiatement
        setTimeout(() => {
          window.close();
        }, 100);
      } else {
        // Comportement normal - rediriger vers la page de connexion
        console.error('Aucun token trouvé dans l\'URL');
        navigate('/login?error=auth_failed');
      }
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