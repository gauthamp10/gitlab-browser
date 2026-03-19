import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const shortcuts: Shortcut[] = [
      { key: 'g p', handler: () => navigate('/projects'), description: 'Go to Projects' },
      { key: 'g g', handler: () => navigate('/groups'), description: 'Go to Groups' },
      { key: 'g d', handler: () => navigate('/dashboard'), description: 'Go to Dashboard' },
      { key: 'g t', handler: () => navigate('/todos'), description: 'Go to Todos' },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('[data-global-search]');
        searchInput?.focus();
        return;
      }

      const key = e.key.toLowerCase();

      if (pendingKey.current) {
        const combo = `${pendingKey.current} ${key}`;
        const match = shortcuts.find((s) => s.key === combo);
        if (match) {
          e.preventDefault();
          match.handler();
        }
        pendingKey.current = null;
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
      } else {
        const isPrefixOfAny = shortcuts.some((s) => s.key.startsWith(key + ' '));
        if (isPrefixOfAny) {
          pendingKey.current = key;
          pendingTimer.current = setTimeout(() => {
            pendingKey.current = null;
          }, 1000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, [navigate]);
}

export function useShortcutHint(shortcut: string): string {
  return shortcut.split(' ').join(' then ');
}
