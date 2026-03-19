import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Monitor, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '../ui/dropdown-menu';
import UserAvatar from '../common/UserAvatar';
import { useAuthStore } from '../../store/auth';
import { useTheme } from '../ThemeProvider';
import { cn } from '../../utils/cn';

export default function Topbar() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="flex items-center h-14 px-4 border-b border-border bg-card gap-4">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            data-global-search
            placeholder="Search projects, issues, MRs… (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        {/* Keyboard shortcut hint */}
        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground mr-2">
          <kbd className="bg-muted border border-border rounded px-1 py-0.5">g</kbd>
          <span>+</span>
          <kbd className="bg-muted border border-border rounded px-1 py-0.5">p</kbd>
          <span className="opacity-60">projects</span>
        </div>

        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setTheme('light')}
              className={cn(theme === 'light' && 'bg-accent')}
            >
              <Sun className="h-4 w-4 mr-2" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('dark')}
              className={cn(theme === 'dark' && 'bg-accent')}
            >
              <Moon className="h-4 w-4 mr-2" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme('system')}
              className={cn(theme === 'system' && 'bg-accent')}
            >
              <Monitor className="h-4 w-4 mr-2" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <UserAvatar user={user} size="xs" showTooltip={false} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground font-normal">@{user.username}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
