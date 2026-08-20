# Matriz de rastreabilidade

Legenda de implementação nesta etapa:

- **ok** — coberto por tela/API/tabela atuais
- **schema** — tabela/RLS prontos; CRUD de negócio ainda não
- **stub** — ponto de extensão (scheduler), sem regra completa
- **auth** — Supabase Auth (não é tabela de senha)
- **extra** — existe no código, fora dos documentos oficiais
- **gap** — requisito oficial sem dado ou integração ainda

| UC | RF | BPMN | Frontend | Backend | Banco | API |
|---|---|---|---|---|---|---|
| Fazer Login | RF-002, RF-003 | Login + validar | `/login` | JWT JWKS | `auth.users` + `usuario` | Auth client; `/api/users/me` |
| Validar Credenciais | RF-003 | Validar credenciais | Supabase Auth | JwtStrategy | `auth.users` | — |
| Recuperar Senha | RF-004 | — (extend login) | `/forgot-password` | Auth | `auth.users` | — |
| Gerenciar Conta | RF-001, RF-005 | Cadastro | `/register`; perfil mínimo | `UsersService` | `usuario` | `GET/PATCH /api/users/me` |
| (regra) Auth obrigatória | RF-006 | Acesso interno | `ProtectedRoute` | `JwtAuthGuard` | RLS | Bearer |
| Gerenciar Carteira | RF-007 | Sub Gerenciar Carteira | `/carteiras` | `CarteirasModule` | `carteira` | `/api/carteiras` |
| Registrar Receita | RF-008 | Adicionar receita | `/transacoes` | `TransacoesModule` | `transacao` tipo RECEITA | `POST /api/transacoes` |
| Registrar Despesa | RF-009 | Adicionar despesa | `/transacoes` | `TransacoesModule` | `transacao` tipo DESPESA | `POST /api/transacoes` |
| Gerenciar Categorias | RF-010 | Selecionar categoria | `/categorias` | `CategoriasModule` | `categoria` | `/api/categorias` |
| Visualizar Transações | RF-011 | — | `/transacoes` | `TransacoesModule` | `transacao` | `GET /api/transacoes` |
| Atualizar Saldo | RF-012 | Atualizar saldo | lê `saldoAtual` | trigger + leitura | `carteira.saldo_atual` | GET carteira |
| Atualizar dashboard | RF-013 | Atualizar dashboard | `/` | `DashboardModule` | agrega `transacao`/`carteira` | `GET /api/dashboard/summary` |
| Gerenciar Metas | RF-014–017 | Sub Metas | `/metas` | `MetasModule` | `meta`, `progresso_meta` | `/api/metas` |
| Gerenciar Orçamento | RF-018–023 | Sub Orçamento | `/orcamentos` | `OrcamentosModule` | `orcamento`, `orcamento_categoria` | `/api/orcamentos` |
| Conteúdo educativo | RF-024–027 | Sub Conteúdo | — | — | `conteudo`, `usuario_conteudo` **schema** | — |
| Simulação de juros | RF-028 | Sub Simulação | — | — | `simulacao_juros` **schema** | — |
| Relatórios e gráficos | RF-029–033 | Sub Relatórios | `/` período + gráfico | `DashboardModule` | `transacao` | `/api/dashboard/summary` |
| Gerenciar notificações | RF-034 | — | — | `NotificacoesModule` **stub** | `notificacao` **schema** | — |
| Verificar contas vencendo | RF-035 | Timer 24h | — | cron **stub** / **gap** D-010 | sem `data_vencimento` | — |
| Enviar notificação | RF-036 | Enviar notificação | — | **stub** | `notificacao` | — |
| Notificação e-mail | RF-037 | extend | — | **gap** (sem provedor) | — | — |
| Notificação sistema/push | RF-038 | extend | — | **gap** (sem push) | `notificacao` | — |
| Taxas/moedas públicas | RF-039 | Info pública | — | — | `moeda`, `taxa` RLS público **schema** | — |
| Retorno ao dashboard | RF-040 | Todos os subprocessos | nav layout | — | — | — |
| Sair | RF-041 | Sair | signOut | — | — | — |
| *(não oficial)* Investments | — | — | `/investments` **extra** | `InvestmentsModule` **extra** | `investments` **extra** | `/api/investments` |
