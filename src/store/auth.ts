import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GitLabUser } from '../types/gitlab';
import { encryptedLocalStorage } from '../utils/crypto';

export interface GitLabInstance {
  host: string;
  token: string;
  user: GitLabUser;
  addedAt: string;
}

interface AuthState {
  token: string | null;
  host: string;
  user: GitLabUser | null;
  instances: GitLabInstance[];

  setAuth: (token: string, host: string) => void;
  setUser: (user: GitLabUser) => void;
  logout: () => void;
  addInstance: (instance: GitLabInstance) => void;
  removeInstance: (host: string) => void;
  switchInstance: (host: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      host: 'https://gitlab.com',
      user: null,
      instances: [],

      setAuth: (token, host) => set({ token, host }),

      setUser: (user) => {
        const { host, token, instances } = get();
        const existing = instances.find((i) => i.host === host);
        const updated: GitLabInstance = { host, token: token!, user, addedAt: existing?.addedAt ?? new Date().toISOString() };
        set({
          user,
          instances: existing
            ? instances.map((i) => (i.host === host ? updated : i))
            : [...instances, updated],
        });
      },

      logout: () => {
        const { host, instances } = get();
        const remaining = instances.filter((i) => i.host !== host);
        if (remaining.length > 0) {
          const next = remaining[remaining.length - 1];
          set({ token: next.token, host: next.host, user: next.user, instances: remaining });
        } else {
          set({ token: null, host: 'https://gitlab.com', user: null, instances: [] });
        }
      },

      addInstance: (instance) => {
        const { instances } = get();
        const existing = instances.find((i) => i.host === instance.host);
        set({
          instances: existing
            ? instances.map((i) => (i.host === instance.host ? instance : i))
            : [...instances, instance],
          token: instance.token,
          host: instance.host,
          user: instance.user,
        });
      },

      removeInstance: (host) => {
        const { instances, host: currentHost } = get();
        const remaining = instances.filter((i) => i.host !== host);
        if (currentHost === host) {
          if (remaining.length > 0) {
            const next = remaining[remaining.length - 1];
            set({ instances: remaining, token: next.token, host: next.host, user: next.user });
          } else {
            set({ instances: [], token: null, host: 'https://gitlab.com', user: null });
          }
        } else {
          set({ instances: remaining });
        }
      },

      switchInstance: (host) => {
        const { instances } = get();
        const instance = instances.find((i) => i.host === host);
        if (instance) {
          set({ token: instance.token, host: instance.host, user: instance.user });
        }
      },
    }),
    {
      name: 'glab-browser-auth',
      // AES-GCM encrypted storage: PATs are never written to localStorage in
      // plaintext. The decryption key lives only in sessionStorage, so data
      // cannot be read after the browser session ends.
      storage: createJSONStorage(() => encryptedLocalStorage),
      partialize: (state) => ({
        token: state.token,
        host: state.host,
        user: state.user,
        instances: state.instances,
      }),
    }
  )
);
