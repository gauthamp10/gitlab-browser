import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users,
  ChevronLeft, ChevronRight, Search, Pin, LogOut,
  Plus, Server
} from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import UserAvatar from '../common/UserAvatar';
import { useAuthStore } from '../../store/auth';
import { useSettingsStore } from '../../store/settings';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: 'g d' },
  { to: '/projects', icon: FolderOpen, label: 'Projects', shortcut: 'g p' },
  { to: '/groups', icon: Users, label: 'Groups', shortcut: 'g g' },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, instances, host, switchInstance } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, pinnedProjects } = useSettingsStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3 border-b border-border', sidebarCollapsed ? 'justify-center' : 'gap-2')}>
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
              <path d="M12 2L2 19h20L12 2zm0 3.5L18.5 17h-13L12 5.5z" />
            </svg>
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-sm text-foreground truncate">GitLab Browser</span>
          )}
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Search shortcut */}
          {!sidebarCollapsed && (
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => document.querySelector<HTMLInputElement>('[data-global-search]')?.focus()}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="text-[10px] bg-muted border border-border rounded px-1 py-0.5">/</kbd>
            </button>
          )}

          {/* Nav items */}
          {navItems.map(({ to, icon: Icon, label, shortcut }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Tooltip key={to} delayDuration={0} disableHoverableContent={!sidebarCollapsed}>
                <TooltipTrigger asChild>
                  <Link
                    to={to}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                      sidebarCollapsed && 'justify-center',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    {!sidebarCollapsed && (
                      <kbd className="ml-auto text-[10px] bg-muted border border-border rounded px-1 hidden group-hover:inline-block">
                        {shortcut}
                      </kbd>
                    )}
                  </Link>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">
                    {label}
                    <span className="ml-2 text-xs opacity-60">{shortcut}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}

          {/* Pinned projects */}
          {pinnedProjects.length > 0 && !sidebarCollapsed && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Pin className="h-3 w-3" />
                  <span>Pinned</span>
                </div>
                {pinnedProjects.slice(0, 5).map((id) => (
                  <Link
                    key={id}
                    to={`/projects/${id}`}
                    className="flex items-center gap-2 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Project #{id}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Instances */}
          {instances.length > 1 && !sidebarCollapsed && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Server className="h-3 w-3" />
                  <span>Instances</span>
                </div>
                {instances.map((instance) => (
                  <button
                    key={instance.host}
                    onClick={() => switchInstance(instance.host)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors',
                      instance.host === host
                        ? 'text-primary font-medium bg-primary/5'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className={cn('h-2 w-2 rounded-full shrink-0', instance.host === host ? 'bg-primary' : 'bg-muted-foreground')} />
                    <span className="truncate">{instance.host.replace('https://', '').replace('http://', '')}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom: user + add instance + collapse */}
      <div className="border-t border-border p-2 space-y-1">
        {user && (
          <Tooltip delayDuration={0} disableHoverableContent={!sidebarCollapsed}>
            <TooltipTrigger asChild>
              <Link
                to="/profile"
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <UserAvatar user={user} size="xs" showTooltip={false} />
                {!sidebarCollapsed && (
                  <span className="truncate text-muted-foreground text-xs">{user.name}</span>
                )}
              </Link>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">{user.name}</TooltipContent>}
          </Tooltip>
        )}

        <Link
          to="/login?add=1"
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!sidebarCollapsed && <span>Add instance</span>}
        </Link>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>

        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full h-7 text-xs text-muted-foreground', sidebarCollapsed && 'justify-center')}
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
