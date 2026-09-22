import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Campo de formulario.
 *
 * `required` controla SOLO la marca visual, no la validación. Es deliberado:
 * hay un campo obligatorio que no lleva asterisco y que únicamente falla al
 * guardar. La validación de verdad vive en el motor de requisitos.
 */
export function Field({
  id,
  label,
  hint,
  required = false,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Grupo de opciones múltiples con aspecto de etiquetas. */
export function ChipGroup({
  options,
  selected,
  onToggle,
  emptyLabel,
  labelFor,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyLabel?: string;
  /** Los valores son identificadores estables; esto los convierte en texto. */
  labelFor?: (value: string) => string;
}) {
  if (options.length === 0 && emptyLabel) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option)}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {labelFor ? labelFor(option) : option}
          </button>
        );
      })}
    </div>
  );
}
