import { Outlet, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { TooltipProvider } from '../ui/tooltip';
import { useAuthStore } from '../../store/auth';

export default function AppLayout() {
  useKeyboardShortcuts();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const isGuest = token === '';

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          {isGuest && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs shrink-0">
              <span>
                <strong>Guest mode</strong> — you're browsing public repositories only.
                Private repos, write actions, and CI/CD features require a token.
              </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
              >
                <LogIn className="h-3 w-3" />
                Sign in
              </button>
            </div>
          )}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
