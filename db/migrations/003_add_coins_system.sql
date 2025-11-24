-- Add coins system for gamification

-- Add coins column to wallet_balance
ALTER TABLE wallet_balance 
ADD COLUMN IF NOT EXISTS coins DECIMAL(10, 2) DEFAULT 0;

-- Coin transfers table
CREATE TABLE IF NOT EXISTS coin_transfers (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL, -- Original amount sent
  gst_amount DECIMAL(10, 2) NOT NULL, -- 18% GST
  platform_fee DECIMAL(10, 2) NOT NULL, -- 2% platform fee
  net_amount DECIMAL(10, 2) NOT NULL, -- Amount after deductions (80% of original)
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'failed', 'pending'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coin_transfers_sender_id ON coin_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_coin_transfers_receiver_id ON coin_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_coin_transfers_session_id ON coin_transfers(session_id);
CREATE INDEX IF NOT EXISTS idx_coin_transfers_created_at ON coin_transfers(created_at);

