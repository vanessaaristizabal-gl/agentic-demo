import { Check } from 'lucide-react';
import { STAGES, agentForStage, stageDef, type StageId } from '@/domain';
import { cn } from '@/lib/utils';

/**
 * Stepper del flujo de la solicitud.
 *
 * Las siete etapas son una secuencia ordinal, así que no se colorean con siete
 * tonos distintos: lo que el lector necesita distinguir son tres estados
 * —recorrida, actual y pendiente— y eso se encoda con tinta, no con arcoíris.
 */

type StepState = 'completada' | 'actual' | 'pendiente';

function stateOf(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completada';
  if (index === currentIndex) return 'actual';
  return 'pendiente';
}

export function StageStepper({
  current,
  className,
}: {
  current: StageId;
  className?: string;
}) {
  const currentIndex = stageDef(current).index;
  const owner = agentForStage(current);

  return (
    <div className={cn('w-full', className)}>
      <ol className="flex w-full items-start">
        {STAGES.map((stage, index) => {
          const state = stateOf(index, currentIndex);
          const isFirst = index === 0;
          const isLast = index === STAGES.length - 1;

          return (
            <li
              key={stage.id}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              aria-current={state === 'actual' ? 'step' : undefined}
            >
              <div className="flex w-full items-center">
                {/* Tramo anterior: recorrido si ya se pasó por esta etapa. */}
                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    isFirst && 'invisible',
                    index <= currentIndex ? 'bg-primary' : 'bg-border',
                  )}
                />

                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums transition-colors',
                    state === 'completada' && 'bg-primary text-primary-foreground',
                    state === 'actual' &&
                      'border-2 border-primary bg-background text-primary ring-4 ring-primary/10',
                    state === 'pendiente' && 'border border-border bg-background text-muted-foreground',
                  )}
                >
                  {state === 'completada' ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>

                <span
                  aria-hidden
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    isLast && 'invisible',
                    index < currentIndex ? 'bg-primary' : 'bg-border',
                  )}
                />
              </div>

              {/* En pantallas estrechas las siete etiquetas no caben:
                  el pie del stepper nombra la etapa actual. */}
              <span
                className={cn(
                  'hidden px-1 text-center text-[11px] leading-tight sm:block',
                  state === 'actual' && 'font-medium text-foreground',
                  state === 'completada' && 'text-muted-foreground',
                  state === 'pendiente' && 'text-muted-foreground/60',
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left">
        Etapa {currentIndex + 1} de {STAGES.length} ·{' '}
        <span className="font-medium text-foreground">{stageDef(current).label}</span> ·{' '}
        {currentIndex === STAGES.length - 1
          ? 'el flujo de la solicitud ha terminado'
          : `en la bandeja de ${owner.name}`}
      </p>
    </div>
  );
}

/**
 * Versión compacta para las tarjetas del tablero: siete tramos separados por
 * un hueco del color de la superficie, no por un borde.
 */
export function StageProgress({ current }: { current: StageId }) {
  const currentIndex = stageDef(current).index;
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`Etapa ${currentIndex + 1} de ${STAGES.length}: ${stageDef(current).label}`}
    >
      {STAGES.map((stage, index) => (
        <span
          key={stage.id}
          className={cn(
            'h-1 flex-1 rounded-full',
            index <= currentIndex ? 'bg-primary' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}
