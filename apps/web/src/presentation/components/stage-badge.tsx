import { stageDef, type StageId } from '@/domain';
import { cn } from '@/lib/utils';

/** Color estable por etapa. Sobrio: un tinte, nada de degradados. */
const TONES: Record<StageId, string> = {
  registro: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  perfil: 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  equipo: 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  vacante: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  entrevista: 'bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  onboarding: 'bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-200',
  activo: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};

export function stageTone(stage: StageId): string {
  return TONES[stage];
}

export function StageBadge({ stage, className }: { stage: StageId; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
        TONES[stage],
        className,
      )}
    >
      {stageDef(stage).label}
    </span>
  );
}
