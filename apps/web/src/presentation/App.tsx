import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from './components/app-shell';
import { Toaster } from './components/toaster';
import { ConsultantView } from './views/consultant/consultant-view';
import { RequestsView } from './views/requests/requests-view';
import { TeamsView } from './views/teams/teams-view';

export function App() {
  const { t, i18n } = useTranslation();

  // El título de la pestaña y el atributo lang del documento siguen al idioma.
  useEffect(() => {
    document.title = t('app.title');
    document.documentElement.lang = i18n.resolvedLanguage ?? 'es';
  }, [t, i18n.resolvedLanguage]);

  return (
    <TooltipProvider delayDuration={200}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/solicitudes" replace />} />
          <Route path="/solicitudes" element={<RequestsView />} />
          <Route path="/ciclo" element={<ConsultantView />} />
          <Route path="/equipos" element={<TeamsView />} />
          <Route path="*" element={<Navigate to="/solicitudes" replace />} />
        </Routes>
      </AppShell>
      <Toaster />
    </TooltipProvider>
  );
}
