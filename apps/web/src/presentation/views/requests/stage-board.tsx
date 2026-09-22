import { AlertCircle, Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  agentForStage,
  agentKey,
  catalogKey,
  stageKey,
  STAGES,
  type Inspection,
  type StaffingRequest,
} from '@/domain';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { stageTone } from '@/presentation/components/stage-badge';
import { StageProgress } from '@/presentation/components/stage-stepper';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectRequest } from '@/store/slices/ui-slice';

/**
 * Tablero de solicitudes por etapa.
 *
 * Cada columna es a la vez la etapa y la bandeja del rol responsable: hay
 * exactamente un rol por etapa, así que no se muestran por separado. La
 * cabecera de la columna es la ficha del agente.
 */
export function StageBoard({
  requests,
  inspections,
}: {
  requests: StaffingRequest[];
  inspections: Record<string, Inspection>;
}) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const filter = useAppSelector((state) => state.ui.boardFilter);

  return (
    <div className="overflow-x-auto scrollbar-thin pb-2">
      <div className="grid min-w-[1190px] grid-cols-7 gap-3">
        {STAGES.map((stage, index) => {
          const column = requests.filter((request) => request.stage === stage.id);
          const agent = agentForStage(stage.id);

          const blocked = column.filter((request) => {
            const inspection = inspections[request.id];
            return inspection && !inspection.isFinal && !inspection.canAdvance;
          }).length;
          const ready = column.filter((request) => inspections[request.id]?.canAdvance).length;

          const visible = column.filter((request) => {
            if (filter === 'todas') return true;
            const inspection = inspections[request.id];
            if (!inspection || inspection.isFinal) return false;
            return filter === 'listas' ? inspection.canAdvance : !inspection.canAdvance;
          });

          return (
            <section key={stage.id} className="flex flex-col gap-2">
              {/* Cabecera: la etapa y, dentro, el rol cuya bandeja es. */}
              <header className="rounded-md border bg-card p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px] font-medium',
                      stageTone(stage.id),
                    )}
                  >
                    {index + 1}. {t(stageKey(stage.id, 'label'))}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{column.length}</span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
                      stageTone(stage.id),
                    )}
                  >
                    {agent.initials}
                  </span>
                  {/* Solo el nombre del rol: el cargo completo cabe mal en una
                      columna estrecha y se lee al pasar por encima. */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="min-w-0 flex-1 cursor-help text-xs font-medium leading-tight">
                        {t(agentKey(agent.id, 'name'))}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t(agentKey(agent.id, 'title'))}. {t(stageKey(stage.id, 'purpose'))}
                    </TooltipContent>
                  </Tooltip>
                  {agent.autonomy === 'asistido-por-modelo' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help items-center gap-0.5 rounded bg-secondary px-1 py-0.5 text-[10px] text-secondary-foreground">
                          <Sparkles className="h-2.5 w-2.5" />
                          {t('requests.board.aiBadge')}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t('requests.board.aiTooltip')}</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>

                <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">
                  {column.length === 0
                    ? t('requests.board.emptyInbox')
                    : [
                        blocked > 0 ? t('requests.board.blocked', { count: blocked }) : null,
                        ready > 0 ? t('requests.board.ready', { count: ready }) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || t('requests.board.closed', { count: column.length })}
                </p>
              </header>

              <div className="flex flex-col gap-2">
                {visible.length === 0 ? (
                  <p className="rounded-md border border-dashed px-2 py-6 text-center text-[11px] text-muted-foreground">
                    {column.length === 0
                      ? t('requests.board.noRequests')
                      : t('requests.board.noneWithFilter')}
                  </p>
                ) : null}

                {visible.map((request) => {
                  const inspection = inspections[request.id];
                  const isBlocked = inspection && !inspection.isFinal && !inspection.canAdvance;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => dispatch(selectRequest(request.id))}
                      className="rounded-md border bg-card p-2.5 text-left transition-colors hover:border-foreground/25"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {request.code}
                        </span>
                        {request.intake.priority ? (
                          <span className="text-[10px] text-muted-foreground">
                            {t(catalogKey('priorities', request.intake.priority))}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">
                        {request.intake.clientName || t('requests.board.noClient')}
                      </p>

                      {request.intake.stack ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {request.intake.stack}
                        </p>
                      ) : null}

                      <div className="mt-2">
                        <StageProgress current={request.stage} />
                      </div>

                      <div className="mt-2">
                        {inspection?.isFinal ? (
                          <Badge variant="success" className="gap-1 font-normal">
                            <Check className="h-3 w-3" />
                            {t('requests.board.activeBadge')}
                          </Badge>
                        ) : isBlocked ? (
                          <Badge variant="outline" className="gap-1 font-normal text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {t('requests.board.missing', { count: inspection.missing.length })}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="font-normal text-emerald-700 dark:text-emerald-400"
                          >
                            {t('requests.board.readyBadge')}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
