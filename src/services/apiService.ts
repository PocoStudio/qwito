import { API_BASE_URL } from '@/config/api';

const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export const apiGet = async (endpoint: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Une erreur est survenue');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API GET Error:', error);
    throw error;
  }
};

export const apiPost = async (endpoint: string, data: any) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Une erreur est survenue');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API POST Error:', error);
    throw error;
  }
};

export const apiDelete = async (endpoint: string, data?: any) => {
  try {
    const options: RequestInit = {
      method: 'DELETE',
      headers: getHeaders(),
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Une erreur est survenue');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API DELETE Error:', error);
    throw error;
  }
};

export const apiUploadFiles = async (
  endpoint: string, 
  formData: FormData, 
  onProgress?: (progress: { [key: string]: number }) => void
) => {
  try {
    const token = getToken();
    // const headers: HeadersInit = {
    //   'Authorization': token ? `Bearer ${token}` : ''
    // };
    
    // Utiliser XMLHttpRequest pour suivre la progression
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Suivre la progression
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // Calculer la progression globale
            const percentComplete = (event.loaded / event.total) * 100;
            
            // Créer un objet avec la progression pour chaque fichier
            // Dans ce cas, nous utilisons la même progression pour tous les fichiers
            const progressMap: { [key: string]: number } = {};
            
            // Extraire les fichiers du FormData
            for (let pair of formData.entries()) {
              if (pair[0] === 'files' && pair[1] instanceof File) {
                const file = pair[1] as File;
                progressMap[file.name] = percentComplete;
              }
            }
            
            onProgress(progressMap);
          }
        });
      }
      
      xhr.open('POST', `${API_BASE_URL}${endpoint}`);
      
      // Ajouter les en-têtes
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Erreur lors de l\'analyse de la réponse'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Une erreur est survenue'));
          } catch (e) {
            reject(new Error('Une erreur est survenue'));
          }
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Erreur réseau lors du téléchargement'));
      };
      
      xhr.send(formData);
    });
  } catch (error) {
    console.error('API Upload Error:', error);
    throw error;
  }
};