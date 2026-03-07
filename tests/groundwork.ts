import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import { Groundwork } from "../target/types/groundwork";

// ---------------------------------------------------------------------------
// Authority keypair — matches AUTHORITY_PUBKEY hardcoded in the program.
// pubkey: QVxt9ixFYpSbo44f8qR8hmSLnSJchzTQCCWJG1pCu2c
// ---------------------------------------------------------------------------
const AUTHORITY_SECRET = Uint8Array.from([
  103, 114, 111, 117, 110, 100, 119, 111, 114, 107, 45, 97, 117, 116, 104,
  111, 114, 105, 116, 121, 103, 114, 111, 117, 110, 100, 119, 111, 114, 107,
  45, 97, 6, 5, 27, 147, 157, 238, 108, 216, 95, 122, 148, 143, 20, 89, 29,
  105, 117, 83, 2, 94, 242, 207, 234, 208, 52, 122, 236, 171, 152, 17, 160,
  149,
]);

const RPC = { skipPreflight: true, commitment: "confirmed" } as const;
const STAKE = new BN(40_000_000); // 40 USDC
const MINT_AMOUNT = 200_000_000; // 200 USDC per user

describe("groundwork", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Groundwork as Program<Groundwork>;
  const conn = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;
  const authority = anchor.web3.Keypair.fromSecretKey(AUTHORITY_SECRET);

  // user1 — streak + re-deposit + COMMIT tests
  const user1 = anchor.web3.Keypair.generate();
  // user2 (forfeiter) + user3 (claimer) — pool redistribution tests
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();

  let usdcMint: anchor.web3.PublicKey;
  let commitMint: anchor.web3.PublicKey; // Token-2022

  let user1UsdcAta: anchor.web3.PublicKey;
  let user2UsdcAta: anchor.web3.PublicKey;
  let user3UsdcAta: anchor.web3.PublicKey;

  // PDAs (derived once, reused throughout)
  let user1Account: anchor.web3.PublicKey;
  let pool: anchor.web3.PublicKey;
  let poolState: anchor.web3.PublicKey;

  async function airdrop(pubkey: anchor.web3.PublicKey, lamports: number) {
    const sig = await conn.requestAirdrop(pubkey, lamports);
    const { blockhash, lastValidBlockHeight } =
      await conn.getLatestBlockhash("confirmed");
    await conn.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  }

  function pda(seeds: Buffer[]) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];
  }

  before("bootstrap", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    for (const kp of [authority, user1, user2, user3]) {
      await airdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    }

    // Standard USDC mock mint
    usdcMint = await createMint(conn, payer, payer.publicKey, null, 6);

    // Derive pool_state PDA before creating the COMMIT mint — it will be the mint authority
    poolState = pda([Buffer.from("pool_state")]);

    // Token-2022 COMMIT mint — mint authority = pool_state PDA, 0 decimals
    commitMint = await createMint(
      conn,
      payer,
      poolState,   // mint authority
      null,        // freeze authority
      0,           // decimals
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Fund each user with USDC
    for (const [kp, setter] of [
      [user1, (v: anchor.web3.PublicKey) => (user1UsdcAta = v)],
      [user2, (v: anchor.web3.PublicKey) => (user2UsdcAta = v)],
      [user3, (v: anchor.web3.PublicKey) => (user3UsdcAta = v)],
    ] as const) {
      const ata = await createAssociatedTokenAccount(
        conn, payer, usdcMint, kp.publicKey
      );
      await mintTo(conn, payer, usdcMint, ata, payer, MINT_AMOUNT);
      setter(ata);
    }

    // Derive PDAs used in assertions
    user1Account = pda([Buffer.from("user_account"), user1.publicKey.toBuffer()]);
    pool         = pda([Buffer.from("pool")]);
  });

  // ---------------------------------------------------------------------------
  // initialize_pool
  // ---------------------------------------------------------------------------

  it("initialize_pool: creates pool + pool_state, stores commit_mint", async () => {
    await program.methods
      .initializePool()
      .accounts({ usdcMint, commitMint })
      .signers([authority])
      .rpc(RPC);

    const ps = await program.account.poolState.fetch(poolState);
    assert.equal(ps.commitMint.toBase58(), commitMint.toBase58(), "commitMint stored");
    assert.equal(ps.verifiedUsersThisMonth, 0, "verifiedUsersThisMonth starts at 0");

    const poolInfo = await getAccount(conn, pool);
    assert.equal(Number(poolInfo.amount), 0, "pool starts empty");
  });

  // ---------------------------------------------------------------------------
  // Streak tracking
  // ---------------------------------------------------------------------------

  it("streak: starts at 0 on first deposit", async () => {
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta, usdcMint })
      .signers([user1])
      .rpc(RPC);

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.streak, 0, "streak = 0 before any release");
    assert.equal(ua.isActive, true, "is_active = true after deposit");
    assert.notEqual(ua.monthStart.toNumber(), 0, "month_start set");
  });

  it("streak: increments to 1 after release_stake", async () => {
    await program.methods
      .releaseStake()
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta })
      .signers([authority])
      .rpc(RPC);

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.streak, 1, "streak = 1 after first release");
    assert.equal(ua.isActive, false, "is_active = false after release");
    assert.equal(ua.verified, true);
  });

  it("streak: increments to 2 after second deposit + release", async () => {
    // Re-deposit (is_active is now false)
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta, usdcMint })
      .signers([user1])
      .rpc(RPC);

    await program.methods
      .releaseStake()
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta })
      .signers([authority])
      .rpc(RPC);

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.streak, 2, "streak = 2 after second release");
  });

  it("streak: resets to 0 after forfeit_stake", async () => {
    // Deposit a third time
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta, usdcMint })
      .signers([user1])
      .rpc(RPC);

    await program.methods
      .forfeitStake()
      .accounts({ user: user1.publicKey })
      .signers([authority])
      .rpc(RPC);

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.streak, 0, "streak = 0 after forfeit");
    assert.equal(ua.isActive, false, "is_active = false after forfeit");
  });

  // ---------------------------------------------------------------------------
  // Re-deposit
  // ---------------------------------------------------------------------------

  it("re-deposit: works after settlement (is_active = false)", async () => {
    // user1's streak was just reset; is_active = false — deposit should succeed
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta, usdcMint })
      .signers([user1])
      .rpc(RPC);

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.isActive, true, "is_active = true after re-deposit");
  });

  it("re-deposit: rejected mid-month when is_active = true", async () => {
    // user1 is currently active (just deposited above)
    try {
      await program.methods
        .depositStake(STAKE)
        .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta, usdcMint })
        .signers([user1])
        .rpc();
      assert.fail("expected AlreadyActive error");
    } catch (err: any) {
      assert.ok(
        err.message.includes("AlreadyActive") ||
          err.error?.errorCode?.code === "AlreadyActive",
        `unexpected error: ${err.message}`
      );
    }
    // Clean up: release so user1 is settled for subsequent tests
    await program.methods
      .releaseStake()
      .accounts({ user: user1.publicKey, userUsdcAta: user1UsdcAta })
      .signers([authority])
      .rpc(RPC);
  });

  // ---------------------------------------------------------------------------
  // COMMIT token minting (Token-2022)
  // ---------------------------------------------------------------------------

  async function commitBalance(user: anchor.web3.PublicKey): Promise<bigint> {
    const ata = getAssociatedTokenAddressSync(
      commitMint, user, false, TOKEN_2022_PROGRAM_ID
    );
    const info = await getAccount(conn, ata, "confirmed", TOKEN_2022_PROGRAM_ID);
    return info.amount;
  }

  /** Explicit Token-2022 ATA address — Anchor can't auto-resolve cross-program ATAs. */
  function commitAta(user: anchor.web3.PublicKey) {
    return getAssociatedTokenAddressSync(
      commitMint, user, false, TOKEN_2022_PROGRAM_ID
    );
  }

  it("mint_commit: streak 1-2 → 100 tokens", async () => {
    await program.methods
      .mintCommit(user1.publicKey, 1)
      .accountsPartial({ user: user1.publicKey, commitMint, userCommitAta: commitAta(user1.publicKey), token2022Program: TOKEN_2022_PROGRAM_ID })
      .signers([authority])
      .rpc(RPC);

    assert.equal(Number(await commitBalance(user1.publicKey)), 100);
  });

  it("mint_commit: streak 3-5 → 150 tokens", async () => {
    await program.methods
      .mintCommit(user1.publicKey, 3)
      .accountsPartial({ user: user1.publicKey, commitMint, userCommitAta: commitAta(user1.publicKey), token2022Program: TOKEN_2022_PROGRAM_ID })
      .signers([authority])
      .rpc(RPC);

    assert.equal(Number(await commitBalance(user1.publicKey)), 250); // 100 + 150
  });

  it("mint_commit: streak 6-11 → 200 tokens", async () => {
    await program.methods
      .mintCommit(user1.publicKey, 6)
      .accountsPartial({ user: user1.publicKey, commitMint, userCommitAta: commitAta(user1.publicKey), token2022Program: TOKEN_2022_PROGRAM_ID })
      .signers([authority])
      .rpc(RPC);

    assert.equal(Number(await commitBalance(user1.publicKey)), 450); // + 200
  });

  it("mint_commit: streak 12-23 → 300 tokens", async () => {
    await program.methods
      .mintCommit(user1.publicKey, 12)
      .accountsPartial({ user: user1.publicKey, commitMint, userCommitAta: commitAta(user1.publicKey), token2022Program: TOKEN_2022_PROGRAM_ID })
      .signers([authority])
      .rpc(RPC);

    assert.equal(Number(await commitBalance(user1.publicKey)), 750); // + 300
  });

  it("mint_commit: streak 24+ → 400 tokens", async () => {
    await program.methods
      .mintCommit(user1.publicKey, 24)
      .accountsPartial({ user: user1.publicKey, commitMint, userCommitAta: commitAta(user1.publicKey), token2022Program: TOKEN_2022_PROGRAM_ID })
      .signers([authority])
      .rpc(RPC);

    assert.equal(Number(await commitBalance(user1.publicKey)), 1150); // + 400
  });

  // ---------------------------------------------------------------------------
  // Pool redistribution
  // ---------------------------------------------------------------------------

  it("reset_month: sets verifiedUsersThisMonth to 0", async () => {
    // Accumulated releases from streak tests — reset before pool tests
    await program.methods
      .resetMonth()
      .accounts({})
      .signers([authority])
      .rpc(RPC);

    const ps = await program.account.poolState.fetch(poolState);
    assert.equal(ps.verifiedUsersThisMonth, 0);
  });

  it("pool redistribution: forfeited user's stake flows to verified user", async () => {
    // user2 deposits and forfeits — 40 USDC goes to pool
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user2.publicKey, userUsdcAta: user2UsdcAta, usdcMint })
      .signers([user2])
      .rpc(RPC);

    await program.methods
      .forfeitStake()
      .accounts({ user: user2.publicKey })
      .signers([authority])
      .rpc(RPC);

    // user3 deposits and releases — verified_users_this_month becomes 1
    await program.methods
      .depositStake(STAKE)
      .accounts({ user: user3.publicKey, userUsdcAta: user3UsdcAta, usdcMint })
      .signers([user3])
      .rpc(RPC);

    await program.methods
      .releaseStake()
      .accounts({ user: user3.publicKey, userUsdcAta: user3UsdcAta })
      .signers([authority])
      .rpc(RPC);

    const ps = await program.account.poolState.fetch(poolState);
    assert.equal(ps.verifiedUsersThisMonth, 1, "one verified user this month");

    const poolBalBefore = (await getAccount(conn, pool)).amount;
    const user3BalBefore = (await getAccount(conn, user3UsdcAta)).amount;

    // user3 claims their proportional share: pool_balance / 1 = 40 USDC
    await program.methods
      .claimPoolShare()
      .accounts({ user: user3.publicKey, userUsdcAta: user3UsdcAta })
      .signers([user3])
      .rpc(RPC);

    const user3BalAfter = (await getAccount(conn, user3UsdcAta)).amount;
    const poolBalAfter = (await getAccount(conn, pool)).amount;

    assert.equal(
      Number(user3BalAfter - user3BalBefore),
      Number(poolBalBefore),
      "user3 received the full pool (user2's forfeited 40 USDC)"
    );
    assert.equal(Number(poolBalAfter), 0, "pool drained");

    // Verify has_claimed was set
    const ua = await program.account.userAccount.fetch(
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("user_account"), user3.publicKey.toBuffer()],
        program.programId
      )[0]
    );
    assert.equal(ua.hasClaimed, true, "has_claimed = true after first claim");
  });

  it("claim_pool_share: rejects double-claim with AlreadyClaimed", async () => {
    // user3 already claimed above — a second call must be rejected
    try {
      await program.methods
        .claimPoolShare()
        .accounts({ user: user3.publicKey, userUsdcAta: user3UsdcAta })
        .signers([user3])
        .rpc();
      assert.fail("expected AlreadyClaimed error");
    } catch (err: any) {
      assert.ok(
        err.message.includes("AlreadyClaimed") ||
          err.error?.errorCode?.code === "AlreadyClaimed",
        `unexpected error: ${err.message}`
      );
    }
  });
});
