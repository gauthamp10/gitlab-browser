import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../store/auth';
import type { GitLabUser } from '../../types/gitlab';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeUser(username: string): GitLabUser {
  return {
    id: Math.floor(Math.random() * 10000),
    username,
    name: username,
    email: `${username}@example.com`,
    avatar_url: `https://gitlab.com/uploads/${username}/avatar.png`,
    web_url: `https://gitlab.com/${username}`,
    state: 'active',
    created_at: new Date().toISOString(),
    bio: '',
    location: '',
    public_email: '',
    skype: '',
    linkedin: '',
    twitter: '',
    website_url: '',
    organization: '',
  };
}

// Reset store state before each test
beforeEach(() => {
  useAuthStore.setState({
    token: null,
    host: 'https://gitlab.com',
    user: null,
    instances: [],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setAuth
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.setAuth', () => {
  it('sets token and host', () => {
    useAuthStore.getState().setAuth('glpat-abc', 'https://my-gitlab.com');
    const { token, host } = useAuthStore.getState();
    expect(token).toBe('glpat-abc');
    expect(host).toBe('https://my-gitlab.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setUser
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.setUser', () => {
  it('stores user and adds to instances', () => {
    useAuthStore.getState().setAuth('glpat-abc', 'https://gitlab.com');
    const user = makeUser('alice');
    useAuthStore.getState().setUser(user);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.instances).toHaveLength(1);
    expect(state.instances[0].host).toBe('https://gitlab.com');
    expect(state.instances[0].token).toBe('glpat-abc');
  });

  it('updates existing instance instead of duplicating', () => {
    useAuthStore.getState().setAuth('glpat-v1', 'https://gitlab.com');
    useAuthStore.getState().setUser(makeUser('alice'));
    useAuthStore.getState().setAuth('glpat-v2', 'https://gitlab.com');
    useAuthStore.getState().setUser(makeUser('alice'));
    expect(useAuthStore.getState().instances).toHaveLength(1);
    expect(useAuthStore.getState().instances[0].token).toBe('glpat-v2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.logout', () => {
  it('clears auth when only one instance exists', () => {
    useAuthStore.getState().setAuth('glpat-abc', 'https://gitlab.com');
    useAuthStore.getState().setUser(makeUser('alice'));
    useAuthStore.getState().logout();
    const { token, user, instances } = useAuthStore.getState();
    expect(token).toBeNull();
    expect(user).toBeNull();
    expect(instances).toHaveLength(0);
  });

  it('switches to the remaining instance when multiple exist', () => {
    // Add two instances
    useAuthStore.getState().setAuth('glpat-abc', 'https://gitlab.com');
    useAuthStore.getState().setUser(makeUser('alice'));
    useAuthStore.getState().addInstance({
      host: 'https://self-hosted.example.com',
      token: 'glpat-xyz',
      user: makeUser('bob'),
      addedAt: new Date().toISOString(),
    });
    // Switch to first instance and log out
    useAuthStore.getState().switchInstance('https://gitlab.com');
    useAuthStore.getState().logout();
    const { token, host } = useAuthStore.getState();
    // Should have switched to the remaining self-hosted instance
    expect(token).toBe('glpat-xyz');
    expect(host).toBe('https://self-hosted.example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// addInstance
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.addInstance', () => {
  it('adds a new instance and makes it active', () => {
    const inst = {
      host: 'https://new-gitlab.com',
      token: 'glpat-new',
      user: makeUser('charlie'),
      addedAt: new Date().toISOString(),
    };
    useAuthStore.getState().addInstance(inst);
    const { instances, token, host } = useAuthStore.getState();
    expect(instances).toHaveLength(1);
    expect(token).toBe('glpat-new');
    expect(host).toBe('https://new-gitlab.com');
  });

  it('replaces existing instance for same host', () => {
    const inst1 = {
      host: 'https://gitlab.com',
      token: 'glpat-old',
      user: makeUser('alice'),
      addedAt: '2024-01-01T00:00:00Z',
    };
    const inst2 = { ...inst1, token: 'glpat-new' };
    useAuthStore.getState().addInstance(inst1);
    useAuthStore.getState().addInstance(inst2);
    const { instances } = useAuthStore.getState();
    expect(instances).toHaveLength(1);
    expect(instances[0].token).toBe('glpat-new');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// removeInstance
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.removeInstance', () => {
  it('removes the specified instance', () => {
    useAuthStore.getState().addInstance({
      host: 'https://a.com',
      token: 'tok-a',
      user: makeUser('a'),
      addedAt: new Date().toISOString(),
    });
    useAuthStore.getState().addInstance({
      host: 'https://b.com',
      token: 'tok-b',
      user: makeUser('b'),
      addedAt: new Date().toISOString(),
    });
    useAuthStore.getState().removeInstance('https://a.com');
    const { instances } = useAuthStore.getState();
    expect(instances).toHaveLength(1);
    expect(instances[0].host).toBe('https://b.com');
  });

  it('clears auth when last instance is removed', () => {
    useAuthStore.getState().addInstance({
      host: 'https://gitlab.com',
      token: 'glpat-only',
      user: makeUser('alice'),
      addedAt: new Date().toISOString(),
    });
    useAuthStore.getState().removeInstance('https://gitlab.com');
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().instances).toHaveLength(0);
  });

  it('switches to a remaining instance when active one is removed', () => {
    useAuthStore.getState().addInstance({
      host: 'https://a.com',
      token: 'tok-a',
      user: makeUser('a'),
      addedAt: new Date().toISOString(),
    });
    useAuthStore.getState().addInstance({
      host: 'https://b.com',
      token: 'tok-b',
      user: makeUser('b'),
      addedAt: new Date().toISOString(),
    });
    // Current host is b.com (last added)
    useAuthStore.getState().removeInstance('https://b.com');
    expect(useAuthStore.getState().token).toBe('tok-a');
    expect(useAuthStore.getState().host).toBe('https://a.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// switchInstance
// ─────────────────────────────────────────────────────────────────────────────
describe('useAuthStore.switchInstance', () => {
  it('switches the active token, host, and user', () => {
    const userA = makeUser('alice');
    const userB = makeUser('bob');
    useAuthStore.getState().addInstance({ host: 'https://a.com', token: 'tok-a', user: userA, addedAt: '' });
    useAuthStore.getState().addInstance({ host: 'https://b.com', token: 'tok-b', user: userB, addedAt: '' });
    useAuthStore.getState().switchInstance('https://a.com');
    expect(useAuthStore.getState().token).toBe('tok-a');
    expect(useAuthStore.getState().host).toBe('https://a.com');
    expect(useAuthStore.getState().user?.username).toBe('alice');
  });

  it('does nothing for an unknown host', () => {
    useAuthStore.getState().addInstance({ host: 'https://a.com', token: 'tok-a', user: makeUser('a'), addedAt: '' });
    useAuthStore.getState().switchInstance('https://unknown.com');
    expect(useAuthStore.getState().token).toBe('tok-a');
  });
});
