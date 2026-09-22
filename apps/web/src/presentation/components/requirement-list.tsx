import { Check, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { requirementLabelKey, stageKey, type RequirementCheck } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Lista de verificación acumulada: se ven también los requisitos que vienen
 * de etapas anteriores, marcados como heredados. Deja a la vista que nada
 * se cierra al avanzar.
 */
export function RequirementList({ checks }: { checks: RequirementCheck[] }) {
  const { t } = useTranslation();

  if (checks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('requests.dialog.noneRequired')}</p>;
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
              {t(requirementLabelKey(check.requirement.id))}
            </span>
            {check.inherited ? (
              <Badge variant="outline" className="ml-2 align-middle font-normal">
                {t(stageKey(check.originStage, 'label'))}
              </Badge>
            ) : null}
            {!check.satisfied && check.requirement.resolveIn === 'equipos' ? (
              <Badge variant="warning" className="ml-2 align-middle font-normal">
                {t('blocking.fixedInTeams')}
              </Badge>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
