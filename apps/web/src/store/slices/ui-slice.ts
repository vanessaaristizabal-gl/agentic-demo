import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RoleId } from '@/domain';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error';
}

export interface UiState {
  /** Solicitud abierta en el panel lateral de Orquestación. */
  selectedRequestId: string | null;
  /** Persona elegida en la vista Ciclo del consultor. */
  selectedConsultantId: string | null;
  /** Filtro por rol en el tablero de Orquestación. */
  roleFilter: RoleId | null;
  /** Traza de orquestación desplegada. */
  traceOpen: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  selectedRequestId: null,
  selectedConsultantId: null,
  roleFilter: null,
  traceOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    selectRequest(state, action: PayloadAction<string | null>) {
      state.selectedRequestId = action.payload;
    },
    selectConsultant(state, action: PayloadAction<string | null>) {
      state.selectedConsultantId = action.payload;
    },
    setRoleFilter(state, action: PayloadAction<RoleId | null>) {
      state.roleFilter = state.roleFilter === action.payload ? null : action.payload;
    },
    toggleTrace(state) {
      state.traceOpen = !state.traceOpen;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(toast: Omit<Toast, 'id'>) {
        return { payload: { ...toast, id: nanoid() } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const {
  selectRequest,
  selectConsultant,
  setRoleFilter,
  toggleTrace,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
