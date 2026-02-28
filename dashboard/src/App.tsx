import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import AgentDashboard from './components/AgentDashboard';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('agent-dashboard-theme');
    if (stored) return stored !== 'light';
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('agent-dashboard-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsDark(!isDark)}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors hover:text-foreground"
          title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <AgentDashboard />
    </div>
  );
}
