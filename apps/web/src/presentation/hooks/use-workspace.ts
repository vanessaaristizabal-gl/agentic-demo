import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  advanceRequest,
  advanceLifecycle,
  assignRequestToTeam,
  closeConsultantCycle,
  createNewRequest,
  draftVacancyDescription,
  loadWorkspace,
  releasePosition,
  setPositionAllocation,
  updateRequest,
  type RequestPatch,
  type Workspace,
} from '@/application/use-cases';
import type { RequestIntake } from '@/domain';
import { container } from '@/infrastructure/container';
import { clearDatabase } from '@/infrastructure/persistence/database';
import { seedNow } from '@/infrastructure/persistence/seed';
import { pushToast } from '@/store/slices/ui-slice';
import { useAppDispatch } from '@/store';

const WORKSPACE_KEY = ['workspace'] as const;

export function useWorkspace() {
  return useQuery<Workspace>({
    queryKey: WORKSPACE_KEY,
    queryFn: () => loadWorkspace(container),
  });
}

/** Todas las mutaciones invalidan la misma consulta: una sola fuente de verdad. */
function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: WORKSPACE_KEY });
}

export function useCreateRequest() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (intake: Partial<RequestIntake>) => createNewRequest(container, intake),
    onSuccess: async (request) => {
      await invalidate();
      dispatch(
        pushToast({
          variant: 'success',
          title: { key: 'requests.toast.created', params: { code: request.code } },
          description: { key: 'requests.toast.createdDetail' },
        }),
      );
    },
  });
}

export function useUpdateRequest() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ requestId, patch }: { requestId: string; patch: RequestPatch }) =>
      updateRequest(container, requestId, patch),
    onSuccess: invalidate,
  });
}

export function useAdvanceRequest() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (requestId: string) => advanceRequest(container, requestId),
    onSuccess: async (outcome) => {
      await invalidate();
      if (outcome.ok) {
        dispatch(
          pushToast({
            variant: 'success',
            title: { key: 'requests.toast.delivered' },
            description: outcome.message,
          }),
        );
      } else {
        dispatch(
          pushToast({
            variant: 'error',
            title: { key: 'requests.toast.blocked' },
            description: outcome.report.headline,
          }),
        );
      }
    },
  });
}

export function useAssignTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ requestId, teamId }: { requestId: string; teamId: string }) =>
      assignRequestToTeam(container, requestId, teamId),
    onSuccess: invalidate,
  });
}

export function useDraftVacancy() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (requestId: string) => draftVacancyDescription(container, requestId),
    onSuccess: async (outcome) => {
      await invalidate();
      dispatch(
        pushToast({
          variant: outcome.source === 'anthropic' ? 'success' : 'default',
          title:
            outcome.source === 'anthropic'
              ? { key: 'requests.toast.draftAnthropic', params: { model: outcome.model ?? '' } }
              : outcome.source === 'gemini-nano'
                ? { key: 'requests.toast.draftLocal' }
                : { key: 'requests.toast.draftFallback' },
          // El motivo lo redacta el servidor, en su propio idioma: se muestra tal cual.
          description: outcome.reason
            ? { key: 'requests.toast.raw', params: { text: outcome.reason } }
            : { key: 'requests.toast.draftDone' },
        }),
      );
    },
    onError: () => {
      dispatch(
        pushToast({
          variant: 'error',
          title: { key: 'requests.toast.draftFailed' },
          description: { key: 'requests.toast.draftFailedDetail' },
        }),
      );
    },
  });
}

export function useSetAllocation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ positionId, allocationPct }: { positionId: string; allocationPct: number | null }) =>
      setPositionAllocation(container, positionId, allocationPct),
    onSuccess: invalidate,
  });
}

export function useReleasePosition() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (positionId: string) => releasePosition(container, positionId),
    onSuccess: async () => {
      await invalidate();
      dispatch(
        pushToast({
          variant: 'default',
          title: { key: 'requests.toast.released' },
          description: { key: 'requests.toast.releasedDetail' },
        }),
      );
    },
  });
}

export function useAdvanceLifecycle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (consultantId: string) => advanceLifecycle(container, consultantId),
    onSuccess: invalidate,
  });
}

export function useCloseLifecycle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      consultantId,
      outcome,
      note,
    }: {
      consultantId: string;
      outcome: 'rotacion' | 'salida';
      note: string;
    }) => closeConsultantCycle(container, consultantId, outcome, note),
    onSuccess: invalidate,
  });
}

export function useResetWorkspace() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: async () => {
      await clearDatabase();
      await seedNow();
    },
    onSuccess: async () => {
      await invalidate();
      dispatch(
        pushToast({
          variant: 'success',
          title: { key: 'requests.toast.reset' },
          description: { key: 'requests.toast.resetDetail' },
        }),
      );
    },
  });
}
