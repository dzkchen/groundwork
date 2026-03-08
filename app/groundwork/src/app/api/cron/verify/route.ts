import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { getPlaidClient } from "@/lib/plaid";
import { FieldValue } from "firebase-admin/firestore";
import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import idl from "@/lib/idl.json";

function keypairAsWallet(payer: Keypair) {
  return {
    publicKey: payer.publicKey,
    signTransaction: async (tx: Transaction | VersionedTransaction) => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([payer]);
      } else {
        tx.partialSign(payer);
      }
      return tx;
    },
    signAllTransactions: async (txs: (Transaction | VersionedTransaction)[]) => {
      return txs.map((tx) => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([payer]);
        } else {
          tx.partialSign(payer);
        }
        return tx;
      });
    },
  };
}

function buildProgram(): { program: Program; authority: Keypair } {
  const keyArray = JSON.parse(process.env.AUTHORITY_PRIVATE_KEY!);
  const authority = Keypair.fromSecretKey(Uint8Array.from(keyArray));
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com",
    "confirmed"
  );
  const provider = new AnchorProvider(connection, keypairAsWallet(authority) as never, {
    commitment: "confirmed",
  });
  return { program: new Program(idl as Idl, provider), authority };
}

function pdas(userPubkey: PublicKey, programId: PublicKey) {
  const [userAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_account"), userPubkey.toBuffer()],
    programId
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), userPubkey.toBuffer()],
    programId
  );
  const [pool] = PublicKey.findProgramAddressSync([Buffer.from("pool")], programId);
  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    programId
  );
  return { userAccount, vault, pool, poolState };
}

async function getCommitMint(program: Program): Promise<PublicKey> {
  const [poolStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    program.programId
  );
  const state = await (program.account as any).poolState.fetch(poolStatePda);
  return state.commitMint as PublicKey;
}

async function callReleaseStake(
  program: Program,
  authority: Keypair,
  userPubkey: PublicKey,
  usdcMint: PublicKey
) {
  const { userAccount, vault, poolState } = pdas(userPubkey, program.programId);
  const userUsdcAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);

  await (program.methods as any)
    .releaseStake()
    .accounts({
      authority: authority.publicKey,
      user: userPubkey,
      userAccount,
      vault,
      userUsdcAta,
      poolState,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function callMintCommit(
  program: Program,
  authority: Keypair,
  userPubkey: PublicKey,
  commitMint: PublicKey,
  streak: number
) {
  const { poolState } = pdas(userPubkey, program.programId);
  const userCommitAta = getAssociatedTokenAddressSync(
    commitMint,
    userPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  await (program.methods as any)
    .mintCommit(userPubkey, streak)
    .accounts({
      authority: authority.publicKey,
      poolState,
      commitMint,
      user: userPubkey,
      userCommitAta,
      token2022Program: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function callForfeitStake(
  program: Program,
  authority: Keypair,
  userPubkey: PublicKey
) {
  const { userAccount, vault, pool } = pdas(userPubkey, program.programId);

  await (program.methods as any)
    .forfeitStake()
    .accounts({
      authority: authority.publicKey,
      user: userPubkey,
      userAccount,
      vault,
      pool,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function callResetMonth(program: Program, authority: Keypair) {
  const [poolState] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_state")],
    program.programId
  );

  await (program.methods as any)
    .resetMonth()
    .accounts({ authority: authority.publicKey, poolState })
    .rpc();
}

function plaidDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const ago = new Date(now);
  ago.setDate(ago.getDate() - 30);
  return {
    startDate: ago.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

interface UserDoc {
  walletAddress: string;
  plaidAccessToken: string;
  monthlyCommitment: number;
  streak: number;
  totalMonths: number;
  monthsCompleted: number;
}

async function processUser(
  user: UserDoc,
  program: Program,
  authority: Keypair,
  usdcMint: PublicKey,
  commitMint: PublicKey,
  forceResult?: "verified" | "forfeited"
): Promise<"verified" | "forfeited"> {
  let verified = false;

  if (forceResult) {
    verified = forceResult === "verified";
  } else {
    const { startDate, endDate } = plaidDateRange();
    const resp = await getPlaidClient().transactionsGet({
      access_token: user.plaidAccessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 500, offset: 0 },
    });
    verified = resp.data.transactions.some(
      (t) => t.amount >= user.monthlyCommitment
    );
  }

  const userPubkey = new PublicKey(user.walletAddress);
  const newMonthsCompleted = user.monthsCompleted + 1;
  const graduated = verified && newMonthsCompleted >= user.totalMonths;

  if (verified) {
    if (graduated) {
      await callReleaseStake(program, authority, userPubkey, usdcMint);
    }
    await callMintCommit(program, authority, userPubkey, commitMint, user.streak + 1);
    await getDb()
      .collection("users")
      .doc(user.walletAddress)
      .update({
        verifiedThisMonth: true,
        streak: FieldValue.increment(1),
        monthsCompleted: FieldValue.increment(1),
        isActive: graduated ? false : true,
        graduated: graduated ? true : false,
      });
  } else {
    await callForfeitStake(program, authority, userPubkey);
    await getDb()
      .collection("users")
      .doc(user.walletAddress)
      .update({
        verifiedThisMonth: false,
        streak: 0,
        isActive: false,
      });
  }

  return verified ? "verified" : "forfeited";
}

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization");
  return (
    header === secret ||
    (bearer != null && bearer === `Bearer ${secret}`)
  );
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usdcMintAddr = process.env.NEXT_PUBLIC_USDC_MINT;
  if (!usdcMintAddr) {
    return NextResponse.json({ error: "USDC mint not configured" }, { status: 500 });
  }

  const { program, authority } = buildProgram();
  const usdcMint = new PublicKey(usdcMintAddr);

  let commitMint: PublicKey;
  try {
    commitMint = await getCommitMint(program);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch pool state: ${String(e)}` },
      { status: 500 }
    );
  }

  try {
    await callResetMonth(program, authority);
  } catch (e) {
    return NextResponse.json(
      { error: `reset_month failed: ${String(e)}` },
      { status: 500 }
    );
  }

  const snapshot = await getDb()
    .collection("users")
    .where("isActive", "==", true)
    .get();

  const users = snapshot.docs
    .map((d) => d.data() as UserDoc)
    .filter((u) => u.plaidAccessToken && u.plaidAccessToken !== "");

  let verified = 0;
  let forfeited = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const result = await processUser(user, program, authority, usdcMint, commitMint);
      if (result === "verified") verified++;
      else forfeited++;
    } catch (e) {
      errors.push(`${user.walletAddress}: ${String(e)}`);
    }
  }

  return NextResponse.json({ verified, forfeited, errors });
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const wallet = req.nextUrl.searchParams.get("wallet");
  const result = req.nextUrl.searchParams.get("result") as
    | "verified"
    | "forfeited"
    | null;

  if (!wallet || !result || !["verified", "forfeited"].includes(result)) {
    return NextResponse.json(
      { error: "Required: ?wallet=<address>&result=verified|forfeited" },
      { status: 400 }
    );
  }

  const usdcMintAddr = process.env.NEXT_PUBLIC_USDC_MINT;
  if (!usdcMintAddr) {
    return NextResponse.json({ error: "USDC mint not configured" }, { status: 500 });
  }

  const snap = await getDb().collection("users").doc(wallet).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const user = snap.data() as UserDoc;

  const { program, authority } = buildProgram();
  const usdcMint = new PublicKey(usdcMintAddr);

  let commitMint: PublicKey;
  try {
    commitMint = await getCommitMint(program);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch pool state: ${String(e)}` },
      { status: 500 }
    );
  }

  try {
    await processUser(user, program, authority, usdcMint, commitMint, result);
    return NextResponse.json({ wallet, result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
