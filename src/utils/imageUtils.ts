export const compressImage = (file: File, maxWidth = 300, maxHeight = 300, crop = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (crop) {
          // Pour le recadrage carré, on prend la plus petite dimension
          const size = Math.min(width, height);
          offsetX = (width - size) / 2;
          offsetY = (height - size) / 2;
          width = size;
          height = size;
        } else {
          // Déterminer les dimensions pour maintenir le ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * maxHeight / height);
              height = maxHeight;
            }
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = crop ? maxWidth : width;
        canvas.height = crop ? maxHeight : height;
        
        const ctx = canvas.getContext('2d');
        if (crop) {
          // Dessiner une portion carrée de l'image source
          ctx?.drawImage(
            img,
            offsetX, offsetY, width, height,  // Source: portion carrée de l'image
            0, 0, maxWidth, maxHeight         // Destination: canvas entier
          );
        } else {
          ctx?.drawImage(img, 0, 0, width, height);
        }
        
        // Convertir en base64 avec compression
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
  });
};

// Fonction pour obtenir l'URL complète d'un avatar
export const getFullAvatarUrl = (avatarPath: string | null | undefined): string => {
  if (!avatarPath) return '';
  
  // Si l'URL est déjà absolue (commence par http:// ou https://), la retourner telle quelle
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // Extraire l'ID utilisateur du chemin de l'avatar
  // Le format actuel est /uploads/avatars/userId.extension
  const match = avatarPath.match(/\/uploads\/avatars\/([^\.]+)/);
  if (match && match[1]) {
    const userId = match[1];
    // Utiliser la nouvelle route sécurisée
    return `${import.meta.env.VITE_API_URL}/api/auth/public-avatar/${userId}`;
  }
  
  // Fallback au comportement précédent si le format ne correspond pas
  return `${import.meta.env.VITE_API_URL}${avatarPath}`;
};


export const getFullFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) return '';
  
  // Extraire l'ID du channel et le nom du fichier depuis l'URL
  // Exemple: /uploads/channels/123/filename.pdf
  const urlParts = filePath.split('/');
  const channelId = urlParts[3]; // Position de l'ID du channel
  const filename = urlParts[4]; // Position du nom de fichier
  
  // Retourner l'URL sécurisée qui passera par le contrôleur d'authentification
  return `${import.meta.env.VITE_API_URL}/api/auth/uploads/channels/${channelId}/${filename}`;
};
