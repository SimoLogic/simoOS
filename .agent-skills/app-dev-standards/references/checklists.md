# Checklists

Úsalas como filtro final, no como sustituto del criterio. Si un punto no aplica,
di por qué en vez de saltarlo en silencio.

---

## Antes de implementar (gate socrático)

- [ ] ¿Qué tan caro es revertir esta decisión en tres meses?
- [ ] ¿Introduce una segunda fuente de verdad para algún dato?
- [ ] ¿Contradice alguna decisión ya tomada y verificada en este proyecto?
- [ ] ¿Qué pasa con 100× los datos actuales?
- [ ] ¿Qué pasa si dos usuarios hacen esto a la vez?
- [ ] ¿Qué piezas que hoy funcionan toca este cambio?
- [ ] ¿Los nombres de tabla y columna del plan existen tal cual en la BD?

Para cambios grandes, además: plan escrito con tablas a migrar, rutas a tocar,
componentes a cambiar y **qué no debe romperse** — revisado antes de escribir código.

---

## Antes de cerrar un feature

**Arquitectura**
- [ ] La lógica de negocio está en funciones puras, sin I/O
- [ ] El handler solo valida, llama y responde
- [ ] Ningún componente de UI contiene reglas de negocio
- [ ] Nada quedó duplicado; si se repite, se extrajo a un helper compartido

**Tipos y compilación**
- [ ] Contratos explícitos en cada frontera; cero `any`
- [ ] Los tipos se definen una vez y se comparten
- [ ] El typecheck pasa limpio (ejecutado y verificado, no supuesto)

**Datos**
- [ ] Nombres de tabla y columnas verificados contra la BD real
- [ ] Toda query paginada o con límite explícito y justificado
- [ ] Filtros aplicados en SQL, no en JavaScript
- [ ] Filtros globales inyectados; omisiones deliberadas comentadas
- [ ] Operaciones acotadas al subconjunto relevante
- [ ] Borrados en orden hijas → padre, con las tablas relacionadas listadas
- [ ] Migraciones idempotentes
- [ ] Campo de origen poblado en datos multi-fuente

**Estado y persistencia**
- [ ] Ningún estado local se confirma antes de `res.ok`
- [ ] Todo optimistic update tiene rollback implementado **y probado forzando el fallo**
- [ ] El caché tiene regla de invalidación definida
- [ ] El trabajo manual no se sobreescribe por procesos automáticos

**Errores**
- [ ] Ningún `catch` vacío ni que solo loguee
- [ ] Los errores llevan operación, ubicación y datos de entrada
- [ ] Formato de error consistente en todas las rutas
- [ ] Ningún error crudo de BD llega a la UI

**UI**
- [ ] Los cuatro estados cubiertos: cargando, vacío, error, con datos
- [ ] "Select All" limitado a lo visible bajo los filtros activos
- [ ] Operaciones destructivas muestran conteo real antes y resumen después
- [ ] Fallos parciales reportan desglose exacto
- [ ] Contenido dinámico escapado antes de insertarse como HTML
- [ ] Modales manejan foco y `Escape`
- [ ] La exportación refleja exactamente lo que muestra la pantalla

**Higiene**
- [ ] Credenciales en variables de entorno
- [ ] Logs temporales de diagnóstico retirados
- [ ] `scan_antipatterns.py` ejecutado y sus hallazgos revisados
- [ ] Commits descriptivos, un cambio por commit

---

## Antes de cerrar un bug

- [ ] Reproducido con datos reales
- [ ] Causa demostrada con evidencia concreta (query, línea de código o log)
- [ ] Causa explicada **antes** de tocar código
- [ ] Corregido
- [ ] Verificado con datos reales: números antes/después o query de confirmación
- [ ] Buscado el mismo patrón en el resto del código
- [ ] Reportado cuántas ocurrencias se encontraron y corrigieron
- [ ] Logs temporales retirados

---

## Antes de un cambio grande sobre algo que ya funciona

- [ ] Plan revisado y aprobado antes de escribir código
- [ ] Lista explícita de lo que no debe romperse
- [ ] Backup de los datos afectados, con rollback disponible y probado
- [ ] Migración idempotente
- [ ] **Re-verificado lo que ya estaba verificado antes del cambio** — que
      funcionara antes no prueba que funcione después
- [ ] Evidencia posterior: conteos, queries o capturas que confirmen el resultado

---

## Frases que no cierran nada

Ninguna de estas es evidencia. Si aparecen, falta el trabajo real:

> "Ya está implementado" · "Ya debería funcionar" · "Debería compilar"
> "Lo probé y se ve bien" · "Es un cambio menor, no rompe nada"

Reemplázalas por: el conteo de registros procesados, la query que confirma el
estado, la salida del compilador, o la captura del resultado.
