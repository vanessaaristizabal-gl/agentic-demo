import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  advanceDemand,
  advanceLifecycle,
  assignDemandToTeam,
  closeConsultantCycle,
  createNewDemand,
  draftVacancyDescription,
  loadWorkspace,
  releasePosition,
  setPositionAllocation,
  updateDemand,
  type DemandPatch,
  type Workspace,
} from '@/application/use-cases';
import type { DemandIntake } from '@/domain';
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

export function useCreateDemand() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (intake: Partial<DemandIntake>) => createNewDemand(container, intake),
    onSuccess: async (demand) => {
      await invalidate();
      dispatch(
        pushToast({
          variant: 'success',
          title: `${demand.code} registrada`,
          description: `La demanda entra en la bandeja de Sales, en la etapa Demanda.`,
        }),
      );
    },
  });
}

export function useUpdateDemand() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ demandId, patch }: { demandId: string; patch: DemandPatch }) =>
      updateDemand(container, demandId, patch),
    onSuccess: invalidate,
  });
}

export function useAdvanceDemand() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (demandId: string) => advanceDemand(container, demandId),
    onSuccess: async (outcome) => {
      await invalidate();
      if (outcome.ok) {
        dispatch(pushToast({ variant: 'success', title: 'Demanda entregada', description: outcome.message }));
      } else {
        dispatch(
          pushToast({
            variant: 'error',
            title: 'No se puede avanzar todavía',
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
    mutationFn: ({ demandId, teamId }: { demandId: string; teamId: string }) =>
      assignDemandToTeam(container, demandId, teamId),
    onSuccess: invalidate,
  });
}

export function useDraftVacancy() {
  const invalidate = useInvalidate();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (demandId: string) => draftVacancyDescription(container, demandId),
    onSuccess: async (outcome) => {
      await invalidate();
      dispatch(
        pushToast({
          variant: outcome.source === 'anthropic' ? 'success' : 'default',
          title:
            outcome.source === 'anthropic'
              ? `Descripción generada con ${outcome.model}`
              : outcome.source === 'gemini-nano'
                ? 'Descripción generada en el navegador'
                : 'Descripción compuesta con el texto de reserva',
          description: outcome.reason ?? 'La descripción ya está en la vacante.',
        }),
      );
    },
    onError: () => {
      dispatch(
        pushToast({
          variant: 'error',
          title: 'No se pudo redactar la descripción',
          description: 'Escríbela a mano en el panel del Recruiter para seguir adelante.',
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
          title: 'Posición liberada',
          description:
            'La demanda vuelve a necesitar equipo: el requisito de la etapa Equipo deja de cumplirse.',
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
          title: 'Datos reiniciados',
          description: 'Vuelve a haber una demanda parada en cada etapa del flujo.',
        }),
      );
    },
  });
}
