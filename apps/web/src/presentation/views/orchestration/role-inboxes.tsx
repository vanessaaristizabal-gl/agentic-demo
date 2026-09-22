import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { AgentInbox } from '@/domain';
import { stageDef } from '@/domain';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { stageTone } from '@/presentation/components/stage-badge';
import { useAppDispatch, useAppSelector } from '@/store';
import { setRoleFilter } from '@/store/slices/ui-slice';

/**
 * Los siete roles, cada uno con su bandeja.
 *
 * Es la representación del sistema multiagente: cada tarjeta es un agente
 * con su etapa, sus capacidades, cuántas solicitudes esperan por él y cuántas
 * de ellas no podrían avanzar hoy.
 */
export function RoleInboxes({ inboxes }: { inboxes: AgentInbox[] }) {
  const dispatch = useAppDispatch();
  const roleFilter = useAppSelector((state) => state.ui.roleFilter);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {inboxes.map((inbox, index) => {
        const stage = stageDef(inbox.agent.owns);
        const active = roleFilter === inbox.agent.id;
        const waiting = inbox.requests.length;

        return (
          <button
            key={inbox.agent.id}
            type="button"
            onClick={() => dispatch(setRoleFilter(inbox.agent.id))}
            aria-pressed={active}
            className={cn(
              'group relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-foreground/25',
              active && 'border-foreground/40 ring-1 ring-foreground/10',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold',
                  stageTone(inbox.agent.owns),
                )}
              >
                {inbox.agent.initials}
              </span>
              <span className="text-right">
                <span className="block text-xl font-semibold leading-none tabular-nums">
                  {waiting}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {waiting === 1 ? 'solicitud' : 'solicitudes'}
                </span>
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{inbox.agent.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{inbox.agent.title}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-medium',
                  stageTone(inbox.agent.owns),
                )}
              >
                {index + 1}. {stage.label}
              </span>
              {inbox.agent.autonomy === 'asistido-por-modelo' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                      <Sparkles className="h-2.5 w-2.5" />
                      IA
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Es el único agente que puede apoyarse en un modelo de lenguaje, y solo para
                    redactar la descripción del puesto.
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {inbox.blocked > 0 ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {inbox.blocked} sin poder avanzar
                </span>
              ) : null}
              {inbox.ready > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <ArrowRight className="h-3 w-3" />
                  {inbox.ready} lista{inbox.ready === 1 ? '' : 's'}
                </span>
              ) : null}
              {waiting === 0 ? <span>Bandeja vacía</span> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
