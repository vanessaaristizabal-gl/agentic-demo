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
  useAdvanceRequest,
  useAssignTeam,
  useDraftVacancy,
  useUpdateRequest,
} from '@/presentation/hooks/use-workspace';
import { useAppDispatch, useAppSelector } from '@/store';
import { selectRequest } from '@/store/slices/ui-slice';
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
  registro: null,
  perfil: ProfilePanel,
  equipo: TeamPanel,
  vacante: VacancyPanel,
  entrevista: InterviewPanel,
  onboarding: OnboardingPanel,
  activo: ActivePanel,
};

export function RequestDialog({ workspace }: { workspace: Workspace }) {
  const dispatch = useAppDispatch();
  const requestId = useAppSelector((state) => state.ui.selectedRequestId);
  const [report, setReport] = useState<BlockingReport | null>(null);
  const [tab, setTab] = useState<StageId>('registro');

  const update = useUpdateRequest();
  const assignTeam = useAssignTeam();
  const draft = useDraftVacancy();
  const advance = useAdvanceRequest();

  const request = workspace.requests.find((candidate) => candidate.id === requestId) ?? null;
  const inspection = request ? workspace.inspections[request.id] : null;

  // Al abrir una solicitud se muestra la etapa en la que está parada.
  useEffect(() => {
    if (request) {
      setTab(request.stage);
      setReport(null);
    }
  }, [request?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!request || !inspection) return null;

  const panelProps: PanelProps = {
    request,
    teams: workspace.teams,
    consultants: workspace.consultants,
    onPatch: (patch) => update.mutate({ requestId: request.id, patch }),
    onAssignTeam: (teamId) => assignTeam.mutate({ requestId: request.id, teamId }),
    onDraft: () => draft.mutate(request.id),
    drafting: draft.isPending,
  };

  const reachable = STAGES.filter((stage) => stage.index <= stageIndex(request.stage));
  const current = stageDef(request.stage);
  const owner = agentForStage(request.stage);

  const onAdvance = () => {
    advance.mutate(request.id, {
      onSuccess: (outcome) => setReport(outcome.ok ? null : outcome.report),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && dispatch(selectRequest(null))}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {request.code}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {owner.name}
            </Badge>
          </div>
          <DialogTitle className="text-left">{request.intake.clientName || 'Cliente sin nombre'}</DialogTitle>
          <DialogDescription className="text-left">{current.purpose}</DialogDescription>
          <div className="pt-3">
            <StageStepper current={request.stage} />
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

              <TabsContent value="registro">
                <IntakeForm
                  value={request.intake}
                  onChange={(patch) => update.mutate({ requestId: request.id, patch: { intake: patch } })}
                />
              </TabsContent>

              {reachable
                .filter((stage) => stage.id !== 'registro')
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
                  ? 'La solicitud está cerrada.'
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
