# Solana on-chain multiplayer card game

### Game runs on devnet


## Overview

Multiplayer card game on the solana blockchain. Players take turn playing cards onto the board and attacking each other's heroes and units.

Command line interface: https://github.com/francisy9/hs-cli


### How to Play
Each player is given a fixed amount of mana each turn

Use your mana to place your desired card onto the baord

Use your units (your cards on the board) to attack opponent units/hero (Note: units usually need a turn to get ready!)

When unit A is used to attack unit B, both units take damage equivalent to the other's attack

When one of the heroes' health goes to 0, that player loses


### Program features
The program was developed with the anchor lang framework.
1. User would connect their wallet to the program and initialize a user stats PDA account (if it's their first time), that stores their score
2. PDA account also records the player's active game, so they could reconnect to it if the game account public key wasn't stored properly
3. User could then initiate a game account that challenges another player to a game
4. Once the game begins, users can only interact with the game account if it is their turn (enforced by a signer check)
5. As the game concludes, their scores on their respective user stats PDA accounts will be updated accordingly

### Features to be added
1. Add other attributes to the card (e.g. taunt, units that can buff allies, spells etc.)
1. Unity implementation to make the game not just have a CLI simulator
2. Add NFT as cards (currently, cards are passed in from the front end and can take any arbitrary values)
3. Add deck feature (at each turn, the player would draw a random card from their deck)
