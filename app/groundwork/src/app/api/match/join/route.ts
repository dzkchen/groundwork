import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const MAX_PARTICIPANTS = 4;

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, matchIdOrCode, monthlyCommitment } = await req.json();

    if (!walletAddress || !matchIdOrCode) {
      return NextResponse.json(
        { error: "walletAddress and matchIdOrCode (or code) required" },
        { status: 400 }
      );
    }

    const db = getDb();
    let matchSnap;

    if (matchIdOrCode.length === 6) {
      const byCode = await db
        .collection("matches")
        .where("code", "==", matchIdOrCode.toUpperCase())
        .limit(1)
        .get();
      matchSnap = byCode.docs[0];
    } else {
      matchSnap = await db.collection("matches").doc(matchIdOrCode).get();
    }

    if (!matchSnap?.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const data = matchSnap.data()!;
    const participants: string[] = data.participants || [];

    if (participants.includes(walletAddress)) {
      return NextResponse.json({
        matchId: matchSnap.id,
        stakeAmount: data.stakeAmount,
        alreadyIn: true,
      });
    }

    if (participants.length >= MAX_PARTICIPANTS) {
      return NextResponse.json(
        { error: "Match is full (4 people max)" },
        { status: 400 }
      );
    }

    const ref = matchSnap.ref;
    await ref.update({
      participants: FieldValue.arrayUnion(walletAddress),
      status: participants.length + 1 >= MAX_PARTICIPANTS ? "full" : "open",
    });

    await db.collection("users").doc(walletAddress).set(
      {
        matchId: matchSnap.id,
        monthlyCommitment: monthlyCommitment ?? data.monthlyCommitment,
        totalMonths: data.totalMonths ?? 1,
        stakeAmount: data.stakeAmount,
      },
      { merge: true }
    );

    return NextResponse.json({
      matchId: matchSnap.id,
      stakeAmount: data.stakeAmount,
    });
  } catch (err) {
    console.error("POST /api/match/join:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
