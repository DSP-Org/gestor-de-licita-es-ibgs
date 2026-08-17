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

<!-- egc:start -->
## EGC Project Memory

**Context:** Migração de escopo de dados: de usuário individual para unidade de negócio (business unit). Cada usuário passa a pertencer a 1 unidade; dados (Licitacao, BuscaSalva, FavoritaLista, Destinatario) são compartilhados entre todos os membros da mesma unidade. Acesso dentro da unidade é flat (sem hierarquia por enquanto).

**Active decisions:**
- Nova entidade UnidadeNegocio (base44/entities/UnidadeNegocio.jsonc) + campo unidade_negocio_id em User e nas 4 entidades com dono.
- RLS das 4 entidades reescrito usando {{user.data.unidade_negocio_id}} comparado a data.unidade_negocio_id do registro, com bypass para o master (nailton.alsampaio@gmail.com).
- usuario_id/created_by_id mantidos nos schemas como legado/informativo (não removidos), mas não controlam mais RLS.
- Seletor do master no Layout trocou de 'escolher usuário' para 'escolher unidade'.
- Renomeado src/lib/escopoUsuario.js -> escopoUnidade.js e src/lib/UserFilterContext.jsx -> UnidadeFilterContext.jsx (hook useUnidadeFilter).

**Next session:**
- Rodar a função migrarUnidadesNegocio (botão em Usuarios.jsx) contra os dados reais - requer confirmação explícita do usuário antes, é escrita em massa em produção.
- Aplicar/publicar as mudanças de schema (base44/entities/*.jsonc, novo UnidadeNegocio) no backend hospedado do base44 - código local não basta, precisa do fluxo de deploy do base44 CLI/plataforma.
- Testar no navegador com o backend atualizado: seletor de unidade no Layout, criação de unidade/usuário em Usuarios.jsx, RLS efetivo (usuário de uma unidade não vê dados de outra).
- typecheck/lint já passam (únicos erros de typecheck são pré-existentes em Login.jsx/OAuthConsent.jsx/Register.jsx/ResetPassword.jsx e base44.users.inviteUser, não relacionados a esta mudança).
<!-- egc:end -->
