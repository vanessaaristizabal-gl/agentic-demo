import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';

/**
 * Cambia el idioma de toda la aplicación, incluidos los mensajes de las reglas:
 * el dominio devuelve claves, así que nada de lo que dice depende del idioma en
 * que se escribió.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? 'es';

  return (
    <Select value={current} onValueChange={(next) => void i18n.changeLanguage(next)}>
      <SelectTrigger className="h-9 w-auto gap-1.5 px-2.5" aria-label={t('nav.language')}>
        <Languages className="h-4 w-4 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {SUPPORTED_LANGUAGES.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
