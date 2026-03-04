import type { ReportType, ReportLocationType } from '@/types';

export interface ReportTypeConfig {
  type: ReportType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  { type: 'CONTROLEURS', label: 'Contrôleurs', icon: 'Shield', color: '#6366f1', description: 'Contrôleurs sur le réseau' },
  { type: 'RAME_BONDEE', label: 'Rame bondée', icon: 'Users', color: '#f97316', description: 'Train très chargé' },
  { type: 'ESCALATOR_PANNE', label: 'Escalator en panne', icon: 'ArrowUpDown', color: '#ef4444', description: 'Escalator hors service' },
  { type: 'ASCENSEUR_PANNE', label: 'Ascenseur en panne', icon: 'Accessibility', color: '#ef4444', description: 'Ascenseur hors service' },
  { type: 'RETARD_NON_SIGNALE', label: 'Retard non signalé', icon: 'Clock', color: '#eab308', description: 'Retard non annoncé' },
  { type: 'GREVE', label: 'Grève', icon: 'Megaphone', color: '#dc2626', description: 'Mouvement social en cours' },
];

export const REPORT_TYPE_MAP: Record<string, ReportTypeConfig> = Object.fromEntries(
  REPORT_TYPES.map(t => [t.type, t]),
);

export interface ReportLocationConfig {
  type: ReportLocationType;
  label: string;
  description: string;
}

export const REPORT_LOCATIONS: ReportLocationConfig[] = [
  { type: 'PLATFORM', label: 'Quai', description: 'Sur le quai d\'une ligne' },
  { type: 'TRANSFER_CORRIDOR', label: 'Couloir', description: 'Couloir de correspondance' },
  { type: 'STATION_EXIT', label: 'Sortie', description: 'Sortie de station' },
];
