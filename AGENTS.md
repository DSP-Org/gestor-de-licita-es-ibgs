# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Protocolo de Sincronização Obrigatória (Equipe Data5)
Todos os agentes trabalhando neste repositório (Antigravity, Claude Code, AGY) devem:
1. **Ler o arquivo `EQUIPE_DATA5.md`** no início de qualquer ciclo para verificar tarefas e decisões da equipe.
2. Respeitar o direcionamento de arquitetura do Arquiteto Chefe (Antigravity) e as arbitragens do usuário (Sampaio).
3. Registrar novas descobertas, status de entregas e dúvidas no fim de `EQUIPE_DATA5.md` (append-only).


<!-- egc:start -->
## EGC Project Memory

**Context:** Gestor de Licitacoes IBGS - Implementado Kanban com drag-and-drop, badges de urgencia de pregoes e filtro de passadas em MinhasLicitacoes.jsx

**Active decisions:**
- Implementação de KanbanFunil desacoplado com @hello-pangea/dnd
- Criação do módulo prazosLicitacao e BadgeUrgencia com suporte ao timezone de SP

**Next session:**
- Aguardar feedback de Claude Code e AGY no EQUIPE_DATA5.md sobre as entregas
- Desenvolver Frente 4 de ações em lote ou refinamento de filtros se aprovado
<!-- egc:end -->
