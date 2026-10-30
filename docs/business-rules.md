# Business Rules

## UI / Design

### Badges con ícono/texto y porcentaje
- Siempre en una sola fila (`whitespace-nowrap`, `inline-flex items-center`).
- Padding estándar: `px-2.5 py-1` para badges normales, `px-2 py-px` para badges compactos dentro de tablas.
- El fondo del badge **nunca** usa un color hardcodeado (ej. `bg-green-50`, `bg-blue-100`, o hex con opacidad `${color}22`).  
  Usar `bg-muted` (variable CSS) para que se adapte automáticamente al modo oscuro sin prefijos `dark:`.
- El color del texto sí puede usar clases de color (`text-green-600`) con su variante `dark:text-green-400` si es necesario.
- Si el badge representa una categoría con color propio, usar un punto de color (`size-2 rounded-full` con `style={{ background: color }}`) + texto truncado. No usar el color como fondo del badge.
- El elemento de la derecha (monto o porcentaje) siempre lleva `shrink-0` para no ser desplazado.
- El badge de la izquierda lleva `min-w-0 flex-1 truncate` si el texto puede ser largo.

### Listas de filas con acciones (UserRow, tablas, etc.)
- **Nunca usar `overflow-hidden` en el wrapper de una lista de filas** si las filas tienen botones de acción. El `overflow-hidden` recorta los iconos/botones que quedan en el borde derecho.
- Los corners redondeados del card se logran con `rounded-lg` en el wrapper; `overflow-hidden` solo es necesario si un hijo tiene fondo que desborda (ej. imágenes). Si los hijos son solo texto y borderes, omitirlo.
- En la fila, el panel derecho (badges + botones) no debe tener `shrink-0`; usar `min-w-0` para permitir que el flex row reparta correctamente el espacio disponible.
- El contenedor de la fila siempre debe tener `flex-wrap` (no `sm:flex-nowrap`) para que en pantallas medianas el panel derecho baje limpiamente en lugar de desbordarse.

### Selects con icono personalizado
- Usar siempre `appearance-none` en `<select>` para quitar la flecha nativa del navegador.
- Envolver en un `<div className="relative">` y agregar `<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />`.
- Padding: `pl-2 pr-7` para dejar espacio al ícono sin que el select se ensanche innecesariamente.

### Filtros con floating label que hacen wrap
- El contenedor de filtros debe tener `gap-x-2 gap-y-5` (más gap vertical que horizontal).
- Agregar `pt-5 pb-3` al contenedor para que la floating label del primer row tenga espacio arriba.
- La floating label se posiciona en `absolute -top-2.5`, por lo que el `gap-y` entre rows debe ser ≥ 20 px.

### Modo oscuro
- Preferir variables CSS de shadcn/ui (`bg-muted`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) sobre colores Tailwind hardcodeados.
- Cuando se usan colores hardcodeados, agregar siempre la variante `dark:`, ej. `text-red-600 dark:text-red-400`.
- Los fondos translúcidos con hex (`#RRGGBBAA`) no se adaptan al tema; reemplazarlos con `bg-muted` o un color sólido.
