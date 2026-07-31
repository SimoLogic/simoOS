# Errores, tipado y diagnóstico

Contenido:
1. Contratos de datos
2. Manejo de errores
3. Formato de errores de API
4. Diagnóstico antes de corregir
5. Bugs de patrón

---

## 1. Contratos de datos

Cada forma de dato que cruza una frontera (API ↔ cliente, módulo ↔ módulo,
archivo → aplicación) tiene un contrato explícito, definido **una sola vez** y
compartido.

**Con TypeScript:**

```ts
export interface Transaccion {
  id: string;
  monto: number;
  centroCostoId: string | null;
  origen: 'manual' | 'regla' | 'importado';
}
```

`any` está prohibido: apaga exactamente la verificación por la que se eligió
TypeScript, y se propaga — un `any` en una frontera contamina todo lo que toca
aguas abajo. Cuando el tipo es realmente desconocido, `unknown` obliga a
estrecharlo antes de usarlo, que es lo correcto.

**Sin TypeScript**, el contrato sigue siendo obligatorio; cambia el mecanismo:

```js
/** @typedef {{ id: string, monto: number, origen: 'manual'|'regla'|'importado' }} Transaccion */

// Y validación en runtime en el borde — sin compilador, esta es la única defensa
export function parsearTransaccion(raw) {
  if (typeof raw?.id !== 'string') throw new Error(`Transacción sin id válido: ${JSON.stringify(raw)}`);
  if (!Number.isFinite(raw.monto)) throw new Error(`Monto inválido en ${raw.id}: ${raw.monto}`);
  return { id: raw.id, monto: raw.monto, origen: raw.origen ?? 'importado' };
}
```

Valida en el borde (respuesta de API, parseo de archivo), no en cada uso interno.
Una vez validado el dato, el resto del código puede confiar en él.

**Antes de dar por terminado cualquier cambio en un proyecto TypeScript, el
compilador debe pasar con cero errores.** "Debería compilar" no es una
confirmación; correr el typecheck y ver la salida sí lo es.

## 2. Manejo de errores

Ningún `try/catch` vacío. Ninguno que solo haga `console.log(error)`.

```js
// MAL — el error desaparece y la función devuelve algo que parece válido
try {
  return await cargarDatos();
} catch (e) {
  console.log(e);
  return [];
}
```

Ese patrón es peor que no capturar: convierte un fallo en un resultado vacío
plausible. El usuario ve una tabla en blanco y reporta "no hay datos", que manda
la investigación al lado equivocado.

```js
// BIEN — contexto suficiente para diagnosticar qué falló, dónde y con qué datos
try {
  return await cargarDatos({ branch, periodo });
} catch (causa) {
  throw new Error(`Fallo cargando datos de branch=${branch} periodo=${periodo}`, { cause: causa });
}
```

Todo error debe propagarse con: **qué** operación falló, **dónde**, y **con qué
datos**. Un stack trace sin los parámetros de entrada rara vez alcanza para
reproducir.

Captura solo cuando puedas hacer algo útil: traducir el error, agregar contexto,
reintentar o revertir. Capturar para silenciar no es manejo de errores.

## 3. Formato de errores de API

Todas las rutas devuelven errores con la misma forma. Un formato que varía por
endpoint hace imposible manejar errores genéricamente en el cliente.

```json
{
  "error": {
    "codigo": "CONFLICTO_ASIGNACION",
    "mensaje": "El centro de costo ya tiene una asignación manual para este período.",
    "detalle": { "transaccionId": "abc123", "centroCostoId": "cc-07" }
  }
}
```

- `codigo`: estable, para que el cliente decida qué hacer.
- `mensaje`: legible por humanos, ya traducido, mostrable directo en la UI.
- `detalle`: contexto estructurado, opcional.

Códigos HTTP coherentes: 400 input inválido, 404 no existe, 409 conflicto de
estado, 422 válido pero no procesable, 500 fallo del servidor. Un 200 con
`{error: ...}` adentro rompe todo manejo estándar y obliga a inspeccionar cada
respuesta.

Nunca filtres a la UI el error crudo del motor de base de datos: expone nombres
de tablas, columnas y constraints, y es incomprensible para el usuario.

## 4. Diagnóstico antes de corregir

**Nunca corrijas un bug sin mostrar primero evidencia concreta de la causa.**

Un fix sin diagnóstico es una hipótesis disfrazada de solución. Cuando el síntoma
desaparece por casualidad, el bug real sigue ahí y vuelve más adelante en otra
forma, ya sin la pista original.

Evidencia aceptable, en orden de preferencia:

1. Una query que muestra el estado incorrecto en la base de datos.
2. El fragmento de código exacto, con línea, y por qué produce ese comportamiento.
3. Un log temporal que capture el valor real en el punto de falla.

Secuencia:

```
1. Reproducir con datos reales
2. Localizar — query o log que aísle dónde diverge lo esperado de lo real
3. Explicar la causa antes de tocar código
4. Corregir
5. Probar con los mismos datos reales: números antes/después
6. Buscar el mismo patrón en el resto del código
```

Los logs temporales de diagnóstico se retiran antes de cerrar. Un `console.log`
olvidado en producción filtra datos y ensucia la consola para el siguiente que
depure.

## 5. Bugs de patrón

Cuando encuentres un bug, **búscalo sistemáticamente en el resto del código antes
de darlo por cerrado**. Estos casi nunca aparecen una sola vez, porque surgen de
un hábito, no de un descuido puntual:

- optimistic update sin verificar `res.ok`,
- filtro global no aplicado en una consulta,
- nombre de tabla o columna incorrecto,
- paginación ausente en una query que hoy devuelve pocas filas,
- `catch` que silencia,
- borrado que no contempla una tabla hija,
- total calculado aparte del cuerpo de la tabla.

`scripts/scan_antipatterns.py` automatiza la búsqueda de varios de estos. Úsalo
como red de arrastre y revisa los resultados a mano — no entiende semántica, así
que produce falsos positivos, pero encuentra el segundo y el tercer caso, que es
justo lo que se olvida buscar.

Al cerrar un bug de patrón, reporta cuántas ocurrencias encontraste y corregiste,
no solo la original.
