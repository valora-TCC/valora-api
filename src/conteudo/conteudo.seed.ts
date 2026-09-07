export type ConteudoSeedItem = {
  slug: string;
  titulo: string;
  descricao: string;
  corpo: string;
  nivel: 'iniciante' | 'intermediario' | 'avancado';
  tipo: string;
  ordem: number;
  url?: string;
};

export const CONTEUDO_SEED: ConteudoSeedItem[] = [
  {
    slug: 'reserva-de-emergencia',
    titulo: 'Como criar uma reserva de emergência',
    descricao:
      'Entenda por que guardar de 3 a 6 meses de despesas é o primeiro passo da segurança financeira.',
    nivel: 'iniciante',
    tipo: 'article',
    ordem: 1,
    url: 'https://www.gov.br/cvm/pt-br/assuntos/educacao',
    corpo: `A reserva de emergência é um valor guardado para imprevistos: desemprego, saúde, consertos urgentes.

## Quanto guardar?
Em geral, o equivalente a **3 a 6 meses** das suas despesas mensais essenciais.

## Onde deixar?
Prefira liquidez e baixo risco (ex.: conta remunerada, Tesouro Selic ou CDB com liquidez diária). O objetivo não é rentabilidade máxima, e sim disponibilidade.

## Como começar
1. Some gastos fixos do mês.
2. Defina uma meta (ex.: 3× esse valor).
3. Automatize transferências mensais até atingir a meta.`,
  },
  {
    slug: 'orcamento-pessoal',
    titulo: 'Orçamento pessoal: organize receitas e despesas',
    descricao: 'Aprenda a registrar para onde vai o dinheiro e a planejar o mês com clareza.',
    nivel: 'iniciante',
    tipo: 'article',
    ordem: 2,
    corpo: `Orçamento pessoal é o mapa do seu dinheiro: quanto entra, quanto sai e o que sobra.

## Passos práticos
1. Liste todas as receitas (salário, freelas, rendas).
2. Categorize despesas (moradia, alimentação, transporte, lazer).
3. Compare com o que você realmente gasta no Valora.
4. Ajuste limites de orçamento por categoria.

## Regra 50/30/20 (exemplo)
- 50% necessidades
- 30% desejos
- 20% poupança e metas

Use as telas de **Transações** e **Orçamento** do Valora para colocar isso em prática.`,
  },
  {
    slug: 'controle-de-gastos',
    titulo: 'Controle de gastos no dia a dia',
    descricao: 'Hábitos simples para evitar vazamentos no orçamento e gastar com intenção.',
    nivel: 'iniciante',
    tipo: 'article',
    ordem: 3,
    corpo: `Controlar gastos não significa nunca se divertir — significa saber **por que** você gasta.

## Dicas
- Registre despesas no mesmo dia.
- Revise o Dashboard semanalmente.
- Identifique categorias que crescem sem perceber (delivery, assinaturas).
- Separe “quero” de “preciso” antes de comprar.

Pequenas economias recorrentes fazem diferença composta ao longo do ano.`,
  },
  {
    slug: 'juros-simples-e-compostos',
    titulo: 'Juros simples e juros compostos',
    descricao:
      'A diferença entre calcular juros só sobre o capital e sobre o capital acrescido de juros.',
    nivel: 'iniciante',
    tipo: 'article',
    ordem: 4,
    corpo: `## Juros simples
Os juros incidem apenas sobre o valor inicial.
Exemplo: R$ 1.000 a 1% ao mês por 12 meses ≈ R$ 120 de juros.

## Juros compostos
Os juros incidem sobre o valor acumulado (capital + juros anteriores). É o “juros sobre juros”.
No longo prazo, a diferença é enorme — a favor de quem investe e contra quem se endivida.

Use a área de **Simulações** do Valora para comparar cenários com taxas reais (Selic/CDI).`,
  },
  {
    slug: 'o-que-e-inflacao',
    titulo: 'O que é inflação (e o IPCA)',
    descricao: 'Por que o dinheiro perde poder de compra e como o IPCA mede isso no Brasil.',
    nivel: 'iniciante',
    tipo: 'article',
    ordem: 5,
    url: 'https://www.bcb.gov.br/',
    corpo: `Inflação é a alta generalizada de preços. Com o tempo, o mesmo salário compra menos.

No Brasil, o **IPCA** (IBGE) é o índice oficial de inflação ao consumidor. O Banco Central usa a meta de inflação como referência de política monetária.

## Por que importa?
- Seu salário precisa acompanhar a inflação.
- Investimentos precisam render **acima** da inflação para gerar ganho real.
- Acompanhe o IPCA na seção de indicadores desta área.`,
  },
  {
    slug: 'o-que-e-selic-e-cdi',
    titulo: 'O que são Selic e CDI',
    descricao:
      'As taxas que influenciam crédito, poupança e a maior parte da renda fixa no Brasil.',
    nivel: 'intermediario',
    tipo: 'article',
    ordem: 6,
    url: 'https://www.bcb.gov.br/',
    corpo: `## Selic
É a taxa básica de juros da economia, definida pelo Copom (Banco Central). Influencia empréstimos, crédito e investimentos.

## CDI
Taxa de empréstimos entre bancos. Quase sempre acompanha a Selic. Muitos CDBs e fundos de renda fixa rendem um percentual do CDI (ex.: 100% do CDI).

## Na prática
Quando a Selic sobe, a renda fixa pós-fixada tende a render mais — e o crédito fica mais caro.
Veja os valores atuais nos indicadores e experimente nas simulações.`,
  },
  {
    slug: 'renda-fixa-cdb',
    titulo: 'Renda fixa e CDB',
    descricao: 'Como funcionam investimentos que pagam juros previsíveis, como o CDB.',
    nivel: 'intermediario',
    tipo: 'article',
    ordem: 7,
    corpo: `Na renda fixa, você empresta dinheiro a um banco, ao governo ou a uma empresa e recebe juros.

## CDB
Certificado de Depósito Bancário. Pode ser:
- **Pré-fixado**: taxa definida no início.
- **Pós-fixado**: percentual do CDI.
- **Híbrido**: IPCA + spread.

Atenção a liquidez, prazo e cobertura do FGC (até o limite vigente por CPF/instituição).
Compare sempre o rendimento líquido com a inflação.`,
  },
  {
    slug: 'tesouro-direto',
    titulo: 'Tesouro Direto: títulos públicos',
    descricao: 'Emprestar ao governo federal via Tesouro Selic, Prefixado e IPCA+.',
    nivel: 'intermediario',
    tipo: 'article',
    ordem: 8,
    url: 'https://www.tesourodireto.com.br/',
    corpo: `O Tesouro Direto permite comprar títulos públicos federais pela internet.

## Principais tipos
- **Tesouro Selic**: acompanha a Selic; boa opção para reserva.
- **Tesouro Prefixado**: taxa fixa conhecida na compra.
- **Tesouro IPCA+**: protege da inflação + juros reais.

Há preço de mercado (marcação a mercado): vender antes do vencimento pode gerar ganho ou perda.
Veja títulos e taxas de referência na seção de dados reais desta área.`,
  },
  {
    slug: 'acoes-e-etfs',
    titulo: 'Ações e ETFs',
    descricao: 'Participação em empresas e fundos que replicam índices da bolsa.',
    nivel: 'avancado',
    tipo: 'article',
    ordem: 9,
    corpo: `## Ações
Frações do capital de uma empresa. O retorno vem de valorização e/ou dividendos — com risco de perda.

## ETFs
Fundos negociados em bolsa que seguem um índice (ex.: Ibovespa). Oferecem diversificação com uma única compra.

Renda variável exige horizonte longo, diversificação e tolerância a oscilações. Comece estudando antes de investir valores significativos.`,
  },
  {
    slug: 'fundos-de-investimento',
    titulo: 'Fundos de investimento',
    descricao: 'Como funciona a gestão coletiva e quais cuidados observar.',
    nivel: 'avancado',
    tipo: 'article',
    ordem: 10,
    corpo: `Em um fundo, vários cotistas reúnem recursos geridos por profissionais segundo uma política de investimento.

## Pontos de atenção
- Taxa de administração e performance
- Liquidez (prazo de resgate)
- Classificação de risco
- Histórico não garante retorno futuro

Leia a lâmina e o regulamento. Compare com alternativas simples (Tesouro, CDB) antes de escolher produtos complexos.`,
  },
  {
    slug: 'diversificacao-e-riscos',
    titulo: 'Riscos e diversificação',
    descricao: 'Não coloque todos os ovos na mesma cesta — e entenda os tipos de risco.',
    nivel: 'avancado',
    tipo: 'article',
    ordem: 11,
    corpo: `## Tipos de risco (exemplos)
- **Mercado**: preços oscilam.
- **Crédito**: o emissor pode não pagar.
- **Liquidez**: dificuldade de vender rápido.
- **Inflação**: perda de poder de compra.

## Diversificação
Distribuir entre classes (reserva, renda fixa, variável), prazos e emissores reduz o impacto de um único evento ruim.

Diversificar não elimina risco — apenas ajuda a gerenciá-lo.`,
  },
  {
    slug: 'planejamento-financeiro',
    titulo: 'Planejamento financeiro pessoal',
    descricao: 'Una orçamento, metas, reserva e investimentos em um plano coerente.',
    nivel: 'intermediario',
    tipo: 'article',
    ordem: 12,
    corpo: `Planejar é alinhar o dinheiro de hoje com a vida que você quer amanhã.

## Ordem sugerida
1. Orçamento e controle de gastos
2. Reserva de emergência
3. Quitação de dívidas caras
4. Metas de curto e médio prazo
5. Investimentos alinhados ao prazo e ao risco

No Valora, use **Metas**, **Orçamento** e **Investimentos** juntos com esta trilha educativa.`,
  },
];
