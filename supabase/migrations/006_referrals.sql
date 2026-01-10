-- FilingsFlow Referral System Schema
-- Supports milestone-based account credit rewards

-- Referral codes (one per user)
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referral tracking
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  rejection_reason TEXT,
  signup_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

-- Credit awards history
CREATE TABLE public.referral_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_txn_id TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

-- Audit log for fraud detection
CREATE TABLE public.referral_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referrals_created ON public.referrals(created_at);
CREATE INDEX idx_referrals_ip ON public.referrals(signup_ip);
CREATE INDEX idx_referral_credits_user ON public.referral_credits(user_id);
CREATE INDEX idx_referral_audit_user ON public.referral_audit_log(user_id);
CREATE INDEX idx_referral_audit_event ON public.referral_audit_log(event_type);
CREATE INDEX idx_referral_audit_created ON public.referral_audit_log(created_at);

-- RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral code
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view referrals they made
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can view their own credits
CREATE POLICY "Users can view own credits" ON public.referral_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Service role only for audit log (no user access)
CREATE POLICY "Service role can manage audit log" ON public.referral_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS TABLE (
  total_referrals BIGINT,
  confirmed_referrals BIGINT,
  pending_referrals BIGINT,
  credits_earned_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_referrals,
    COUNT(*) FILTER (WHERE status = 'confirmed')::BIGINT as confirmed_referrals,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_referrals,
    COALESCE((SELECT SUM(amount_cents) FROM public.referral_credits WHERE user_id = p_user_id), 0)::BIGINT as credits_earned_cents
  FROM public.referrals
  WHERE referrer_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
