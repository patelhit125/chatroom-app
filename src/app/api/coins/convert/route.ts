import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transaction, query } from "@/lib/db";
import { z } from "zod";

const convertCoinsSchema = z.object({
  coins: z.number().positive().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { coins } = convertCoinsSchema.parse(body);

    const userId = parseInt(session.user.id);
    const pointsPerCoin = parseFloat(
      process.env.COINS_TO_POINTS_RATE || "1"
    ); // 1 coin = 1 point by default
    const points = coins * pointsPerCoin;

    const pointsPerSecond = parseFloat(
      process.env.WALLET_POINTS_PER_SECOND || "0.1667"
    );
    const seconds = Math.floor(points / pointsPerSecond);

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Check user's coin balance
      const coinBalance = await client.query(
        `SELECT coins FROM wallet_balance WHERE user_id = $1`,
        [userId]
      );

      const userCoins = parseFloat(coinBalance.rows[0]?.coins || "0");

      if (userCoins < coins) {
        throw new Error("Insufficient coins");
      }

      // Deduct coins
      await client.query(
        `UPDATE wallet_balance 
         SET coins = coins - $1, updated_at = NOW()
         WHERE user_id = $2`,
        [coins, userId]
      );

      // Add points
      const balanceResult = await client.query(
        `UPDATE wallet_balance 
         SET points = COALESCE(points, 0) + $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING points`,
        [points, userId]
      );

      // Log transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, points, type, description)
         VALUES ($1, 0, $2, 'coin_conversion', 'Converted ${coins} coins to ${points} points')`,
        [userId, points]
      );

      return {
        newCoinBalance: userCoins - coins,
        newPointsBalance: parseFloat(balanceResult.rows[0].points),
      };
    });

    return NextResponse.json({
      success: true,
      coinsConverted: coins,
      pointsReceived: points,
      secondsReceived: seconds,
      newCoinBalance: result.newCoinBalance,
      newPointsBalance: result.newPointsBalance,
    });
  } catch (error: any) {
    console.error("Convert coins error:", error);
    if (error.message === "Insufficient coins") {
      return NextResponse.json(
        { error: "Insufficient coins" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to convert coins" },
      { status: 500 }
    );
  }
}

