import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  pinnedProjects: number[];
  defaultPerPage: number;
  sidebarCollapsed: boolean;

  setTheme: (theme: Theme) => void;
  pinProject: (id: number) => void;
  unpinProject: (id: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDefaultPerPage: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      pinnedProjects: [],
      defaultPerPage: 20,
      sidebarCollapsed: false,

      setTheme: (theme) => set({ theme }),

      pinProject: (id) => {
        const { pinnedProjects } = get();
        if (!pinnedProjects.includes(id)) {
          set({ pinnedProjects: [...pinnedProjects, id] });
        }
      },

      unpinProject: (id) => {
        set({ pinnedProjects: get().pinnedProjects.filter((p) => p !== id) });
      },

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setDefaultPerPage: (n) => set({ defaultPerPage: n }),
    }),
    {
      name: 'glab-browser-settings',
    }
  )
);
