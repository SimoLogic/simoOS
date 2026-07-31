# Datos, esquema y Supabase/PostgREST

Contenido:
1. Verificar el esquema real antes de escribir código
2. Diseño de esquema
3. Estrategias de carga
4. PostgREST directo
5. Paginación y procesamiento en chunks
6. Filtros a nivel de query
7. Borrados y relaciones FK
8. Migraciones
9. Auditoría
10. Normalización y matching de strings

---

## 1. Verificar el esquema real antes de escribir código

Este es el paso que más se salta y el que más caro sale.

Antes de implementar cualquier lógica que lea una tabla, confirma contra la base
de datos real:

- el **nombre exacto** de la tabla,
- los **nombres y tipos** de las columnas que vas a usar,
- los **valores válidos** de los campos enum,
- las **restricciones check** que podrían rechazar un insert.

Por qué importa tanto: en PostgREST y en varios ORMs, un nombre de tabla o
columna equivocado **no lanza error** — devuelve vacío. El bug se ve como "no hay
datos" y se persigue durante horas en el lado equivocado.

```sql
-- verificación rápida del esquema real
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'mi_tabla'
order by ordinal_position;
```

## 2. Diseño de esquema

Tres familias de tablas, con roles que no deben mezclarse:

| Familia | Contiene | Característica |
|---|---|---|
| Configuración | Reglas, mapeos, catálogos, centros de costo | Pocas filas, editadas por humanos, versionables |
| Datos | Transacciones, registros importados, eventos | Muchas filas, escritas por procesos |
| Auditoría | Origen, snapshots, historial de cambios | Append-only, nunca se edita |

**La clasificación de un registro vive al nivel de la regla, no del registro**
cuando esa clasificación se deriva de una regla. Si copias el resultado a cada
fila, cambiar la regla exige reprocesar todo y tienes dos fuentes de verdad.

Guarda la asignación derivada solo cuando necesites congelar el resultado
histórico (ej. lo que se reportó en un cierre contable) — y entonces marca
explícitamente que es un snapshot, no un cálculo vivo.

## 3. Estrategias de carga

| Estrategia | Cuándo | Riesgo |
|---|---|---|
| Full replace | El archivo fuente es la verdad completa del período | **Borra trabajo manual.** Requiere snapshot previo |
| Upsert | Llegan actualizaciones sobre registros existentes | Necesita clave natural estable |
| Append-only | Eventos, logs, historial | Crece sin límite; necesita política de retención |

**Regla del full replace**: antes de reemplazar, respalda lo que un humano tocó a
mano y restáuralo después. El caso que rompe todo es el usuario que pasó dos
horas resolviendo asignaciones manuales y las pierde al re-subir el archivo.

## 4. PostgREST directo

Usar la API REST sin SDK es válido y reduce dependencias.

```js
const res = await fetch(`${URL}/rest/v1/tabla?select=id,nombre&branch=eq.${branch}`, {
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Accept-Profile': 'mi_schema',      // lectura sobre schema no-público
    'Content-Profile': 'mi_schema',     // escritura
  },
});
if (!res.ok) throw new Error(`PostgREST ${res.status}: ${await res.text()}`);
```

**Upsert con resolución de conflictos:**

```js
headers: {
  Prefer: 'resolution=merge-duplicates,return=representation',
}
// requiere un unique constraint sobre la clave de conflicto
```

`return=representation` devuelve las filas afectadas — úsalo para reportar el
conteo real al usuario en vez de asumir que se procesaron todas.

**Row Level Security**: actívalo cuando el cliente habla directo con PostgREST
con una clave que llega al navegador. Con RLS desactivado, cualquiera con la
clave anon lee toda la tabla. Se puede omitir solo si todo el acceso pasa por un
backend propio con la service key **nunca expuesta al cliente**.

## 5. Paginación y procesamiento en chunks

Nunca traigas el dataset completo a memoria. PostgREST además corta en un límite
por defecto, así que "parecía funcionar" en desarrollo con 500 filas y devuelve
resultados silenciosamente truncados en producción con 50.000.

```js
async function traerTodo(query, tam = 1000) {
  const out = [];
  for (let desde = 0; ; desde += tam) {
    const res = await fetch(`${query}&limit=${tam}&offset=${desde}`, { headers });
    if (!res.ok) throw new Error(`Página ${desde}: ${res.status}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < tam) return out;
  }
}
```

Los procesos que afectan muchos registros procesan en chunks **con feedback de
progreso visible**. Una operación de tres minutos sin indicador se percibe como
una app colgada y el usuario la interrumpe a la mitad — dejando datos parciales.

## 6. Filtros a nivel de query

Los filtros se aplican en SQL, nunca trayendo todo y filtrando en JavaScript. No
es solo rendimiento: filtrar en el cliente sobre un resultado ya truncado por
paginación da **resultados incorrectos que parecen correctos**.

Los filtros globales (organización, branch, período) se inyectan automáticamente
como condición de fondo en todas las consultas. Cuando un filtro global
deliberadamente **no** aplica a una fuente específica, documéntalo en el código:

```js
// El filtro de branch NO aplica a `tasas_globales`: es configuración
// compartida por toda la organización, no datos por sucursal.
```

Una omisión de filtro sin comentar es indistinguible de un olvido, y nadie se
atreve a "arreglarla" ni a dejarla.

## 7. Borrados y relaciones FK

Borra en orden: **hijas primero, padre al final.** No asumas que las cascadas de
la BD cubren todos los casos — pueden no estar definidas, estar definidas como
`restrict`, o existir tablas relacionadas sin FK formal (el caso más común y el
que deja huérfanos silenciosos).

Antes de implementar un borrado, lista todas las tablas que referencian a la
tabla padre:

```sql
select tc.table_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and ccu.table_name = 'tabla_padre';
```

Y busca también referencias por convención de nombres (`*_id`) sin FK declarada.

## 8. Migraciones

Idempotentes siempre — seguras de correr más de una vez:

```sql
create table if not exists centros_costo (...);
alter table transacciones add column if not exists origen text;
drop index if exists idx_viejo;
```

Una migración que falla a la mitad deja el esquema en estado indeterminado. Si
puede correrse de nuevo sin error, la recuperación es trivial.

## 9. Auditoría

Todo dato que puede venir de múltiples fuentes lleva:

```sql
origen text not null,        -- 'manual' | 'regla' | 'importado' | 'integracion'
origen_ref text,             -- id de la regla, nombre del archivo, etc.
actualizado_en timestamptz not null default now(),
actualizado_por text
```

Sin esto, un dato raro seis meses después es imposible de explicar: no se puede
distinguir un error de captura de un error de regla de un archivo mal formado.

**Operaciones masivas**: muestra al usuario cuántos registros va a afectar
**antes** de ejecutar, con confirmación explícita. Después, muestra cuántos se
procesaron realmente. Cuando la operación puede fallar parcialmente, reporta el
desglose exacto — "142 restaurados, 3 fallaron por conflicto de clave" — no un
"éxito" o "error" global que oculta la mitad de la historia.

## 10. Normalización y matching de strings

Matching de nombres de personas, empresas y sucursales entre fuentes distintas es
donde se pierden datos en silencio.

```js
export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita tildes
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')                          // puntuación → espacio
    .replace(/\s+/g, ' ')
    .trim();
}
```

**Match por niveles**, del más estricto al más laxo, registrando siempre con qué
nivel se resolvió:

1. Exacto sobre el valor normalizado.
2. Parcial — contención, o apellido + inicial de nombre.
3. Fonético (Soundex/Metaphone) o distancia de edición con umbral.

El nivel 3 **nunca se aplica automáticamente sin revisión** cuando el match tiene
consecuencias financieras. Preséntalo como sugerencia con su score y deja que un
humano confirme; guarda la confirmación para no volver a preguntar.

**Deduplicación** por clave compuesta explícita, no por "el nombre se parece".
Define la clave (ej. `normalizar(nombre) + '|' + fecha + '|' + monto`) y
documenta por qué esos campos identifican unívocamente un registro.

Variantes que hay que contemplar siempre: tildes, dobles espacios,
abreviaciones (`Jose` / `José` / `J.`), orden de apellidos, sufijos corporativos
(`SAS`, `S.A.S.`, `LLC`, `Inc`).
