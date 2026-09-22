import { X } from 'lucide-react';
import { agentById } from '@/domain';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/presentation/hooks/use-workspace';
import { useAppDispatch, useAppSelector } from '@/store';
import { setRoleFilter } from '@/store/slices/ui-slice';
import { RequestDialog } from './request-dialog';
import { FlowMetrics } from './flow-metrics';
import { NewRequestDialog } from './new-request-dialog';
import { RoleInboxes } from './role-inboxes';
import { StageBoard } from './stage-board';
import { TraceLog } from './trace-log';

export function OrchestrationView() {
  const { data, isLoading } = useWorkspace();
  const dispatch = useAppDispatch();
  const roleFilter = useAppSelector((state) => state.ui.roleFilter);

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando el estado…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Orquestación</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Siete roles, siete etapas. Una solicitud solo cambia de manos cuando alguien la entrega y
            se cumplen todos los requisitos acumulados hasta ese punto.
          </p>
        </div>
        <NewRequestDialog />
      </div>

      <FlowMetrics workspace={data} />

      <RoleInboxes inboxes={data.inboxes} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Solicitudes por etapa</h2>
          {roleFilter ? (
            <Button variant="outline" size="sm" onClick={() => dispatch(setRoleFilter(roleFilter))}>
              <X className="h-3.5 w-3.5" />
              Quitar filtro: {agentById(roleFilter).name}
            </Button>
          ) : null}
        </div>
        <StageBoard requests={data.requests} inspections={data.inspections} />
      </section>

      <TraceLog events={data.events} />

      <RequestDialog workspace={data} />
    </div>
  );
}
