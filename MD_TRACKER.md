# Standalone Refactor Tracker

| Task | Owner | Priority | Status | Notes | Dependencies |
| --- | --- | --- | --- | --- | --- |
| Replace Spark persistence with Recoil atoms and local storage effects | Frontend | High | In Progress | Create global state for backend, Neo4j, PLM, MDG, AI settings | Recoil setup
| Introduce Recoil root provider and remove `@github/spark/spark` | Frontend | High | Not Started | Update `main.jsx`, remove Spark dependency | None
| Refactor `AIServiceSettings` to use Recoil selectors | Frontend | High | Not Started | Move service mode + fallback to atoms | Recoil setup
| Refactor backend integration panels (`BackendConfigPanel`, `FDCConfigPanel`, `Neo4jConfigPanel`) | Frontend | High | Not Started | Use Recoil state + persist effect, remove mock toggles later | Recoil setup
| Implement backend environment save endpoints for config round-trip | Backend | High | Not Started | Persist to `env.local.json` and reload settings | Existing env service
| Remove Spark local shim + dependencies from Vite config | Frontend | Medium | Not Started | Replace icon proxy + shim; rely on real APIs | Atlas icons plan
| Update documentation for standalone setup (no Spark) | Docs | Medium | Not Started | Revise setup guides, emphasize Recoil + real connections | Completed refactor
| Add automated tests covering new Recoil state management | Frontend | Low | Not Started | Unit tests for selectors and persistence | Recoil setup |
