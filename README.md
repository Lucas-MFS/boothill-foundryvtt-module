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

Arraste o item do diretório para a ficha do personagem para criar uma cópia em `actor.items`, pelo comportamento nativo de `ActorSheetV2`. Um modelo pode ser usado por vários personagens, cada um com sua munição independente. A seção **Armamento** permite abrir a cópia e empunhá-la; **Nova arma** cria diretamente no personagem. Não existe campo de proprietário nem seletor para associar uma arma a um único personagem. O Foundry criou um backup do mundo Boothill antes de abrir a versão 0.2.0.

Os atributos foram reduzidos de 46 para 32 px, e o checkbox de ambidestria tem um desenho próprio para não herdar os ícones sobrepostos do tema.

## Ficha compacta de arma — 0.2.1

Janela de 540 × 520, imagem quadrada de 64 × 64 ao lado do título, campos numéricos de 54 px e observações recolhíveis. Clique na imagem para usar o seletor nativo `editImage` do Foundry, que grava em `Item.img`. O seletor de personagem foi removido. Referência do comportamento nativo de inventário: https://foundryvtt.com/article/items/ e API v13 de ActorSheetV2. Itens podem ser arrastados do diretório para o personagem, e as linhas do inventário também usam `toDragData` pelo manipulador herdado.

## Empunhadura, saúde e tiros — 0.3.0

O corpo usa uma grade de cinco colunas: atributos nas três primeiras, perícias de armas nas duas restantes acima; armamento abaixo dos atributos, saúde na quarta coluna e trabalho na quinta. A seleção de trabalho continua disponível pela engrenagem.

Armas têm empunhadura de uma ou duas mãos. Rifles, carabinas, espingardas e escopetas exigem duas; revólveres e pistolas admitem uma (ou duas, se configuradas). Os hooks de criação/atualização de itens impedem exceder duas mãos, inclusive pela ficha do item. Itens recebidos no inventário quando não há mãos livres entram guardados. Armas antigas deduzem a empunhadura pelo modelo até serem editadas.

A saúde mantém quantidades de ferimentos leves e sérios em nove regiões (com silhueta vetorial própria), separadas dos pontos reais e temporários de dano. Os pontos somam para o limite de Força; atingir o limite exibe **Desmaiado** e bloqueia disparos. Cada ferimento leve aplica −1 à precisão; cada sério, −4. A recuperação, mortalidade e restrições específicas por membro serão tratadas na etapa de resolução de ferimentos. Temporários de briga não foram distribuídos por região, pois as regras os tratam como uma reserva de pontos; seus efeitos após a briga ficam a cargo do Juiz por enquanto.

Cada arma empunhada oferece tiros Mirado, Firme, de Saque e Seguido (este último apenas para revólveres). As bases são Coordenação, teto(Coordenação/2), piso(Coordenação/4) e máximo(1, Pistola); a perícia é somada aos três primeiros. **Usar duas armas** aplica −6 a ambas, conforme escolha expressa do usuário e PDF; a mão secundária sofre −2 adicional salvo ambidestria. **Trocar mãos** muda a principal. Segurar duas armas com a opção desmarcada permite atirar com uma de cada vez, sem a penalidade de disparo duplo.

O alcance selecionado aplica os modificadores tabelados e espingardas/escopetas recebem +2/+4. O diálogo do Juiz recebe os ajustes adicionais. Cada clique rola um único d20 e consome uma bala, registra a decomposição da chance no chat e confirma Sorte nos extremos. Os lances aparecem nas dicas dos botões; o sistema ainda não impõe cadência no rastreador. Um 20 natural lembra de verificar defeito; não automatizamos a tabela de defeitos, localização, gravidade ou dano nesta etapa. Nenhum alvo é ferido automaticamente. Referência: PDF fornecido, páginas físicas 23–25, 38, 42 e 68–69.

## Ajustes de uso — 0.3.1

As listas de perícias e tabelas têm linhas alternadas. A seleção de treinamento usa checkboxes próprios com espaço reservado; o dado junto ao nome testa a perícia. Gerar um novo nível fica disponível apenas com a engrenagem aberta.

No personagem, a coluna Mãos deu lugar à recarga. A munição pode ser editada diretamente, limitada pela capacidade; editar reinicia o progresso de recarga. O botão de recarga avança um turno e mostra quantos faltam, preservando o mecanismo e o progresso de cada arma. A ficha do item continua contendo empunhadura.

Clique normal em atributo, perícia ou tiro resolve imediatamente; Shift+clique abre o modificador do Juiz. A decomposição da conta aparece em texto pequeno e suave no chat. Rapidez por arma publica o valor calculado, sem dado aleatório: Coordenação + arma + ferimentos + movimento −2 ao usar duas armas. Shift também permite ajustá-la. Não substitui a regra especial de saque rápido.

A seleção de movimento modifica rapidez (andar/trotar −1; correr/galopar −3) e tiro (correr/trotar −2; galopar −4; não se atira esquivando). O deslocamento mostra metros por turno de combate (6 s) e por lance de tiroteio (1 s). Cada ferimento na perna reduz distâncias a pé pela metade; sério na perna impede correr/esquivar, nas duas pernas permite apenas rastejar. Sérios em outras regiões reduzem correr/esquivar pela metade. Rastejar e os valores de uma montaria saudável permanecem como tabelados. Terreno e ferimentos do animal são manuais. Referência: PDF fornecido, páginas físicas 28–30 e 33–35.
