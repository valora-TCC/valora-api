# Requisitos funcionais

Derivados exclusivamente da Documentação de Caso de Uso 2.0 e da Documentação BPMN 2.0. Itens marcados **[derivado]** vêm de regra ou fluxo, não de um caso de uso nomeado.

Investments existentes no código **não** geram RF.

## Acesso e segurança

| ID | Requisito | Origem |
|---|---|---|
| RF-001 | Cadastro de usuário para quem ainda não possui conta | BPMN cadastro; [derivado] |
| RF-002 | Login no sistema | UC Fazer Login |
| RF-003 | Validação das credenciais informadas | UC Validar Credenciais (`<<include>>`) |
| RF-004 | Recuperação de senha | UC Recuperar Senha (`<<extend>>`) |
| RF-005 | Gerenciamento da conta do usuário | UC Gerenciar Conta |
| RF-006 | Funcionalidades internas exigem autenticação | Regra de negócio 1; BPMN |

## Gestão financeira

| ID | Requisito | Origem |
|---|---|---|
| RF-007 | Gerenciar uma ou mais carteiras do titular | UC Gerenciar Carteira; RN 2 |
| RF-008 | Registrar receita vinculada a carteira e categoria | UC Registrar Receita; RN 3 |
| RF-009 | Registrar despesa vinculada a carteira e categoria | UC Registrar Despesa; RN 3 |
| RF-010 | Gerenciar categorias de receita e despesa | UC Gerenciar Categorias |
| RF-011 | Visualizar transações | UC Visualizar Transações |
| RF-012 | Atualizar automaticamente o saldo da carteira após movimentação | UC Atualizar Saldo (`<<include>>`); RN 4 |
| RF-013 | Atualizar o dashboard após alterações financeiras | BPMN Gerenciar Carteira; [derivado] |

## Planejamento e metas

| ID | Requisito | Origem |
|---|---|---|
| RF-014 | Gerenciar metas financeiras | UC Gerenciar Metas |
| RF-015 | Definir meta (valor e prazo) | UC Definir Meta; BPMN Metas |
| RF-016 | Acompanhar progresso da meta | UC Acompanhar Progresso |
| RF-017 | Registrar progresso da meta | UC Registrar Progresso |

## Orçamento

| ID | Requisito | Origem |
|---|---|---|
| RF-018 | Gerenciar orçamento mensal | UC Gerenciar Orçamento Mensal; RN 6 |
| RF-019 | Definir categorias do orçamento | UC Definir Categorias do Orçamento |
| RF-020 | Definir limites por categoria | UC Definir Limites |
| RF-021 | Lançar/registrar gastos no contexto do orçamento | UC Lançar/Registrar Gastos |
| RF-022 | Comparar gastos com limites | UC Comparar Gastos com Limites |
| RF-023 | Visualizar status do orçamento | UC Visualizar Status do Orçamento |

## Educação financeira

| ID | Requisito | Origem |
|---|---|---|
| RF-024 | Gerenciar conteúdo educativo | UC Gerenciar Conteúdo Educativo |
| RF-025 | Listar conteúdos | UC Listar Conteúdos |
| RF-026 | Acessar conteúdo | UC Acessar Conteúdo |
| RF-027 | Acompanhar progresso de consumo do conteúdo | UC Acompanhar Progresso; RN 7 |

## Simulação

| ID | Requisito | Origem |
|---|---|---|
| RF-028 | Realizar simulação de juros (valor, taxa, tempo, resultado) | UC Realizar Simulação de Juros; BPMN 5.6 |

## Relatórios

| ID | Requisito | Origem |
|---|---|---|
| RF-029 | Gerar relatórios e gráficos | UC Gerar Relatórios e Gráficos |
| RF-030 | Selecionar período | UC Selecionar Período |
| RF-031 | Buscar/filtrar dados financeiros | UC Buscar/Filtrar Dados; RN 9 |
| RF-032 | Gerar gráficos | UC Gerar Gráficos |
| RF-033 | Exibir relatórios | UC Exibir Relatórios |

## Notificações

| ID | Requisito | Origem |
|---|---|---|
| RF-034 | Gerenciar notificações | UC Gerenciar Notificações |
| RF-035 | Verificar contas próximas do vencimento a cada 24 horas | UC Verificar Contas Vencendo; BPMN processo paralelo |
| RF-036 | Enviar notificação quando houver contas vencendo | UC Enviar Notificação |
| RF-037 | Notificação por e-mail (opcional) | UC Notificação por E-mail (`<<extend>>`) |
| RF-038 | Notificação no sistema / push (opcional) | UC Notificação no Sistema (`<<extend>>`) |

## Informações públicas e navegação

| ID | Requisito | Origem |
|---|---|---|
| RF-039 | Visualizar taxas e moedas sem autenticação | BPMN passo 2; [derivado] |
| RF-040 | Após cada subprocesso, permitir retorno ao dashboard | BPMN regra; [derivado] |
| RF-041 | Permitir sair do sistema ao finalizar operações | BPMN passo 12; [derivado] |

## Fora do escopo de RF (código legado)

- Carteira de investimentos e suas transações: implementado extra, sem UC/RF oficial (D-008).
