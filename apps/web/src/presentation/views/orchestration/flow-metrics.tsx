import { AlertCircle, ArrowRight, CircleDot, UserCheck } from 'lucide-react';
import { buildFlowMetrics, type Workspace } from '@/application/use-cases';
import { BlockersChart } from '@/presentation/components/blockers-chart';
import { StatTile } from '@/presentation/components/stat-tile';

/** Titular del tablero: cuatro cifras y una gráfica que dice qué frena el flujo. */
export function FlowMetrics({ workspace }: { workspace: Workspace }) {
  const metrics = buildFlowMetrics(workspace);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={CircleDot}
          label="En curso"
          value={metrics.inFlight}
          hint={
            metrics.closed === 0
              ? 'Solicitudes recorriendo el flujo.'
              : `Solicitudes recorriendo el flujo. ${metrics.closed} ya cerradas.`
          }
        />
        <StatTile
          icon={ArrowRight}
          tone="good"
          label="Listas para entregar"
          value={metrics.ready}
          hint="Cumplen todo lo que se les pide y esperan a que alguien las mueva."
        />
        <StatTile
          icon={AlertCircle}
          tone="critical"
          label="Sin poder avanzar"
          value={metrics.blocked}
          hint={
            metrics.totalBlockers === 1
              ? 'Falta un requisito en total.'
              : `Faltan ${metrics.totalBlockers} requisitos en total.`
          }
        />
        <StatTile
          icon={UserCheck}
          label="Consultores activos"
          value={metrics.activeConsultants}
          hint={
            metrics.positionsWithoutAllocation === 0
              ? `${metrics.openPositions} posiciones abiertas en los equipos.`
              : `${metrics.openPositions} posiciones abiertas, ${metrics.positionsWithoutAllocation} sin dedicación.`
          }
        />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium">Qué frena el flujo</h2>
        <p className="mb-4 mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Requisitos sin cumplir, agrupados por la etapa que los pide. Como los requisitos se
          acumulan, una etapa temprana puede seguir frenando solicitudes que ya van por el final.
        </p>
        <BlockersChart data={metrics.blockersByStage} />
      </section>
    </div>
  );
}
