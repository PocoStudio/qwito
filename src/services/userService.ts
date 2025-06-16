import { apiGet, apiPost, apiDelete } from './apiService';

export const getCurrentUser = async () => {
  return await apiGet('/api/auth/me');
};

export const checkUsernameAvailability = async (username: string) => {
  return await apiGet(`/api/auth/check-username/${encodeURIComponent(username.toLowerCase())}`);
};

export const updateUsername = async (username: string) => {
  return await apiPost('/api/auth/update-username', { username });
};

export const changePassword = async (oldPassword: string, newPassword: string, confirmPassword: string) => {
  return await apiPost('/api/auth/change-password', { oldPassword, newPassword, confirmPassword });
};


export const getUserOptions = async () => {
  const response = await apiGet('/api/auth/user-options');
  return response.options || {};
};

export const setUserOption = async (optionName: string, optionValue: string) => {
  return await apiPost('/api/auth/set-user-option', { optionName, optionValue });
};

export const deleteUserOption = async (optionName: string) => {
  return await apiPost('/api/auth/delete-user-option', { optionName });
};

export const deleteUserAccount = async (password: string) => {
  return await apiDelete('/api/auth/delete-account', { password });
};

// Nouvelles fonctions pour gérer l'avatar
export const uploadAvatar = async (avatarData: string) => {
  return await apiPost('/api/auth/upload-avatar', { avatarData });
};

export const deleteAvatar = async () => {
  return await apiPost('/api/auth/delete-avatar', {});
};


export const activatePlatinum = async (activationCode: string) => {
    const response = await apiPost('/api/auth/activate-platinum', { activationCode });
    return response;
};


export const checkPlatinumStatus = async () => {
  try {
    const response = await apiGet('/api/auth/platinum-status');
    return response; // Retourner directement la réponse, pas response.data
  } catch (error) {
    if (error instanceof Error && 'response' in error) {
      const apiError = error as { response?: { data: unknown } };
      throw apiError.response?.data || { message: 'Erreur lors de la vérification du statut Platinum' };
    }
    throw { message: 'Erreur lors de la vérification du statut Platinum' };
  }
};