import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { z } from "zod";

const rechargeSchema = z.object({
  amount: z.number().positive().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = rechargeSchema.parse(body);

    const userId = parseInt(session.user.id);
    const rupeesPerPoint = parseFloat(
      process.env.WALLET_RUPEES_PER_POINT || "1"
    );
    const points = amount / rupeesPerPoint;

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Update wallet balance
      const balanceResult = await client.query(
        `UPDATE wallet_balance 
         SET points = points + $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING points`,
        [points, userId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, points, type, description)
         VALUES ($1, $2, $3, 'recharge', 'Wallet recharge')`,
        [userId, amount, points]
      );

      return balanceResult.rows[0];
    });

    const pointsPerSecond = parseFloat(
      process.env.WALLET_POINTS_PER_SECOND || "0.1667"
    );
    const seconds = Math.floor(parseFloat(result.points) / pointsPerSecond);

    return NextResponse.json({
      success: true,
      points: parseFloat(result.points),
      seconds,
      amountPaid: amount,
    });
  } catch (error) {
    console.error("Recharge error:", error);
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}
