import React from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  return <Link to="/notifications" aria-label={`${unreadCount} unread notifications`} className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100">
    <Bell className="h-5 w-5" />
    {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
  </Link>;
};
