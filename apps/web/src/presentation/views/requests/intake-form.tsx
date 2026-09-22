import { useTranslation } from 'react-i18next';
import {
  BILLING_MODELS,
  catalogKey,
  PRACTICES,
  PRIORITIES,
  stacksFor,
  type PracticeId,
  type RequestIntake,
} from '@/domain';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/presentation/components/field';

/**
 * Formulario de la solicitud: ocho campos, tres obligatorios.
 *
 * Dos detalles deliberados:
 *
 * - «Centro de costo» es obligatorio y NO lleva asterisco. Solo falla al
 *   guardar, con el resto de lo que falte, en un único mensaje.
 * - «Stack tecnológico» depende de «Práctica»: sin práctica no hay opciones,
 *   y cambiar de práctica vacía el stack elegido.
 */
export function IntakeForm({
  value,
  onChange,
  disabled = false,
}: {
  value: RequestIntake;
  onChange: (patch: Partial<RequestIntake>) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const stacks = stacksFor(value.practice);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="clientName" label={t('form.client')} required className="sm:col-span-2">
        <Input
          id="clientName"
          value={value.clientName}
          disabled={disabled}
          placeholder={t('form.clientPlaceholder')}
          onChange={(event) => onChange({ clientName: event.target.value })}
        />
      </Field>

      <Field id="practice" label={t('form.practice')} required hint={t('form.practiceHint')}>
        <Select
          value={value.practice || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ practice: next as PracticeId, stack: '' })}
        >
          <SelectTrigger id="practice">
            <SelectValue placeholder={t('form.practicePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {PRACTICES.map((practice) => (
              <SelectItem key={practice} value={practice}>
                {t(catalogKey('practices', practice))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="stack"
        label={t('form.stack')}
        hint={value.practice ? t('form.stackHintReady') : t('form.stackHintBlocked')}
      >
        <Select
          value={value.stack || undefined}
          disabled={disabled || !value.practice}
          onValueChange={(next) => onChange({ stack: next })}
        >
          <SelectTrigger id="stack">
            <SelectValue
              placeholder={value.practice ? t('form.stackPlaceholder') : t('form.stackBlocked')}
            />
          </SelectTrigger>
          <SelectContent>
            {stacks.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Obligatorio, pero sin asterisco. El fallo aparece al guardar. */}
      <Field id="costCenter" label={t('form.costCenter')}>
        <Input
          id="costCenter"
          value={value.costCenter}
          disabled={disabled}
          placeholder="CC-0000"
          onChange={(event) => onChange({ costCenter: event.target.value })}
        />
      </Field>

      <Field id="expectedStart" label={t('form.expectedStart')}>
        <Input
          id="expectedStart"
          type="date"
          value={value.expectedStart}
          disabled={disabled}
          onChange={(event) => onChange({ expectedStart: event.target.value })}
        />
      </Field>

      <Field id="billingModel" label={t('form.billingModel')}>
        <Select
          value={value.billingModel || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ billingModel: next as RequestIntake['billingModel'] })}
        >
          <SelectTrigger id="billingModel">
            <SelectValue placeholder={t('form.undefined')} />
          </SelectTrigger>
          <SelectContent>
            {BILLING_MODELS.map((model) => (
              <SelectItem key={model} value={model}>
                {t(catalogKey('billing', model))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="priority" label={t('form.priority')}>
        <Select
          value={value.priority || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ priority: next as RequestIntake['priority'] })}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder={t('form.undefined')} />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {t(catalogKey('priorities', priority))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="description"
        label={t('form.description')}
        className="sm:col-span-2"
        hint={t('form.descriptionHint')}
      >
        <Textarea
          id="description"
          rows={3}
          value={value.description}
          disabled={disabled}
          placeholder={t('form.descriptionPlaceholder')}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </Field>
    </div>
  );
}
