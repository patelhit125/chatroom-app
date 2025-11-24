import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transaction, query } from "@/lib/db";
import { z } from "zod";

const sendCoinsSchema = z.object({
  receiverId: z.number().int().positive(),
  amount: z.number().positive().min(1),
  sessionId: z.number().int().positive().optional(),
});

const GST_RATE = 0.18; // 18%
const PLATFORM_FEE_RATE = 0.02; // 2%
const TOTAL_DEDUCTION_RATE = GST_RATE + PLATFORM_FEE_RATE; // 20%

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, amount, sessionId } = sendCoinsSchema.parse(body);

    const senderId = parseInt(session.user.id);

    if (senderId === receiverId) {
      return NextResponse.json(
        { error: "Cannot send coins to yourself" },
        { status: 400 }
      );
    }

    // Calculate deductions
    const gstAmount = amount * GST_RATE;
    const platformFee = amount * PLATFORM_FEE_RATE;
    const netAmount = amount * (1 - TOTAL_DEDUCTION_RATE); // 80% of original

    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // Check sender's coin balance
      const senderBalance = await client.query(
        `SELECT coins FROM wallet_balance WHERE user_id = $1`,
        [senderId]
      );

      const senderCoins = parseFloat(senderBalance.rows[0]?.coins || "0");

      if (senderCoins < amount) {
        throw new Error("Insufficient coins");
      }

      // Deduct coins from sender
      await client.query(
        `UPDATE wallet_balance 
         SET coins = coins - $1, updated_at = NOW()
         WHERE user_id = $2`,
        [amount, senderId]
      );

      // Add net amount to receiver (after deductions)
      await client.query(
        `UPDATE wallet_balance 
         SET coins = COALESCE(coins, 0) + $1, updated_at = NOW()
         WHERE user_id = $2`,
        [netAmount, receiverId]
      );

      // Create coin transfer record
      const transferResult = await client.query(
        `INSERT INTO coin_transfers 
         (sender_id, receiver_id, amount, gst_amount, platform_fee, net_amount, session_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
         RETURNING id, created_at`,
        [senderId, receiverId, amount, gstAmount, platformFee, netAmount, sessionId || null]
      );

      return {
        transferId: transferResult.rows[0].id,
        createdAt: transferResult.rows[0].created_at,
        newBalance: senderCoins - amount,
      };
    });

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      amountSent: amount,
      netAmountReceived: netAmount,
      gstAmount,
      platformFee,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("Send coins error:", error);
    if (error.message === "Insufficient coins") {
      return NextResponse.json(
        { error: "Insufficient coins" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send coins" },
      { status: 500 }
    );
  }
}

