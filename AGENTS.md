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
Todos os agentes trabalhando neste repositório (Antigravity, Claude Code, AGY, Freebuff) devem:
1. **Ler o arquivo `EQUIPE_DATA5.md`** no início de qualquer ciclo (janela ativa enxuta da rodada atual).
2. Respeitar rigorosamente a atribuição de arquivos (LOCKs) e a governança do Arquiteto Chefe (Antigravity).
3. Registrar status de entregas ou impedimentos no final de `EQUIPE_DATA5.md`.

<!-- egc:start -->
## EGC Project Memory

**Context:** Gestor de Licitações IBGS (Licitalerta360). Base44 + Deno backend, React + Vite frontend. Multi-tenancy por unidade de negócio + Pipeline Kanban e gestão estratégica de oportunidades com equipe colaborativa Claude Code, AGY e Antigravity.

**Active decisions:**
- [Multi-tenancy]: Cada usuário pertence a 1 UnidadeNegocio; dados (Licitacao, BuscaSalva, FavoritaLista, Destinatario) são compartilhados por unidade com RLS reforçado no backend e bypass para master.
- [Sincronização & Timezone]: Fix no housekeeping (remoção de toArray no Deno) e fuso de SP garantido (hojeSP e -03:00) em entry.ts.
- [Minhas Licitações]: Pipeline Kanban interativo com drag-and-drop desacoplado (@hello-pangea/dnd), badges de urgência calculados via prazosLicitacao.js e filtro de disputas passadas.
- [Comunicação]: Protocolo de escuta ativa via EQUIPE_DATA5.md e script npm run watch:equipe.

**Next session:**
- Frente 4: Implementar ações em lote (Bulk Actions) nos modos Tabela e Cards em Minhas Licitações.
- Testar no navegador seletor de unidade e RLS efetivo.
<!-- egc:end -->
