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
