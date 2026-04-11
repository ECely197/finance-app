import { create } from 'zustand';
import type { User } from 'firebase/auth';

export interface Profile {
  id: string;
  name: string;
  type: 'Personal' | 'Business' | 'Project';
  createdAt?: any;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isPomodoroRunning: boolean;
  setIsPomodoroRunning: (isRunning: boolean) => void;
  workspaceActiveTab: 'list' | 'kanban' | 'notes' | 'calendar';
  setWorkspaceActiveTab: (tab: 'list' | 'kanban' | 'notes' | 'calendar') => void;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  isFocusModeActive: boolean;
  setIsFocusModeActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),
  currentProfile: null,
  setCurrentProfile: (profile) => set({ currentProfile: profile }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  isPomodoroRunning: false,
  setIsPomodoroRunning: (isPomodoroRunning) => set({ isPomodoroRunning }),
  workspaceActiveTab: 'list',
  setWorkspaceActiveTab: (tab) => set({ workspaceActiveTab: tab }),
  selectedNoteId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  isFocusModeActive: false,
  setIsFocusModeActive: (active) => set({ isFocusModeActive: active }),
}));
