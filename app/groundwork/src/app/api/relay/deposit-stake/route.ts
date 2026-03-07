import { NextRequest, NextResponse } from "next/server";
import { buildDepositStakeTx } from "@/lib/relay";

export async function POST(req: NextRequest) {
  try {
    const { wallet, amount } = await req.json();
    if (!wallet || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "wallet (string) and amount (positive number, USDC) required" },
        { status: 400 }
      );
    }
    const transaction = await buildDepositStakeTx(wallet, amount);
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error("POST /api/relay/deposit-stake:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build transaction" },
      { status: 500 }
    );
  }
}
