import { Check, Circle } from 'lucide-react';
import type { RequirementCheck } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Lista de verificación acumulada: se ven también los requisitos que vienen
 * de etapas anteriores, marcados como heredados. Deja a la vista que nada
 * se cierra al avanzar.
 */
export function RequirementList({ checks }: { checks: RequirementCheck[] }) {
  if (checks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta etapa no exige nada: la demanda ya está en el final del flujo.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {checks.map((check) => (
        <li
          key={check.requirement.id}
          className={cn(
            'flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm',
            check.satisfied ? 'text-muted-foreground' : 'bg-muted/60',
          )}
        >
          {check.satisfied ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          ) : (
            <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          )}
          <span className="min-w-0 flex-1">
            <span className={cn(!check.satisfied && 'font-medium text-foreground')}>
              {check.requirement.label}
            </span>
            {check.inherited ? (
              <Badge variant="outline" className="ml-2 align-middle font-normal">
                {check.originLabel}
              </Badge>
            ) : null}
            {!check.satisfied && check.requirement.resolveIn === 'equipos' ? (
              <Badge variant="warning" className="ml-2 align-middle font-normal">
                Se fija en Equipos
              </Badge>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
