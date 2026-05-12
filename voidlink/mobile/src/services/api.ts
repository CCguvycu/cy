import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'voidlink_token';
const SERVER_URL_KEY = 'voidlink_server_url';

export const getStoredToken = () => SecureStore.getItemAsync(TOKEN_KEY);
export const storeToken = (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);
export const getServerUrl = () => SecureStore.getItemAsync(SERVER_URL_KEY);
export const storeServerUrl = (url: string) => SecureStore.setItemAsync(SERVER_URL_KEY, url);

let _baseUrl = '';
let _api: AxiosInstance | null = null;

export async function initApi(): Promise<void> {
  const url = await getServerUrl();
  _baseUrl = url || 'http://localhost:8000';
  _api = createAxiosInstance(_baseUrl);
}

export function getBaseUrl(): string {
  return _baseUrl;
}

function createAxiosInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 30000 });

  instance.interceptors.request.use(async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    (error) => {
      if (error.response?.status === 401) {
        clearToken();
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export function api(): AxiosInstance {
  if (!_api) throw new Error('API not initialized. Call initApi() first.');
  return _api;
}

export async function setServerUrl(url: string): Promise<void> {
  const clean = url.replace(/\/$/, '');
  await storeServerUrl(clean);
  _baseUrl = clean;
  _api = createAxiosInstance(clean);
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api().post('/api/auth/token', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (username: string, password: string, email?: string) =>
    api().post('/api/auth/register', { username, password, email }),
  me: () => api().get('/api/auth/me'),
  pairDevice: (deviceName: string, platform: string, pushToken?: string) =>
    api().post('/api/auth/pair-device', {
      device_name: deviceName,
      device_type: 'mobile',
      platform,
      push_token: pushToken,
    }),
};

// Chat
export const chatApi = {
  sendMessage: (data: {
    conversation_id?: number;
    model: string;
    message: string;
    system_prompt?: string;
    character_mode?: string;
    temperature?: number;
    folder_id?: number;
    attachments?: string[];
  }) => fetch(`${_baseUrl}/api/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: '',
    },
    body: JSON.stringify(data),
  }),

  getConversations: (folderId?: number, limit = 50, offset = 0) =>
    api().get('/api/chat/conversations', { params: { folder_id: folderId, limit, offset } }),

  getConversation: (id: number) => api().get(`/api/chat/conversations/${id}`),

  createConversation: (model: string, title?: string, folderId?: number) =>
    api().post('/api/chat/conversations', { model, title, folder_id: folderId }),

  deleteConversation: (id: number) => api().delete(`/api/chat/conversations/${id}`),

  getFolders: () => api().get('/api/chat/folders'),

  createFolder: (name: string, color?: string) =>
    api().post('/api/chat/folders', { name, color }),

  deleteFolder: (id: number) => api().delete(`/api/chat/folders/${id}`),
};

// Models
export const modelsApi = {
  list: () => api().get('/api/models/'),
  listSupported: () => api().get('/api/models/supported'),
  characters: () => api().get('/api/models/characters'),
  health: () => api().get('/api/models/health'),
};

// Files
export const filesApi = {
  upload: (formData: FormData) =>
    api().post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: () => api().get('/api/files/'),
  delete: (filename: string) => api().delete(`/api/files/${filename}`),
};

// System
export const systemApi = {
  stats: () => api().get('/api/system/stats'),
  discovery: () => api().get('/api/system/discovery'),
  updateSettings: (data: {
    system_prompt?: string;
    character_mode?: string;
    memory_enabled?: boolean;
    memory_context?: string;
  }) => api().put('/api/system/settings', data),
  terminal: (command: string) => api().post('/api/system/terminal', { command }),
};

// Streaming chat helper
export async function streamChat(
  data: Parameters<typeof chatApi.sendMessage>[0],
  onChunk: (chunk: string, convId?: number) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const token = await getStoredToken();
  const response = await fetch(`${_baseUrl}/api/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    onError(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) {
    onError('No response body');
    return;
  }

  let convId: number | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));

    for (const line of lines) {
      const raw = line.replace(/^data: /, '').trim();
      if (raw === '[DONE]') {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) {
          onError(parsed.error);
          return;
        }
        if (parsed.chunk) {
          convId = parsed.conversation_id;
          onChunk(parsed.chunk, convId);
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  onDone();
}
