import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { FiltersState } from '@/types/genericList';

export interface PersistedListState {
  filters: FiltersState;
  search: string;
  sortProperty: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface ListStateStore {
  states: Record<string, PersistedListState>;
  saveListState: (key: string, state: PersistedListState) => void;
  getListState: (key: string) => PersistedListState | undefined;
  clearListState: (key: string) => void;
}

export const useListStateStore = create<ListStateStore>()(
  devtools(
    (set, get) => ({
      states: {},
      saveListState: (key, state) =>
        set((prev) => ({ states: { ...prev.states, [key]: state } }), false, 'listState/save'),
      getListState: (key) => get().states[key],
      clearListState: (key) =>
        set(
          (prev) => {
            const next = { ...prev.states };
            delete next[key];
            return { states: next };
          },
          false,
          'listState/clear'
        )
    }),
    { name: 'ListStateStore' }
  )
);
