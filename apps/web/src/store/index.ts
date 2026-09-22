import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { uiReducer } from './slices/ui-slice';

/**
 * Redux Toolkit sostiene el estado de interfaz (qué está seleccionado, qué
 * filtro hay puesto, qué avisos se muestran). Los datos del negocio viven en
 * IndexedDB y los sirve TanStack Query: no se duplican aquí.
 */
export const store = configureStore({
  reducer: { ui: uiReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
