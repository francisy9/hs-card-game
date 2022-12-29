import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Card } from "../target/types/card";
import { expect } from "chai";

async function playCard(
  program: Program<Card>,
  game,
  player,
  pos,
  expectedTurn,
  expectedGameState,
  expectedBoard,
  expectedMana
) {
  await program.methods
    .playCard(pos, 0)
    .accounts({
      player: player.publicKey,
      game,
    })
    .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
    .rpc();
  const gameState = await program.account.game.fetch(game);
  expect(gameState.turn).to.equal(expectedTurn);
  expect(gameState.state).to.eql(expectedGameState);
  expect(gameState.board).to.eql(expectedBoard);
  expect(gameState.mana).to.eql(expectedMana);
}

async function endTurn(
  program: Program<Card>,
  game,
  player,
  expectedTurn,
  expectedBoard
) {
  await program.methods
    .endTurn()
    .accounts({
      player: player.publicKey,
      game,
    })
    .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
    .rpc();
  const gameState = await program.account.game.fetch(game);
  expect(gameState.turn).to.equal(expectedTurn);
  expect(gameState.board).to.eql(expectedBoard);
}

async function attack(
  program: Program<Card>,
  game,
  player,
  botPos,
  topPos,
  expectedBoard,
  expectedHp
) {
  await program.methods
    .attack(botPos, topPos)
    .accounts({
      player: player.publicKey,
      game,
    })
    .signers(player instanceof (anchor.Wallet as any) ? [] : [player])
    .rpc();
  const gameState = await program.account.game.fetch(game);
  expect(gameState.board).to.eql(expectedBoard);
  expect(gameState.health).to.eql(expectedHp);
}

async function printBoard(program: Program<Card>, game) {
  let gameState = await program.account.game.fetch(game);
  console.log("\n");

  console.log("Game state:", gameState.state);
  for (let i = 0; i < 2; i++) {
    var currRow = "";
    for (let j = 0; j < 7; j++) {
      const obj = gameState.board[i][j];
      if (obj) {
        currRow += JSON.stringify(obj);
      } else {
        currRow += " ";
      }
      if (j != 6) {
        currRow += "  |  ";
      }
    }
    console.log(currRow);
    if (i == 1) {
      break;
    }
    console.log("------------------------------------------------------------");
  }

  console.log("\n");
  console.log(
    "p1 hp:",
    gameState.health[0],
    "p1 remaining mana:",
    gameState.mana[0],
    "p1 hand:",
    gameState.p1Hand
  );
  console.log(
    "p2 hp:",
    gameState.health[1],
    "p2 remaining mana:",
    gameState.mana[1],
    "p2 hand:",
    gameState.p2Hand
  );
  console.log("\n");
}

describe("card", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Card as Program<Card>;
  const gameKeypair = anchor.web3.Keypair.generate();
  const playerOne = (program.provider as anchor.AnchorProvider).wallet;
  const playerTwo = anchor.web3.Keypair.generate();

  it("setup game!", async () => {
    await program.methods
      .setupGame(playerTwo.publicKey)
      .accounts({
        game: gameKeypair.publicKey,
        playerOne: playerOne.publicKey,
      })
      .signers([gameKeypair])
      .rpc();

    let gameState = await program.account.game.fetch(gameKeypair.publicKey);

    expect(gameState.turn).to.equal(1);

    expect(gameState.players).to.eql([
      playerOne.publicKey,
      playerTwo.publicKey,
    ]);

    expect(gameState.state).to.eql({ active: {} });

    expect(gameState.board).to.eql([
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
    ]);

    expect(gameState.health).to.eql([30, 30]);

    expect(gameState.mana).to.eql([1, 1]);

    expect(gameState.p1Hand).to.eql([{ hp: 2, atk: 1, mana: 1, moves: 0 }]);

    expect(gameState.p2Hand).to.eql([{ hp: 1, atk: 2, mana: 1, moves: 0 }]);
  });

  it("Test game functions", async () => {
    // console.log("Initial state: ");
    // await printBoard(program, gameKeypair.publicKey);

    console.log("Player 1 plays card");
    await playCard(
      program,
      gameKeypair.publicKey,
      playerOne,
      6,
      1,
      { active: {} },
      [
        [null, null, null, null, null, null, null],
        [
          null,
          null,
          null,
          null,
          null,
          null,
          { hp: 2, atk: 1, mana: 1, moves: 0 },
        ],
      ],
      [0, 1]
    );
    // await printBoard(program, gameKeypair.publicKey);

    await endTurn(program, gameKeypair.publicKey, playerOne, 2, [
      [null, null, null, null, null, null, null],
      [
        null,
        null,
        null,
        null,
        null,
        null,
        { hp: 2, atk: 1, mana: 1, moves: 1 },
      ],
    ]);
    // await printBoard(program, gameKeypair.publicKey);

    console.log("Player 2 plays card");
    await playCard(
      program,
      gameKeypair.publicKey,
      playerTwo,
      1,
      2,
      { active: {} },
      [
        [
          null,
          { hp: 1, atk: 2, mana: 1, moves: 0 },
          null,
          null,
          null,
          null,
          null,
        ],
        [
          null,
          null,
          null,
          null,
          null,
          null,
          { hp: 2, atk: 1, mana: 1, moves: 1 },
        ],
      ],
      [2, 0]
    );
    // await printBoard(program, gameKeypair.publicKey);

    console.log("Player 2 ends turn");
    await endTurn(program, gameKeypair.publicKey, playerTwo, 3, [
      [
        null,
        { hp: 1, atk: 2, mana: 1, moves: 1 },
        null,
        null,
        null,
        null,
        null,
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null,
        { hp: 2, atk: 1, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Player 1's unit attacks player 2's unit");
    await attack(
      program,
      gameKeypair.publicKey,
      playerOne,
      6,
      1,
      [
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
      ],
      [30, 30]
    );
    // printBoard(program, gameKeypair.publicKey);
  });
});
