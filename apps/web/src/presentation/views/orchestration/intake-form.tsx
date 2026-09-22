import {
  BILLING_MODELS,
  PRACTICES,
  PRIORITIES,
  stacksFor,
  type RequestIntake,
  type PracticeId,
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
  const stacks = stacksFor(value.practice);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="clientName" label="Cliente" required className="sm:col-span-2">
        <Input
          id="clientName"
          value={value.clientName}
          disabled={disabled}
          placeholder="Nombre de la empresa que hace la petición"
          onChange={(event) => onChange({ clientName: event.target.value })}
        />
      </Field>

      <Field
        id="practice"
        label="Práctica"
        required
        hint="Determina qué stacks se pueden elegir en el campo siguiente."
      >
        <Select
          value={value.practice || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ practice: next as PracticeId, stack: '' })}
        >
          <SelectTrigger id="practice">
            <SelectValue placeholder="Elige una práctica" />
          </SelectTrigger>
          <SelectContent>
            {PRACTICES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="stack"
        label="Stack tecnológico"
        hint={
          value.practice
            ? 'Solo se ofrecen los stacks de la práctica elegida.'
            : 'Elige antes una práctica: sus opciones dependen de ella.'
        }
      >
        <Select
          value={value.stack || undefined}
          disabled={disabled || !value.practice}
          onValueChange={(next) => onChange({ stack: next })}
        >
          <SelectTrigger id="stack">
            <SelectValue
              placeholder={value.practice ? 'Elige un stack' : 'Bloqueado hasta elegir práctica'}
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
      <Field id="costCenter" label="Centro de costo">
        <Input
          id="costCenter"
          value={value.costCenter}
          disabled={disabled}
          placeholder="CC-0000"
          onChange={(event) => onChange({ costCenter: event.target.value })}
        />
      </Field>

      <Field id="expectedStart" label="Fecha estimada de inicio">
        <Input
          id="expectedStart"
          type="date"
          value={value.expectedStart}
          disabled={disabled}
          onChange={(event) => onChange({ expectedStart: event.target.value })}
        />
      </Field>

      <Field id="billingModel" label="Modelo de facturación">
        <Select
          value={value.billingModel || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ billingModel: next as RequestIntake['billingModel'] })}
        >
          <SelectTrigger id="billingModel">
            <SelectValue placeholder="Sin definir" />
          </SelectTrigger>
          <SelectContent>
            {BILLING_MODELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="priority" label="Prioridad">
        <Select
          value={value.priority || undefined}
          disabled={disabled}
          onValueChange={(next) => onChange({ priority: next as RequestIntake['priority'] })}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="Sin definir" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="description"
        label="Descripción de la necesidad"
        className="sm:col-span-2"
        hint="Lo que contó el cliente, en sus palabras. Se usa después para redactar la vacante."
      >
        <Textarea
          id="description"
          rows={3}
          value={value.description}
          disabled={disabled}
          placeholder="Qué problema tiene el cliente y qué espera de nosotros"
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </Field>
    </div>
  );
}
