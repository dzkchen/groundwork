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

  // The hardcoded authority the program checks in release_stake.
  const authority = anchor.web3.Keypair.fromSecretKey(AUTHORITY_SECRET);

  // Fresh user for each test run.
  const user = anchor.web3.Keypair.generate();

  const STAKE_AMOUNT = new anchor.BN(40_000_000); // 40 USDC (6 decimals)
  const MINT_AMOUNT = 100_000_000; // 100 USDC

  let usdcMint: anchor.web3.PublicKey;
  let userUsdcAta: anchor.web3.PublicKey;
  let userAccount: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  /** Helper that airdrop-confirms using a fresh blockhash to avoid expiry. */
  async function airdrop(pubkey: anchor.web3.PublicKey, lamports: number) {
    const sig = await connection.requestAirdrop(pubkey, lamports);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    );
  }

  before("bootstrap: mint, ATAs, and PDAs", async () => {
    // Give the freshly-started localnet validator a moment to stabilise.
    await new Promise((r) => setTimeout(r, 2000));

    // Fund authority and user from the provider wallet (localnet airdrop).
    for (const kp of [authority, user]) {
      await airdrop(kp.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    }

    // Create a mock USDC mint (payer is mint authority for test convenience).
    usdcMint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      6 // 6 decimals — matches real USDC
    );

    // Create user's ATA and top it up.
    userUsdcAta = await createAssociatedTokenAccount(
      connection,
      payer,
      usdcMint,
      user.publicKey
    );
    await mintTo(connection, payer, usdcMint, userUsdcAta, payer, MINT_AMOUNT);

    // Derive PDAs — must match the seeds in lib.rs.
    [userAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_account"), user.publicKey.toBuffer()],
      program.programId
    );
    [vault] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("deposit_stake: initialises UserAccount and moves USDC into vault", async () => {
    await program.methods
      .depositStake(STAKE_AMOUNT)
      .accounts({
        user: user.publicKey,
        userUsdcAta,
        usdcMint,
      })
      .signers([user])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // UserAccount state
    const ua = await program.account.userAccount.fetch(userAccount);
    assert.equal(ua.wallet.toBase58(), user.publicKey.toBase58(), "wallet");
    assert.equal(
      ua.stakeAmount.toNumber(),
      STAKE_AMOUNT.toNumber(),
      "stakeAmount"
    );
    assert.equal(ua.verified, false, "verified should be false after deposit");

    // Vault should hold the staked tokens
    const vaultInfo = await getAccount(connection, vault);
    assert.equal(
      Number(vaultInfo.amount),
      STAKE_AMOUNT.toNumber(),
      "vault balance"
    );

    // User's ATA should be debited
    const userInfo = await getAccount(connection, userUsdcAta);
    assert.equal(
      Number(userInfo.amount),
      MINT_AMOUNT - STAKE_AMOUNT.toNumber(),
      "user ATA balance after deposit"
    );
  });

  it("release_stake: flips verified=true and returns USDC to user", async () => {
    const userBalBefore = (await getAccount(connection, userUsdcAta)).amount;

    await program.methods
      .releaseStake()
      .accounts({
        user: user.publicKey,
        userUsdcAta,
      })
      .signers([authority])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    // verified must be true
    const ua = await program.account.userAccount.fetch(userAccount);
    assert.equal(ua.verified, true, "verified should be true after release");

    // 40 USDC returned to user
    const userBalAfter = (await getAccount(connection, userUsdcAta)).amount;
    assert.equal(
      Number(userBalAfter - userBalBefore),
      STAKE_AMOUNT.toNumber(),
      "40 USDC returned to user"
    );

    // Vault should be empty
    const vaultInfo = await getAccount(connection, vault);
    assert.equal(Number(vaultInfo.amount), 0, "vault drained");
  });
});
