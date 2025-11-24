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

    const result = await query<{ points: string }>(
      "SELECT points FROM wallet_balance WHERE user_id = $1",
      [parseInt(session.user.id)]
    );

    const points = result.rows[0]?.points || "0";
    const pointsPerSecond = parseFloat(
      process.env.WALLET_POINTS_PER_SECOND || "0.1667"
    );
    const seconds = Math.floor(parseFloat(points) / pointsPerSecond);

    return NextResponse.json(
      {
        points: parseFloat(points),
        seconds,
        pointsPerSecond,
      },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
