import { NextRequest, NextResponse } from "next/server";
import { getPlaidClient } from "@/lib/plaid";
import { getDb } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    const { public_token, wallet } = await req.json();

    const response = await getPlaidClient().itemPublicTokenExchange({ public_token });
    const access_token = response.data.access_token;

    await getDb()
      .collection("users")
      .doc(wallet)
      .set({ plaidAccessToken: access_token, flinksLoginId: "plaid-connected" }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/plaid/exchange-token:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
