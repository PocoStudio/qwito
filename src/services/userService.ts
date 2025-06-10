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