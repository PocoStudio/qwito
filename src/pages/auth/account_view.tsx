import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/config/api';

interface UserData {
  uniqueid: string;
  username: string;
  email: string;
  createdAt: string;
}

function AccountView() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      // Récupérer le token depuis sessionStorage ou localStorage
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données');
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Erreur:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Mon Compte</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Informations de votre compte
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Nom d'utilisateur</label>
            <p className="mt-1 text-lg font-semibold text-foreground">{userData.username}</p>
          </div>

          <div>
          <label className="block text-sm font-medium text-muted-foreground">Identifiant unique</label>
          <p className="mt-1 text-lg font-semibold text-foreground">{userData.uniqueid}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">Adresse e-mail</label>
            <p className="mt-1 text-lg font-semibold text-foreground">{userData.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground">Date de création du compte</label>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {new Date(userData.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountView;
