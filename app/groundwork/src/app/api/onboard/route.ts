import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, fhsaProvider, monthlyCommitment } = await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const ref = getDb().collection("users").doc(walletAddress);

    await ref.set(
      {
        walletAddress,
        fhsaProvider: fhsaProvider ?? null,
        monthlyCommitment: monthlyCommitment ?? null,
        // plaidAccessToken is intentionally NOT set here so merge:true
        // preserves any value already written by /api/plaid/exchange-token
        streak: 0,
        isActive: false,
        verifiedThisMonth: false,
        hasClaimed: false,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, walletAddress }, { status: 200 });
  } catch (err) {
    console.error("POST /api/onboard:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
