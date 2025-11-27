import { apiGet, apiPost } from './apiService';

export const getUserInvitations = async () => {
  return await apiGet('/api/channels/invitations');
};

export const respondToInvitation = async (invitationId: string, accept: boolean) => {
  return await apiPost(`/api/channels/invitations/${invitationId}/respond`, { accept });
};