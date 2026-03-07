import { NextRequest, NextResponse } from "next/server";
import { buildClaimPoolShareTx } from "@/lib/relay";

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json();
    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "wallet (string) required" },
        { status: 400 }
      );
    }
    const transaction = await buildClaimPoolShareTx(wallet);
    return NextResponse.json({ transaction });
  } catch (e) {
    console.error("POST /api/relay/claim-pool-share:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build transaction" },
      { status: 500 }
    );
  }
}
