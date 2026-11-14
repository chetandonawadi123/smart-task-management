import api from '../lib/api';

export interface Notification {
  id: number;
  recipient_id: number;
  organization_id: number;
  actor_id: number | null;
  task_id: number | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationEventItem {
  id: number;
  title?: string;
  message?: string;
  notification_type?: string;
  created_at?: string;
  is_read?: boolean;
  task_id?: number | null;
}

export interface NotificationEvent {
  event: string;
  unread_count: number;
  notification?: NotificationEventItem;
}

export const notificationService = {
  async list(params: { unread_only?: boolean; limit?: number; offset?: number } = {}): Promise<NotificationListResponse> {
    const response = await api.get<NotificationListResponse>('/api/v1/notifications/', {
      params: { limit: 20, offset: 0, ...params },
    });
    return response.data;
  },
  async unreadCount(): Promise<number> {
    const response = await api.get<UnreadCountResponse>('/api/v1/notifications/unread-count');
    return response.data.unread_count;
  },
  async markRead(notificationId: number): Promise<void> {
    await api.patch(`/api/v1/notifications/${notificationId}/read`);
  },
  async markAllRead(): Promise<number> {
    const response = await api.patch<{ updated_count: number }>('/api/v1/notifications/read-all');
    return response.data.updated_count;
  },
  async remove(notificationId: number): Promise<void> {
    await api.delete(`/api/v1/notifications/${notificationId}`);
  },
};
