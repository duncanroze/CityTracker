'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Route, TrainFront, AlertTriangle, MessageSquareWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Itinéraire', icon: Route, exact: true },
  { href: '/lignes', label: 'Lignes', icon: TrainFront, exact: false },
  { href: '/trafic', label: 'Trafic', icon: AlertTriangle, exact: true },
  { href: '/communaute', label: 'Signalements', icon: MessageSquareWarning, exact: true },
];

export default function AppNav({ showLabels }: { showLabels?: boolean } = {}) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className={showLabels ? '' : 'hidden sm:inline'}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
