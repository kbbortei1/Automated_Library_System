import type { ReactNode } from 'react';
import { NotificationBell } from './NotificationBell';

// Page header for staff screens: title/subtitle on the left, optional actions + bell on the right.
export function StaffHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-800 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <NotificationBell />
      </div>
    </div>
  );
}
