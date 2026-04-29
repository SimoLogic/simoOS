# 🌍 GLOBAL RULE: ENGLISH-ONLY UI (Mandatory Compliance)

**CRITICAL MANDATE:** ALL user-facing text, buttons, objects, graphics, pop-up windows, navigation elements, inputs, forms, modules, sub-modules, and pages developed within the HOPS / SIMO Intellisense ecosystem MUST be rendered EXCLUSIVELY in English.

## 1. Zero-Tolerance Translation Rule
- **Prompt Isolation:** It does not matter if the development prompt or user request is provided in Spanish, French, or any other language. The AI agent and developers must **always** translate the final UI output to English.
- **Prohibition:** No Spanish words, phrases, or sentences are allowed to be visible on the screen under any circumstance.
- **Scope of Enforcement:** This applies to labels, buttons, toast notifications, error messages, placeholders, tooltips, chart legends, table headers, breadcrumbs, and modal texts.

## 2. Authorized Exceptions
The ONLY scenarios where non-English text is permitted are:
- **Proper Nouns:** Names of real people, companies, entities, or brands (e.g., "HOMESI", "Bancolombia").
- **Explicit Hardcode Request:** When a prompt *literally* and *explicitly* requests a specific phrase to be shown in Spanish (e.g., "The button must say exactly 'Confirmar Pago'").

## 3. Developer & AI Agent Protocol
1. **Receive Prompt:** Read and understand the requirements (e.g., "Crea un botón que diga 'Guardar Cambios' y un alert de 'Operación Exitosa'").
2. **Translate Contextually:** Mentally translate the requested elements.
3. **Implement in English:** Write the code as:
   - `<Button>Save Changes</Button>`
   - `toast({ title: "Operation Successful" })`
4. **Audit Before Push:** Before finalizing the file or component, conduct a quick search for common Spanish terms to ensure zero bleed-through.

## 4. Why This is Global
SIMO Intellisense is an enterprise OS used by offshore teams in Colombia connecting with US and European clients. English is the unifier language for codebases and client-facing interfaces. Consistency is non-negotiable.
