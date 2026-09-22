import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  composeIntakeReport,
  createDemand,
  emptyIntake,
  evaluate,
  type BlockingReport,
  type DemandIntake,
} from '@/domain';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BlockingAlert } from '@/presentation/components/blocking-alert';
import { useCreateDemand } from '@/presentation/hooks/use-workspace';
import { IntakeForm } from './intake-form';

export function NewDemandDialog() {
  const [open, setOpen] = useState(false);
  const [intake, setIntake] = useState<DemandIntake>(emptyIntake);
  const [report, setReport] = useState<BlockingReport | null>(null);
  const create = useCreateDemand();

  const reset = () => {
    setIntake(emptyIntake());
    setReport(null);
  };

  const submit = () => {
    // Se valida con el mismo motor que usa el flujo: los requisitos de la
    // etapa Demanda. Si falta algo, se dice todo de una vez.
    const provisional = createDemand({
      id: 'provisional',
      code: 'provisional',
      now: new Date().toISOString(),
      intake,
    });
    const missing = evaluate({ demand: provisional, teams: [], positions: [] }, 'demanda').filter(
      (check) => !check.satisfied,
    );

    if (missing.length > 0) {
      setReport(composeIntakeReport(missing));
      return;
    }

    create.mutate(intake, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nueva demanda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar una demanda</DialogTitle>
          <DialogDescription>
            Sales recoge la necesidad del cliente. La demanda entra en la etapa Demanda y no avanza
            hasta que alguien la mueve a mano.
          </DialogDescription>
        </DialogHeader>

        {report ? <BlockingAlert report={report} /> : null}

        <IntakeForm
          value={intake}
          onChange={(patch) => setIntake((current) => ({ ...current, ...patch }))}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Guardando…' : 'Registrar demanda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
