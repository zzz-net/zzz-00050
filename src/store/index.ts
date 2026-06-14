import { create } from 'zustand';
import type { User, DraftTicket, Ticket } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  login: (user, token) => {
    localStorage.setItem('auth_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ user: null, token: null });
  },
  setUser: (user) => set({ user }),
}));

interface DraftState {
  drafts: DraftTicket[];
  loadDrafts: () => void;
  saveDraft: (draft: Omit<DraftTicket, 'id' | 'savedAt'>) => void;
  deleteDraft: (id: string) => void;
  clearDrafts: () => void;
}

const DRAFT_KEY = 'ticket_drafts';

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: [],
  loadDrafts: () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        set({ drafts: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load drafts', e);
    }
  },
  saveDraft: (draft) => {
    const newDraft: DraftTicket = {
      ...draft,
      id: 'draft_' + Date.now(),
      savedAt: new Date().toISOString(),
    };
    const drafts = [newDraft, ...get().drafts];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    set({ drafts });
  },
  deleteDraft: (id) => {
    const drafts = get().drafts.filter((d) => d.id !== id);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    set({ drafts });
  },
  clearDrafts: () => {
    localStorage.removeItem(DRAFT_KEY);
    set({ drafts: [] });
  },
}));
