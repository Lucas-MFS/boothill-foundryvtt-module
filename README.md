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
## Cartões de rolagem e miniaturas — 0.3.2

O armamento mostra `Item.img` em miniaturas quadradas, no inventário e nas armas empunhadas. Os testes de atributos, perícias e tiros compartilham um cartão no chat com título, chance / d20 e resultado verde ou vermelho. A base não aparece; apenas ajustes diferentes de zero são listados discretamente. Rapidez usa o mesmo estilo e também omite ajustes zero.

Sorte deixa de ser automática. Conforme as páginas físicas 10 e 25 do PDF, 1 natural com chance abaixo de 1 ou 20 natural com chance de 20 ou mais deixa o resultado pendente. **Rolar Sorte** resolve o d20 no mesmo cartão, usando a Sorte registrada no momento do teste. O autor da mensagem ou um GM pode concluir o teste; o botão desaparece ao resolver, inclusive após recarregar a página. Não há novo consumo de munição. O d20 original e o teste de Sorte permanecem nos dados de rolagem da mensagem. Mensagens com conteúdo oculto não recebem o cartão visível.

Validação: 17 testes, incluindo estados pendentes, resolução única, permissão e privacidade; verificação no navegador com sucesso, falha, ajuste manual, tiro e resolução de Sorte após um 20 natural.

## Ficha compacta e inventário — 0.4.0

Largura inicial de 912 px (redução de 20%). Saúde no topo da lateral direita, seguida de perícias de armas e trabalho. XP no cabeçalho. Clique na linha da arma ou use Enter/Espaço para expandir rapidez e tiros; botões e miniatura abrem/operam o item sem alternar a linha. Empunhadura usa ícone de punho.

Deslocamentos publicam a ação no chat e aplicam o movimento à precisão/rapidez. Em combate, o efeito termina ao mudar de rodada; fora dele, permanece até usar Encerrar movimento. O mesmo botão permite dispensa manual durante a rodada.

Inventário inclui todas as armas incorporadas ao ator e itens avulsos com quantidade e peso unitário em kg. Peso da arma é editado na ficha do item (inicial 0, deve ser preenchido). Total soma quantidade × peso; limite de carga é manual, pois não foi localizada uma fórmula explícita no PDF. Itens avulsos podem ser removidos e adicionados novamente para corrigir valores. Não automatiza penalidades de sobrecarga.

Os testes existentes passaram. Validação visual desta versão pendente: ferramenta do navegador indisponível durante esta atualização.
## Localização e gravidade — 0.5.0

Tiros acertados oferecem Determinar localização (d20). A silhueta habilita regiões alcançáveis pelo ajuste da Tabela 12, combinando perícia, tiro e alcance com arredondamento para baixo. A escolha rola d6 de gravidade com modificador regional (+1 peito/cabeça, −1 membros) e da arma. Resultado persiste no cartão, sem novo consumo de munição e sem aplicação automática ao alvo. Mortais lembram o teste de Sorte do alvo. 20 natural exige confirmação do Juiz de ausência de defeito antes de localização; a tabela de defeitos continua manual. Referência: PDF fornecido, páginas físicas 36–37. Seletor de alcance com espaçamento e cores do sistema. Validação: 21 testes automatizados; validação visual pendente.

## Targeting e aplicação de dano — 0.6.0

Ao rolar localização, um único token marcado em targeting é registrado no cartão. Após escolher a região e determinar a gravidade, o dano é aplicado automaticamente ao Actor daquele TokenDocument. Sem alvo único, Aplicar dano usa exatamente um token selecionado (controlado) pelo usuário que clica. Alvos sem estrutura de saúde são recusados. Mais de um alvo exige aplicação manual a um token selecionado.

Um Juiz conectado com a versão atual processa os pedidos, permitindo atingir fichas que o atacante não controla. Pedidos são mensagens privadas ao solicitante e ao Juiz, sem alterar permissões de atores. Registros no ator e no cartão impedem reaplicar o mesmo ferimento; pedidos são serializados. Tokens desvinculados usam seu ator sintético, preservando a ficha-base e os outros tokens. A implementação consulta a estrutura de saúde, sem restringir o tipo character, para acomodar a futura ficha NPC.

Leves/sérios incrementam a região e somam os pontos da gravidade modificada; temporários permanecem intactos. Arranhões não causam efeitos. Mortais rolam Sorte do alvo automaticamente: sucesso reduz a leve de 1 ponto; falha marca Ferimento mortal na saúde, bloqueando disparos. A condução narrativa da morte fica com o Juiz; o marcador pode ser removido manualmente. O cartão registra alvo, pontos e eventual teste de Sorte. A aplicação não dispara nova bala.

Validação: 25 testes automatizados, incluindo deduplicação, ator sintético, saúde e mortalidade; no Foundry, seleção manual aplicou 2 pontos/leve no peito e targeting aplicou automaticamente 3 pontos/sério no braço. Saúde da ficha de validação restaurada ao terminar.
## Espingardas, escopetas e dispersão — 0.7.0

Armas shotgun/sawedOff passam a rolar a quantidade de ferimentos antes da localização: d6 1 dá 1/0/0; 2–3 dá 2/1/0; 4–6 dá 4/3/2 em curto/longo/extremo. A faixa 6 foi completada conforme o PDF adicional informado pelo usuário; o exemplo contraditório não é usado. Próximo usa a coluna curto. Cada ferimento cria um cartão independente com localização, gravidade e aplicação, mantendo o alvo do disparo registrado ao rolar a quantidade. O disparo consome uma única munição, independentemente do número de ferimentos. Zero ferimentos encerra a resolução do alvo.

Somente escopeta (sawedOff), em longo/extremo, oferece dispersão a 2/5 m do alvo original, mesmo se o teste principal falhar. O Juiz escolhe quem está na área e rola diretamente contra cada alvo secundário. A chance é piso(chance final do original/2), incluindo a perícia antes da divisão. Os secundários rolam quantidade, localização sem ajuste e gravidade; nunca aplicam saúde automaticamente nem oferecem Aplicar dano. Não há medição de área, detecção de tokens próximos ou gasto extra de munição. Um 20 no disparo original requer confirmação manual de ausência de defeito antes de resolver a dispersão.

Os cartões derivados preservam sussurros e rolagens cegas. A localização mantém a escolha normal no alvo principal; nos secundários apenas a região sorteada fica habilitada. Referência: Tabela 13, PDF fornecido, página física 39, com complemento expresso do usuário para a rolagem 6.

Validação: 29 testes automatizados; no Foundry, principal gerou um ferimento independente, secundário usou metade da chance, gerou três ferimentos e resolveu cabeça com ajuste zero e aplicação manual.

## Ajustes — 0.7.1

Ferimentos secundários passam a oferecer Aplicar dano, usando um único token selecionado pelo usuário que clica, com o mesmo encaminhamento ao Juiz e proteção contra duplicação. A dispersão continua sem aplicação automática aos secundários. O marcador de ferimento mortal foi movido para baixo do resumo da saúde como controle discreto Sim/Não, com indicação acessível aria-pressed e suporte a teclado. Validação: 29 testes.

## Ajustes — 0.7.2

Rolagem secundária direta, sem pedir nome. Saúde com peito entre ombros e abdômen entre braços; cabeça e pernas preservadas. Conferido visualmente no Foundry.

## Ficha de NPC — 0.8.0

Novo tipo de ator npc com modelo próprio e a ficha compartilhada de combate, saúde, deslocamento, armas e perícias. Não exibe inventário, Jogador, idade ou XP. Mantém os cinco atributos básicos: o PDF não retira nenhum deles. Ganância e Bravura aparecem como campos opcionais apenas na interface do Juiz, e seus testes são sussurrados aos GMs. A geração de NPC usa 2d10 sem o bônus da Tabela 1; Estatura/Sorte conservam a divisão por dois. Geração dos atributos é reservada ao Juiz. Níveis de perícias de trabalho gerados também usam 2d10 direto. Não usa limites de escolhas da criação de personagens de jogador.

Saúde, mãos, tiros, targeting, dano e término do movimento por rodada compartilham o fluxo do personagem. Modelo de NPC exclui inventário/carga e identificação de jogador; a base character permanece independente. A migração não transforma personagens existentes em NPCs. Ombros/braços aproximados 20 px das laterais e abdômen baixado 15 px, sem mexer em cabeça/pernas.

Referência: PDF fornecido, páginas físicas 60–61. Reações em 2d6 é uma possível etapa futura; não automatizada nesta versão. Validação: 31 testes, modelo e contexto NPC, preservação dos atributos de jogador, geração distinta e campos reservados; criação, geração e teste de Ganância conferidos no Foundry.

## Briga, imobilização e lâminas — 0.9.0

Na perícia Briga, Briga e Imobilização usam targeting com exatamente um outro token de saúde compatível. O checkbox Mais forte que o alvo concede +1 manual a esses dois ataques. d20 + Briga − Briga do defensor + Força manual + ferimentos + efeito pendente + Juiz; o resultado consulta as Tabelas 15/17, limitado às linhas 1–20. Shift+Briga oferece os objetos da Tabela 16, mão do golpe, defesa do alvo e ajuste do Juiz. Objetos acrescentam o bônus de ataque e +1 por golpe que causa dano. Socos usam mão direita por padrão, esquerda se a direita estiver ocupada/presa; ambidestros usam dano direito também com a esquerda. Sequência soma as duas mãos quando disponíveis. Mãos ocupadas por armas devem ser liberadas ou o objeto deve ser escolhido explicitamente.

Dano temporário e efeitos são aplicados pelo Juiz conectado, ao Actor do token marcado. Pedidos compartilham a fila de dano, com registros por ator para impedir duplicação. Os efeitos da tabela, positivos ou negativos, somam para a próxima rolagem (atributo, perícia, tiro ou corpo a corpo), são consumidos uma vez e expiram ao mudar/terminar a rodada. Sem combate ativo, permanecem até uso ou limpeza manual. As rolagens de criação e a publicação do valor fixo de rapidez não consomem efeitos. O resultado ajustado 1 em imobilização causa 2 temporários e −2 ao próprio atacante, não ao alvo.

Chaves de braço, gravata e abraço de urso persistem: Manter chave repete dano/efeito sem dado; Soltar chave encerra a prisão. Chave de braço limita a mão usada nos ataques manuais e abraço de urso impede socos/lâminas; imobilização continua permitida para tentar escapar. Arremesso liberta das chaves do oponente atacado. Limpar efeitos recebidos é um recurso manual do Juiz/jogador para corrigir estados. Chaves não são encerradas por mudança de rodada. Cadência de ataques, distância (<2 m), objetos disponíveis e circunstâncias narrativas são conferidos pelo Juiz; não há movimentação forçada de tokens. Não automatiza penalidades pós-briga decorrentes do total de dano temporário, que o livro só aplica depois de a briga acabar.

Atacar com lâmina usa Faca/Espada, sem bônus de Força nem subtração da perícia do defensor. Resultados 8+ consultam a coluna de gravidade da Tabela 15; o modificador entra como modificador de arma no fluxo compartilhado de localização/gravidade, com ajuste integral da perícia de faca e aplicação ao token marcado. Não consome munição. Estou em guarda com lâmina indica manualmente que atacantes precisam de abertura: Observação ou Coordenação à metade (teto), mais perícia, ferimentos e efeito pendente. O teste de abertura é independente; se falhar, não há ataque. Sorte nos extremos da abertura é resolvida junto do teste e registrada no chat. Exceções podem ser dispensadas pelo Juiz no diálogo Shift; chaves próprias no alvo ou braço direito preso/abraço de urso também dispensam abertura. As mãos e armas narrativas continuam à escolha do Juiz.

Referência: PDF fornecido, páginas físicas 42–45, Tabelas 15–17. A tabela é seguida literalmente, inclusive o +1 do golpe fintado; exemplos contraditórios não substituem as linhas tabeladas. Validação: 36 testes automatizados; no Foundry, golpe com objeto aplicou 4 temporários/−3 e o efeito foi consumido no teste seguinte; imobilização, manutenção e liberação funcionaram; abertura passou e lâmina aplicou ferimento real via localização/gravidade. Saúde e estados dos atores de teste restaurados.

## Controles recolhíveis — 0.9.1

Briga e Faca/Espada começam recolhidas. Clique no nome para mostrar ou esconder botões e opções; editar o nível não altera a expansão. O estado aberto é preservado durante atualizações da ficha. Opções de força ficam em Briga e guarda com lâmina em Faca/Espada. Validado no Foundry: expansão independente e recolhimento, com 36 testes passando.

## Inventário e deslocamento — 0.9.2

Colunas independentes eliminam o vazio entre deslocamento e inventário. Botão de adicionar compacto com +, cantos arredondados e carga próxima da tabela. Deslocamento alterna entre Em pé e Montado sem publicar movimento nem alterar penalidades ao trocar de aba; a escolha é preservada nas atualizações da ficha. Personagens e NPCs compartilham o layout e os controles, mantendo NPC sem inventário. Validado visualmente nas duas fichas no Foundry; 36 testes passaram.

## Defeitos de armas — 0.10.0

Todo 20 natural de tiro permite Verificar defeito no cartão, inclusive se o ataque errou. Consulta a Tabela 5 (PDF físico 25–26), usando modelo e munição anteriores ao disparo. Falha ou explosão impedem acerto mesmo com Sorte; trava permite resolver a bala disparada, mas bloqueia novos tiros. Sem defeito preserva a regra de Sorte. Dispersão não cria verificações adicionais. Disparos antigos pedem identificação da arma e munição anterior; novos guardam esses dados automaticamente.

A ficha da arma permite destravar um turno por clique: três turnos, ou dois com Criar Armas treinada e teste bem-sucedido. Falha nas armas de carga dianteira/cano liso e rifles de cilindro exige confirmação de desmontagem/limpeza fora do tiroteio. Falha simples em revólveres não bloqueia o cilindro inteiro. A contagem de tempo é manual; não avança o combate automaticamente.

Explosão na última bala é Sem defeito; caso contrário esvazia o cilindro e oferece gravidade d6 na mão escolhida, +1 com quatro ou mais balas antes do disparo. Mão usa a região de braço correspondente (modificador local −1). O cartão de ferimento permite Aplicar dano ao token selecionado do atirador, incluindo Sorte para ferimento mortal. Não aplica dano explosivo automaticamente a alvos marcados.

Validação: 39 testes, limites da tabela, bloqueio de dano/dispersão e execução do botão com permissão e prevenção de clique repetido. No Foundry, um disparo antigo com 20 foi resolvido: defeito d20=4, Sem defeito; Sorte já falhada manteve o erro. Nenhuma saúde ou munição foi alterada nesse teste.

## Ficha de Cavalo — 0.11.0

Novo tipo Actor horse com ficha própria: nome no cabeçalho; saúde em cinco colunas usando a silhueta fornecida; inventário em três colunas e perícias nas duas restantes abaixo da saúde. Regiões seguem a Tabela 10: braços são patas dianteiras, pernas são traseiras; campos separados para ambos os lados. Mantém saúde, pontos temporários, mortalidade e inventário editável compatíveis com o sistema. Imagem original copiada sem edição para assets/horse.png.

Força, Coordenação, Inteligência e Sorte são editáveis. Pastoreio, Corte, Natação e Explosão têm seleção de treinamento; Truques são cadastrados com nome e nível individual. Coordenação usa Corte quando superior ou bônus +3 quando treinada; Natação sem treinamento usa metade da Força (teto); Explosão sem treinamento usa Inteligência, e treinada no mínimo Inteligência+3 quando a Inteligência alcança/supera o nível. Criação/geração de atributos, aprendizado e qualidades de cavalos ficam manuais nesta versão. Referência: páginas físicas 46 e 55–57 do PDF fornecido.

Aplicação de dano por targeting/botão aceita saúde do cavalo. No processamento do dano em cavalo, d6 natural 6 de gravidade é mortal mesmo que o total modificado seja menor; mantém a confirmação de Sorte do alvo. Transferência de tiros entre cavaleiro e montaria continua manual.

Validação: 41 testes. Criado Validação Cavalo no mundo Boothill; Força salva, inventário com 3 itens de 3 kg totaliza 9 kg, truque com nível individual e marcação de treinamento persistem após recarregar. Conferidas silhueta, posições anatômicas e painéis inferiores. O serviço foi reiniciado apenas para registrar o novo tipo de ator.

## Organização do Cavalo — 0.11.1

Atributos acima da saúde, ocupando cinco colunas; posições anatômicas preservadas. Engrenagem alterna entre edição de todas as perícias com checkboxes e exibição apenas das conhecidas. Truques compartilham linhas, ícone e campo numérico das demais perícias; adição e remoção aparecem durante edição. O livro (página física 55) exige teste de Inteligência para cada perícia inicial, portanto não presume todas treinadas. Configuração permanece manual. Validação no Foundry: abrir/fechar engrenagem, ocultar não treinadas e campos de edição; regressão com 41 testes.

## Montaria vinculada — 0.12.0

Personagens e NPCs vinculam um ator Cavalo por UUID, sem incorporá-lo nem copiar dados. Arraste um ator de cavalo para a ficha ou use Vincular cavalo. O retrato na ficha do cavalo também fornece dados de arrastar do ator. Cabeçalho do cavaleiro exibe imagem/nome, abertura por duplo clique ou Enter, Montado/Desmontado, seleção do token da cena e remoção do vínculo. Um vínculo novo inicia desmontado. A ficha do cavalo mostra a imagem do token/protótipo no canto.

Transferência segue a página física 46 do PDF: tiro no cavaleiro, perna/abdômen com valor de localização ímpar atinge o cavalo; tiro no cavalo, peito/abdômen com valor par atinge o cavaleiro. Usa o valor efetivamente escolhido após ajuste. O Juiz conectado resolve no fluxo de aplicação do dano, tanto pelo targeting quanto por Aplicar dano manual: rola nova localização d20 e gravidade d6 sem outro ajuste, registra o destino e aplica apenas nele. Registro no cartão impede transferir outra vez e permite retomar sem rerrolar se a aplicação for interrompida. Lâminas não usam esta transferência de tiros.

O token explicitamente escolhido precisa estar na mesma cena. Sem escolha explícita, é aceito apenas um token correspondente à montaria. Cópias ambíguas ou vínculos quebrados interrompem a aplicação com orientação para corrigir, evitando dano no ator errado. O caminho inverso procura o cavaleiro montado naquela cena e rejeita múltiplos cavaleiros no mesmo cavalo. Vínculo não movimenta tokens nem altera suas permissões.

Validação: 45 testes, incluindo paridade nas duas direções, resolução de cópias, criação do vínculo por drop e processamento de dano redirecionado uma única vez. No Foundry, vínculo pelo seletor, alternância montado/desmontado e duplo clique abriram a ficha; conferidos foto do token e posição junto dos dados do jogador. Ficha Validação da ficha ficou vinculada a Validação Cavalo, desmontada; nenhuma saúde foi alterada na validação visual. Arrastar tem cobertura do manipulador em teste automatizado; o gesto de arrastar da automação de navegador não produziu um drop verificável.

## Localização em montaria — 0.12.2

A transferência com token alvo conhecido passa a acontecer na seleção da região, antes da gravidade: nova localização sem ajuste e silhueta do destinatário (cavalo ou cavaleiro). O cartão mostra estado montado/desmontado e indica → Cavalo nos valores ímpares elegíveis. Sem token marcado, mantém a resolução no Aplicar dano pelo Juiz. Tokens desvinculados precisam do vínculo/estado montado na ficha do próprio token. Validação: 46 testes, incluindo seleção de perna que redireciona antes de causar ferimento e renderiza horse.png.

## Botão Cavalo — 0.12.3

A seleção de localização mostra Cavalo quando um alvo montado tem algum valor ímpar de perna/abdômen ao alcance do ajuste de perícia. Considera todos os valores alcançáveis, inclusive quando o número original é par. O botão escolhe o ímpar elegível mais próximo e rola d20 para a localização no cavalo, sem novo ajuste; o cartão mostra a silhueta e a região sorteada para resolver gravidade. Não aparece para alvos desmontados, lâminas ou ferimentos já transferidos. Validação: 47 testes, incluindo visibilidade, limites de ajuste e clique que transfere antes da gravidade.

## Escolha exclusiva de Cavalo — 0.12.4

No cavaleiro montado, perna/abdômen só ficam habilitados se houver valor par alcançável para atingir o próprio cavaleiro. Ímpares ficam exclusivamente no botão Cavalo; removida a indicação redundante → Cavalo dos membros. Havendo par e ímpar alcançáveis, o jogador escolhe o membro para o cavaleiro ou Cavalo para a montaria. Mesma validação no clique e no desenho dos botões. Validação: 48 testes.

## Limpeza visual e movimento da montaria — 0.12.5

Removidas legendas de deslocamento e saúde das fichas de personagem/NPC; armamento mantém apenas a dica Shift+clique. Inventários de personagem e cavalo exibem balança no cabeçalho Peso. Pontos de ferimento continuam editáveis para cura e correções manuais; contagens regionais não determinam os pontos exatos de dano.

Deslocamento montado passa a consultar saúde da montaria vinculada, priorizando o token escolhido ou o único correspondente na cena. Aplica os fatores de movimento da Tabela 6 às distâncias de montaria; pernas correspondem às patas traseiras conforme a Tabela 10/Animais em Combate. Ferimentos leves em perna reduzem cumulativamente as distâncias; sérios impedem trote/galope e sérios nas duas pernas impedem deslocamento montado. Outros sérios reduzem trote/galope; mortal/desmaio impede movimento. Ferimentos do cavaleiro continuam afetando apenas a pé. Sem montaria vinculada, exibe distâncias base. Fonte: PDF físico 28–30 e 46.

Atualizar a montaria atualiza fichas abertas de cavaleiros. O duplo clique abre a mesma cópia de ator/token usada no cálculo. Validação: 50 testes, incluindo separação entre saúde de cavalo/cavaleiro, restrições por gravidade, impedimento por desmaio e preferência pelo token correto. Limpeza conferida no Foundry; ferimento temporário de teste foi restaurado.

## Quatro patas e ajuste regional de saúde — 0.12.6

Deslocamento montado considera feridas em todas as quatro patas: cada leve/séria divide a distância por dois; uma pata com ferida séria impede trote/galope; duas patas distintas com ferida séria impedem andar. Outros ferimentos sérios continuam reduzindo velocidades rápidas. Essa adaptação evita tratar patas dianteiras como braços humanos para movimento.

Pontos reais passam a ser saída somente de leitura nas três fichas de atores. Campos regionais contam feridas, não pontos: ferida leve pode causar 0–2 e séria 3–5. Tiros continuam aplicando automaticamente os valores exatos. Alterar contagens manualmente abre diálogo de dano/cura; quantidade e pontos são atualizados juntos, com limites e cancelamento sem alteração. Não converte contagens antigas em pontos, pois o dano original não pode ser inferido. Temporários permanecem editáveis e separados.

Validação: 53 testes, todas as patas, gravidade, ajuste manual válido/inválido e cura. No Foundry, adicionar leve na dianteira esquerda com 1 ponto atualizou ambos; remover com cura de 1 restaurou exatamente a saúde inicial.

## Edição direta da saúde restaurada — 0.12.7

Por solicitação do usuário, pontos de ferimento voltam a ser editáveis diretamente em personagem, NPC e cavalo. Removido diálogo de dano/cura ao editar contagens regionais; essas contagens e os pontos são ajustados separadamente, como antes. Dano por tiros continua somando automaticamente. Mantida correção de movimento pelas quatro patas.

## Som por arma — 0.13.0

Alto-falante no cabeçalho da ficha de arma, ao lado de fechar, abre configuração com arquivo de áudio, seletor nativo do Foundry, volume, prévia local, remoção e salvamento. Caminho e volume são dados do Item, preservados ao arrastar novas cópias para atores; cópias já existentes são configuradas individualmente.

O disparo pelo painel de armamento reproduz uma vez para os clientes conectados, no canal de efeitos de interface e sem repetição. No 20 natural, aguarda o defeito: sem defeito/trava/explosão reproduz som; falha de munição não reproduz. Guardado snapshot do áudio no disparo para verificação posterior de defeito. Localização, ferimentos e dispersão não repetem áudio. Arquivo ausente informa erro sem interromper o ataque. Prévia usa apenas o cliente atual.

Validação: 53 testes, reprodução opcional, transmissão única, prévia local e tolerância a erro. No Foundry, alto-falante, navegador de áudio, prévia de sounds/lock.wav sem erros e persistência após salvar/reabrir; som de teste removido ao concluir. Nenhuma munição/saúde alterada na conferência visual. API de áudio consultada em modo leitura na instalação v13; nenhum arquivo nativo alterado.
