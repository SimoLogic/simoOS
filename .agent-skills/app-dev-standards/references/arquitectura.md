# Arquitectura y organización

Contenido:
1. Las tres capas
2. Dónde vive cada cosa
3. Gestión de estado
4. Comunicación entre módulos
5. Adaptación por stack
6. Duplicación y refactor

---

## 1. Las tres capas

```
UI          → presenta y captura interacción. Cero lógica de negocio.
Aplicación  → handlers de API / controladores. Delgados.
Dominio     → funciones puras. Reciben datos, devuelven datos. Sin I/O.
Acceso      → queries, fetch, storage. Aislado detrás de funciones nombradas.
```

La regla que hace útil esta separación: **el dominio no importa nada del acceso a
datos**. Si una función de negocio necesita datos, se los pasan como argumento.
Esto la hace testeable sin base de datos y reutilizable desde un handler, un
script de migración o un job — que es exactamente donde la lógica duplicada suele
aparecer.

```js
// MAL — lógica de negocio acoplada a la BD
async function calcularComision(loanId) {
  const loan = await db.from('loans').select().eq('id', loanId).single();
  return loan.amount * (loan.tier === 'A' ? 0.02 : 0.015);
}

// BIEN — pura, testeable, reutilizable
export function calcularComision(loan) {
  const rate = loan.tier === 'A' ? 0.02 : 0.015;
  return loan.amount * rate;
}
// el handler orquesta: leer → calcular → responder
```

## 2. Dónde vive cada cosa

| Tipo de código | Ubicación | Señal de que está mal ubicado |
|---|---|---|
| Reglas de negocio, cálculos, clasificación | `lib/` o módulo de dominio | Un componente importa el cliente de BD |
| Validación de input | Borde de la aplicación (handler) | Se valida dentro de la función pura |
| Queries | Módulo de acceso a datos | Un componente arma SQL o un fetch a PostgREST |
| Formateo para pantalla | UI | El dominio devuelve strings con `$` y comas |
| Tipos / contratos | Módulo compartido, definidos una vez | El mismo shape redefinido en tres archivos |

**Los tipos se definen una sola vez y se comparten entre frontend y backend.** Un
tipo duplicado se desincroniza; cuando eso pasa el compilador no ayuda porque
ambos lados compilan bien por separado.

## 3. Gestión de estado

No hace falta Redux ni librerías externas para la mayoría de las apps de datos.
Lo que sí hace falta es que el estado sea **centralizado y con puntos de entrada
nombrados**: nada de que cinco módulos muten el mismo objeto directamente.

```
state.js
  ├── el estado (privado al módulo)
  ├── getters   → lectura
  ├── mutadores → escritura, uno por operación con nombre semántico
  └── suscripción → notifica a quien deba re-renderizar
```

**Caché en memoria**: útil, pero necesita invalidación explícita. Un caché sin
regla de invalidación es una fuente de verdad paralela — viola el invariante 2.
Define desde el inicio qué operaciones invalidan qué claves.

**Persistencia de preferencias de usuario** (estado del sidebar, filtros
recordados, columnas visibles) va en `localStorage`. Nunca datos de negocio ahí:
no se sincroniza, no se audita y no sobrevive a un cambio de navegador.

## 4. Comunicación entre módulos

**Event bus** para desacoplar módulos que no deben conocerse. El módulo de
filtros emite `filtros:cambiaron`; el de tabla y el de KPIs reaccionan. Ninguno
importa al otro.

El riesgo del event bus es que el flujo se vuelve invisible. Mitigación:
mantén un registro de eventos en un solo archivo con nombre y payload de cada uno.
Si nadie puede decir qué escucha un evento, el bus se convirtió en `goto`.

**Event delegation** para listas dinámicas: un listener en el contenedor, no uno
por fila. Con 500 filas la diferencia es real, y sobrevive a re-renders sin
re-vincular nada.

```js
// data attributes para comunicar HTML → JS, nunca onclick inline
tabla.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-accion]');
  if (!btn) return;
  manejar(btn.dataset.accion, btn.dataset.id);
});
```

`onclick` inline acopla markup a nombres globales de función, rompe con
Content-Security-Policy y no sobrevive a que el HTML se genere dinámicamente.

## 5. Adaptación por stack

Los principios no cambian; la forma sí.

### Next.js + TypeScript + Supabase

```
lib/          → dominio (funciones puras) + tipos compartidos
app/api/      → route handlers delgados
components/   → UI
supabase/     → migraciones SQL
```

- Tipos explícitos en cada frontera. `any` prohibido — deshabilita justo la
  verificación que justifica usar TypeScript.
- El compilador debe pasar con **cero errores** antes de dar algo por terminado.
  "Debería funcionar" no es confirmación; correr el typecheck sí.
- Server components para lectura, route handlers para mutación.

### Vite + ES Modules (vanilla, sin framework)

```
src/
  state.js      → estado centralizado
  utils.js      → helpers puros
  events.js     → event bus
  api/          → acceso a datos
  features/     → un módulo por feature
```

- Componentes reutilizables como funciones de render que devuelven strings de
  HTML, más una función de montaje que engancha los listeners.
- Sin TypeScript, el contrato de datos igual debe ser explícito: `@typedef` de
  JSDoc para que el editor ayude, **más validación en runtime en el borde** (al
  recibir la respuesta de la API o al parsear un archivo). Sin compilador, el
  borde es la única defensa.
- Deploy: Vercel con auto-deploy desde GitHub.

### Elegir entre los dos

Vanilla + Vite gana cuando la app es principalmente dashboards y tablas sobre
datos ajenos, el equipo es chico y quieres cero fricción de build. Next.js gana
cuando hay autenticación seria, rutas server-side, muchas mutaciones o el equipo
va a crecer — el tipado compartido paga su costo a partir de cierto tamaño.

Lo que no es aceptable en ninguno: lógica de negocio dentro de componentes.

## 6. Duplicación y refactor

Si la misma lógica se necesita en N lugares, vive en un helper compartido. Al
detectar duplicación, extraer **antes** de seguir agregando features — cada
feature nueva sobre lógica duplicada multiplica el costo del refactor futuro.

Matiz importante: dos fragmentos que hoy se parecen pero responden a reglas de
negocio distintas **no son duplicación**. Unificarlos crea un helper con banderas
que después nadie puede cambiar sin romper el otro caso. La pregunta correcta no
es "¿se ve igual?" sino "¿si cambia una regla, cambian las dos?".
