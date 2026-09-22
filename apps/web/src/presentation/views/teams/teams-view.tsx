import { AlertCircle, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildOccupancy, type TeamOccupancy } from '@/application/use-cases';
import {
  CONSULTANT_ROLES,
  labelOf,
  SENIORITIES,
  type Consultant,
  type Demand,
  type Position,
} from '@/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StageBadge } from '@/presentation/components/stage-badge';
import {
  useReleasePosition,
  useSetAllocation,
  useWorkspace,
} from '@/presentation/hooks/use-workspace';

/**
 * Vista del Delivery Manager.
 *
 * Aquí se ve qué está cubierto, qué está abierto y dónde hay hueco. Y aquí
 * —y solo aquí— se fija la dedicación de cada posición, que es una de las
 * condiciones que bloquean el cierre de la demanda en la última etapa.
 */

function AllocationEditor({
  position,
  overCapacity,
}: {
  position: Position;
  overCapacity: boolean;
}) {
  const setAllocation = useSetAllocation();
  const [draft, setDraft] = useState(
    position.allocationPct === null ? '' : String(position.allocationPct),
  );

  useEffect(() => {
    setDraft(position.allocationPct === null ? '' : String(position.allocationPct));
  }, [position.allocationPct]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    if (parsed === position.allocationPct) return;
    setAllocation.mutate({ positionId: position.id, allocationPct: parsed });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        max={200}
        step={5}
        aria-label="Dedicación en puntos"
        className={cn(
          'h-8 w-20 text-sm',
          position.allocationPct === null && 'border-amber-400 dark:border-amber-700',
          overCapacity && 'border-destructive',
        )}
        placeholder="—"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
      />
      <span className="text-xs text-muted-foreground">pts</span>
    </div>
  );
}

function PositionRow({
  position,
  consultant,
  demand,
  overCapacity,
}: {
  position: Position;
  consultant: Consultant | undefined;
  demand: Demand | undefined;
  overCapacity: boolean;
}) {
  const release = useReleasePosition();
  const open = position.status === 'abierta';

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 basis-[11rem] items-center gap-2.5">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
            open
              ? 'border border-dashed border-muted-foreground/40 text-muted-foreground'
              : 'bg-secondary text-secondary-foreground',
          )}
        >
          {consultant ? consultant.initials : <UserRound className="h-3.5 w-3.5" />}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {consultant ? consultant.name : 'Posición abierta'}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {labelOf(CONSULTANT_ROLES, position.role)} · {labelOf(SENIORITIES, position.seniority)}
            {demand ? ` · ${demand.code}` : null}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {demand ? <StageBadge stage={demand.stage} /> : null}
        {position.allocationPct === null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="warning" className="cursor-help font-normal">
                Sin dedicación
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Mientras esta posición no tenga dedicación, la demanda no puede cerrarse en la etapa
              Onboarding.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <AllocationEditor position={position} overCapacity={overCapacity} />

      {open ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => release.mutate(position.id)}
              aria-label="Liberar posición"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Liberar la posición. La demanda deja de cumplir el requisito de la etapa Equipo y habrá
            que reasignarla.
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="w-8" aria-hidden />
      )}
    </li>
  );
}

function TeamCard({
  occupancy,
  consultants,
  demands,
}: {
  occupancy: TeamOccupancy;
  consultants: Consultant[];
  demands: Demand[];
}) {
  const { team, used, free, overCapacity } = occupancy;
  const percent = Math.min(100, Math.round((used / team.capacityPct) * 100));

  return (
    <article className="rounded-lg border bg-card">
      <header className="space-y-3 border-b p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-medium">{team.name}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {team.clientName} · Delivery Manager: {team.deliveryManager}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-normal">
              {occupancy.covered.length} cubierta{occupancy.covered.length === 1 ? '' : 's'}
            </Badge>
            {occupancy.open.length > 0 ? (
              <Badge variant="outline" className="font-normal">
                {occupancy.open.length} abierta{occupancy.open.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
            {occupancy.withoutAllocation > 0 ? (
              <Badge variant="warning" className="font-normal">
                {occupancy.withoutAllocation} sin dedicación
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Dedicación comprometida</span>
            <span className="tabular-nums">
              {used} / {team.capacityPct} pts
            </span>
          </div>
          <Progress
            value={percent}
            indicatorClassName={cn(overCapacity && 'bg-destructive')}
          />
          <p
            className={cn(
              'text-xs',
              overCapacity ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {overCapacity ? (
              <span className="inline-flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {Math.abs(free)} puntos por encima de la capacidad del equipo.
              </span>
            ) : free === 0 ? (
              'El equipo está al completo: no queda hueco.'
            ) : (
              `Quedan ${free} puntos libres, es decir hueco para ${(free / 100).toFixed(free % 100 === 0 ? 0 : 2)} persona${free === 100 ? '' : 's'} a tiempo completo.`
            )}
          </p>
        </div>
      </header>

      <ul className="divide-y">
        {occupancy.positions.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            Este equipo no tiene posiciones todavía.
          </li>
        ) : null}
        {occupancy.positions.map((position) => (
          <PositionRow
            key={position.id}
            position={position}
            overCapacity={overCapacity}
            consultant={consultants.find((candidate) => candidate.id === position.consultantId)}
            demand={demands.find((candidate) => candidate.id === position.demandId)}
          />
        ))}
      </ul>
    </article>
  );
}

export function TeamsView() {
  const { data, isLoading } = useWorkspace();

  if (isLoading || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Cargando los equipos…</p>;
  }

  const occupancies = buildOccupancy(data.teams, data.positions);
  const openTotal = occupancies.reduce((total, item) => total + item.open.length, 0);
  const pendingAllocation = occupancies.reduce((total, item) => total + item.withoutAllocation, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Equipos</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          La vista del Delivery Manager: qué posiciones están cubiertas, cuáles siguen abiertas y
          cuánta dedicación tiene comprometida cada equipo. La dedicación de una posición se fija
          aquí, no en la demanda, y sin ella la demanda no puede llegar a <em>activo</em>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="font-normal">
          {data.teams.length} equipos
        </Badge>
        <Badge variant="outline" className="font-normal">
          {openTotal === 1 ? '1 posición abierta' : `${openTotal} posiciones abiertas`}
        </Badge>
        {pendingAllocation > 0 ? (
          <Badge variant="warning" className="font-normal">
            {pendingAllocation} esperando dedicación
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {occupancies.map((occupancy) => (
          <TeamCard
            key={occupancy.team.id}
            occupancy={occupancy}
            consultants={data.consultants}
            demands={data.demands}
          />
        ))}
      </div>
    </div>
  );
}
