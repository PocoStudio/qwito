import { apiGet, apiPost } from './apiService';

export const getUserChannels = async () => {
  return await apiGet('/api/channels');
};

export const getChannelDetails = async (channelId: string) => {
  return await apiGet(`/api/channels/${channelId}`);
};

export const createChannel = async (channelData: { name: string; description: string }) => {
  return await apiPost('/api/channels', channelData);
};

export const inviteUserToChannel = async (channelId: string, username: string) => {
  return await apiPost(`/api/channels/${channelId}/invite`, { username });
};

export const getChannelMessageBatchCount = async (channelId: string, batchSize = 50) => {
  return await apiGet(`/api/channels/${channelId}/messages/batch-count?batch_size=${batchSize}`);
};

export const getChannelMessageBatch = async (channelId: string, batchNumber = 1, batchSize = 50) => {
  return await apiGet(`/api/channels/${channelId}/messages/batch?batch_number=${batchNumber}&batch_size=${batchSize}`);
};

export const updateChannelDescription = async (channelId: string, description: string) => {
  return await apiPost(`/api/channels/${channelId}/update-description`, { description });
};