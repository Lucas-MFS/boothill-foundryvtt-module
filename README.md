# Boot Hill para FoundryVTT

Sistema de jogo independente de Boot Hill 3ª edição, em português brasileiro, para **FoundryVTT 14**.

Inclui fichas de personagem, NPC, cavalo e animal selvagem; armas e munição; inventário, ferimentos e rolagens de combate no chat.

Para Foundry 13, use a versão preservada na tag [v0.15.6-foundry13](https://github.com/Lucas-MFS/boothill-foundryvtt-module/tree/v0.15.6-foundry13).

## Instalação

Copie os arquivos para `Data/systems/boothill/`, reinicie o Foundry e escolha Boot Hill ao criar um mundo. As alterações ficam na pasta do sistema, sem modificar o núcleo do Foundry.

## Uso

Crie os atores e arraste armas e munições da aba Itens para suas fichas. No armamento, clique na linha da arma para abrir as opções e selecionar a reserva de munição.

**Shift+clique** abre ajustes nas rolagens e no botão Aplicar dano. Para aplicação manual, selecione um token; ataques com alvo marcado podem aplicar dano automaticamente com um Juiz conectado.

## Desenvolvimento

Execute `npm test` com Node.js 24 ou superior. Consulte o [histórico resumido](CHANGELOG.md).

O livro de regras não é distribuído neste repositório.
