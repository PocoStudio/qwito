import { apiGet, apiPost, apiDelete } from './apiService';

export const getBlockedUsers = async () => {
  return await apiGet('/api/channels/blocked-users');
};

export const blockUser = async (userId: string) => {
  return await apiPost('/api/channels/blocked-users', { blockedUserId: userId });
};

export const unblockUser = async (userId: string) => {
  return await apiDelete(`/api/channels/blocked-users/${userId}`);
};

export const blockAndRejectInvitation = async (invitationId: string) => {
  return await apiPost(`/api/channels/invitations/${invitationId}/block`, {});
};