# 🏛️ Simo Intellisense: Global Workspace Rules (Vibe Work OS)

Este documento es la "Constitución Tecnológica" de Simo Intellisense. Todo agente o desarrollador debe cumplir estas reglas para garantizar un software fluido, profesional y de grado empresarial.

## 1. Las 4 Llaves Maestras (Arquitectura Core)
- **Llave #1: Memoria Persistente:** Antes de cada tarea, leer `ARCHITECTURE.md` y `GLOBAL_RULES.md`. No se permiten "olvidos" sobre la estructura base.
- **Llave #2: Calendario Comercial:** Ningún cálculo de fechas debe ser ingenuo. Se debe usar obligatoriamente el `WorkdayHelper` para saltar fines de semana y festivos según la configuración de la organización.
- **Llave #3: Protección de Datos (Trigger Guard):** Los datos con `isProtected=true` o `sourcePlaybookId` son intocables. La UI debe bloquear el borrado y la DB debe rechazarlo mediante triggers/middleware.
- **Llave #4: Mirror Sync Protocol:** La integridad entre el ERP (Simo IS) y el PMO es sagrada. Los conflictos de sincronización se resuelven siempre con el consentimiento del usuario mediante modales de comparación.

## 2. Experiencia de Usuario "Vibe" (Fluidez Natural)
- **Prohibición de Easing Lineal:** NUNCA usar animaciones lineales. El software debe imitar la física orgánica.
- **Tokens de Movimiento:**
    - **70ms (Productive-Short):** Feedback táctil inmediato.
    - **100ms (Productive-Medium):** Estándar para expansiones, dropdowns y cambios de estado.
    - **250ms (Expressive-Short):** Apertura de modales y paneles.
- **Densidad de Pantalla:** Aprovechamiento del 100% del viewport. Espaciado basado en múltiplos de **4px**. Diseño de "Alta Densidad" para ver más información sin saturar.

## 3. Rendimiento de Alto Impacto (HPC Render)
- **Latencia Cero:** Implementar **Actualizaciones Optimistas** en todas las interacciones críticas. La UI reacciona al instante (Zustand), la DB confirma después.
- **Virtualización:** Si una vista maneja >3,000 ítems, es obligatorio el uso de `TanStack Virtual` para mantener 60 FPS constantes.
- **Búsqueda Instantánea:** Los filtros y el buscador global (CMD+K) deben responder en menos de **50ms** indexando el estado local.

## 4. Estándares de Ingeniería (Calidad de Código)
- **TypeScript Estricto:** Prohibido el uso de `any`. Tipado fuerte en toda la aplicación.
- **Componentes Legos:** No reinventar componentes. Si un elemento de la interfaz (ej. StatusCell) ya existe en el `Field Engine`, debe reutilizarse.
- **Multi-tenant:** Toda consulta debe estar filtrada obligatoriamente por `org_id` para garantizar el aislamiento total entre clientes.
- **Naming:** Seguir estrictamente la nomenclatura definida en el Plan Maestro (ej. `pmo_groups`, `pmo_tasks`).

## 5. Regla de Oro del Agente
- **Push & Verify:** Antes de dar un Sprint por terminado, el código debe estar subido (pushed) a la rama correspondiente de GitHub y verificado contra errores de TypeScript.

## 6. Infraestructura de Time Travel (Undo/Redo)
- Toda mutación de estado que afecte datos del usuario (nombres, estados, fechas, asignaciones) DEBE ser envuelta en el *Command Pattern*.
- Se debe utilizar el middleware de `zundo` o una implementación propia en el Store para permitir un historial de al menos 50 acciones por sesión.
- La UI debe ser capaz de detectar la combinación de teclas *Ctrl+Z / Cmd+Z* y ejecutar la función `undo()` de forma global, con un aviso sutil (Toast) que diga: 'Acción deshecha'. El redibujado de la UI debe ser instantáneo.
