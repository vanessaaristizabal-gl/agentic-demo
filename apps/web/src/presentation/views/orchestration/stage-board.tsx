import { AlertCircle, Check } from 'lucide-react';
import { STAGES, labelOf, PRIORITIES, type Demand, type Inspection } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { stageTone } from '@/presentation/components/stage-badge';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectDemand } from '@/store/slices/ui-slice';

/** Tablero de demandas por etapa. Una columna por etapa, en orden. */
export function StageBoard({
  demands,
  inspections,
}: {
  demands: Demand[];
  inspections: Record<string, Inspection>;
}) {
  const dispatch = useAppDispatch();
  const roleFilter = useAppSelector((state) => state.ui.roleFilter);

  return (
    <div className="overflow-x-auto scrollbar-thin pb-2">
      <div className="grid min-w-[980px] grid-cols-7 gap-3">
        {STAGES.map((stage) => {
          const column = demands.filter((demand) => demand.stage === stage.id);
          const dimmed = roleFilter !== null && roleFilter !== stage.owner;

          return (
            <section
              key={stage.id}
              className={cn('flex flex-col gap-2 transition-opacity', dimmed && 'opacity-40')}
            >
              <header className="flex items-center justify-between gap-2 px-0.5">
                <span
                  className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', stageTone(stage.id))}
                >
                  {stage.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">{column.length}</span>
              </header>

              <div className="flex flex-col gap-2">
                {column.length === 0 ? (
                  <p className="rounded-md border border-dashed px-2 py-6 text-center text-[11px] text-muted-foreground">
                    Sin demandas
                  </p>
                ) : null}

                {column.map((demand) => {
                  const inspection = inspections[demand.id];
                  const blocked = inspection && !inspection.isFinal && !inspection.canAdvance;

                  return (
                    <button
                      key={demand.id}
                      type="button"
                      onClick={() => dispatch(selectDemand(demand.id))}
                      className="rounded-md border bg-card p-2.5 text-left transition-colors hover:border-foreground/25"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {demand.code}
                        </span>
                        {demand.intake.priority ? (
                          <span className="text-[10px] text-muted-foreground">
                            {labelOf(PRIORITIES, demand.intake.priority)}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">
                        {demand.intake.clientName || 'Cliente sin nombre'}
                      </p>

                      {demand.intake.stack ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {demand.intake.stack}
                        </p>
                      ) : null}

                      <div className="mt-2">
                        {inspection?.isFinal ? (
                          <Badge variant="success" className="gap-1 font-normal">
                            <Check className="h-3 w-3" />
                            Activo
                          </Badge>
                        ) : blocked ? (
                          <Badge variant="outline" className="gap-1 font-normal text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            Faltan {inspection.missing.length}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-emerald-700 dark:text-emerald-400">
                            Lista para entregar
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
