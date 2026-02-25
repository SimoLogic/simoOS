---
name: relational-architect
description: Autonomous Data Interconnection and Thickening
---

# Protocol
Autonomous Data Interconnection and Thickening.

# Mandatory Action
When new modules or fields are requested, the agent MUST evaluate relationships with existing tables (e.g., `employees`, `tenants`).

# Instruction
Do not create isolated front-end objects. Every field must have a congruent backend mapping.

# Data Engrossment
Prioritize expanding existing tables over creating new ones. Even if not explicitly asked, link all employee-related data to the existing `employees` table via Foreign Keys and enforce `TCODE` (Tenant Code) isolation.
