# 🏛️ SIMO Architecture Standards & Rules

1. **SERVICES LAYER FIRST:** Ningún archivo en `app/actions/` debe contener lógica de negocio compleja (ej. cálculos de FX, iteraciones de BD). Los Server Actions actúan ÚNICAMENTE como controladores (routers). Toda la lógica pesada debe vivir en `lib/services/`.
2. **END-TO-END TYPE SAFETY:** Prohibido escribir tipos de base de datos a mano. Todo tipado debe provenir del archivo autogenerado `lib/types/database.types.ts`.
3. **TRIPLE SHIELD VALIDATION OBLIGATORIO:** Todo input de usuario debe pasar por:
   - *Escudo 1 (UI):* Restricción de teclado en componentes (ej. type="number").
   - *Escudo 2 (Zod):* Validación estricta en el Server Action usando esquemas Zod que hereden del tipado de Supabase.
   - *Escudo 3 (DB):* Tipos estrictos en las columnas de Supabase.
4. **NO HARDCODED STRINGS:** Todo texto visible para el usuario debe consumirse desde diccionarios de i18n.
