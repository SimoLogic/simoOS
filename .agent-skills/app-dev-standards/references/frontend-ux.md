# Frontend y UX

Contenido:
1. Sistema de diseño
2. Componentes sin framework
3. Tablas complejas
4. Filtros
5. Operaciones destructivas
6. Feedback y estados
7. Importación y exportación de archivos

---

## 1. Sistema de diseño

Define tokens antes de escribir el primer componente. Sin ellos, el sexto
componente introduce el quinto gris ligeramente distinto y la app se ve
ensamblada por accidente.

```css
:root {
  /* color: semántico, no literal */
  --color-fondo: #fcfcfa;
  --color-superficie: #ffffff;
  --color-texto: #001a40;
  --color-texto-suave: #5a6b85;
  --color-acento: #ff4040;
  --color-borde: #e3e8ef;
  --color-exito: #0f8a5f;
  --color-alerta: #b45309;

  /* escala tipográfica y de espaciado: pocos valores, usados con disciplina */
  --texto-xs: 0.75rem;  --texto-sm: 0.875rem; --texto-base: 1rem;
  --texto-lg: 1.25rem;  --texto-xl: 1.75rem;
  --esp-1: 4px; --esp-2: 8px; --esp-3: 12px; --esp-4: 16px;
  --esp-6: 24px; --esp-8: 32px;

  --radio: 8px;
  --sombra: 0 1px 3px rgba(0,26,64,.08);
}
```

Nombra por función (`--color-acento`) y no por apariencia (`--rojo`): cuando
cambie la marca, el nombre sigue siendo verdad.

**Layout**: CSS Grid para la estructura de página y tablas; Flexbox para
alineación dentro de un componente. Reservar espacio para elementos que cargan
después evita saltos de layout.

**Single screen view**: en dashboards analíticos, lo que decide la acción cabe
sin scroll. El scroll es para el detalle, no para los KPIs.

## 2. Componentes sin framework

Patrón: una función de render que devuelve HTML como string, más una función de
montaje que engancha comportamiento.

```js
export function renderTarjetaKPI({ id, titulo, valor, delta }) {
  return `
    <article class="kpi" data-kpi="${id}">
      <h3 class="kpi__titulo">${escapar(titulo)}</h3>
      <p class="kpi__valor">${escapar(valor)}</p>
      ${delta ? `<span class="kpi__delta">${escapar(delta)}</span>` : ''}
    </article>`;
}
```

**Escapa siempre el contenido dinámico.** Interpolar datos sin escapar dentro de
`innerHTML` es una inyección de HTML — y con datos que vienen de un archivo
subido por un usuario, es una vulnerabilidad real, no teórica.

```js
const escapar = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

**Accesibilidad en modales, drawers y sidebars** — lo mínimo que no es opcional:
`role` y `aria-modal` correctos, foco que entra al abrir y vuelve al disparador al
cerrar, `Escape` cierra, y el foco no se escapa detrás del overlay. Un modal sin
manejo de foco es inutilizable con teclado y con lector de pantalla.

## 3. Tablas complejas

Lo que hace difícil una tabla de datos no es pintarla, es mantenerla coherente
mientras cambian filtros, orden y selección.

- **Headers agrupados**: usa `colspan` con una fila de encabezado real, y `scope`
  en las celdas de encabezado para que el lector de pantalla asocie bien.
- **Totalizadores dinámicos**: recalcúlalos desde los datos filtrados en el mismo
  paso de render, nunca de un valor guardado aparte. Un total que se calcula por
  su cuenta se desincroniza del cuerpo de la tabla — y nadie lo nota hasta que
  alguien suma a mano.
- **Ordenamiento**: sobre los datos, no sobre el DOM. Estable, con criterio
  explícito para nulos (decide si van al inicio o al final y sé consistente).
- **Selección múltiple**: ver invariante 4 en `SKILL.md`. El "Select All" opera
  exclusivamente sobre lo visible bajo los filtros activos, y lo que viaja al
  backend es la lista de IDs.

Con más de ~2.000 filas, virtualiza o pagina. Renderizar 20.000 nodos congela el
navegador y ninguna optimización de CSS lo arregla.

## 4. Filtros

- Multi-select con **propagación reactiva**: cambiar un filtro actualiza tabla,
  KPIs, gráficos y totales en un solo ciclo. Actualizar solo una parte produce
  una pantalla que se contradice a sí misma.
- Los filtros se aplican **en la query** (ver `datos-supabase.md` §6).
- Muestra siempre los filtros activos y cuántos registros quedaron. "0 resultados"
  sin indicar qué filtro los eliminó es una pantalla que no se puede diagnosticar.
- Persiste las preferencias de vista en `localStorage`; nunca datos de negocio.

## 5. Operaciones destructivas

Antes de ejecutar algo irreversible, la confirmación dice **cuántos registros y
de qué tipo**:

```
Vas a eliminar 1.284 transacciones del período 2026-07
de la sucursal 716. 47 tienen asignación manual y se perderán.

[Cancelar]  [Eliminar 1.284 registros]
```

Tres cosas que hacen que esto funcione: el número es real (contado, no estimado),
el botón repite la acción concreta en vez de decir "OK", y se advierte
específicamente sobre el trabajo manual en riesgo.

Después de ejecutar, resumen de lo que pasó realmente. Si falló parcialmente, el
desglose exacto — nunca un "listo" que oculta 3 fallos entre 142 éxitos.

## 6. Feedback y estados

Todo componente que carga datos contempla cuatro estados, no uno:

| Estado | Qué mostrar |
|---|---|
| Cargando | Skeleton o spinner con el espacio ya reservado |
| Vacío | Por qué está vacío y qué hacer (¿sin datos, o filtros muy estrechos?) |
| Error | Mensaje accionable + cómo reintentar |
| Con datos | El contenido |

El estado vacío es el que más se olvida y el que más confunde: una tabla en
blanco no distingue entre "no hay nada", "el filtro es muy estrecho" y "falló la
carga".

Los errores crudos de la base de datos nunca llegan a la UI sin traducir.
`duplicate key value violates unique constraint "idx_cc_nombre"` se convierte en
"Ya existe un centro de costo con ese nombre." El error técnico va al log, con
contexto suficiente para diagnosticar.

## 7. Importación y exportación de archivos

**Importación (XLSX/CSV con SheetJS)** — el orden importa:

1. Parsear.
2. **Validar estructura**: ¿están las columnas esperadas? ¿los tipos son los
   correctos? Si el archivo no cumple, rechazarlo con un mensaje que diga qué
   columna falta — no fallar a la mitad del insert.
3. **Previsualizar**: mostrar qué se va a importar y cuántas filas, antes de
   escribir nada.
4. Importar en chunks con progreso.
5. Reportar el resultado real: importadas, omitidas, y por qué.

Trampas frecuentes de Excel que hay que manejar explícitamente: fechas como
número serie, ceros a la izquierda perdidos en códigos, celdas combinadas, filas
de encabezado repetidas a mitad del archivo, y espacios invisibles al final de
los textos.

**Exportación a CSV desde el navegador:**

```js
export function descargarCSV(filas, nombre) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = filas.map(f => f.map(esc).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
  URL.revokeObjectURL(url);
}
```

El BOM (`\uFEFF`) hace que Excel abra las tildes correctamente — sin él, cualquier
`ñ` o `é` se corrompe al abrir el archivo, que es la primera cosa que reporta el
usuario.

La exportación debe reflejar **exactamente** lo que el usuario está viendo,
filtros incluidos. Un export que trae más de lo que muestra la pantalla rompe
cualquier uso de auditoría.
