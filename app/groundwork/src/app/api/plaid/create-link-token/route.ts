import { NextRequest, NextResponse } from "next/server";
import { Products, CountryCode } from "plaid";
import { getPlaidClient } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const { client_user_id } = await req.json();

    const response = await getPlaidClient().linkTokenCreate({
      user: { client_user_id: client_user_id ?? "user" },
      client_name: "Groundwork",
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca],
      language: "en",
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown } };
    console.error("POST /api/plaid/create-link-token:", axiosErr?.response?.data ?? err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
