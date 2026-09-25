---
name: Drizzle error wrapping
description: PostgreSQL constraint errors can be wrapped by Drizzle before reaching route handlers.
---

PostgreSQL unique-constraint failures may arrive in a Drizzle error's nested `cause`, not on the top-level error. Route-level conflict handling must inspect the cause chain before returning a generic server error.

**Why:** Missing the wrapped `23505` code turns expected duplicate-name or duplicate-number conflicts into 500 responses.

**How to apply:** When mapping database conflicts to user-facing API errors, unwrap a bounded cause chain and handle known PostgreSQL codes explicitly.