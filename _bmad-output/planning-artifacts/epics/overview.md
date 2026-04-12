# Overview

This document provides the complete epic and story breakdown for EM . U, decomposing requirements from the PRD and Architecture into implementable stories.

**Development Approach: FE-First**

The FE team builds the complete frontend against MSW mocks. The BE team implements the real API only after all FE stories are done. This means:

- **Phase 1 — FE (current priority):** All of Epic 1 + the FE layer of every story across Epics 2–9
- **Phase 2 — BE:** The BE layer of every story across Epics 2–9, implemented in epic order

Each story below is annotated with `[Phase 1: FE]` and `[Phase 2: BE]` AC sections where applicable. Phase 1 ACs are implemented first against MSW. Phase 2 ACs replace the MSW with real Fastify routes, repositories, and services — no FE changes required (MSW is transparent).

---
