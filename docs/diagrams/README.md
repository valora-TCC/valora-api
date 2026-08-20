# Diagramas do Valora

Artefatos editáveis versionados com o código. Fonte dos requisitos: documentos oficiais do projeto (Caso de Uso, BPMN, DER, Modelo Físico 2.0).

## Inventário

| Diagrama | Arquivo | Formato | Abrir / editar |
|---|---|---|---|
| Caso de uso | [use-case/valora-use-case.puml](use-case/valora-use-case.puml) | PlantUML | [PlantUML online](https://www.plantuml.com/plantuml), VS Code PlantUML, `plantuml` CLI |
| Processo | [bpmn/valora-process.bpmn](bpmn/valora-process.bpmn) | BPMN 2.0 XML | [Camunda Modeler](https://camunda.com/download/modeler/), [bpmn.io](https://demo.bpmn.io/) |
| DER | [er/valora-der.mmd](er/valora-der.mmd) | Mermaid ER | GitHub/GitLab preview, [Mermaid Live](https://mermaid.live), extensão Markdown |
| Modelo físico | [physical-model/valora-physical-model.mmd](physical-model/valora-physical-model.mmd) | Mermaid ER | Idem DER |

## Como renderizar

PlantUML (se o CLI estiver instalado):

```powershell
plantuml docs/diagrams/use-case/valora-use-case.puml
```

Mermaid (extensão no editor ou Mermaid Live). Não há CLI no repositório.

BPMN: abrir o `.bpmn` no Camunda Modeler ou em https://demo.bpmn.io/ (Open files). Não é uma imagem estática.

## Manutenção

1. Alterar primeiro o PDF oficial (fonte).
2. Atualizar o arquivo editável correspondente.
3. Se a mudança divergir de outro diagrama, registrar em [architecture/diagram-decisions.md](../architecture/diagram-decisions.md) — não “consertar” o oficial em silêncio.
4. Atualizar [requirements/traceability.md](../requirements/traceability.md) se casos de uso, APIs ou tabelas mudarem.

## Validação local

Nesta etapa o ambiente pode não ter `plantuml` nem validador BPMN CLI. Se a renderização local falhar, use as ferramentas web acima. Não instalar suítes pesadas só para preview.
