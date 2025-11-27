import { API_BASE_URL } from '@/config/api';

/**
 * Ouvre un fichier dans un nouvel onglet avec authentification sécurisée
 * @param fileUrl URL relative du fichier
 * @param channelId ID du channel auquel appartient le fichier
 */
export const openFileInNewTab = async (fileUrl: string, channelId: string): Promise<void> => {
  try {
    // Générer un token temporaire pour l'accès au fichier
    const response = await fetch(`${API_BASE_URL}/api/files/secure-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ fileUrl, channelId, action: 'open' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'accès au fichier');
    }

    const { secureUrl } = await response.json();
    
    // Ouvrir le fichier dans un nouvel onglet
    window.open(secureUrl, '_blank');
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du fichier:', error);
    throw error;
  }
};

/**
 * Télécharge un fichier avec authentification sécurisée
 * @param fileUrl URL relative du fichier
 * @param channelId ID du channel auquel appartient le fichier
 */
export const downloadFileWithAuth = async (fileUrl: string, channelId: string): Promise<void> => {
  try {
    // Générer un token temporaire pour l'accès au fichier
    const response = await fetch(`${API_BASE_URL}/api/files/secure-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({ fileUrl, channelId, action: 'download' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors du téléchargement du fichier');
    }

    const { secureUrl } = await response.json();
    
    // Créer un lien temporaire pour le téléchargement
    const link = document.createElement('a');
    link.href = secureUrl;
    link.setAttribute('download', ''); // Force le téléchargement
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    throw error;
  }
};