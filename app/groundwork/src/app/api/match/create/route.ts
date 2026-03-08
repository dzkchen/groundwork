import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const STAKE_AMOUNT = 50;
const MAX_PARTICIPANTS = 4;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, monthlyCommitment } = await req.json();

    if (!walletAddress || monthlyCommitment == null) {
      return NextResponse.json(
        { error: "walletAddress and monthlyCommitment required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const matchRef = db.collection("matches").doc();
    const code = generateCode();

    await matchRef.set({
      creatorWallet: walletAddress,
      participants: [walletAddress],
      monthlyCommitment: Number(monthlyCommitment),
      stakeAmount: STAKE_AMOUNT,
      totalMonths: 1,
      status: "open",
      code,
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection("users").doc(walletAddress).set(
      { matchId: matchRef.id },
      { merge: true }
    );

    return NextResponse.json({
      matchId: matchRef.id,
      code,
      stakeAmount: STAKE_AMOUNT,
      maxParticipants: MAX_PARTICIPANTS,
    });
  } catch (err) {
    console.error("POST /api/match/create:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
