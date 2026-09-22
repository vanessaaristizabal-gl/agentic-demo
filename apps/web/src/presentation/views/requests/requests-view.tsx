import { buildFlowMetrics } from '@/application/use-cases';
import { BlockersChart } from '@/presentation/components/blockers-chart';
import { CollapsibleSection } from '@/presentation/components/collapsible-section';
import { useWorkspace } from '@/presentation/hooks/use-workspace';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleBlockers, toggleTrace } from '@/store/slices/ui-slice';
import { BoardFilters } from './board-filters';
import { NewRequestDialog } from './new-request-dialog';
import { RequestDialog } from './request-dialog';
import { StageBoard } from './stage-board';
import { TraceLog } from './trace-log';

/**
 * Vista principal: el tablero de solicitudes.
 *
 * El tablero es lo único que ocupa el centro. Las cifras de arriba lo filtran
 * y las dos secciones del pie se consultan cuando hacen falta. Los siete roles
 * no tienen bloque propio: cada uno es la cabecera de su columna, porque hay
 * exactamente un rol por etapa.
 */
export function RequestsView() {
  const { data, isLoading } = useWorkspace();
  const dispatch = useAppDispatch();
  const blockersOpen = useAppSelector((state) => state.ui.blockersOpen);
  const traceOpen = useAppSelector((state) => state.ui.traceOpen);

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando el estado…</p>;
  }

  const metrics = buildFlowMetrics(data);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Solicitudes</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cada solicitud espera en la bandeja de un rol. Ábrela para ver qué le falta y
            entregarla al siguiente; nunca avanza sola.
          </p>
        </div>
        <NewRequestDialog />
      </div>

      <BoardFilters metrics={metrics} />

      <StageBoard requests={data.requests} inspections={data.inspections} />

      <div className="space-y-3">
        <CollapsibleSection
          title="Qué frena el flujo"
          description={
            metrics.totalBlockers === 0
              ? 'No falta ningún requisito.'
              : `${metrics.totalBlockers} requisitos sin cumplir, por la etapa que los pide.`
          }
          open={blockersOpen}
          onToggle={() => dispatch(toggleBlockers())}
        >
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Como los requisitos se acumulan, una etapa temprana puede seguir frenando solicitudes
            que ya van por el final.
          </p>
          <BlockersChart data={metrics.blockersByStage} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Traza de orquestación"
          description={`${data.events.length} movimientos entre agentes, con lo que se verificó en cada uno.`}
          open={traceOpen}
          onToggle={() => dispatch(toggleTrace())}
        >
          <TraceLog events={data.events} />
        </CollapsibleSection>
      </div>

      <RequestDialog workspace={data} />
    </div>
  );
}
