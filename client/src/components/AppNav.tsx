import { NavLink } from 'react-router';
import { Route, TrainFront, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Itinéraire', icon: Route, end: true },
  { to: '/lignes', label: 'Lignes', icon: TrainFront, end: false },
  { to: '/trafic', label: 'Infos trafic', icon: AlertTriangle, end: true },
];

export default function AppNav() {
  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )
          }
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
