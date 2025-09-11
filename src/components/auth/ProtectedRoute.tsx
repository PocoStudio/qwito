import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Protège les routes qui nécessitent une authentification
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // Afficher un spinner pendant le chargement
  if (loading) {
    return <LoadingSpinner fullHeight text="Chargement..." />;
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Rendre les routes enfants si l'utilisateur est connecté
  return <Outlet />;
};