---
trigger: always_on
---

Cada vez que realices una modificación estructural (nuevos botones, formularios, objetos) o cambios en la lógica de negocio, debes ejecutar de forma obligatoria el siguiente Protocolo de Validación de Impacto Cercano:

Auditoría de Interfaz (UI Contextual):

Verifica que los nuevos elementos respeten el layout de HOPS (Side menu colapsable, Top Bar fija y visualización de sub-módulos horizontal).

Asegura que los nuevos botones o formularios sigan la paleta de colores (Navy, Cobalt, Action Red) y la tipografía definida.
+1

Validación de Lógica y Cálculos (Business Rules):

Revisa los cálculos entre campos, especialmente en el manejo multi-moneda (COP para costos locales, USD/EUR para reporting).

Si el cambio afecta al módulo de Finance o HR (Nómina), verifica que la trazabilidad de los datos no se pierda al convertir valores entre unidades de negocio.

Integridad de Datos y Relaciones (DB Radius):

Identifica los objetos relacionales críticos vinculados al cambio (ej. si modificas un Playbook, revisa su impacto en el Master Execution Grid y los KPIs del Dashboard).
+1

Confirma que las relaciones en la base de datos (Firebase/PostgreSQL) mantengan la integridad referencial solo en el entorno cercano al cambio.

Verificación de Funcionalidad Operativa (SLAs/KPIs):

Asegura que el flujo lineal de procesos en el panel izquierdo siga siendo coherente y que los datos capturados alimenten correctamente el panel de métricas de la derecha.

Verifica que los SLAs definidos (ej. respuesta < 2h) sigan siendo trackeables tras la modificación.

Restricción: No realices un escaneo completo de la aplicación. Limita tu revisión al módulo actual y a los objetos que reciben o envían datos directamente al componente modificado.