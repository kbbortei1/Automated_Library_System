import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { BellIcon } from './icons';

export function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: async () => (await api.get<{ unread: number }>('/notifications')).data,
    refetchInterval: 60_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <NavLink
      to="/notifications"
      className="relative rounded-full p-2 text-fg-muted transition hover:bg-surface-3"
      aria-label="Notifications"
    >
      <BellIcon />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </NavLink>
  );
}
