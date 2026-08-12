# Análisis Forense — rutas-soporte-ti (AMAIA)
**Fecha:** 2026-08-12
**Repositorio:** https://github.com/robertomistatas/rutas-soporte-ti (público)
**Rama analizada:** `main` @ `84c254b`

Este documento es el punto de partida para cualquier desarrollador (o para el propio Roberto) que retome el proyecto. Resume el stack, la arquitectura, y — lo más importante — los hallazgos de seguridad, bugs y deuda técnica encontrados, priorizados por urgencia.

---

## 1. Resumen ejecutivo

AMAIA es una SPA en React + TypeScript + Firebase para gestionar "tickets" de soporte técnico (instalaciones/mantenciones de GPS/apps para adultos mayores), con calendario, reportes en PDF y un módulo de importación de Excel.

Es un primer proyecto y se nota: la lógica de negocio funciona razonablemente bien, pero hay **un hallazgo crítico de seguridad que debe resolverse antes de seguir agregando features**: cualquier persona en internet puede auto-registrarse en la app y acceder a datos personales de beneficiarios (nombre, RUT, teléfono, dirección).

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 2 |
| 🟠 Alto | 4 |
| 🟡 Medio | 6 |
| 🟢 Bajo / limpieza | 7 |

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript | 4.9.5 |
| Framework UI | React (Create React App / `react-scripts`) | React 18.3.1 / react-scripts 5.0.1 |
| Estilos | Tailwind CSS | 3.4.17 |
| Backend / Datos | Firebase (Auth + Firestore + Analytics) | SDK 10.14.1 |
| Animaciones | framer-motion | 12.18.1 |
| Iconos | lucide-react | 0.259.0 |
| PDF | jsPDF + jspdf-autotable + html2pdf.js | 3.0.1 / 5.0.2 / 0.10.3 |
| Excel | xlsx (SheetJS) | 0.18.5 |
| Hosting | GitHub Pages (vía `gh-pages`) | — |
| Node instalado en la máquina | v24.13.0 / npm 11.6.2 | — |

No hay backend propio: todo corre en el navegador y habla directo con Firebase (Auth para login, Firestore para los tickets "oficiales", `localStorage` para el módulo AMAIA de Excel).

### 2.1 Estructura del proyecto

```
src/
  App.tsx                 (1160 líneas — "God file": Sidebar, Header, TicketForm,
                            TicketCard, TicketsListView, DashboardView, CalendarView
                            y el componente App, todo en un solo archivo)
  LoginPage.tsx            Login + registro de usuarios (Firebase Auth)
  firebase.ts               Config e inicialización de Firebase
  components/
    AmaiaTicketsView.tsx    Carga de Excel + tabla/filtro (persistido en localStorage)
    CloseTicketModal.tsx    Modal para cerrar un ticket (motivo/solución)
    Modal.tsx               Modal genérico reutilizable
    PrintRoutesView.tsx      Vista de impresión de rutas + export PDF
    ReportesView.tsx         Reportes/métricas + export PDF
  types/
    types.ts                 Tipos de dominio (Ticket, Beneficiario, etc.)
    html2pdf.d.ts, jspdf-autotable.d.ts   Shims de tipos para libs sin tipado oficial
  styles/print.css, print.css (duplicado, ver hallazgo #14), index.css, styles.css
public/                     index.html, manifest.json (CRA estándar)
```

No existe carpeta `docs/`, ni `README.md`, ni `firebase.json` / `.firebaserc` / `firestore.rules` en el repo — es decir, **las reglas de seguridad de Firestore no están versionadas** (se administran solo desde la consola de Firebase, si es que existen reglas restrictivas configuradas ahí).

---

## 3. Hallazgos críticos de seguridad 🔴

> **Actualización 2026-08-12 (tarde):** ambos hallazgos de esta sección fueron remediados a nivel de código/repo y desplegados a producción el mismo día. Quedan 2 acciones manuales pendientes de parte de Roberto (ver checklist al final de cada hallazgo) que requieren login interactivo en Firebase/Google Cloud Console y no pueden automatizarse desde aquí.

### 3.1 `.env` con credencial real, commiteado y en un repositorio **público** — ✅ código corregido, ⏳ rotación de key pendiente
- Archivo: [`.env`](.env), trackeado por git desde el commit `fd6c76b` ("chore: add environment configuration") y actualizado en `979859e`, `e5a6ba4`, `e7531fc`.
- Contiene `REACT_APP_FIREBASE_API_KEY=AIzaSyC...` (clave real, visible en `git log -p -- .env`).
- El `.gitignore` solo excluye `.env.local`, `.env.development.local`, etc. — **nunca excluyó `.env` a secas**, así que cada `git push` lo sube.
- Verificado vía API de GitHub: `"private": false` → el repo es público, cualquiera puede ver el historial completo, incluidas las 3 rotaciones previas de la clave.
- **Matiz importante:** una API key de Firebase *web* no es un secreto que dé acceso administrativo por sí sola (está pensada para ir en el bundle del cliente) — el riesgo real depende de qué tan abiertas estén las reglas de Firestore/Auth. Pero: (a) subir secretos a un repo público es mala práctica que hay que corregir igual, y (b) combinado con el hallazgo 3.2, sí hay un problema real de exposición de datos.
- **Hecho el 2026-08-12:** `git rm --cached .env` y se agregó `.env` (a secas) al `.gitignore`. El archivo sigue existiendo en el disco local (necesario para compilar) pero ya no se sube en próximos commits.
- **Pendiente — requiere acción manual de Roberto (login interactivo, no automatizable):**
  1. Rotar la API key en Google Cloud Console → APIs & Services → Credentials (proyecto `rutas-soporte-ti`), y restringirla por dominio/referrer (`robertomistatas.github.io/*`) una vez rotada.
  2. Opcional: limpiar el historial de git (`git filter-repo`) si se quiere borrar el rastro de la key antigua — de bajo impacto real ya que las Web API keys de Firebase no son secretas por diseño (ver nota abajo), pero recomendable por higiene. Esto reescribe hashes de commits y requiere force-push, así que se dejó fuera del fix automático a propósito.
  > Nota: una vez rotada la key, la que quedó en el historial de git queda inutilizable de todas formas — girar la key es lo que realmente cierra el hallazgo, no el historial de git en sí.

### 3.2 Auto-registro abierto = cualquiera puede crear una cuenta y ver datos de beneficiarios — ✅ UI corregida, ⏳ reglas de Firestore pendientes de desplegar
- Archivo: [`src/LoginPage.tsx`](src/LoginPage.tsx) — botón "¿No tienes cuenta? Regístrate" llama a `createUserWithEmailAndPassword` (línea 23) sin ninguna validación de dominio, invitación o aprobación.
- En [`src/App.tsx:945-972`](src/App.tsx#L945-L972), en cuanto `authReady && userId` son verdaderos (o sea, en cuanto alguien se loguea o se registra), la app suscribe un listener a **toda** la colección `/artifacts/default-amaia-app/public/data/tickets` (ver `getTicketsCollectionPath`, línea 80) — sin filtrar por usuario.
- Esa colección contiene nombre, RUT, teléfono y dirección de beneficiarios (adultos mayores) — datos personales sensibles.
- Como no hay `firestore.rules` en el repo, no se puede confirmar si las reglas en producción restringen esto — pero el hecho de que el *código de la app* no aplique ninguna restricción, y que cualquiera pueda auto-registrarse, significa que **la única barrera posible son las reglas de Firestore configuradas manualmente en la consola**, algo frágil y no versionado.
- **Hecho el 2026-08-12:**
  1. Se quitó la opción de auto-registro de [`src/LoginPage.tsx`](src/LoginPage.tsx) — ahora solo permite iniciar sesión, ya no llama a `createUserWithEmailAndPassword`. De ahora en adelante, las cuentas se crean manualmente desde la consola de Firebase (Authentication → Users → Add user).
  2. También se generalizó el mensaje de error de login (ya no expone `err.message` de Firebase, que puede revelar si un email existe o no) — mitigación adicional de enumeración de usuarios.
  3. Se versionó `firestore.rules` + `firebase.json` + `.firebaserc` en la raíz del repo, exigiendo `request.auth != null` para leer/escribir la colección de tickets y denegando por defecto cualquier otra ruta.
- **Pendiente — requiere acción manual de Roberto:**
  1. **Desplegar las reglas:** el Firebase CLI de esta máquina tiene la sesión vencida. Correr `firebase login --reauth` (abre el navegador) y luego `firebase deploy --only firestore:rules` desde la raíz del repo. Alternativa sin CLI: copiar el contenido de `firestore.rules` y pegarlo manualmente en Firebase Console → Firestore Database → Reglas → Publicar.
  2. **Importante:** quitar el botón de registro de la UI no impide que alguien llame a `createUserWithEmailAndPassword` directamente contra el proyecto de Firebase (la config pública del cliente sigue siendo, por diseño, pública). El paso 1 (reglas desplegadas) es el que realmente cierra el acceso a los datos — sin eso, alguien que se registre "por fuera" de la UI seguiría entrando a Firestore igual que antes. Considerar además, en Firebase Console → Authentication → Settings, desactivar "Habilitar la creación de nuevas cuentas" si el proveedor Email/Password lo permite, como capa adicional.
  3. Revisar si conviene restringir aún más las reglas (por ejemplo a un allowlist de emails de los 4 técnicos + admin) en vez de "cualquier usuario autenticado".

---

## 4. Hallazgos de severidad alta 🟠

### 4.1 Bug de zona horaria en `formatDate` (desfase de un día)
- Archivo: [`src/App.tsx:83-98`](src/App.tsx#L83-L98).
- `ticket.fechaCoordinacion` se guarda como string `"YYYY-MM-DD"` (viene de un `<input type="date">`). `new Date("2026-08-12")` lo interpreta como **medianoche UTC**, no medianoche local.
- Chile está en UTC-3/UTC-4, así que al mostrarlo con `toLocaleDateString('es-CL', ...)` el navegador lo convierte a hora local y **muestra el día anterior** (12 ago UTC 00:00 → 11 ago 21:00 en Chile).
- Se manifiesta en `TicketCard` (línea 522) y en cualquier otro lugar que llame `formatDate(ticket.fechaCoordinacion)` sin agregar hora.
- Nótese que otras partes del código **sí** lo hacen bien, agregando `'T00:00:00'` para forzar hora local: `DashboardView` (línea 714) y `CalendarView` (línea 837). Esto confirma que ya se detectó el patrón de bug antes (ver commit `667321f "fix: corregida la fecha mostrada..."`) pero no se corrigió de forma consistente en todos los puntos.
- **Fix sugerido:** en `formatDate`, cuando `date` es un string `"YYYY-MM-DD"` (sin hora), parsearlo como `new Date(date + 'T00:00:00')` igual que ya se hace en otros componentes, o mejor: centralizar un solo parser de fechas y usarlo en todos lados.

### 4.2 Mezcla de fechas UTC y locales en `ReportesView` (filtro por rango)
- Archivo: [`src/components/ReportesView.tsx:23-38`](src/components/ReportesView.tsx#L23-L38).
- `ticketDate` y `fromDate` se parsean como UTC (mismo problema que 4.1), pero `toDate.setHours(23, 59, 59)` opera en **hora local** sobre un `Date` cuyo instante interno es medianoche UTC. El resultado es que el límite superior del rango termina cortando ~3-4 horas antes de lo esperado (o después, dependiendo de la zona horaria del navegador que use la app).
- Esto puede hacer que un reporte "del 1 al 31 de agosto" excluya silenciosamente tickets coordinados el 31 en ciertas horas, o los límites de días se corran.
- **Fix sugerido:** usar el mismo patrón consistente que en 4.1 (parsear con `'T00:00:00'` / `'T23:59:59'` explícito) en vez de depender de conversiones implícitas UTC↔local.

### 4.3 Dependencias con vulnerabilidades conocidas (`npm audit`)
- `npm audit` reporta **74 vulnerabilidades: 13 bajas, 24 moderadas, 32 altas, 5 críticas** en el árbol de dependencias actual.
- La mayoría vienen de la cadena de `react-scripts` 5.0.1 (webpack-dev-server, babel plugins, etc.) — afectan sobre todo al entorno de desarrollo, no necesariamente al bundle de producción, pero igual conviene resolverlas.
- **Dependencia directa con vulnerabilidad sin parche disponible en npm:** `xlsx@0.18.5` (usada en `AmaiaTicketsView.tsx` para leer archivos Excel subidos por el usuario) tiene "Prototype Pollution" (GHSA-4r6h-8v6p-xvw6) y ReDoS (GHSA-5pgg-2g8v-p4x9), **sin fix disponible vía npm** — SheetJS solo publica los parches en su propio CDN (`https://cdn.sheetjs.com/`), no en el registro de npm.
- **Acción recomendada:**
  1. Correr `npm audit fix` para lo que se pueda resolver sin romper nada.
  2. Evaluar migrar `xlsx` a la versión parcheada distribuida por SheetJS directamente (`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`) dado que el vector de ataque (subir un `.xlsx` malicioso) es real: cualquier usuario logueado puede subir un archivo a `AmaiaTicketsView`.
  3. Evaluar migrar de Create React App (en modo mantenimiento desde 2023) a Vite en el mediano plazo — reduce buena parte de esta cadena de vulnerabilidades transitivas.

### 4.4 Sin backend / sin reglas de Firestore versionadas
- Ya mencionado en 3.2, pero desde el ángulo de mantenibilidad: no hay forma de saber, leyendo el repo, qué reglas de seguridad protegen los datos en producción. Cualquier cambio de reglas se hace "a mano" en la consola de Firebase y no queda registrado en git ni es revisable en un PR.

---

## 5. Hallazgos de severidad media 🟡

1. **`App.tsx` es un "God file" de 1160 líneas** que mezcla `Sidebar`, `Header`, `TicketForm`, `TicketCard`, `TicketsListView`, `DashboardView`, `CalendarView` y el componente raíz `App`. Dificulta mantenimiento y testing. Recomendado: separar cada componente a su propio archivo bajo `src/components/`, como ya se hizo con `PrintRoutesView`, `ReportesView`, etc.

2. **Módulo "Tickets AMAIA" no comparte datos entre usuarios/dispositivos.** [`src/components/AmaiaTicketsView.tsx:20-21`](src/components/AmaiaTicketsView.tsx#L20-L21) persiste todo en `localStorage` del navegador, no en Firestore. Si el objetivo es que el equipo vea los mismos tickets AMAIA importados, hoy cada persona que abra la app en su propio navegador tiene su propia copia desincronizada. Vale la pena confirmar con el negocio si esto es intencional (datos temporales/privados) o un bug de diseño (se esperaba que fuera compartido, como el resto de la app).

3. **Parseo de Excel asume orden fijo de columnas y descarta la fila 0 con `.slice(1)`** ([`AmaiaTicketsView.tsx:74-86`](src/components/AmaiaTicketsView.tsx#L74-L86)). Si el archivo Excel viene con columnas en otro orden, o sin encabezado, los datos se mapean mal silenciosamente (sin ningún error visible al usuario). También se ignoran las columnas `tipo`, `estado` y `cierre` que sí se leen del header pero nunca se usan.

4. **Contador de estados puede romperse con datos inconsistentes.** [`DashboardView`, `src/App.tsx:700-705`](src/App.tsx#L700-L705): `counts[ticket.estado as TicketEstado]++` asume que `estado` siempre es uno de los 6 valores válidos. Si llega un valor distinto (dato legado, edición manual en Firestore), el contador correspondiente queda `NaN` y se muestra roto en el dashboard sin ningún error visible.

5. **Validación de RUT solo de formato, no de dígito verificador.** [`src/App.tsx:288`](src/App.tsx#L288): la regex valida el patrón (`12.345.678-K`) pero no calcula el dígito verificador real, así que un RUT con formato válido pero dígito incorrecto pasa la validación.

6. **`tsconfig.json` tiene una clave duplicada.** [`tsconfig.json:11-12`](tsconfig.json#L11-L12): `"allowSyntheticDefaultImports"` aparece dos veces. No rompe nada (TypeScript solo usa el último valor) pero es un descuido que vale la pena limpiar — más aún porque es el archivo que estaba abierto al pedir este análisis.

---

## 6. Hallazgos menores / limpieza 🟢

7. **Archivo `gitignore` (sin punto) trackeado junto al `.gitignore` real**, en la raíz del proyecto. Es un duplicado que git ignora por completo (no tiene ningún efecto) y solo genera confusión. Se puede eliminar con `git rm gitignore`.

8. **`build/manifest.json` quedó trackeado en git** a pesar de que `/build` está en `.gitignore` — probablemente se agregó con `git add` antes de que el `.gitignore` tuviera esa regla, o con `-f`. Ejecutar `git rm -r --cached build` para destrackearlo.

9. **`src/print.css` es un archivo huérfano** (nunca se importa desde ningún lugar) que duplica a `src/styles/print.css`, el que sí se usa (`App.tsx:48`). Genera confusión sobre cuál es el archivo "real" a editar.

10. **Código duplicado para copiar al portapapeles** en `TicketCard` ([`src/App.tsx:470-488`](src/App.tsx#L470-L488)): existen `handleCopyAddress` y `copyToClipboard` haciendo básicamente lo mismo; solo se usa el primero, el segundo es código muerto.

11. **`console.log` de depuración dejados en producción** en varios puntos (`App.tsx` líneas 940, 948, 953, 965, 998, 1034, 1047, 1082; `PrintRoutesView.tsx` líneas 30, 54; etc.). No es grave pero expone detalles internos (IDs de usuario truncados, rutas de Firestore) en la consola del navegador de cualquier visitante.

12. **Autoría de commits bajo el placeholder "Tu Nombre"** en varios commits del historial (`git log`, ej. `979859e`, `fd5b1b3`, `fd6c76b`) — el `git config user.name` global nunca se personalizó en esos commits, aunque el email sí es correcto. Cosmético, pero afecta el historial visible en GitHub.

13. **`alert()` nativo del navegador usado para errores** (`App.tsx:1011`, `PrintRoutesView.tsx:94`, `ReportesView.tsx:130`) en vez de un componente de notificación consistente con el resto del diseño (ya existe `Modal.tsx` reutilizable, se podría extender a un toast/alert component).

---

## 7. Estado del build y type-check

- `npx tsc --noEmit` → **sin errores**. El proyecto compila limpio en TypeScript strict mode.
- `npm ls --depth=0` → todas las dependencias están instaladas y resueltas sin conflictos de versión.
- No se corrió `npm run build` completo (build de producción) ni se probó la app en navegador en esta sesión — queda pendiente para el siguiente paso si se quiere validar visualmente.

---

## 8. Plan de acción sugerido (orden de prioridad)

### Inmediato (antes de seguir desarrollando)
1. Rotar la API key de Firebase expuesta y sacar `.env` del control de versiones (§3.1).
2. Quitar el auto-registro público de `LoginPage.tsx` y revisar/endurecer las reglas de Firestore (§3.2).
3. Versionar `firestore.rules` / `firebase.json` en el repo.

### Corto plazo
4. Corregir el bug de zona horaria en `formatDate` y en el filtro de `ReportesView` (§4.1, §4.2).
5. `npm audit fix` + evaluar reemplazo de `xlsx` por la build parcheada de SheetJS (§4.3).
6. Limpiar archivos huérfanos/duplicados: `gitignore`, `build/` trackeado, `src/print.css` (§6, #7-9).

### Mediano plazo
7. Dividir `App.tsx` en componentes separados por archivo.
8. Decidir si "Tickets AMAIA" debe vivir en Firestore (compartido) en vez de `localStorage`.
9. Agregar manejo de errores consistente (reemplazar `alert()` por notificaciones propias del diseño).
10. Evaluar migración de Create React App a Vite para reducir la superficie de vulnerabilidades heredadas del toolchain.

---

## 9. Notas para continuar en la próxima sesión

Este archivo, junto con un resumen guardado en la memoria persistente de Claude Code (carpeta de memoria del proyecto), sirve de punto de partida. La idea es abordar el plan de acción de la sección 8 paso a paso, empezando por los ítems "Inmediato". Cuando se retome el trabajo, decirle a Claude algo como *"sigamos con el punto 1 del forense"* debería ser suficiente para continuar sin tener que re-explicar el contexto.
