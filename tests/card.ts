import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Card } from "../target/types/card";
import { expect } from "chai";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";

async function playCard(
  program: Program<Card>,
  game,
  player,
  cardIndex,
  pos,
  expectedTurn,
  expectedGameState,
  expectedBoard,
  expectedMana
) {
  await program.methods
    .playCard(pos, cardIndex)
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

async function getUserPDA(program, key) {
  const obj = await publicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("user-stats"), key.toBuffer()],
    program.programId
  );

  return obj;
}

async function createUserStat(program, pubkey, pda, bump, name, leaderboard) {
  await program.methods
    .createUserStats(name)
    .accounts({
      user: pubkey,
      userStats: pda,
      leaderboard: leaderboard,
    })
    .rpc();

  const UserState = await program.account.userStats.fetch(pda);
  expect(UserState.name).eql(name);
  expect(UserState.score).eql(0);
  expect(UserState.bump).eql(bump);

  const registeredPlayers = await (
    await program.account.leaderboard.fetch(leaderboard)
  ).players;
  expect(registeredPlayers[registeredPlayers.length - 1]).to.eql(pubkey);
}

async function concede(program, kp, pda) {
  const userState = await program.account.userStats.fetch(pda);
  if (!userState.activeGame) {
    console.log(
      "Concede function called, but player doesn't have an active game."
    );
    return;
  }
  const gamePk = new anchor.web3.PublicKey(userState.activeGame);
  const gameState = await program.account.game.fetch(gamePk);
  const playerList = gameState.players;
  const opponentPkObj =
    playerList[0].toBase58() == kp.publicKey.toBase58()
      ? playerList[1]
      : playerList[0];
  const opponentPk = new anchor.web3.PublicKey(opponentPkObj);
  const [opponentPDA, _] = await getUserPDA(program, opponentPkObj);
  await program.methods
    .concede()
    .accounts({
      game: gamePk,
      p1: kp.publicKey,
      p1Stats: pda,
      p2: opponentPk,
      p2Stats: opponentPDA,
    })
    .signers(kp instanceof (anchor.Wallet as any) ? [] : [kp])
    .rpc();
}

describe("card", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Card as Program<Card>;
  const gameKP = anchor.web3.Keypair.generate();
  const gameKP2 = anchor.web3.Keypair.generate();
  const p1 = (program.provider as anchor.AnchorProvider).wallet;
  const p2 = anchor.web3.Keypair.generate();
  const p3 = anchor.web3.Keypair.generate();

  let sampleHand = [
    { hp: 10, atk: 10, mana: 1, moves: 0 },
    { hp: 7, atk: 3, mana: 2, moves: 0 },
  ];

  let sampleHand2 = [
    { hp: 15, atk: 7, mana: 1, moves: 0 },
    { hp: 5, atk: 5, mana: 2, moves: 0 },
  ];

  it("Test init leaderboard function", async () => {
    const [leaderboardPDA, leaderboardBump] =
      await publicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("leaderboard")],
        program.programId
      );
    const state = await program.account.leaderboard.fetch(leaderboardPDA);
    const [p1PDA, p1Bump] = await getUserPDA(program, p1.publicKey);
    const [p2PDA, p2Bump] = await getUserPDA(program, p2.publicKey);
    const [p3PDA, p3Bump] = await getUserPDA(program, p3.publicKey);

    console.log("Initing leaderboard");
    try {
      await program.methods
        .initLeaderboard(leaderboardBump)
        .accounts({
          user: provider.wallet.publicKey,
          leaderboard: leaderboardPDA,
        })
        .rpc();
    } catch (error) {
      console.log(
        "Init leaderboard test, expect already in use error if not first time testing:",
        error.logs[3]
      );
    }
  });

  it("Test new player account create function", async () => {
    const [leaderboardPDA, leaderboardBump] =
      await publicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("leaderboard")],
        program.programId
      );

    const [p1PDA, p1Bump] = await getUserPDA(program, p1.publicKey);
    const [p2PDA, p2Bump] = await getUserPDA(program, p2.publicKey);
    const [p3PDA, p3Bump] = await getUserPDA(program, p3.publicKey);

    try {
      await createUserStat(
        program,
        p1.publicKey,
        p1PDA,
        p1Bump,
        "Player One",
        leaderboardPDA
      );
    } catch (err) {
      console.log(
        "Failed to create user account, expect already in use error:",
        err.logs[3]
      );
    }

    try {
      console.log(`Airdropping 1 SOL to p2`);
      await program.provider.connection.confirmTransaction(
        await program.provider.connection.requestAirdrop(
          p2.publicKey,
          1_000_000_000
        ),
        "confirmed"
      );
      const balance = await program.provider.connection.getBalance(
        p2.publicKey
      );
      console.log("p2 balance:", balance);
    } catch (error) {
      console.log("Airdrop into player two account:", error);
    }

    try {
      console.log(`Airdropping 1 SOL to p3`);
      await program.provider.connection.confirmTransaction(
        await program.provider.connection.requestAirdrop(
          p3.publicKey,
          1_000_000_000
        ),
        "confirmed"
      );
    } catch (error) {
      console.log("Airdrop into player two account:", error);
    }

    try {
      await program.methods
        .createUserStats("Player Two")
        .accounts({
          user: p2.publicKey,
          userStats: p2PDA,
          leaderboard: leaderboardPDA,
        })
        .signers([p2])
        .rpc();
    } catch (Err) {
      console.log("Player two pda account creation:", Err);
    }
    try {
      await program.methods
        .createUserStats("Player Three")
        .accounts({
          user: p3.publicKey,
          userStats: p3PDA,
          leaderboard: leaderboardPDA,
        })
        .signers([p3])
        .rpc();
    } catch (Err) {
      console.log("Player two pda account creation:", Err);
    }
  });

  it("setup game!", async () => {
    const [leaderboardPDA, leaderboardBump] =
      await publicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("leaderboard")],
        program.programId
      );

    const [p1PDA, p1Bump] = await getUserPDA(program, p1.publicKey);
    const [p2PDA, p2Bump] = await getUserPDA(program, p2.publicKey);
    const [p3PDA, p3Bump] = await getUserPDA(program, p3.publicKey);

    console.log("Setting up game between p1 and p2");
    await concede(program, p1, p1PDA);
    console.log("End of concede call");
    const testgame = anchor.web3.Keypair.generate();
    await program.methods
      .setupGame(sampleHand, sampleHand2)
      .accounts({
        game: testgame.publicKey,
        p1: p1.publicKey,
        p1Stats: p1PDA,
        p2: p2.publicKey,
        p2Stats: p2PDA,
        leaderboard: leaderboardPDA,
      })
      .signers([testgame])
      .rpc();
    await concede(program, p2, p2PDA);

    const state = await program.account.userStats.fetch(p1PDA);
    console.log(
      `P1 current score ${state.score} with game state: ${state.activeGame}`
    );

    try {
      await program.methods
        .setupGame(sampleHand, sampleHand2)
        .accounts({
          game: gameKP.publicKey,
          p1: p1.publicKey,
          p1Stats: p1PDA,
          p2: p2.publicKey,
          p2Stats: p2PDA,
          leaderboard: leaderboardPDA,
        })
        .signers([gameKP])
        .rpc();
    } catch (error) {
      console.log("Setup game 1 creation:", error);
    }

    console.log("Setting up game between p2 and p3");
    try {
      await program.methods
        .setupGame(sampleHand, sampleHand2)
        .accounts({
          game: gameKP2.publicKey,
          p1: p2.publicKey,
          p1Stats: p2PDA,
          p2: p3.publicKey,
          p2Stats: p3PDA,
          leaderboard: leaderboardPDA,
        })
        .signers([p2, gameKP2])
        .rpc();
    } catch (error) {
      console.log(
        "Setup game 2 creation expecting already active error:",
        error.logs
      );
    }

    let gameState = await program.account.game.fetch(gameKP.publicKey);

    expect(gameState.turn).to.equal(1);
    expect(gameState.players).to.eql([p1.publicKey, p2.publicKey]);

    expect(gameState.state).to.eql({ active: {} });

    expect(gameState.board).to.eql([
      [null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null],
    ]);

    expect(gameState.health).to.eql([30, 30]);

    expect(gameState.mana).to.eql([1, 1]);

    expect(gameState.p1Hand).to.eql(sampleHand);

    expect(gameState.p2Hand).to.eql(sampleHand2);
  });

  it("Test game functions", async () => {
    const [leaderboardPDA, leaderboardBump] =
      await publicKey.findProgramAddressSync(
        [anchor.utils.bytes.utf8.encode("leaderboard")],
        program.programId
      );

    const [p1PDA, p1Bump] = await getUserPDA(program, p1.publicKey);
    const [p2PDA, p2Bump] = await getUserPDA(program, p2.publicKey);
    const [p3PDA, p3Bump] = await getUserPDA(program, p3.publicKey);
    // console.log("Initial state: ");
    // await printBoard(program, gameKP.publicKey);

    console.log("Turn 1: Player 1 plays card");
    await playCard(
      program,
      gameKP.publicKey,
      p1,
      0,
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
          { hp: 10, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [0, 1]
    );
    // await printBoard(program, gameKP.publicKey);

    try {
      await attack(program, gameKP.publicKey, p1, 6, 7, null, null);
    } catch (error) {
      console.log("Expect unit not ready yet:", error.logs[2]);
    }

    console.log("Player 1 ends turn");
    await endTurn(program, gameKP.publicKey, p1, 2, [
      [null, null, null, null, null, null, null],
      [
        null,
        null,
        null,
        null,
        null,
        null,
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);
    // await printBoard(program, gameKP.publicKey);

    console.log("Turn 2: Player 2 plays card");
    await playCard(
      program,
      gameKP.publicKey,
      p2,
      0,
      1,
      2,
      { active: {} },
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 0 },
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
          { hp: 10, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [2, 0]
    );
    await printBoard(program, gameKP.publicKey);

    console.log("Player 2 ends turn");
    await endTurn(program, gameKP.publicKey, p2, 3, [
      [
        null,
        { hp: 15, atk: 7, mana: 1, moves: 1 },
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
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 3: Player 1 attacks player 2 hero");
    await attack(
      program,
      gameKP.publicKey,
      p1,
      6,
      7,
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 1 },
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
          { hp: 10, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [30, 20]
    );

    console.log("Player 1 ends turn");
    await endTurn(program, gameKP.publicKey, p1, 4, [
      [
        null,
        { hp: 15, atk: 7, mana: 1, moves: 1 },
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
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    try {
      await playCard(
        program,
        gameKP.publicKey,
        p2,
        0,
        1,
        4,
        { active: {} },
        [
          [
            null,
            { hp: 15, atk: 7, mana: 1, moves: 1 },
            null,
            { hp: 5, atk: 5, mana: 2, moves: 0 },
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
            { hp: 10, atk: 10, mana: 1, moves: 1 },
          ],
        ],
        [2, 0]
      );
    } catch (error) {
      console.log("expecting already set error: ", error.error["errorCode"]);
    }

    console.log("Player 2 plays card");
    await playCard(
      program,
      gameKP.publicKey,
      p2,
      0,
      3,
      4,
      { active: {} },
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 1 },
          null,
          { hp: 5, atk: 5, mana: 2, moves: 0 },
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
          { hp: 10, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [3, 0]
    );

    console.log("Turn 4: Player 2 attacks player 1 hero");
    await attack(
      program,
      gameKP.publicKey,
      p2,
      7,
      1,
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 0 },
          null,
          { hp: 5, atk: 5, mana: 2, moves: 0 },
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
          { hp: 10, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [23, 20]
    );

    console.log("Player 2 ends turn");
    await endTurn(program, gameKP.publicKey, p2, 5, [
      [
        null,
        { hp: 15, atk: 7, mana: 1, moves: 1 },
        null,
        { hp: 5, atk: 5, mana: 2, moves: 1 },
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
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 5: Player 1 attacks player 2 hero");
    await attack(
      program,
      gameKP.publicKey,
      p1,
      6,
      7,
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 1 },
          null,
          { hp: 5, atk: 5, mana: 2, moves: 1 },
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
          { hp: 10, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [23, 10]
    );

    console.log("Player 1 plays card");
    await playCard(
      program,
      gameKP.publicKey,
      p1,
      0,
      0,
      5,
      { active: {} },
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 1 },
          null,
          { hp: 5, atk: 5, mana: 2, moves: 1 },
          null,
          null,
          null,
        ],
        [
          { hp: 7, atk: 3, mana: 2, moves: 0 },
          null,
          null,
          null,
          null,
          null,
          { hp: 10, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [1, 3]
    );

    console.log("Player 1 ends turn");
    await endTurn(program, gameKP.publicKey, p1, 6, [
      [
        null,
        { hp: 15, atk: 7, mana: 1, moves: 1 },
        null,
        { hp: 5, atk: 5, mana: 2, moves: 1 },
        null,
        null,
        null,
      ],
      [
        { hp: 7, atk: 3, mana: 2, moves: 1 },
        null,
        null,
        null,
        null,
        null,
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 6: Player 2 attacks player 1 hero");
    await attack(
      program,
      gameKP.publicKey,
      p2,
      7,
      1,
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 0 },
          null,
          { hp: 5, atk: 5, mana: 2, moves: 1 },
          null,
          null,
          null,
        ],
        [
          { hp: 7, atk: 3, mana: 2, moves: 1 },
          null,
          null,
          null,
          null,
          null,
          { hp: 10, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [16, 10]
    );

    console.log("Player 2 attacks player 1 unit");
    await attack(
      program,
      gameKP.publicKey,
      p2,
      0,
      3,
      [
        [
          null,
          { hp: 15, atk: 7, mana: 1, moves: 0 },
          null,
          { hp: 2, atk: 5, mana: 2, moves: 0 },
          null,
          null,
          null,
        ],
        [
          { hp: 2, atk: 3, mana: 2, moves: 1 },
          null,
          null,
          null,
          null,
          null,
          { hp: 10, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [16, 10]
    );

    console.log("Player 2 ends turn");
    await endTurn(program, gameKP.publicKey, p2, 7, [
      [
        null,
        { hp: 15, atk: 7, mana: 1, moves: 1 },
        null,
        { hp: 2, atk: 5, mana: 2, moves: 1 },
        null,
        null,
        null,
      ],
      [
        { hp: 2, atk: 3, mana: 2, moves: 1 },
        null,
        null,
        null,
        null,
        null,
        { hp: 10, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 7: Player 1 attacks player 2's unit");
    await attack(
      program,
      gameKP.publicKey,
      p1,
      6,
      1,
      [
        [
          null,
          { hp: 5, atk: 7, mana: 1, moves: 1 },
          null,
          { hp: 2, atk: 5, mana: 2, moves: 1 },
          null,
          null,
          null,
        ],
        [
          { hp: 2, atk: 3, mana: 2, moves: 1 },
          null,
          null,
          null,
          null,
          null,
          { hp: 3, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [16, 10]
    );

    await endTurn(program, gameKP.publicKey, p1, 8, [
      [
        null,
        { hp: 5, atk: 7, mana: 1, moves: 1 },
        null,
        { hp: 2, atk: 5, mana: 2, moves: 1 },
        null,
        null,
        null,
      ],
      [
        { hp: 2, atk: 3, mana: 2, moves: 1 },
        null,
        null,
        null,
        null,
        null,
        { hp: 3, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 8: Player 2 attacks player 1's hero");
    await attack(
      program,
      gameKP.publicKey,
      p2,
      7,
      1,
      [
        [
          null,
          { hp: 5, atk: 7, mana: 1, moves: 0 },
          null,
          { hp: 2, atk: 5, mana: 2, moves: 1 },
          null,
          null,
          null,
        ],
        [
          { hp: 2, atk: 3, mana: 2, moves: 1 },
          null,
          null,
          null,
          null,
          null,
          { hp: 3, atk: 10, mana: 1, moves: 1 },
        ],
      ],
      [9, 10]
    );

    await endTurn(program, gameKP.publicKey, p2, 9, [
      [
        null,
        { hp: 5, atk: 7, mana: 1, moves: 1 },
        null,
        { hp: 2, atk: 5, mana: 2, moves: 1 },
        null,
        null,
        null,
      ],
      [
        { hp: 2, atk: 3, mana: 2, moves: 1 },
        null,
        null,
        null,
        null,
        null,
        { hp: 3, atk: 10, mana: 1, moves: 1 },
      ],
    ]);

    console.log("Turn 9: Player 1 attacks player 2 hero");
    await attack(
      program,
      gameKP.publicKey,
      p1,
      6,
      7,
      [
        [
          null,
          { hp: 5, atk: 7, mana: 1, moves: 1 },
          null,
          { hp: 2, atk: 5, mana: 2, moves: 1 },
          null,
          null,
          null,
        ],
        [
          { hp: 2, atk: 3, mana: 2, moves: 1 },
          null,
          null,
          null,
          null,
          null,
          { hp: 3, atk: 10, mana: 1, moves: 0 },
        ],
      ],
      [9, 0]
    );

    try {
      await endTurn(program, gameKP.publicKey, p1, null, null);
    } catch (error) {
      console.log("Expect game over: ", error.error["errorCode"]);
    }

    console.log("Test set score functionality");
    const pre_p1_stats = await program.account.userStats.fetch(p1PDA);
    const pre_p2_stats = await program.account.userStats.fetch(p2PDA);

    await program.methods
      .setScores()
      .accounts({
        p1: p1.publicKey,
        p2: p2.publicKey,
        p1Stats: p1PDA,
        p2Stats: p2PDA,
        game: gameKP.publicKey,
      })
      .rpc();

    const post_p1_stats = await program.account.userStats.fetch(p1PDA);
    const post_p2_stats = await program.account.userStats.fetch(p2PDA);

    expect(pre_p1_stats.score + 5).to.eql(post_p1_stats.score);
    expect(pre_p2_stats.score).to.eql(post_p2_stats.score);

    // console.log("Setting up game between player 2 and player 3");
    // try {
    //   await program.methods
    //     .setupGame(sampleHand, sampleHand2)
    //     .accounts({
    //       game: gameKP2.publicKey,
    //       p1: p2.publicKey,
    //       p2: p3.publicKey,
    //       p1Stats: p2PDA,
    //       p2Stats: p3PDA,
    //       leaderboard: leaderboardPDA,
    //     })
    //     .signers([p2, gameKP2])
    //     .rpc();
    // } catch (error) {
    //   console.log("Creating game error:", error);
    // }

    // const gameState = await program.account.game.fetch(gameKP2.publicKey);

    // expect(gameState.turn).to.equal(1);
    // expect(gameState.players).to.eql([p2.publicKey, p3.publicKey]);
    // expect(gameState.state).to.eql({ active: {} });
    // expect(gameState.board).to.eql([
    //   [null, null, null, null, null, null, null],
    //   [null, null, null, null, null, null, null],
    // ]);

    // expect(gameState.health).to.eql([30, 30]);
    // expect(gameState.mana).to.eql([1, 1]);
    // expect(gameState.p1Hand).to.eql(sampleHand);
    // expect(gameState.p2Hand).to.eql(sampleHand2);
  });
});
