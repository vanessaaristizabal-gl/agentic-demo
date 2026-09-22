import type { StageBlockers } from '@/application/use-cases';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Requisitos sin cumplir, agrupados por la etapa que los pide.
 *
 * Una sola serie: las barras comparan magnitud, no identidad, así que todas
 * llevan el mismo tono y no hace falta leyenda —el título dice qué se mide—.
 * El valor va en la punta de cada barra; no hay rejilla que estorbe.
 */
export function BlockersChart({ data }: { data: StageBlockers[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No hay ningún requisito sin cumplir: todas las solicitudes podrían avanzar.
      </p>
    );
  }

  const max = Math.max(...data.map((entry) => entry.count));

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {data.map((entry) => (
          <li key={entry.stage} className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-3">
            <span className="truncate text-xs text-muted-foreground sm:text-right">
              {entry.label}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                {/* El área sensible es toda la fila, no solo la barra. */}
                <div className="flex cursor-help items-center gap-2 border-l border-[var(--chart-grid)] py-1 pl-2">
                  <div
                    className="h-2.5 rounded-r-[4px] bg-[var(--chart-1)]"
                    style={{ width: `${Math.max((entry.count / max) * 100, 4)}%` }}
                  />
                  <span className="text-xs tabular-nums text-muted-foreground">{entry.count}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {entry.count === 1
                  ? `Un requisito que pide la etapa ${entry.label} sigue sin cumplirse.`
                  : `${entry.count} requisitos que pide la etapa ${entry.label} siguen sin cumplirse.`}{' '}
                {entry.requests === 1
                  ? 'Frena una solicitud.'
                  : `Frenan ${entry.requests} solicitudes.`}
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>

      {/* Vista de tabla: los valores nunca dependen solo del color ni del largo. */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">
          Ver los datos en tabla
        </summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-1 font-medium">Etapa que lo pide</th>
              <th scope="col" className="py-1 text-right font-medium">Requisitos</th>
              <th scope="col" className="py-1 text-right font-medium">Solicitudes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.stage} className="border-b last:border-b-0">
                <td className="py-1">{entry.label}</td>
                <td className="py-1 text-right tabular-nums">{entry.count}</td>
                <td className="py-1 text-right tabular-nums">{entry.requests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
