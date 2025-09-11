import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/services/userService';

// Définir l'interface UserData
interface UserData {
  uniqueid: string;
  username: string;
  email: string;
  createdAt: string;
  theme?: string;
  showStatus?: boolean;
  avatar?: string; // Ajout du champ avatar
}

export const useAuth = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Ajoutez cette fonction pour rafraîchir les données utilisateur
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError(err as Error);
    }
  };
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);
  
  return { user, loading, error, refreshUser };
};