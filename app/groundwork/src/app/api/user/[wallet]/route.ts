import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const body = await req.json();
    await getDb().collection("users").doc(wallet).update(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/user/[wallet]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;
    const db = getDb();
    const ref = db.collection("users").doc(wallet);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = snap.data()!;
    let match: { matchId: string; participants: { walletAddress: string; verifiedThisMonth: boolean; isYou: boolean }[] } | null = null;

    const matchId = userData.matchId;
    if (matchId) {
      const matchSnap = await db.collection("matches").doc(matchId).get();
      if (matchSnap.exists) {
        const participants: string[] = matchSnap.data()?.participants ?? [];
        const participantsWithStatus = await Promise.all(
          participants.map(async (wa: string) => {
            const u = await db.collection("users").doc(wa).get();
            const verifiedThisMonth = u.exists ? (u.data()?.verifiedThisMonth === true) : false;
            return {
              walletAddress: wa,
              verifiedThisMonth,
              isYou: wa === wallet,
            };
          })
        );
        match = { matchId, participants: participantsWithStatus };
      }
    }

    return NextResponse.json({ user: userData, match }, { status: 200 });
  } catch (err) {
    console.error("GET /api/user/[wallet]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
