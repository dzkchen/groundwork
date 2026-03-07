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

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

function keypairAsWallet(payer: Keypair) {
  return {
    publicKey: payer.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(payer);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return txs.map((tx) => {
        tx.partialSign(payer);
        return tx;
      });
    },
  } as never;
}

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
  const provider = new AnchorProvider(connection, keypairAsWallet(feePayer), {
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

/** Build a transaction with fee payer set and signed; returns base64 for client to add user sig and send. */
export async function buildSponsoredTx(
  connection: Connection,
  feePayer: Keypair,
  instruction: Parameters<Transaction["add"]>[0]
): Promise<string> {
  const tx = new Transaction();
  tx.add(instruction);
  tx.feePayer = feePayer.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.partialSign(feePayer);
  return tx.serialize({ requireAllSignatures: false }).toString("base64");
}

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
  const lumpSum = new BN(amountUsdc * 1_000_000); // USDC 6 decimals

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ix = await (program.methods as any)
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
    .instruction();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ix = await (program.methods as any)
    .claimPoolShare()
    .accounts({
      user: userPubkey,
      userAccount,
      pool,
      poolState,
      userUsdcAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  return buildSponsoredTx(connection, feePayer, ix);
}
