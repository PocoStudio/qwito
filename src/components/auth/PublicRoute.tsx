import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Protège les routes publiques (login, register) des utilisateurs déjà connectés
export const PublicRoute = () => {
  const { user, loading } = useAuth();

  // Afficher un spinner pendant le chargement
  if (loading) {
    return <LoadingSpinner fullHeight text="Chargement..." />;
  }

  // Rediriger vers le panel si l'utilisateur est déjà connecté
  if (user) {
    return <Navigate to="/panel" replace />;
  }

  // Rendre les routes enfants si l'utilisateur n'est pas connecté
  return <Outlet />;
};