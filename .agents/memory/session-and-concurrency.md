---
name: Session and concurrency choices
description: Durable security and consistency choices for the balance number system.
---

Participant identity is carried by a signed, HTTP-only cookie, but ownership is enforced only by PostgreSQL state. The participant row lock plus unique selected-number constraint is the final authority for one-user/one-number behavior.

**Why:** Browser state alone cannot prevent modified requests, refresh races, or two users claiming the same number at once.

**How to apply:** Preserve the database constraints and transactional selection path when changing the public flow or adding alternate clients.