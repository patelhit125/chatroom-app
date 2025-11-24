import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { z } from "zod";

const purchaseCoinsSchema = z.object({
  amount: z.number().positive().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = purchaseCoinsSchema.parse(body);

    const userId = parseInt(session.user.id);
    
    // Conversion rate: ₹1 = 1 coin (can be configured via env)
    const rupeesPerCoin = parseFloat(
      process.env.RUPEES_PER_COIN || "1"
    );
    const coins = amount / rupeesPerCoin;

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Update wallet balance - add coins
      const balanceResult = await client.query(
        `UPDATE wallet_balance 
         SET coins = COALESCE(coins, 0) + $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING coins`,
        [coins, userId]
      );

      // If user doesn't have a wallet balance record, create one
      if (balanceResult.rows.length === 0) {
        const newBalanceResult = await client.query(
          `INSERT INTO wallet_balance (user_id, coins, points)
           VALUES ($1, $2, 0)
           RETURNING coins`,
          [userId, coins]
        );
        balanceResult.rows.push(newBalanceResult.rows[0]);
      }

      // Log transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, points, type, description)
         VALUES ($1, $2, 0, 'coin_purchase', 'Purchased ${coins.toFixed(2)} coins')`,
        [userId, amount]
      );

      return balanceResult.rows[0];
    });

    return NextResponse.json({
      success: true,
      coins: parseFloat(result.coins),
      amountPaid: amount,
      coinsReceived: coins,
    });
  } catch (error) {
    console.error("Purchase coins error:", error);
    return NextResponse.json(
      { error: "Failed to purchase coins" },
      { status: 500 }
    );
  }
}

