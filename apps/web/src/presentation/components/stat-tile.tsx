import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Cifra suelta.
 *
 * Un número no es una gráfica: cuatro barras de una unidad cada una no dicen
 * nada que el número no diga mejor. Estas cuatro cifras son el titular del
 * tablero y por eso van como cifras, no como gráfico.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'good' | 'critical';
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0',
            tone === 'neutral' && 'text-muted-foreground',
            tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
            tone === 'critical' && 'text-destructive',
          )}
        />
        <p className="text-xs font-medium leading-tight text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
