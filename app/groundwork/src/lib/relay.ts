import {
  Keypair,
  Connection,
  Transaction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idl from "./idl.json";
import { keypairAsWallet } from "./solana-wallet";

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

function getFeePayer(): Keypair {
  const raw = process.env.FEE_PAYER_PRIVATE_KEY;
  if (!raw) throw new Error("FEE_PAYER_PRIVATE_KEY is not set");
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export function getRelayConnection(): Connection {
  return new Connection(RPC, "confirmed");
}

export function buildRelayProgram(): { program: Program; feePayer: Keypair; connection: Connection } {
  const feePayer = getFeePayer();
  const connection = getRelayConnection();
  const provider = new AnchorProvider(connection, keypairAsWallet(feePayer) as never, {
    commitment: "confirmed",
  });
  const program = new Program(idl as Idl, provider);
  return { program, feePayer, connection };
}

export function programId(): PublicKey {
  return PROGRAM_ID;
}

export function pdas(userPubkey: PublicKey) {
  const [userAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_account"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool")], PROGRAM_ID);
  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    PROGRAM_ID
  );
  return { userAccount, pool, poolState };
}

export async function buildSponsoredTx(
  connection: Connection,
  feePayer: Keypair,
  instruction: Parameters<Transaction["add"]>[0]
): Promise<string> {
  const tx = new Transaction();
  tx.add(instruction);
  tx.feePayer = feePayer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(feePayer);
  return tx.serialize({ requireAllSignatures: false }).toString("base64");
}

type AnchorIxBuilder = {
  accounts: (accounts: Record<string, unknown>) => { instruction: () => Promise<unknown> };
};

type RelayMethods = {
  depositStake: (amount: BN) => AnchorIxBuilder;
  claimPoolShare: () => AnchorIxBuilder;
};

export async function buildDepositStakeTx(userWallet: string, amountUsdc: number): Promise<string> {
  const usdcMintStr = process.env.NEXT_PUBLIC_USDC_MINT;
  if (!usdcMintStr) throw new Error("NEXT_PUBLIC_USDC_MINT not set");
  const usdcMint = new PublicKey(usdcMintStr);
  const userPubkey = new PublicKey(userWallet);
  const { program, feePayer, connection } = buildRelayProgram();
  const { userAccount } = pdas(userPubkey);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
  const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);
  const lumpSum = new BN(Math.round(amountUsdc * 1_000_000));

  const ix = (await (program.methods as unknown as RelayMethods)
    .depositStake(lumpSum)
    .accounts({
      user: userPubkey,
      userAccount,
      vault: vaultPda,
      userUsdcAta,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction()) as Parameters<Transaction["add"]>[0];
  return buildSponsoredTx(connection, feePayer, ix);
}

export async function buildClaimPoolShareTx(userWallet: string): Promise<string> {
  const usdcMintStr = process.env.NEXT_PUBLIC_USDC_MINT;
  if (!usdcMintStr) throw new Error("NEXT_PUBLIC_USDC_MINT not set");
  const usdcMint = new PublicKey(usdcMintStr);
  const userPubkey = new PublicKey(userWallet);
  const { program, feePayer, connection } = buildRelayProgram();
  const { userAccount, pool, poolState } = pdas(userPubkey);
  const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);

  const ix = (await (program.methods as unknown as RelayMethods)
    .claimPoolShare()
    .accounts({
      user: userPubkey,
      userAccount,
      pool,
      poolState,
      userUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction()) as Parameters<Transaction["add"]>[0];
  return buildSponsoredTx(connection, feePayer, ix);
}
