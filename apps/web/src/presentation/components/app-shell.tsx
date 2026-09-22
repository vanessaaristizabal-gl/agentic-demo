import { Building2, Menu, RotateCcw, Users, Workflow } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useApiStatus } from '../hooks/use-api-status';
import { useResetWorkspace } from '../hooks/use-workspace';

const NAV = [
  { to: '/orquestacion', label: 'Orquestación', icon: Workflow },
  { to: '/ciclo', label: 'Ciclo del consultor', icon: Users },
  { to: '/equipos', label: 'Equipos', icon: Building2 },
];

function ModelBadge() {
  const { data } = useApiStatus();
  if (!data) return null;

  const label = !data.serverUp
    ? 'Servidor apagado'
    : data.modelConfigured
      ? 'Modelo configurado'
      : 'Sin clave: texto de reserva';

  const detail = !data.serverUp
    ? data.promptApiPresent
      ? 'La API no responde. «Redactar con IA» probará el modelo local del navegador y, si no está, usará el texto de reserva.'
      : 'La API no responde. «Redactar con IA» usará el texto de reserva y la aplicación seguirá funcionando igual.'
    : data.modelConfigured
      ? `El servidor tiene ANTHROPIC_API_KEY y usará ${data.model} para redactar la vacante.`
      : 'El servidor no tiene ANTHROPIC_API_KEY. «Redactar con IA» devolverá una descripción compuesta con los datos del perfil.';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={data.modelConfigured ? 'success' : 'warning'}
          className="cursor-help whitespace-nowrap font-normal"
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const reset = useResetWorkspace();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-[11px] font-semibold text-primary-foreground">
              CS
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Consultora</p>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                Simulador de operaciones
              </p>
            </div>
          </div>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-secondary font-medium text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <ModelBadge />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => reset.mutate()}
                  disabled={reset.isPending}
                  aria-label="Reiniciar datos"
                >
                  <RotateCcw className={cn('h-4 w-4', reset.isPending && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reiniciar datos: vuelve a dejar una solicitud parada en cada etapa.
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t px-4 py-2 md:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                    isActive
                      ? 'bg-secondary font-medium text-secondary-foreground'
                      : 'text-muted-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <div className="px-3 py-2 sm:hidden">
              <ModelBadge />
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
