import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';
import {
  agentForStage,
  stageDef,
  stageIndex,
  STAGES,
  type BlockingReport,
  type StageId,
} from '@/domain';
import type { Workspace } from '@/application/use-cases';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlockingAlert } from '@/presentation/components/blocking-alert';
import { RequirementList } from '@/presentation/components/requirement-list';
import { StageStepper } from '@/presentation/components/stage-stepper';
import {
  useAdvanceDemand,
  useAssignTeam,
  useDraftVacancy,
  useUpdateDemand,
} from '@/presentation/hooks/use-workspace';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectDemand } from '@/store/slices/ui-slice';
import { IntakeForm } from './intake-form';
import {
  ActivePanel,
  InterviewPanel,
  OnboardingPanel,
  ProfilePanel,
  TeamPanel,
  VacancyPanel,
  type PanelProps,
} from './stage-panels';

const PANELS: Record<StageId, ((props: PanelProps) => ReactElement) | null> = {
  demanda: null,
  perfil: ProfilePanel,
  equipo: TeamPanel,
  vacante: VacancyPanel,
  entrevista: InterviewPanel,
  onboarding: OnboardingPanel,
  activo: ActivePanel,
};

export function DemandDialog({ workspace }: { workspace: Workspace }) {
  const dispatch = useAppDispatch();
  const demandId = useAppSelector((state) => state.ui.selectedDemandId);
  const [report, setReport] = useState<BlockingReport | null>(null);
  const [tab, setTab] = useState<StageId>('demanda');

  const update = useUpdateDemand();
  const assignTeam = useAssignTeam();
  const draft = useDraftVacancy();
  const advance = useAdvanceDemand();

  const demand = workspace.demands.find((candidate) => candidate.id === demandId) ?? null;
  const inspection = demand ? workspace.inspections[demand.id] : null;

  // Al abrir una demanda se muestra la etapa en la que está parada.
  useEffect(() => {
    if (demand) {
      setTab(demand.stage);
      setReport(null);
    }
  }, [demand?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!demand || !inspection) return null;

  const panelProps: PanelProps = {
    demand,
    teams: workspace.teams,
    consultants: workspace.consultants,
    onPatch: (patch) => update.mutate({ demandId: demand.id, patch }),
    onAssignTeam: (teamId) => assignTeam.mutate({ demandId: demand.id, teamId }),
    onDraft: () => draft.mutate(demand.id),
    drafting: draft.isPending,
  };

  const reachable = STAGES.filter((stage) => stage.index <= stageIndex(demand.stage));
  const current = stageDef(demand.stage);
  const owner = agentForStage(demand.stage);

  const onAdvance = () => {
    advance.mutate(demand.id, {
      onSuccess: (outcome) => setReport(outcome.ok ? null : outcome.report),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && dispatch(selectDemand(null))}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {demand.code}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {owner.name}
            </Badge>
          </div>
          <DialogTitle className="text-left">{demand.intake.clientName || 'Cliente sin nombre'}</DialogTitle>
          <DialogDescription className="text-left">{current.purpose}</DialogDescription>
          <div className="pt-3">
            <StageStepper current={demand.stage} />
          </div>
        </DialogHeader>

        {report ? <BlockingAlert report={report} /> : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <Tabs value={tab} onValueChange={(next) => setTab(next as StageId)}>
              <div className="overflow-x-auto scrollbar-thin">
                <TabsList>
                  {reachable.map((stage) => (
                    <TabsTrigger key={stage.id} value={stage.id}>
                      {stage.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="demanda">
                <IntakeForm
                  value={demand.intake}
                  onChange={(patch) => update.mutate({ demandId: demand.id, patch: { intake: patch } })}
                />
              </TabsContent>

              {reachable
                .filter((stage) => stage.id !== 'demanda')
                .map((stage) => {
                  const Panel = PANELS[stage.id];
                  return (
                    <TabsContent key={stage.id} value={stage.id}>
                      {Panel ? <Panel {...panelProps} /> : null}
                    </TabsContent>
                  );
                })}
            </Tabs>
          </div>

          <aside className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">Requisitos acumulados</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {inspection.isFinal
                  ? 'La demanda está cerrada.'
                  : `Para entregar a ${inspection.nextAgent?.name} se comprueban ${inspection.checks.length} requisitos, incluidos los de etapas anteriores.`}
              </p>
              <div className="mt-2">
                <RequirementList checks={inspection.checks} />
              </div>
            </div>

            <Separator />

            {inspection.isFinal ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>El consultor ya está trabajando en el equipo.</span>
              </div>
            ) : (
              <Button className="w-full" onClick={onAdvance} disabled={advance.isPending}>
                {current.action}
                <ArrowRight />
              </Button>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
