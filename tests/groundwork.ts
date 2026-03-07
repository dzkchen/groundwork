import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { Groundwork } from "../target/types/groundwork";

// ---------------------------------------------------------------------------
// Authority keypair — matches AUTHORITY_PUBKEY hardcoded in the program.
// Derived from seed "groundwork-authority" (32 bytes), pubkey:
//   QVxt9ixFYpSbo44f8qR8hmSLnSJchzTQCCWJG1pCu2c
// ---------------------------------------------------------------------------
const AUTHORITY_SECRET = Uint8Array.from([
  103, 114, 111, 117, 110, 100, 119, 111, 114, 107, 45, 97, 117, 116, 104,
  111, 114, 105, 116, 121, 103, 114, 111, 117, 110, 100, 119, 111, 114, 107,
  45, 97, 6, 5, 27, 147, 157, 238, 108, 216, 95, 122, 148, 143, 20, 89, 29,
  105, 117, 83, 2, 94, 242, 207, 234, 208, 52, 122, 236, 171, 152, 17, 160,
  149,
]);

describe("groundwork", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Groundwork as Program<Groundwork>;
  const connection = provider.connection;
  const payer = (provider.wallet as anchor.Wallet).payer;

  const authority = anchor.web3.Keypair.fromSecretKey(AUTHORITY_SECRET);

  // user1 — for deposit + release tests
  const user1 = anchor.web3.Keypair.generate();
  // user2 — for deposit + forfeit tests
  const user2 = anchor.web3.Keypair.generate();

  const STAKE_AMOUNT = new anchor.BN(40_000_000); // 40 USDC (6 decimals)
  const MINT_AMOUNT = 100_000_000; // 100 USDC

  let usdcMint: anchor.web3.PublicKey;

  let user1UsdcAta: anchor.web3.PublicKey;
  let user1Account: anchor.web3.PublicKey;
  let vault1: anchor.web3.PublicKey;

  let user2UsdcAta: anchor.web3.PublicKey;
  let user2Account: anchor.web3.PublicKey;
  let vault2: anchor.web3.PublicKey;

  let pool: anchor.web3.PublicKey;

  /** Airdrop-confirms using a fresh blockhash to avoid expiry on localnet. */
  async function airdrop(pubkey: anchor.web3.PublicKey, lamports: number) {
    const sig = await connection.requestAirdrop(pubkey, lamports);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  }

  before("bootstrap", async () => {
    // Give the freshly-started localnet validator a moment to stabilise.
    await new Promise((r) => setTimeout(r, 2000));

    for (const kp of [authority, user1, user2]) {
      await airdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    }

    usdcMint = await createMint(connection, payer, payer.publicKey, null, 6);

    // Fund both users with 100 USDC each
    for (const [kp, setter] of [
      [user1, (v: anchor.web3.PublicKey) => (user1UsdcAta = v)],
      [user2, (v: anchor.web3.PublicKey) => (user2UsdcAta = v)],
    ] as const) {
      const ata = await createAssociatedTokenAccount(
        connection,
        payer,
        usdcMint,
        kp.publicKey
      );
      await mintTo(connection, payer, usdcMint, ata, payer, MINT_AMOUNT);
      setter(ata);
    }

    // Derive all PDAs
    [user1Account] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), user1.publicKey.toBuffer()],
      program.programId
    );
    [vault1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user1.publicKey.toBuffer()],
      program.programId
    );
    [user2Account] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), user2.publicKey.toBuffer()],
      program.programId
    );
    [vault2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user2.publicKey.toBuffer()],
      program.programId
    );
    [pool] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pool")],
      program.programId
    );
  });

  // ---------------------------------------------------------------------------
  // initialize_pool
  // ---------------------------------------------------------------------------

  it("initialize_pool: creates the shared pool account", async () => {
    await program.methods
      .initializePool()
      .accounts({ usdcMint })
      .signers([authority])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    const poolInfo = await getAccount(connection, pool);
    assert.equal(Number(poolInfo.amount), 0, "pool starts empty");
    assert.equal(
      poolInfo.mint.toBase58(),
      usdcMint.toBase58(),
      "pool uses USDC mint"
    );
  });

  // ---------------------------------------------------------------------------
  // deposit_stake + release_stake (user1)
  // ---------------------------------------------------------------------------

  it("deposit_stake: initialises UserAccount and moves 40 USDC into vault", async () => {
    await program.methods
      .depositStake(STAKE_AMOUNT)
      .accounts({
        user: user1.publicKey,
        userUsdcAta: user1UsdcAta,
        usdcMint,
      })
      .signers([user1])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.wallet.toBase58(), user1.publicKey.toBase58(), "wallet");
    assert.equal(ua.stakeAmount.toNumber(), STAKE_AMOUNT.toNumber(), "stakeAmount");
    assert.equal(ua.verified, false, "verified = false after deposit");

    const vaultInfo = await getAccount(connection, vault1);
    assert.equal(Number(vaultInfo.amount), STAKE_AMOUNT.toNumber(), "vault holds 40 USDC");

    const userInfo = await getAccount(connection, user1UsdcAta);
    assert.equal(
      Number(userInfo.amount),
      MINT_AMOUNT - STAKE_AMOUNT.toNumber(),
      "user ATA debited by 40 USDC"
    );
  });

  it("release_stake: flips verified=true and returns 40 USDC to user", async () => {
    const balBefore = (await getAccount(connection, user1UsdcAta)).amount;

    await program.methods
      .releaseStake()
      .accounts({
        user: user1.publicKey,
        userUsdcAta: user1UsdcAta,
      })
      .signers([authority])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    const ua = await program.account.userAccount.fetch(user1Account);
    assert.equal(ua.verified, true, "verified = true after release");

    const balAfter = (await getAccount(connection, user1UsdcAta)).amount;
    assert.equal(Number(balAfter - balBefore), STAKE_AMOUNT.toNumber(), "40 USDC returned");

    const vaultInfo = await getAccount(connection, vault1);
    assert.equal(Number(vaultInfo.amount), 0, "vault drained");
  });

  // ---------------------------------------------------------------------------
  // deposit_stake + forfeit_stake (user2)
  // ---------------------------------------------------------------------------

  it("deposit_stake (user2): deposits 40 USDC into vault2", async () => {
    await program.methods
      .depositStake(STAKE_AMOUNT)
      .accounts({
        user: user2.publicKey,
        userUsdcAta: user2UsdcAta,
        usdcMint,
      })
      .signers([user2])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    const vaultInfo = await getAccount(connection, vault2);
    assert.equal(Number(vaultInfo.amount), STAKE_AMOUNT.toNumber(), "vault2 holds 40 USDC");
  });

  it("forfeit_stake: transfers vault balance to pool, user2 receives nothing", async () => {
    const poolBalBefore = (await getAccount(connection, pool)).amount;
    const user2BalBefore = (await getAccount(connection, user2UsdcAta)).amount;

    await program.methods
      .forfeitStake()
      .accounts({ user: user2.publicKey })
      .signers([authority])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // Pool received the forfeited tokens
    const poolBalAfter = (await getAccount(connection, pool)).amount;
    assert.equal(
      Number(poolBalAfter - poolBalBefore),
      STAKE_AMOUNT.toNumber(),
      "pool received 40 USDC"
    );

    // User2's ATA is unchanged
    const user2BalAfter = (await getAccount(connection, user2UsdcAta)).amount;
    assert.equal(user2BalAfter, user2BalBefore, "user2 received nothing");

    // Vault2 is drained
    const vaultInfo = await getAccount(connection, vault2);
    assert.equal(Number(vaultInfo.amount), 0, "vault2 drained");
  });
});
