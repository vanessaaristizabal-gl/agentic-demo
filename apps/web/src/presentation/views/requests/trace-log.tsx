import { ArrowRight } from 'lucide-react';
import { agentById, type OrchestrationEvent } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn, formatDateTime } from '@/lib/utils';

const KIND_LABEL: Record<OrchestrationEvent['kind'], string> = {
  'solicitud-creada': 'Alta',
  entrega: 'Entrega',
  bloqueo: 'Bloqueo',
  'borrador-ia': 'Borrador',
  dedicacion: 'Dedicación',
  'consultor-activo': 'Activación',
};

/**
 * Traza de orquestación: qué agente entregó qué a quién y cuándo. Es el
 * registro que hace visible el sistema multiagente, pero se consulta después
 * de actuar, no antes, así que vive plegada al pie de la página.
 */
export function TraceLog({ events }: { events: OrchestrationEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Todavía no hay movimientos registrados.
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0">
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
  );
}
