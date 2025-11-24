import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const result = await query<{ coins: string }>(
      "SELECT COALESCE(coins, 0) as coins FROM wallet_balance WHERE user_id = $1",
      [parseInt(session.user.id)]
    );

    const coins = parseFloat(result.rows[0]?.coins || "0");

    return NextResponse.json(
      { coins },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get coins balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch coins balance" },
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

