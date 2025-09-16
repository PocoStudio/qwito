import { Socket } from 'socket.io-client';

export function initSocket(token: string): Socket;
export function getSocket(): Socket | undefined;
export function joinChannels(channels: any[]): void;
export function sendMessage(channelId: string, content: string): void;
export function inviteUser(channelId: string, toUserId: string): void;
export function disconnectSocket(): void;