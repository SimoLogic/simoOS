---
name: app-dev-standards
description: Estándares de ingeniería para apps de datos (Next.js, Vite, Supabase). Úsalo siempre que se pida escribir código, diseñar un esquema, agregar un feature, corregir un bug o instruir a un dev.
---

# Estándares de desarrollo de aplicaciones

Este skill define cómo diseñar, construir y verificar aplicaciones de datos —
independientemente del stack. Consolida estándares probados en producción sobre
Next.js/TypeScript y Vite/vanilla JS, ambos sobre Supabase.

El objetivo no es ceremonia. Cada regla aquí existe porque su ausencia produjo un
bug real, caro y difícil de detectar. Cuando una regla parezca burocrática, la
sección explica qué falla sin ella.

## Antes que nada: el gate socrático

**No escribas código ni instrucciones de implementación hasta cerrar las
ambigüedades críticas.** Ante cualquier feature, cambio de arquitectura o modelo
de datos, primero interroga la decisión:

- **Reversibilidad** — ¿cuánto cuesta deshacer esto en tres meses? Las decisiones
  caras de revertir (forma del esquema, identidad de registros, semántica de un
  campo) merecen más preguntas que las baratas (color de un botón, orden de una lista).
- **Fuente única de verdad** — ¿esto introduce un segundo lugar donde vive el
  mismo dato? Si la respuesta es sí, el diseño está mal salvo justificación explícita.
- **Consistencia con lo ya decidido** — ¿contradice una decisión previa del mismo
  proyecto? Si sí, dilo antes de implementar, no después.
- **Escala** — ¿qué pasa con 100× los datos actuales? ¿Y con dos usuarios
  escribiendo a la vez?
- **Qué se rompe** — ¿qué piezas que hoy funcionan toca este cambio?

Una pregunta que surfacea un edge case ahorra un día de debugging. Tres rondas de
preguntas sobre algo trivial desperdician el tiempo del usuario: calibra la
profundidad al costo de equivocarse.

**Para cambios grandes que tocan piezas ya funcionando**, pide el plan antes del
código: tablas a migrar, rutas a tocar, componentes a cambiar, y explícitamente
qué NO debe romperse. Revisa el plan, pregunta, y solo entonces confirma que proceda.

Nunca asumas que "ya que funcionó antes, sigue funcionando" después de un cambio
grande. Lo verificado antes del refactor no está verificado después.

## Los cinco invariantes

Si solo se recuerda una parte de este skill, que sea esta. Violar cualquiera de
estos cinco produce bugs que parecen funcionar hasta que alguien recarga la página
o revisa los datos meses después.

### 1. Nunca fingir que una operación funcionó

El estado local no se confirma hasta que el backend respondió `ok`. Si falla, la
UI revierte y muestra el error.

Se puede hacer *optimistic update* — actualizar la UI antes de la respuesta para
que se sienta rápida — **pero solo con rollback real implementado y probado**. La
regla no es "no seas optimista"; es "nunca te quedes en un estado mentiroso".

```js
// MAL — el bug más frecuente y el más difícil de ver
setItems(items.filter(i => i.id !== id));
await fetch(`/api/items/${id}`, { method: 'DELETE' });

// BIEN — optimista con rollback
const snapshot = items;
setItems(items.filter(i => i.id !== id));
const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
if (!res.ok) {
  setItems(snapshot);
  showError(await parseError(res));
}
```

Aplica con especial fuerza a: eliminar registros, asignaciones, resolución de
conflictos y cambios de configuración. Visualmente parece funcionar hasta que el
usuario recarga y su trabajo desapareció.

### 2. Una sola fuente de verdad

Nunca datos repartidos en dos tablas con lógica de lectura condicional. Nunca el
mismo cálculo implementado en dos lugares. Cuando aparece duplicación,
refactorizar antes de seguir agregando features — la duplicación se ramifica y
después ya no se puede.

Entre un parche rápido y un modelo limpio, recomienda el modelo limpio y explica
el costo concreto de la deuda técnica. Si el usuario elige el parche con el costo
sobre la mesa, es una decisión informada; documéntala.

### 3. Nada se da por terminado sin evidencia

"Ya está implementado" y "ya debería funcionar" no valen nada como afirmaciones.
Lo que vale es:

- el número real de registros procesados,
- la query que confirma el estado en la base de datos,
- el compilador pasando limpio,
- la captura de pantalla del resultado.

Esto aplica igual a los fixes: no cierres un bug sin prueba con datos reales
(números antes/después, o query que confirme el estado).

### 4. El scope siempre es explícito

Nunca proceses toda una tabla cuando necesitas una parte. Toda operación se acota
por el subconjunto relevante (`upload_id`, `branch`, el ID específico, el período).

Corolario en UI: **"Select All" nunca afecta más registros que los visibles bajo
los filtros activos.** Si el backend recibe una lista de IDs, procesa solo esos
IDs — nunca traduzcas a "todos los que cumplan X condición", porque X y lo que el
usuario estaba viendo divergen en cuanto hay un filtro de por medio.

### 5. Todo dato tiene origen rastreable

Cualquier dato que pueda venir de múltiples fuentes (manual, regla automática,
archivo importado, integración) lleva un campo de auditoría con su origen y
timestamp. Esto es lo que permite diagnosticar un problema de datos seis meses
después sin adivinar.

Regla derivada crítica: **el trabajo manual nunca se sobreescribe por un proceso
automático**, salvo que el usuario lo pida explícitamente. Antes de un reemplazo
masivo, snapshot de lo manual.

## Flujo de trabajo

```
1. Interrogar    → gate socrático, cerrar ambigüedades
2. Planear       → tablas, rutas, componentes, qué no debe romperse
3. Verificar     → nombres de tabla y columnas contra la BD real
4. Implementar   → capas separadas, tipos explícitos, errores con contexto
5. Probar        → compilador limpio + prueba con datos reales
6. Evidenciar    → mostrar números, queries o capturas
```

El paso 3 se salta con frecuencia y es el que más caro sale: una discrepancia
entre el nombre de tabla en el código y el real en la BD **falla en silencio** —
devuelve vacío en vez de error. Lo mismo con columnas, tipos, valores válidos de
enums y restricciones `check`. Verifica el esquema real antes de escribir la
query, no después de que "no salen datos".

## Arquitectura en una línea

**La lógica de negocio son funciones puras que no tocan I/O.** Reciben datos,
devuelven datos. Los handlers de API son delgados: validar input → llamar a la
función pura → formatear respuesta. Los componentes de UI no contienen lógica de
negocio.

Esto es independiente del framework. En Next.js son módulos en `lib/`; en vanilla
JS son módulos ES con `state.js` / `utils.js` / `events.js` y un módulo por
feature. La forma cambia, la separación no.

Detalles por stack, patrones de estado y comunicación entre módulos:
**`references/arquitectura.md`**

## Referencias

Lee el archivo relevante cuando entres en ese terreno — no todos de entrada.

| Archivo | Cuándo leerlo |
|---|---|
| `references/arquitectura.md` | Estructurar un proyecto, decidir dónde vive algo, diseñar estado, elegir stack |
| `references/datos-supabase.md` | Esquema, migraciones, queries, PostgREST, paginación, upserts, borrados con FK, matching y normalización de strings |
| `references/frontend-ux.md` | Componentes, tablas, filtros, modales, exportación, operaciones destructivas, design tokens |
| `references/errores-y-diagnostico.md` | Manejo de errores, debugging de un bug reportado, tipado, formato de errores de API |
| `references/checklists.md` | Antes de dar por cerrado un feature, un fix o un cambio grande |

## Herramienta

`scripts/scan_antipatterns.py` busca en el código los anti-patrones concretos que
este skill prohíbe (catch vacío, optimistic update sin verificación, `any`,
`select('*')` sin límite, credenciales hardcodeadas, `onclick` inline, entre otros).

```bash
python scripts/scan_antipatterns.py <ruta-del-proyecto>
python scripts/scan_antipatterns.py <ruta> --json    # salida procesable
```

Córrelo antes de cerrar un feature. No sustituye la revisión — no entiende
semántica y produce falsos positivos — pero los bugs de patrón casi siempre se
repiten en múltiples lugares, y encontrar el segundo y tercer caso a mano es
justo lo que se olvida hacer.

Cuando encuentres un bug, **búscalo sistemáticamente en el resto del código antes
de darlo por cerrado.** Un optimistic update sin verificación, un filtro no
aplicado o un nombre de tabla incorrecto rara vez aparecen una sola vez.

## Higiene de proyecto

- **Credenciales en variables de entorno**, nunca hardcodeadas ni en el repo.
- **Commits descriptivos, un cambio por commit.** Facilita revertir sin arrastrar
  cambios no relacionados.
- **Cambios quirúrgicos, no reescrituras.** Reescribir algo que funciona para que
  quede "más limpio" cambia riesgo cierto por beneficio incierto. Refactoriza
  cuando la duplicación o el acoplamiento estén bloqueando trabajo real.
- **Migraciones idempotentes** con `IF NOT EXISTS` / `IF EXISTS`.
- **Backup antes de mover datos**, con rollback disponible.
