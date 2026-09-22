import { ArrowRight, Check, Circle, LogOut, Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  agentKey,
  catalogKey,
  currentPhase,
  lifecycleProgress,
  phaseKey,
  phaseRequirementKey,
  type Consultant,
  type LifecyclePhase,
  type Team,
} from '@/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDate } from '@/lib/utils';
import {
  useAdvanceLifecycle,
  useCloseLifecycle,
  useWorkspace,
} from '@/presentation/hooks/use-workspace';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectConsultant } from '@/store/slices/ui-slice';

/**
 * Ciclo del consultor.
 *
 * Se elige una persona y se ve su recorrido completo: qué exigió cada paso y
 * cuándo se cumplió. El ciclo avanza igual que la solicitud: a mano, paso a paso.
 */

function PersonRow({
  consultant,
  team,
  active,
  onSelect,
}: {
  consultant: Consultant;
  team: Team | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const phase = currentPhase(consultant);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/60',
        active && 'bg-accent',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        {consultant.initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{consultant.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {t(catalogKey('roles', consultant.role))} · {team?.name ?? t('consultant.noTeam')}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {consultant.outcome === 'en-curso' ? (
          <Badge variant="outline" className="font-normal">
            {phase ? t(phaseKey(phase.id, 'label')) : t('consultant.closedCycle')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            {consultant.outcome === 'rotacion' ? t('consultant.rotation') : t('consultant.exit')}
          </Badge>
        )}
      </span>
    </button>
  );
}

function PhaseCard({ phase, index }: { phase: LifecyclePhase; index: number }) {
  const { t } = useTranslation();
  const done = phase.status === 'completada';
  const running = phase.status === 'en-curso';

  return (
    <li className="relative pl-8">
      <span
        className={cn(
          'absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold',
          done && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          running && 'border-foreground/30 bg-background',
          !done && !running && 'border-dashed text-muted-foreground',
        )}
      >
        {done ? <Check className="h-3 w-3" /> : index + 1}
      </span>

      <div
        className={cn(
          'rounded-lg border p-4',
          running && 'border-foreground/25 bg-card',
          !running && 'bg-card/50',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium">{t(phaseKey(phase.id, 'label'))}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t(phaseKey(phase.id, 'summary'))}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge variant={running ? 'default' : done ? 'success' : 'outline'} className="font-normal">
              {t(`consultant.status.${phase.status}`)}
            </Badge>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {t(agentKey(phase.owner, 'name'))}
            </Badge>
          </div>
        </div>

        <dl className="mt-3 space-y-2 border-t pt-3">
          {phase.requirements.map((requirement) => (
            <div key={requirement.id} className="flex items-start gap-2.5">
              {requirement.completedAt ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <dt className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className={cn(!requirement.completedAt && 'text-muted-foreground')}>
                    {t(phaseRequirementKey(phase.id, requirement.id, 'label'))}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {requirement.completedAt
                      ? formatDate(requirement.completedAt)
                      : t('consultant.notMet')}
                  </span>
                </dt>
                <dd className="text-xs leading-relaxed text-muted-foreground">
                  {t(phaseRequirementKey(phase.id, requirement.id, 'detail'))}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {phase.startedAt ? (
          <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
            {t('consultant.startedOn', { date: formatDate(phase.startedAt) })}
            {phase.completedAt
              ? t('consultant.closedOn', { date: formatDate(phase.completedAt) })
              : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function CloseCycleDialog({ consultant }: { consultant: Consultant }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<'rotacion' | 'salida'>('rotacion');
  const [note, setNote] = useState('');
  const { t } = useTranslation();
  const close = useCloseLifecycle();

  const start = (next: 'rotacion' | 'salida') => {
    setOutcome(next);
    setNote('');
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => start('rotacion')}>
          <Repeat className="h-3.5 w-3.5" />
          {t('consultant.closeWithRotation')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => start('salida')}>
          <LogOut className="h-3.5 w-3.5" />
          {t('consultant.closeWithExit')}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {outcome === 'rotacion'
                ? t('consultant.closeDialogRotation')
                : t('consultant.closeDialogExit')}
            </DialogTitle>
            <DialogDescription>
              {t('consultant.closeDialogDescription', { name: consultant.name })}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              outcome === 'rotacion'
                ? t('consultant.closeDialogPlaceholderRotation')
                : t('consultant.closeDialogPlaceholderExit')
            }
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() =>
                close.mutate(
                  { consultantId: consultant.id, outcome, note },
                  { onSuccess: () => setOpen(false) },
                )
              }
              disabled={close.isPending}
            >
              {t('consultant.closeCycle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsultantView() {
  const { data, isLoading } = useWorkspace();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.ui.selectedConsultantId);
  const advance = useAdvanceLifecycle();

  // Si no hay nadie elegido, se abre la primera persona de la lista.
  useEffect(() => {
    if (data && !selectedId && data.consultants.length > 0) {
      dispatch(selectConsultant(data.consultants[0].id));
    }
  }, [data, selectedId, dispatch]);

  if (isLoading || !data) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">{t('consultant.loading')}</p>
    );
  }

  if (data.consultants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">{t('consultant.empty')}</p>
      </div>
    );
  }

  const consultant =
    data.consultants.find((candidate) => candidate.id === selectedId) ?? data.consultants[0];
  const team = data.teams.find((candidate) => candidate.id === consultant.teamId);
  const phase = currentPhase(consultant);
  const progress = lifecycleProgress(consultant);
  const closed = consultant.outcome !== 'en-curso';
  const atFinalPhase = phase?.id === 'salida';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t('consultant.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t('consultant.subtitle')}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border bg-card lg:sticky lg:top-20 lg:self-start">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">{t('consultant.people')}</h2>
            <p className="text-xs text-muted-foreground">
              {t('consultant.headcount', { count: data.consultants.length })}
            </p>
          </header>
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin lg:max-h-[70vh]">
            {data.consultants.map((candidate) => (
              <PersonRow
                key={candidate.id}
                consultant={candidate}
                team={data.teams.find((item) => item.id === candidate.teamId)}
                active={candidate.id === consultant.id}
                onSelect={() => dispatch(selectConsultant(candidate.id))}
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <header className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {consultant.initials}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{consultant.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(catalogKey('roles', consultant.role))} ·{' '}
                    {t(catalogKey('seniorities', consultant.seniority))} ·{' '}
                    {team?.name ?? t('consultant.noTeam')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {t('consultant.since', { date: formatDate(consultant.joinedAt) })}
                </p>
                {closed ? (
                  <Badge variant="secondary" className="mt-1 font-normal">
                    {consultant.outcome === 'rotacion'
                      ? t('consultant.rotated')
                      : t('consultant.left')}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">
                  {closed
                    ? t('consultant.closedCycle')
                    : t('consultant.currentPhase', {
                        phase: phase ? t(phaseKey(phase.id, 'label')) : t('common.none'),
                      })}
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>

            {consultant.outcomeNote ? (
              <p className="mt-3 rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
                {consultant.outcomeNote}
              </p>
            ) : null}

            {!closed ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                <Button
                  size="sm"
                  onClick={() => advance.mutate(consultant.id)}
                  disabled={advance.isPending || !phase}
                >
                  {t('consultant.advancePhase', {
                    phase: phase ? t(phaseKey(phase.id, 'label')) : '',
                  })}
                  <ArrowRight />
                </Button>
                {atFinalPhase ? <CloseCycleDialog consultant={consultant} /> : null}
              </div>
            ) : null}
          </header>

          <ol className="space-y-3">
            {consultant.phases.map((item, index) => (
              <PhaseCard key={item.id} phase={item} index={index} />
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
