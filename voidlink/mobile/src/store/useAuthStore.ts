import { create } from 'zustand';
import { authApi, getStoredToken, storeToken, clearToken } from '../services/api';

interface User {
  id: number;
  username: string;
  email?: string;
  is_admin: boolean;
  memory_enabled: boolean;
  character_mode?: string;
  system_prompt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(username, password);
      const { access_token } = res.data;
      await storeToken(access_token);
      const meRes = await authApi.me();
      set({ user: meRes.data, token: access_token, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: async () => {
    await clearToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    const token = await getStoredToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ token, isLoading: true });
    try {
      const meRes = await authApi.me();
      set({ user: meRes.data, isAuthenticated: true, isLoading: false });
    } catch {
      await clearToken();
      set({ token: null, isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const meRes = await authApi.me();
      set({ user: meRes.data });
    } catch {
      // silent
    }
  },
}));
