import { useQuery } from '@tanstack/react-query';
import { isPromptApiPresent } from '@/infrastructure/http/prompt-api';

export interface ApiStatus {
  serverUp: boolean;
  modelConfigured: boolean;
  model: string | null;
  promptApiPresent: boolean;
}

/**
 * Estado del único punto que usa un modelo. Se consulta para poder avisar
 * ANTES de pulsar el botón de qué va a pasar. No expone ninguna clave.
 */
export function useApiStatus() {
  return useQuery<ApiStatus>({
    queryKey: ['api-status'],
    staleTime: 30_000,
    queryFn: async () => {
      const promptApiPresent = isPromptApiPresent();
      try {
        const response = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
        if (!response.ok) throw new Error(String(response.status));
        const payload = (await response.json()) as { model: string; modelConfigured: boolean };
        return {
          serverUp: true,
          modelConfigured: payload.modelConfigured,
          model: payload.model,
          promptApiPresent,
        };
      } catch {
        return { serverUp: false, modelConfigured: false, model: null, promptApiPresent };
      }
    },
  });
}
