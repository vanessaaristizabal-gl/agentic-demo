import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BlockingReport } from '@/domain';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Un único mensaje con TODO lo que falta.
 *
 * No se muestran los errores de a uno ni se marcan los campos por separado:
 * el usuario ve de golpe la lista completa, con la etapa que lo pide y
 * dónde se arregla cada cosa.
 */
export function BlockingAlert({
  report,
  className,
}: {
  report: BlockingReport;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-destructive/40 bg-destructive/[0.04] p-4',
        className,
      )}
    >
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium leading-relaxed">{report.headline}</p>
          {report.aside ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{report.aside}</p>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 space-y-2.5 border-t border-destructive/20 pt-3">
        {report.items.map((item) => (
          <li key={item.requirementId} className="flex gap-3">
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/70"
            />
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm leading-relaxed">{item.sentence}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-normal">
                  Lo pide la etapa {item.originLabel}
                </Badge>
                {item.inherited ? (
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    Requisito heredado
                  </Badge>
                ) : null}
                {item.resolveIn === 'equipos' ? (
                  <Link
                    to="/equipos"
                    className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    Ir a Equipos
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
