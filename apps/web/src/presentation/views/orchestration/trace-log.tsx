import { ArrowRight, ChevronDown } from 'lucide-react';
import { agentById, type OrchestrationEvent } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateTime } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleTrace } from '@/store/slices/ui-slice';

const KIND_LABEL: Record<OrchestrationEvent['kind'], string> = {
  'solicitud-creada': 'Alta',
  entrega: 'Entrega',
  bloqueo: 'Bloqueo',
  'borrador-ia': 'Borrador',
  dedicacion: 'Dedicación',
  'consultor-activo': 'Activación',
};

/**
 * Traza de orquestación: qué agente entregó qué a quién y cuándo, con los
 * requisitos que se verificaron en cada paso. Es el registro que hace
 * visible el sistema multiagente.
 */
export function TraceLog({ events }: { events: OrchestrationEvent[] }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.ui.traceOpen);
  const visible = open ? events : events.slice(0, 6);

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">Traza de orquestación</h2>
          <p className="text-xs text-muted-foreground">
            Cada entrega entre agentes queda registrada con lo que se verificó.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(toggleTrace())}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs transition-colors hover:bg-accent"
        >
          {open ? 'Ver menos' : `Ver las ${events.length}`}
          <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
        </button>
      </header>

      <ol className="divide-y">
        {visible.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay movimientos registrados.
          </li>
        ) : null}

        {visible.map((event) => (
          <li key={event.id} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3">
            <span className="w-28 shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {formatDateTime(event.at)}
            </span>

            <Badge
              variant={event.kind === 'bloqueo' ? 'outline' : 'secondary'}
              className={cn('font-normal', event.kind === 'bloqueo' && 'text-destructive')}
            >
              {KIND_LABEL[event.kind]}
            </Badge>

            <span className="min-w-0 flex-1 text-sm leading-relaxed">{event.summary}</span>

            {event.fromAgent && event.toAgent ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                {agentById(event.fromAgent).initials}
                <ArrowRight className="h-3 w-3" />
                {agentById(event.toAgent).initials}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
