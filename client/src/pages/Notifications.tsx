import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, Card } from '../components/ui';
import { formatDate } from '../lib/format';
import type { AppNotification } from '../types';

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await api.get<{ items: AppNotification[]; unread: number }>('/notifications')).data,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">Notifications</h1>
        {(data?.unread ?? 0) > 0 && (
          <Button variant="secondary" onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !data?.items.length ? (
        <Card>
          <p className="text-center text-slate-500">No notifications yet.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((n) => (
            <Card
              key={n.id}
              className={`${n.read ? '' : 'border-l-4 border-l-brand-500'} cursor-pointer`}
            >
              <button
                onClick={() => !n.read && markRead.mutate(n.id)}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>
                    {n.title}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(n.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
