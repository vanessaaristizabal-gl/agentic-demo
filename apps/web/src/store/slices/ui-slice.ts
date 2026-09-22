import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error';
}

/** Filtro del tablero. Se aplica desde la fila de cifras de la cabecera. */
export type BoardFilter = 'todas' | 'listas' | 'bloqueadas';

export interface UiState {
  /** Solicitud abierta en la ficha. */
  selectedRequestId: string | null;
  /** Persona elegida en la vista Ciclo del consultor. */
  selectedConsultantId: string | null;
  boardFilter: BoardFilter;
  /** Secciones de apoyo del pie, plegadas por defecto. */
  blockersOpen: boolean;
  traceOpen: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  selectedRequestId: null,
  selectedConsultantId: null,
  boardFilter: 'todas',
  blockersOpen: false,
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
    setBoardFilter(state, action: PayloadAction<BoardFilter>) {
      // Volver a pulsar el filtro activo lo quita.
      state.boardFilter = state.boardFilter === action.payload ? 'todas' : action.payload;
    },
    toggleBlockers(state) {
      state.blockersOpen = !state.blockersOpen;
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
  setBoardFilter,
  toggleBlockers,
  toggleTrace,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
