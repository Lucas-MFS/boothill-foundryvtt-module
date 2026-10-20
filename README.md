# Boot Hill — sistema independente para FoundryVTT 13

Apesar do nome histórico do repositório, este pacote é um **sistema de jogo**, com `system.json`, modelo próprio em `actor.system` e ficha de personagem. Não depende de outro sistema.

## Instalação

Copie este repositório para `Data/systems/boothill/` dentro da pasta de dados do usuário. Reinicie o Foundry quando conveniente e crie um **novo mundo** escolhendo Boot Hill. Crie um ator `character`. Não copie arquivos para o núcleo do Foundry nem substitua sistemas ou mundos existentes.

## Primeira etapa

Cinco atributos editáveis, geração pelo método 1, perícias de trabalho e armas, níveis persistentes, testes d20 com modificadores e confirmação de Sorte, contagem de escolhas iniciais e avisos de Literatura. Cada nível de arma conta uma escolha. Valores começam em 0 para indicar dados ainda não preenchidos.

Métodos 2 e 3 são manuais. Ataques, experiência e efeitos especiais de perícias ainda não são automatizados. Os níveis concedidos por Odontologia (Medicina 6) e Sondagem/Mapas (Orientação 6) devem ser acompanhados manualmente e não representam escolhas adicionais. Avisos de criação não bloqueiam evolução.

## Referência e divergência na tradução

PDF fornecido pelo usuário, páginas físicas 5–17. O livro anuncia 57 perícias de trabalho, mas a lista das páginas 10–11 contém 55 nomes. Natação, mencionada na página 9, foi incluída como campo editável: 56 perícias de trabalho e cinco de armas. A perícia restante não foi inventada. Não redistribuímos o livro nem reproduzimos suas descrições integralmente.

## Verificação

`npm test` executa testes de geração, escolhas iniciais e Sorte com Node.js 20+. A ficha foi conferida no mundo Boothill da VM (Foundry 13.351), com edição de identificação, atributo e perícia e testes d20 no chat. Nenhuma instalação remota é feita automaticamente pelos arquivos do projeto.

## Interface 0.1.1

Layout inspirado na ficha HTML fornecida pelo usuário: identificação com jogador, idade e ambidestria; atributos e armas em listas compactas; perícias de trabalho em três colunas. Clique no nome para testar e no pequeno dado para gerar um nível. As opções de criação ficam recolhidas no fim da ficha. Os campos existentes de atributos e perícias mantêm os mesmos caminhos de dados.

## Interface 0.1.2

Os cinco atributos agora aparecem lado a lado com valores maiores. A engrenagem junto ao título de perícias de trabalho alterna entre seleção de treinamento e exibição apenas das treinadas. A seleção fica salva por personagem em `system.trained`; desmarcar não apaga níveis. Fichas antigas reconhecem automaticamente como treinadas as perícias com nível acima de zero até uma seleção explícita. A contagem de escolhas e os pré-requisitos consideram essa seleção.

## Armas — 0.2.0

Na aba Itens, crie um item do tipo `weapon`. A ficha segue o estilo do personagem e contém nome, modelo, calibre, capacidade, munição carregada, taxa de recarga, alcances, rapidez, ferimento, equipamento e observações. Os 18 modelos de referência cobrem revólveres, pistolas, rifles, carabinas, espingarda e escopeta, com valores da Tabela 14 (PDF, páginas físicas 40–41). Trocar o modelo aplica os valores tabelados; eles podem ser personalizados depois, inclusive a capacidade de um ou dois canos.

A recarga completa é calculada por `ceil(capacidade / balas por etapa) × turnos por etapa`. Exemplos: revólver comum, 2 turnos; cápsula embutida, 18; rifle de manivela de 15 tiros, 8; escopeta de dois tiros, 1. Cada avanço manual de recarga representa um turno de combate (6 segundos). O progresso de recargas lentas fica salvo. O botão de gastar disparo só consome munição; não resolve ataques. Não há avanço automático pelo combate nem controle de munição de reserva nesta etapa.

Para vincular, selecione o personagem na própria ficha da arma e clique em **Adicionar arma**, ou arraste o item para a ficha do personagem. A seção **Armamento** permite abrir a cópia e equipá-la; **Nova arma** cria diretamente no personagem. As cópias têm munição independente do item original. O teste no Foundry confirmou criação pelo diretório, troca de modelos, recarga lenta, inclusão no personagem e munição independente. O Foundry criou um backup do mundo Boothill antes de abrir a versão 0.2.0.

Os atributos foram reduzidos de 46 para 32 px, e o checkbox de ambidestria tem um desenho próprio para não herdar os ícones sobrepostos do tema.
