import { ArrowRight, Check, Circle, LogOut, Repeat } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  agentById,
  CONSULTANT_ROLES,
  currentPhase,
  labelOf,
  lifecycleProgress,
  SENIORITIES,
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
 * cuándo se cumplió. El ciclo avanza igual que la demanda: a mano, paso a paso.
 */

const STATUS_LABEL = {
  completada: 'Completada',
  'en-curso': 'En curso',
  pendiente: 'Pendiente',
} as const;

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
          {labelOf(CONSULTANT_ROLES, consultant.role)} · {team?.name ?? 'Sin equipo'}
        </span>
      </span>
      <span className="shrink-0 text-right">
        {consultant.outcome === 'en-curso' ? (
          <Badge variant="outline" className="font-normal">
            {phase?.label ?? 'Cerrado'}
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            {consultant.outcome === 'rotacion' ? 'Rotación' : 'Salida'}
          </Badge>
        )}
      </span>
    </button>
  );
}

function PhaseCard({ phase, index }: { phase: LifecyclePhase; index: number }) {
  const owner = agentById(phase.owner);
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
            <h3 className="text-sm font-medium">{phase.label}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{phase.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Badge variant={running ? 'default' : done ? 'success' : 'outline'} className="font-normal">
              {STATUS_LABEL[phase.status]}
            </Badge>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {owner.name}
            </Badge>
          </div>
        </div>

        <dl className="mt-3 space-y-2 border-t pt-3">
          {phase.requirements.map((requirement) => (
            <div key={requirement.label} className="flex items-start gap-2.5">
              {requirement.completedAt ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <dt className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className={cn(!requirement.completedAt && 'text-muted-foreground')}>
                    {requirement.label}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {requirement.completedAt ? formatDate(requirement.completedAt) : 'Sin cumplir'}
                  </span>
                </dt>
                <dd className="text-xs leading-relaxed text-muted-foreground">
                  {requirement.detail}
                </dd>
              </div>
            </div>
          ))}
        </dl>

        {phase.startedAt ? (
          <p className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">
            Empezó el {formatDate(phase.startedAt)}
            {phase.completedAt ? ` · se cerró el ${formatDate(phase.completedAt)}` : null}
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
          Cerrar con rotación
        </Button>
        <Button variant="outline" size="sm" onClick={() => start('salida')}>
          <LogOut className="h-3.5 w-3.5" />
          Cerrar con salida
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {outcome === 'rotacion' ? 'Rotar a otro equipo' : 'Salida de la cuenta'}
            </DialogTitle>
            <DialogDescription>
              Queda registrado en el ciclo de {consultant.name}. Recursos Humanos cierra la fase de
              salida con esta nota.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              outcome === 'rotacion'
                ? 'A qué equipo rota y desde cuándo'
                : 'Motivo de la salida y fecha del último día'
            }
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
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
              Cerrar el ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConsultantView() {
  const { data, isLoading } = useWorkspace();
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
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando las personas…</p>;
  }

  if (data.consultants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no hay ningún consultor activo. Lleva una demanda hasta la etapa <em>activo</em>{' '}
          desde Orquestación y aparecerá aquí.
        </p>
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
        <h1 className="text-xl font-semibold tracking-tight">Ciclo del consultor</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          El recorrido completo de una persona después de la demanda: onboarding, ramp-up,
          productivo, evaluación y salida o rotación. Cada paso dice qué exigió y cuándo se cumplió.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border bg-card lg:sticky lg:top-20 lg:self-start">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-medium">Personas</h2>
            <p className="text-xs text-muted-foreground">{data.consultants.length} en plantilla</p>
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
                    {labelOf(CONSULTANT_ROLES, consultant.role)} ·{' '}
                    {labelOf(SENIORITIES, consultant.seniority)} · {team?.name ?? 'Sin equipo'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  En la empresa desde {formatDate(consultant.joinedAt)}
                </p>
                {closed ? (
                  <Badge variant="secondary" className="mt-1 font-normal">
                    {consultant.outcome === 'rotacion' ? 'Rota de equipo' : 'Salió de la cuenta'}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">
                  {closed ? 'Ciclo cerrado' : `Fase actual: ${phase?.label ?? '—'}`}
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
                  Cerrar «{phase?.label}» y pasar a la siguiente
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
