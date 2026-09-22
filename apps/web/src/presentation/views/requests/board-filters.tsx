import type { FlowMetrics } from '@/application/use-cases';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { setBoardFilter, type BoardFilter } from '@/store/slices/ui-slice';

/**
 * Cifras de cabecera que además filtran el tablero.
 *
 * No son tarjetas sueltas: cada una acota lo que se ve abajo, así que el
 * número y el tablero son la misma cosa vista de dos maneras.
 */
export function BoardFilters({ metrics }: { metrics: FlowMetrics }) {
  const dispatch = useAppDispatch();
  const active = useAppSelector((state) => state.ui.boardFilter);

  const options: { id: BoardFilter; label: string; value: number; tone: string }[] = [
    { id: 'todas', label: 'En curso', value: metrics.inFlight, tone: 'text-foreground' },
    {
      id: 'listas',
      label: 'Listas para entregar',
      value: metrics.ready,
      tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'bloqueadas',
      label: 'Sin poder avanzar',
      value: metrics.blocked,
      tone: 'text-destructive',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = active === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => dispatch(setBoardFilter(option.id))}
            className={cn(
              'flex items-baseline gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'border-foreground/40 bg-accent'
                : 'border-input bg-background hover:bg-accent/60',
            )}
          >
            <span className={cn('text-base font-semibold tabular-nums', option.tone)}>
              {option.value}
            </span>
            <span className="text-xs text-muted-foreground">{option.label}</span>
          </button>
        );
      })}

      {metrics.closed > 0 ? (
        <span className="px-1 text-xs text-muted-foreground">
          {metrics.closed} ya {metrics.closed === 1 ? 'cerrada' : 'cerradas'}
        </span>
      ) : null}
    </div>
  );
}
