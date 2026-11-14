import React, { useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

export const NotificationToast: React.FC = () => {
  const { toast, dismissToast, openNotification } = useNotifications();
  const navigate = useNavigate();
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(dismissToast, 6_000);
    return () => clearTimeout(timeout);
  }, [dismissToast, toast]);
  if (!toast) return null;
  return <div className="fixed bottom-5 right-5 z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-[#0b1329] p-4 text-white shadow-2xl">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-blue-600 p-2"><Bell className="h-4 w-4" /></div><button type="button" aria-label="Dismiss notification" onClick={dismissToast} className="ml-auto text-slate-400"><X className="h-4 w-4" /></button></div>
    <button type="button" onClick={() => { openNotification(toast); dismissToast(); navigate(toast.task_id ? `/tasks/${toast.task_id}` : '/notifications'); }} className="mt-3 text-left"><p className="text-sm font-bold">{toast.title}</p><p className="mt-1 text-xs leading-5 text-slate-300">{toast.message}</p></button>
  </div>;
};
