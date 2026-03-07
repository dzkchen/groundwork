import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, monthlyBudget, commitmentAmount } =
      await req.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const ref = getDb().collection("users").doc(walletAddress);
    const existing = await ref.get();

    if (existing.exists) {
      return NextResponse.json({ exists: true, walletAddress }, { status: 200 });
    }

    await ref.set({
      walletAddress,
      monthlyBudget: monthlyBudget ?? null,
      commitmentAmount: commitmentAmount ?? null,
      streak: 0,
      isActive: false,
      verifiedThisMonth: false,
      hasClaimed: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ created: true, walletAddress }, { status: 201 });
  } catch (err) {
    console.error("POST /api/onboard:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
