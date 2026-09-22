# Consultora · Simulador de operaciones

Simulador de las operaciones de una consultora de software: cómo una necesidad de un cliente
recorre los distintos roles de la empresa hasta que hay una persona trabajando en un equipo.

No hay login. Todo el estado vive en el navegador, en IndexedDB.

---

## Cómo levantarla

```bash
npm install
npm run dev
```

- Interfaz: <http://localhost:5173>
- API: <http://localhost:3001/api>

`npm run dev` levanta a la vez el servidor NestJS y el servidor de desarrollo de Vite, que
redirige `/api` al primero. Hace falta Node 20 o superior.

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila el servidor y la interfaz para producción |
| `npm test` | Ejecuta las pruebas de las reglas del flujo |
| `npm run typecheck` | Comprueba los tipos de los dos paquetes |

---

## Los siete roles y las siete etapas

Una **demanda** avanza por siete etapas. Cada una tiene un rol responsable, y **el usuario la
avanza explícitamente**: nada se mueve solo.

| # | Etapa | Responsable | Qué hace |
| --- | --- | --- | --- |
| 1 | `demanda` | Sales | Registra la necesidad del cliente |
| 2 | `perfil` | Solution Architect | Define el perfil técnico |
| 3 | `equipo` | Delivery Manager | Asigna la demanda a un equipo y abre la posición |
| 4 | `vacante` | Recruiter | Publica la vacante |
| 5 | `entrevista` | Engineering Manager | Evalúa al candidato y decide |
| 6 | `onboarding` | Recursos Humanos | Gestiona contrato, equipo y accesos |
| 7 | `activo` | Consultor | Queda trabajando en el equipo |

El consultor puede ser desarrollador, QA o tech manager.

---

## Qué hace cada vista

### Orquestación

La vista principal. Arriba, los siete roles como agentes del sistema: cada uno con su bandeja,
cuántas demandas esperan por él y cuántas de ellas no podrían avanzar hoy. Debajo, un tablero con
las demandas repartidas por etapa.

Al abrir una demanda se ve la etapa en la que está parada, el formulario de su responsable y la
lista completa de **requisitos acumulados**, con la etapa que introdujo cada uno. Abajo del todo,
la **traza de orquestación**: qué agente entregó qué a quién, cuándo y con qué comprobaciones.

### Ciclo del consultor

Se elige una persona y se ve su recorrido completo después de la demanda: onboarding, ramp-up,
productivo, evaluación y salida o rotación. Cada fase dice qué exigió y en qué fecha se cumplió
cada exigencia. El ciclo también se avanza a mano, fase a fase.

### Equipos

La vista del Delivery Manager: los equipos con sus posiciones cubiertas y abiertas, la dedicación
de cada persona, la capacidad comprometida y dónde queda hueco.

**Aquí se fija la dedicación de cada posición**, y no en la demanda. Es una de las condiciones que
bloquean el cierre de la última etapa.

---

## Reglas deliberadas

Estas reglas existen a propósito. No son descuidos:

- **El formulario de la demanda tiene ocho campos y tres obligatorios.**
- **Un campo obligatorio no lleva marca visual.** «Centro de costo» es obligatorio, no tiene
  asterisco y solo falla al guardar.
- **Las opciones de un campo dependen de otro.** «Stack tecnológico» solo ofrece los stacks de la
  práctica elegida; sin práctica está bloqueado, y cambiar de práctica vacía el stack.
- **Los requisitos se acumulan.** Para salir de una etapa se reevalúan los requisitos de todas las
  anteriores. La etapa 5 sigue exigiendo lo que pidió la 3: si el referente técnico se borra, la
  entrevista no pasa a Recursos Humanos.
- **La última etapa se bloquea hasta cumplir varias condiciones, y una se configura en otra
  pantalla.** Para llegar a `activo` hacen falta contrato, equipo entregado, tres accesos, buddy,
  dedicación fijada y capacidad del equipo respetada. Las dos últimas se resuelven en la vista
  Equipos.
- **Los mensajes de error nombran todo lo que falta de una vez**, en un solo mensaje, con frases
  completas que dicen qué falta, por qué se pide y dónde se arregla.

Los datos de arranque dejan una demanda parada en cada etapa, cada una tropezando con una regla
distinta. El botón de reinicio de la cabecera vuelve a ese punto de partida.

---

## La única llamada a un modelo

Todo el flujo es determinista salvo un punto: en la etapa `vacante`, el botón **«Redactar con IA»**
genera la descripción del puesto a partir del perfil técnico ya definido.

La llamada **va siempre por el servidor**: `POST /api/draft`. El navegador nunca ve la clave.

1. Copia `.env.example` a `.env` en la raíz del repositorio y pon tu clave:

   ```bash
   cp .env.example .env
   ```

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. El servidor usa el modelo `claude-sonnet-5` (configurable con `ANTHROPIC_MODEL`).

`.env` está en `.gitignore`. **La clave nunca se commitea.**

### Qué pasa si no hay API key

**Nada se rompe.** Es la garantía principal de esta aplicación, pensada para usarse en vivo:

- **Sin `ANTHROPIC_API_KEY`**, el servidor no intenta la llamada y devuelve una descripción de
  puesto compuesta con los datos del perfil: cliente, práctica, stack, seniority, habilidades y
  nivel de inglés. Es un texto utilizable, no un mensaje de error, y siempre supera el mínimo de
  120 caracteres que exige publicar la vacante.
- **Si la llamada falla** —clave rechazada, límite de peticiones, proveedor caído o más de 20
  segundos sin respuesta— se devuelve ese mismo texto de reserva.
- **Si el servidor no responde** (por ejemplo, con la interfaz publicada sin backend), el navegador
  intenta la Prompt API local de Gemini Nano si está disponible y, si tampoco lo está, compone la
  reserva en el cliente.

En los tres casos el endpoint responde `200`, la interfaz dice de dónde salió el texto y el flujo
continúa con normalidad. La insignia de la cabecera avisa del estado antes de pulsar el botón.

---

## Arquitectura

```
agentic-demo/
├─ apps/
│  ├─ api/                     Servidor NestJS: el único punto que habla con un modelo
│  │  └─ src/draft/
│  │     ├─ draft.controller.ts   POST /api/draft
│  │     ├─ draft.service.ts      Orquesta modelo y reserva; nunca lanza
│  │     ├─ ports/                Interfaz del generador
│  │     └─ providers/            Anthropic y escritor de reserva
│  └─ web/
│     └─ src/
│        ├─ domain/            Entidades y reglas puras. No importa React ni Dexie
│        ├─ application/       Puertos y casos de uso
│        ├─ infrastructure/    Dexie, cliente HTTP, Prompt API, contenedor
│        ├─ presentation/      Vistas y componentes React
│        ├─ components/ui/     shadcn/ui
│        └─ store/             Redux Toolkit (estado de interfaz)
```

Las dependencias apuntan siempre hacia dentro: la presentación depende de la aplicación, la
aplicación de los puertos y del dominio, y el dominio no depende de nadie.

### El sistema multiagente

Cada rol se modela como un agente con bandeja, capacidades declaradas, una etapa de la que es
responsable y un único destinatario al que entrega el trabajo. El orquestador
(`domain/orchestrator.ts`) es una función pura que, dada una demanda:

- decide qué agente la tiene,
- evalúa los requisitos acumulados,
- deja avanzar o devuelve el informe con todo lo que falta,
- y registra la entrega en la traza.

Seis agentes son deterministas. Solo el Recruiter puede apoyarse en un modelo de lenguaje, y
únicamente para redactar la descripción del puesto.

### Tecnologías

React 19, TypeScript, Vite, Tailwind CSS y [shadcn/ui](https://ui.shadcn.com/) en la interfaz.
TanStack Query sirve los datos desde IndexedDB (vía Dexie) y Redux Toolkit sostiene el estado de
interfaz. NestJS en el servidor. Se usa IndexedDB y no `localStorage` ni `sessionStorage` porque
los datos son estructurados, se consultan por índice y deben sobrevivir al cierre de la pestaña.

---

## Pruebas

```bash
npm test
```

Cubren la acumulación de requisitos, el campo obligatorio sin marca visual, el bloqueo por
dedicación, el exceso de capacidad del equipo y el recorrido completo de las siete etapas hasta
`activo`.
