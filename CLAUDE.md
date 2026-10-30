# Claude Code — Guía del proyecto finance-flow

## Reglas generales

### Commits y push
- **Nunca hacer commit ni push a menos que el usuario lo indique explícitamente.**
- Cuando se pida commit, incluir siempre la línea de atribución:  
  `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

### Iteración de features
Antes de tocar cualquier componente visual, revisar `docs/business-rules.md`.  
Las reglas allí definidas aplican a **todos** los componentes nuevos o modificados.

---

## Stack técnico

- **Framework**: Next.js (App Router, Server + Client Components)
- **Monorepo**: Turborepo + pnpm
- **DB**: Drizzle ORM + Neon (PostgreSQL serverless)
- **Auth**: Clerk
- **UI**: shadcn/ui (`packages/ui`) + Tailwind CSS v4
- **Temas**: `next-themes`, modo oscuro por clase `.dark` en `<html>`
  - Variante personalizada: `@custom-variant dark (&:is(.dark *))`

## Serialización server → client

Los componentes de servidor pasan datos a componentes de cliente (`*Client.tsx`).  
- `Date` → ISO string con `new Date(val).toISOString()`  
- `Map` → `Record<string, T>` con `??=` para evitar errores de TypeScript sobre index signatures

## Componentes de tabla / lista

Cada vista de datos sigue el patrón:
1. **Server page**: solo fetching + serialización → pasa props al `*Client.tsx`
2. **Client component** (`*Client.tsx`): búsqueda, filtros, paginación, tabs
3. **Layout**:
   - Mobile (`block md:hidden`): tarjetas por fila
   - Desktop (`hidden md:block`): tabla con `overflow-x-auto` y `min-w-[Xpx]`
   - Barra de scroll espejo (superior) solo cuando `scrollWidth > clientWidth`
4. **Paginación**: opciones 10 / 20 / 50 / Todos
5. **Filtros**: selects con floating label, botón "Limpiar"

## Dark mode — reglas de color

Ver `docs/business-rules.md` para el detalle completo.  
Resumen rápido:
- Fondos de badges → `bg-muted` (nunca `bg-green-50`, `bg-blue-100`, ni hex con opacidad)
- Badges de categoría con color propio → punto de color + texto, fondo `bg-muted`
- Badges de tendencia (▲▼%) → `whitespace-nowrap inline-flex items-center`, fondo `bg-muted`
