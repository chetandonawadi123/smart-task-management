import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import type { Notification, NotificationEvent } from '../services/notificationService';

interface NotificationContextValue {
  unreadCount: number;
  isConnected: boolean;
  markRead: (notificationId: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (notificationId: number) => Promise<void>;
  openNotification: (notification: Notification) => void;
  toast: Notification | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempt = useRef(0);
  const seenEvents = useRef(new Set<string>());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setConnected] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const setUnread = useCallback((count: number) => {
    setUnreadCount(count);
    queryClient.setQueryData(['notifications', 'unread-count'], { unread_count: count });
  }, [queryClient]);

  const refreshNotifications = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
    ]);
  }, [queryClient]);

  useEffect(() => {
    if (!token) {
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      setUnreadCount(0);
      setToast(null);
      return;
    }

    let active = true;
    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.unreadCount();
        if (active) setUnread(count);
      } catch {
        // The notification center exposes the request error; realtime setup should remain non-blocking.
      }
    };
    void loadUnreadCount();

    const websocketBase = import.meta.env.VITE_WS_URL || window.location.origin.replace(/^http/, 'ws');
    const connect = () => {
      if (!active) return;
      const socket = new WebSocket(`${websocketBase}/api/v1/ws/notifications?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;
      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setConnected(true);
      };
      socket.onmessage = (message) => {
        let event: NotificationEvent;
        try {
          event = JSON.parse(message.data) as NotificationEvent;
        } catch {
          return;
        }
        const eventKey = `${event.event}:${event.notification?.id ?? 'all'}:${event.unread_count}`;
        if (seenEvents.current.has(eventKey)) return;
        seenEvents.current.add(eventKey);
        if (seenEvents.current.size > 100) seenEvents.current.delete(seenEvents.current.values().next().value ?? '');
        setUnread(event.unread_count);
        void refreshNotifications();
        if (event.event === 'notification.created' && event.notification?.title && event.notification.message) {
          const item: Notification = {
            id: event.notification.id,
            recipient_id: 0,
            organization_id: 0,
            actor_id: null,
            task_id: event.notification.task_id ?? null,
            notification_type: event.notification.notification_type ?? 'notification',
            title: event.notification.title,
            message: event.notification.message,
            is_read: event.notification.is_read ?? false,
            created_at: event.notification.created_at ?? new Date().toISOString(),
          };
          setToast(item);
        }
      };
      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (!active) return;
        const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt.current);
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [refreshNotifications, setUnread, token]);

  const markRead = useCallback(async (notificationId: number) => {
    await notificationService.markRead(notificationId);
    setUnreadCount((count) => {
      const next = Math.max(0, count - 1);
      queryClient.setQueryData(['notifications', 'unread-count'], { unread_count: next });
      return next;
    });
    await refreshNotifications();
  }, [refreshNotifications, setUnread]);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setUnread(0);
    await refreshNotifications();
  }, [refreshNotifications, setUnread]);

  const remove = useCallback(async (notificationId: number) => {
    await notificationService.remove(notificationId);
    await refreshNotifications();
  }, [refreshNotifications]);

  const openNotification = useCallback((notification: Notification) => {
    if (notification.task_id) navigate(`/tasks/${notification.task_id}`);
  }, [navigate]);

  const value = useMemo(() => ({
    unreadCount,
    isConnected,
    markRead,
    markAllRead,
    remove,
    openNotification,
    toast,
    dismissToast: () => setToast(null),
  }), [isConnected, markAllRead, markRead, openNotification, remove, toast, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
