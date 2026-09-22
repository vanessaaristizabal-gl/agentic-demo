import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  composeIntakeReport,
  createRequest,
  emptyIntake,
  evaluate,
  type BlockingReport,
  type RequestIntake,
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
import { useCreateRequest } from '@/presentation/hooks/use-workspace';
import { IntakeForm } from './intake-form';

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const [intake, setIntake] = useState<RequestIntake>(emptyIntake);
  const [report, setReport] = useState<BlockingReport | null>(null);
  const create = useCreateRequest();

  const reset = () => {
    setIntake(emptyIntake());
    setReport(null);
  };

  const submit = () => {
    // Se valida con el mismo motor que usa el flujo: los requisitos de la
    // etapa Registro. Si falta algo, se dice todo de una vez.
    const provisional = createRequest({
      id: 'provisional',
      code: 'provisional',
      now: new Date().toISOString(),
      intake,
    });
    const missing = evaluate({ request: provisional, teams: [], positions: [] }, 'registro').filter(
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
          Nueva solicitud
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar una solicitud</DialogTitle>
          <DialogDescription>
            Sales recoge la necesidad del cliente. La solicitud entra en la etapa Registro y no avanza
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
            {create.isPending ? 'Guardando…' : 'Registrar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
