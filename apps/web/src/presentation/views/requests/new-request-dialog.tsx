import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          {t('requests.new')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('requests.create.title')}</DialogTitle>
          <DialogDescription>{t('requests.create.description')}</DialogDescription>
        </DialogHeader>

        {report ? <BlockingAlert report={report} /> : null}

        <IntakeForm
          value={intake}
          onChange={(patch) => setIntake((current) => ({ ...current, ...patch }))}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? t('common.saving') : t('requests.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
