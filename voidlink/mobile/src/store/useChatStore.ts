import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  attachments?: string[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: number;
  title: string;
  model: string;
  folderId?: number;
  isPinned: boolean;
  totalTokens: number;
  createdAt: string;
  updatedAt?: string;
  messages?: Message[];
}

export interface Folder {
  id: number;
  name: string;
  color: string;
}

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  folders: Folder[];
  selectedModel: string;
  isStreaming: boolean;
  streamingMessageId: string | null;

  setConversations: (convs: Conversation[]) => void;
  setCurrentConversation: (conv: Conversation | null) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateStreamingMessage: (id: string, chunk: string) => void;
  finishStreaming: (id: string) => void;
  setFolders: (folders: Folder[]) => void;
  setSelectedModel: (model: string) => void;
  setIsStreaming: (v: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  cacheConversation: (conv: Conversation) => Promise<void>;
  loadCachedConversations: () => Promise<void>;
}

const CACHE_KEY = 'voidlink_conversations_cache';

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  folders: [],
  selectedModel: 'llama3',
  isStreaming: false,
  streamingMessageId: null,

  setConversations: (convs) => set({ conversations: convs }),

  setCurrentConversation: (conv) => set({ currentConversation: conv }),

  setMessages: (msgs) => set({ messages: msgs }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  updateStreamingMessage: (id, chunk) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    })),

  finishStreaming: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
      isStreaming: false,
      streamingMessageId: null,
    })),

  setFolders: (folders) => set({ folders }),

  setSelectedModel: (model) => set({ selectedModel: model }),

  setIsStreaming: (v) => set({ isStreaming: v }),

  setStreamingMessageId: (id) => set({ streamingMessageId: id }),

  cacheConversation: async (conv) => {
    const existing = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || '[]');
    const updated = [conv, ...existing.filter((c: Conversation) => c.id !== conv.id)].slice(0, 20);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  },

  loadCachedConversations: async () => {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      set({ conversations: JSON.parse(cached) });
    }
  },
}));
