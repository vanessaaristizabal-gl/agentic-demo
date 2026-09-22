import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { App } from './presentation/App';
import { seedIfEmpty } from './infrastructure/persistence/seed';
import { store } from './store';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, refetchOnWindowFocus: false, retry: 1 },
  },
});

/**
 * Los datos viven en IndexedDB. La primera vez se siembran y después se
 * respetan. Se espera a la siembra antes de montar la aplicación para que la
 * primera consulta no lea una base todavía vacía.
 */
seedIfEmpty()
  .catch((error) => {
    console.error('No se pudieron sembrar los datos iniciales.', error);
  })
  .finally(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </Provider>
      </React.StrictMode>,
    );
  });
