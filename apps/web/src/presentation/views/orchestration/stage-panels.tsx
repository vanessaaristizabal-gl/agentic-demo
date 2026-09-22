import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CONSULTANT_ROLES,
  CONTRACT_TYPES,
  ENGLISH_LEVELS,
  ONBOARDING_ACCESSES,
  SALARY_BANDS,
  SENIORITIES,
  SKILL_LIBRARY,
  VACANCY_CHANNELS,
  type Consultant,
  type StaffingRequest,
  type Team,
} from '@/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChipGroup, Field } from '@/presentation/components/field';
import type { RequestPatch } from '@/application/use-cases';

export interface PanelProps {
  request: StaffingRequest;
  teams: Team[];
  consultants: Consultant[];
  onPatch: (patch: RequestPatch) => void;
  onAssignTeam: (teamId: string) => void;
  onDraft: () => void;
  drafting: boolean;
}

/** Campo de texto que guarda al perder el foco, para no escribir en cada tecla. */
function DebouncedInput({
  id,
  value,
  onCommit,
  placeholder,
  type = 'text',
  disabled,
}: {
  id: string;
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Input
      id={id}
      type={type}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

function DebouncedTextarea({
  id,
  value,
  onCommit,
  placeholder,
  rows = 4,
}: {
  id: string;
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Textarea
      id={id}
      rows={rows}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
    />
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/* ---------------------------- Etapa 2 · Perfil --------------------------- */

export function ProfilePanel({ request, onPatch }: PanelProps) {
  const { profile } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="seniority" label="Seniority" required>
        <Select
          value={profile.seniority || undefined}
          onValueChange={(next) => onPatch({ profile: { seniority: next as never } })}
        >
          <SelectTrigger id="seniority">
            <SelectValue placeholder="Elige el seniority" />
          </SelectTrigger>
          <SelectContent>
            {SENIORITIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="consultantRole" label="Rol del consultor" required>
        <Select
          value={profile.consultantRole || undefined}
          onValueChange={(next) => onPatch({ profile: { consultantRole: next as never } })}
        >
          <SelectTrigger id="consultantRole">
            <SelectValue placeholder="Desarrollador, QA o Tech Manager" />
          </SelectTrigger>
          <SelectContent>
            {CONSULTANT_ROLES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="englishLevel" label="Nivel de inglés" required>
        <Select
          value={profile.englishLevel || undefined}
          onValueChange={(next) => onPatch({ profile: { englishLevel: next as never } })}
        >
          <SelectTrigger id="englishLevel">
            <SelectValue placeholder="Elige el nivel exigido" />
          </SelectTrigger>
          <SelectContent>
            {ENGLISH_LEVELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="skills"
        label={`Habilidades (${profile.skills.length} de 3 mínimas)`}
        required
        className="sm:col-span-2"
      >
        <ChipGroup
          options={SKILL_LIBRARY}
          selected={profile.skills}
          onToggle={(value) => onPatch({ profile: { skills: toggle(profile.skills, value) } })}
        />
      </Field>

      <Field id="profileNotes" label="Notas del arquitecto" className="sm:col-span-2">
        <DebouncedTextarea
          id="profileNotes"
          rows={2}
          value={profile.notes}
          placeholder="Condiciones del cliente, restricciones, contexto técnico"
          onCommit={(next) => onPatch({ profile: { notes: next } })}
        />
      </Field>
    </div>
  );
}

/* ---------------------------- Etapa 3 · Equipo --------------------------- */

export function TeamPanel({ request, teams, onPatch, onAssignTeam }: PanelProps) {
  const { assignment } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id="teamId"
        label="Equipo"
        required
        className="sm:col-span-2"
        hint="Al elegir equipo se abre la posición. La dedicación se fija después, en la vista Equipos."
      >
        <Select value={assignment.teamId || undefined} onValueChange={onAssignTeam}>
          <SelectTrigger id="teamId">
            <SelectValue placeholder="Elige el equipo que recibe la solicitud" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} · {team.clientName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="joinDate" label="Fecha de incorporación al equipo" required>
        <DebouncedInput
          id="joinDate"
          type="date"
          value={assignment.joinDate}
          onCommit={(next) => onPatch({ assignment: { joinDate: next } })}
        />
      </Field>

      <Field
        id="technicalReferent"
        label="Referente técnico"
        required
        hint="Quien acompaña al consultor durante el ramp-up."
      >
        <DebouncedInput
          id="technicalReferent"
          value={assignment.technicalReferent}
          placeholder="Nombre de la persona del equipo"
          onCommit={(next) => onPatch({ assignment: { technicalReferent: next } })}
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        La dedicación de esta posición no se decide aquí. Se fija en la vista{' '}
        <Link to="/equipos" className="font-medium text-foreground underline underline-offset-2">
          Equipos
        </Link>
        , y sin ella la solicitud no podrá cerrarse en la última etapa.
      </div>
    </div>
  );
}

/* --------------------------- Etapa 4 · Vacante --------------------------- */

export function VacancyPanel({ request, onPatch, onDraft, drafting }: PanelProps) {
  const { vacancy } = request;
  const length = vacancy.jobDescription.trim().length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vacancyTitle" label="Título de la vacante" required>
          <DebouncedInput
            id="vacancyTitle"
            value={vacancy.title}
            placeholder="Desarrollador Senior React — Cliente"
            onCommit={(next) => onPatch({ vacancy: { title: next } })}
          />
        </Field>

        <Field id="salaryBand" label="Banda salarial" required>
          <Select
            value={vacancy.salaryBand || undefined}
            onValueChange={(next) => onPatch({ vacancy: { salaryBand: next } })}
          >
            <SelectTrigger id="salaryBand">
              <SelectValue placeholder="Elige la banda" />
            </SelectTrigger>
            <SelectContent>
              {SALARY_BANDS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="jobDescription"
        label="Descripción del puesto"
        required
        hint={
          <span>
            {length} de 120 caracteres mínimos.
            {vacancy.draftSource === 'anthropic' ? ' Último borrador generado con el modelo del servidor.' : null}
            {vacancy.draftSource === 'gemini-nano' ? ' Último borrador generado con el modelo local del navegador.' : null}
            {vacancy.draftSource === 'reserva' ? ' Último borrador compuesto con el texto de reserva.' : null}
          </span>
        }
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Se genera a partir del perfil técnico ya definido.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onDraft} disabled={drafting}>
              <Sparkles className={drafting ? 'animate-pulse' : undefined} />
              {drafting ? 'Redactando…' : 'Redactar con IA'}
            </Button>
          </div>
          <DebouncedTextarea
            id="jobDescription"
            rows={10}
            value={vacancy.jobDescription}
            placeholder="Escríbela a mano o pulsa «Redactar con IA»"
            onCommit={(next) => onPatch({ vacancy: { jobDescription: next, draftSource: 'manual' } })}
          />
        </div>
      </Field>

      <Field id="channels" label="Canales de publicación" required>
        <ChipGroup
          options={VACANCY_CHANNELS}
          selected={vacancy.channels}
          onToggle={(value) => onPatch({ vacancy: { channels: toggle(vacancy.channels, value) } })}
        />
      </Field>
    </div>
  );
}

/* -------------------------- Etapa 5 · Entrevista ------------------------- */

const DECISIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'segunda-ronda', label: 'Segunda ronda' },
  { value: 'contratar', label: 'Contratar' },
  { value: 'descartar', label: 'Descartar' },
];

export function InterviewPanel({ request, onPatch }: PanelProps) {
  const { interview } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="candidateName" label="Candidato" required>
        <DebouncedInput
          id="candidateName"
          value={interview.candidateName}
          placeholder="Nombre y apellidos"
          onCommit={(next) => onPatch({ interview: { candidateName: next } })}
        />
      </Field>

      <Field id="technicalScore" label="Puntuación técnica" required hint="De 0 a 10. Se contrata desde 7.">
        <DebouncedInput
          id="technicalScore"
          type="number"
          value={interview.technicalScore === null ? '' : String(interview.technicalScore)}
          onCommit={(next) =>
            onPatch({
              interview: { technicalScore: next === '' ? null : Number(next) },
            })
          }
        />
      </Field>

      <Field id="decision" label="Decisión" required className="sm:col-span-2">
        <Select
          value={interview.decision}
          onValueChange={(next) => onPatch({ interview: { decision: next as never } })}
        >
          <SelectTrigger id="decision">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DECISIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="feedback"
        label="Feedback de la entrevista"
        required
        className="sm:col-span-2"
        hint={`${interview.feedback.trim().length} de 40 caracteres mínimos.`}
      >
        <DebouncedTextarea
          id="feedback"
          rows={4}
          value={interview.feedback}
          placeholder="En qué se basó la decisión"
          onCommit={(next) => onPatch({ interview: { feedback: next } })}
        />
      </Field>
    </div>
  );
}

/* -------------------------- Etapa 6 · Onboarding ------------------------- */

export function OnboardingPanel({ request, onPatch }: PanelProps) {
  const { onboarding } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="contractType" label="Tipo de contrato" required>
        <Select
          value={onboarding.contractType || undefined}
          onValueChange={(next) => onPatch({ onboarding: { contractType: next as never } })}
        >
          <SelectTrigger id="contractType">
            <SelectValue placeholder="Elige el contrato" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="startDate" label="Fecha de alta" required>
        <DebouncedInput
          id="startDate"
          type="date"
          value={onboarding.startDate}
          onCommit={(next) => onPatch({ onboarding: { startDate: next } })}
        />
      </Field>

      <Field id="buddyName" label="Buddy" required>
        <DebouncedInput
          id="buddyName"
          value={onboarding.buddyName}
          placeholder="Quien lo acompaña las dos primeras semanas"
          onCommit={(next) => onPatch({ onboarding: { buddyName: next } })}
        />
      </Field>

      <div className="flex items-end">
        <label className="flex w-full items-center justify-between gap-3 rounded-md border p-3">
          <span className="text-sm font-medium">Equipo de trabajo entregado</span>
          <Switch
            checked={onboarding.equipmentDelivered}
            onCheckedChange={(checked) => onPatch({ onboarding: { equipmentDelivered: checked } })}
          />
        </label>
      </div>

      <Field
        id="accesses"
        label={`Accesos (${onboarding.accesses.length} de 3 mínimos)`}
        required
        className="sm:col-span-2"
      >
        <ChipGroup
          options={ONBOARDING_ACCESSES}
          selected={onboarding.accesses}
          onToggle={(value) =>
            onPatch({ onboarding: { accesses: toggle(onboarding.accesses, value) } })
          }
        />
      </Field>
    </div>
  );
}

/* ---------------------------- Etapa 7 · Activo --------------------------- */

export function ActivePanel({ request, teams, consultants }: PanelProps) {
  const team = teams.find((candidate) => candidate.id === request.assignment.teamId);
  const consultant = consultants.find((candidate) => candidate.id === request.consultantId);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/40 p-4">
        <p className="text-sm leading-relaxed">
          {consultant ? (
            <>
              <span className="font-medium">{consultant.name}</span> está trabajando en{' '}
              <span className="font-medium">{team?.name ?? 'su equipo'}</span>. El flujo de la
              solicitud terminó aquí; a partir de ahora lo que avanza es el ciclo de vida de la
              persona.
            </>
          ) : (
            <>La solicitud está cerrada y el consultor figura activo en {team?.name ?? 'su equipo'}.</>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success" className="font-normal">
            Solicitud cerrada
          </Badge>
          {consultant ? (
            <Link
              to="/ciclo"
              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              Ver su ciclo
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
