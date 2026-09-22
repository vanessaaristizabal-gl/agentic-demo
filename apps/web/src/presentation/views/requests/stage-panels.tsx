import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  catalogKey,
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
  const { t } = useTranslation();
  const { profile } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="seniority" label={t('form.seniority')} required>
        <Select
          value={profile.seniority || undefined}
          onValueChange={(next) => onPatch({ profile: { seniority: next as never } })}
        >
          <SelectTrigger id="seniority">
            <SelectValue placeholder={t('form.seniorityPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {SENIORITIES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(catalogKey('seniorities', option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="consultantRole" label={t('form.consultantRole')} required>
        <Select
          value={profile.consultantRole || undefined}
          onValueChange={(next) => onPatch({ profile: { consultantRole: next as never } })}
        >
          <SelectTrigger id="consultantRole">
            <SelectValue placeholder={t('form.consultantRolePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {CONSULTANT_ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(catalogKey('roles', option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="englishLevel" label={t('form.englishLevel')} required>
        <Select
          value={profile.englishLevel || undefined}
          onValueChange={(next) => onPatch({ profile: { englishLevel: next as never } })}
        >
          <SelectTrigger id="englishLevel">
            <SelectValue placeholder={t('form.englishPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {ENGLISH_LEVELS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(catalogKey('english', option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="skills"
        label={t('form.skills', { count: profile.skills.length })}
        required
        className="sm:col-span-2"
      >
        <ChipGroup
          options={[...SKILL_LIBRARY]}
          labelFor={(value) => t(catalogKey('skills', value))}
          selected={profile.skills}
          onToggle={(value) => onPatch({ profile: { skills: toggle(profile.skills, value) } })}
        />
      </Field>

      <Field id="profileNotes" label={t('form.profileNotes')} className="sm:col-span-2">
        <DebouncedTextarea
          id="profileNotes"
          rows={2}
          value={profile.notes}
          placeholder={t('form.profileNotesPlaceholder')}
          onCommit={(next) => onPatch({ profile: { notes: next } })}
        />
      </Field>
    </div>
  );
}

/* ---------------------------- Etapa 3 · Equipo --------------------------- */

export function TeamPanel({ request, teams, onPatch, onAssignTeam }: PanelProps) {
  const { t } = useTranslation();
  const { assignment } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        id="teamId"
        label={t('form.team')}
        required
        className="sm:col-span-2"
        hint={t('form.teamHint')}
      >
        <Select value={assignment.teamId || undefined} onValueChange={onAssignTeam}>
          <SelectTrigger id="teamId">
            <SelectValue placeholder={t('form.teamPlaceholder')} />
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

      <Field id="joinDate" label={t('form.joinDate')} required>
        <DebouncedInput
          id="joinDate"
          type="date"
          value={assignment.joinDate}
          onCommit={(next) => onPatch({ assignment: { joinDate: next } })}
        />
      </Field>

      <Field
        id="technicalReferent"
        label={t('form.technicalReferent')}
        required
        hint={t('form.technicalReferentHint')}
      >
        <DebouncedInput
          id="technicalReferent"
          value={assignment.technicalReferent}
          placeholder={t('form.technicalReferentPlaceholder')}
          onCommit={(next) => onPatch({ assignment: { technicalReferent: next } })}
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <Trans
          i18nKey="form.allocationNotice"
          components={[
            <Link
              key="teams"
              to="/equipos"
              className="font-medium text-foreground underline underline-offset-2"
            />,
          ]}
        />
      </div>
    </div>
  );
}

/* --------------------------- Etapa 4 · Vacante --------------------------- */

export function VacancyPanel({ request, onPatch, onDraft, drafting }: PanelProps) {
  const { t } = useTranslation();
  const { vacancy } = request;
  const length = vacancy.jobDescription.trim().length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="vacancyTitle" label={t('form.vacancyTitle')} required>
          <DebouncedInput
            id="vacancyTitle"
            value={vacancy.title}
            placeholder={t('form.vacancyTitlePlaceholder')}
            onCommit={(next) => onPatch({ vacancy: { title: next } })}
          />
        </Field>

        <Field id="salaryBand" label={t('form.salaryBand')} required>
          <Select
            value={vacancy.salaryBand || undefined}
            onValueChange={(next) => onPatch({ vacancy: { salaryBand: next } })}
          >
            <SelectTrigger id="salaryBand">
              <SelectValue placeholder={t('form.salaryBandPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SALARY_BANDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(catalogKey('salaryBands', option))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        id="jobDescription"
        label={t('form.jobDescription')}
        required
        hint={
          <span>
            {t('form.jobDescriptionHint', { count: length })}
            {vacancy.draftSource && vacancy.draftSource !== 'manual'
              ? ` ${t(`form.jobDescriptionSource.${vacancy.draftSource}`)}`
              : null}
          </span>
        }
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t('form.draftFrom')}</p>
            <Button type="button" variant="outline" size="sm" onClick={onDraft} disabled={drafting}>
              <Sparkles className={drafting ? 'animate-pulse' : undefined} />
              {drafting ? t('form.drafting') : t('form.draftWithAi')}
            </Button>
          </div>
          <DebouncedTextarea
            id="jobDescription"
            rows={10}
            value={vacancy.jobDescription}
            placeholder={t('form.jobDescriptionPlaceholder')}
            onCommit={(next) => onPatch({ vacancy: { jobDescription: next, draftSource: 'manual' } })}
          />
        </div>
      </Field>

      <Field id="channels" label={t('form.channels')} required>
        <ChipGroup
          options={[...VACANCY_CHANNELS]}
          labelFor={(value) => t(catalogKey('channels', value))}
          selected={vacancy.channels}
          onToggle={(value) => onPatch({ vacancy: { channels: toggle(vacancy.channels, value) } })}
        />
      </Field>
    </div>
  );
}

/* -------------------------- Etapa 5 · Entrevista ------------------------- */

const DECISIONS = ['pendiente', 'segunda-ronda', 'contratar', 'descartar'] as const;

export function InterviewPanel({ request, onPatch }: PanelProps) {
  const { t } = useTranslation();
  const { interview } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="candidateName" label={t('form.candidate')} required>
        <DebouncedInput
          id="candidateName"
          value={interview.candidateName}
          placeholder={t('form.candidatePlaceholder')}
          onCommit={(next) => onPatch({ interview: { candidateName: next } })}
        />
      </Field>

      <Field
        id="technicalScore"
        label={t('form.technicalScore')}
        required
        hint={t('form.technicalScoreHint')}
      >
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

      <Field id="decision" label={t('form.decision')} required className="sm:col-span-2">
        <Select
          value={interview.decision}
          onValueChange={(next) => onPatch({ interview: { decision: next as never } })}
        >
          <SelectTrigger id="decision">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DECISIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(catalogKey('decisions', option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        id="feedback"
        label={t('form.feedback')}
        required
        className="sm:col-span-2"
        hint={t('form.feedbackHint', { count: interview.feedback.trim().length })}
      >
        <DebouncedTextarea
          id="feedback"
          rows={4}
          value={interview.feedback}
          placeholder={t('form.feedbackPlaceholder')}
          onCommit={(next) => onPatch({ interview: { feedback: next } })}
        />
      </Field>
    </div>
  );
}

/* -------------------------- Etapa 6 · Onboarding ------------------------- */

export function OnboardingPanel({ request, onPatch }: PanelProps) {
  const { t } = useTranslation();
  const { onboarding } = request;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="contractType" label={t('form.contractType')} required>
        <Select
          value={onboarding.contractType || undefined}
          onValueChange={(next) => onPatch({ onboarding: { contractType: next as never } })}
        >
          <SelectTrigger id="contractType">
            <SelectValue placeholder={t('form.contractTypePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {t(catalogKey('contracts', option))}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field id="startDate" label={t('form.startDate')} required>
        <DebouncedInput
          id="startDate"
          type="date"
          value={onboarding.startDate}
          onCommit={(next) => onPatch({ onboarding: { startDate: next } })}
        />
      </Field>

      <Field id="buddyName" label={t('form.buddy')} required>
        <DebouncedInput
          id="buddyName"
          value={onboarding.buddyName}
          placeholder={t('form.buddyPlaceholder')}
          onCommit={(next) => onPatch({ onboarding: { buddyName: next } })}
        />
      </Field>

      <div className="flex items-end">
        <label className="flex w-full items-center justify-between gap-3 rounded-md border p-3">
          <span className="text-sm font-medium">{t('form.equipmentDelivered')}</span>
          <Switch
            checked={onboarding.equipmentDelivered}
            onCheckedChange={(checked) => onPatch({ onboarding: { equipmentDelivered: checked } })}
          />
        </label>
      </div>

      <Field
        id="accesses"
        label={t('form.accesses', { count: onboarding.accesses.length })}
        required
        className="sm:col-span-2"
      >
        <ChipGroup
          options={[...ONBOARDING_ACCESSES]}
          labelFor={(value) => t(catalogKey('accesses', value))}
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
  const { t } = useTranslation();
  const team = teams.find((candidate) => candidate.id === request.assignment.teamId);
  const consultant = consultants.find((candidate) => candidate.id === request.consultantId);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/40 p-4">
        <p className="text-sm leading-relaxed">
          {consultant ? (
            <Trans
              i18nKey="form.activeSummary"
              values={{ name: consultant.name, team: team?.name ?? '' }}
              components={[<span key="n" className="font-medium" />, <span key="t" className="font-medium" />]}
            />
          ) : (
            t('form.activeSummaryNoConsultant', { team: team?.name ?? '' })
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success" className="font-normal">
            {t('form.closedBadge')}
          </Badge>
          {consultant ? (
            <Link
              to="/ciclo"
              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              {t('form.seeCycle')}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
