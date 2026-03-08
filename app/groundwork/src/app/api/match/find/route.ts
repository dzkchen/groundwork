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
    const commitment = Number(monthlyCommitment);

    const openMatches = await db
      .collection("matches")
      .where("status", "==", "open")
      .limit(30)
      .get();

    const existing = openMatches.docs.find((d) => {
      const data = d.data();
      return (
        data.monthlyCommitment === commitment &&
        data.stakeAmount === STAKE_AMOUNT &&
        (data.participants?.length ?? 0) < MAX_PARTICIPANTS
      );
    });

    let matchRef;
    let matchId: string;
    let participants: string[];

    if (existing) {
      matchRef = existing.ref;
      matchId = existing.id;
      participants = existing.data().participants ?? [];
      if (participants.includes(walletAddress)) {
        return NextResponse.json({ matchId, stakeAmount: STAKE_AMOUNT, alreadyIn: true });
      }
      await matchRef.update({
        participants: FieldValue.arrayUnion(walletAddress),
        status: participants.length + 1 >= MAX_PARTICIPANTS ? "full" : "open",
      });
    } else {
      const newRef = db.collection("matches").doc();
      matchId = newRef.id;
      await newRef.set({
        creatorWallet: walletAddress,
        participants: [walletAddress],
        monthlyCommitment: commitment,
        stakeAmount: STAKE_AMOUNT,
        totalMonths: 1,
        status: "open",
        code: generateCode(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await db.collection("users").doc(walletAddress).set(
      {
        matchId,
        monthlyCommitment: commitment,
        totalMonths: 1,
        stakeAmount: STAKE_AMOUNT,
      },
      { merge: true }
    );

    return NextResponse.json({ matchId, stakeAmount: STAKE_AMOUNT });
  } catch (err) {
    console.error("POST /api/match/find:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
