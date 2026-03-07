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
    const ref = getDb().collection("users").doc(wallet);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: snap.data() }, { status: 200 });
  } catch (err) {
    console.error("GET /api/user/[wallet]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
