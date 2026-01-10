-- UI Optimization Functions
-- Optimized database functions for the redesigned dashboard

-- Function: Get top signal for dashboard hero card
-- Returns the most significant recent transaction with context
CREATE OR REPLACE FUNCTION public.get_top_signal(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  ticker TEXT,
  company_name TEXT,
  signal_type TEXT,
  headline TEXT,
  context TEXT,
  value BIGINT,
  direction TEXT,
  insider_name TEXT,
  insider_title TEXT,
  transaction_date DATE,
  filing_id UUID,
  significance_score INT,
  is_cluster BOOLEAN,
  cluster_count INT,
  is_first_in_months BOOLEAN,
  months_since_last INT
) AS $$
DECLARE
  v_watchlist_tickers TEXT[];
BEGIN
  -- Get user's watchlist tickers if user_id provided
  IF p_user_id IS NOT NULL THEN
    SELECT ARRAY_AGG(w.ticker) INTO v_watchlist_tickers
    FROM public.watchlists w
    WHERE w.user_id = p_user_id;
  END IF;

  RETURN QUERY
  WITH recent_txns AS (
    SELECT
      it.id,
      it.ticker,
      it.company_name,
      it.insider_name,
      it.insider_title,
      it.transaction_type,
      it.total_value,
      it.transaction_date,
      it.filing_id,
      it.is_officer,
      it.is_director,
      it.insider_cik,
      -- Calculate significance score
      (
        CASE WHEN it.total_value >= 10000000 THEN 50
             WHEN it.total_value >= 1000000 THEN 30
             WHEN it.total_value >= 100000 THEN 10
             ELSE 0 END
        + CASE WHEN it.insider_title ILIKE '%ceo%' THEN 30
               WHEN it.insider_title ILIKE '%cfo%' THEN 25
               WHEN it.insider_title ILIKE '%president%' THEN 20
               WHEN it.is_officer THEN 10
               ELSE 0 END
        + CASE WHEN v_watchlist_tickers IS NOT NULL AND it.ticker = ANY(v_watchlist_tickers) THEN 20 ELSE 0 END
      ) AS base_score
    FROM public.insider_transactions it
    WHERE it.transaction_date >= CURRENT_DATE - 2
      AND it.total_value > 0
    ORDER BY it.total_value DESC
    LIMIT 100
  ),
  with_clusters AS (
    SELECT
      rt.*,
      (
        SELECT COUNT(DISTINCT it2.insider_cik)
        FROM public.insider_transactions it2
        WHERE it2.ticker = rt.ticker
          AND it2.transaction_date >= CURRENT_DATE - 7
      ) AS cluster_insiders,
      (
        SELECT COUNT(*)
        FROM public.insider_transactions it2
        WHERE it2.ticker = rt.ticker
          AND it2.transaction_date >= CURRENT_DATE - 7
      ) AS cluster_txns
    FROM recent_txns rt
  ),
  with_history AS (
    SELECT
      wc.*,
      (
        SELECT MAX(it3.transaction_date)
        FROM public.insider_transactions it3
        WHERE it3.insider_cik = wc.insider_cik
          AND it3.transaction_type = wc.transaction_type
          AND it3.transaction_date < wc.transaction_date
      ) AS last_similar_date
    FROM with_clusters wc
  ),
  scored AS (
    SELECT
      wh.*,
      wh.base_score
        + CASE WHEN wh.cluster_insiders >= 3 THEN 25 ELSE 0 END
        + CASE WHEN wh.last_similar_date IS NULL OR wh.last_similar_date < CURRENT_DATE - 180 THEN 20 ELSE 0 END
      AS final_score,
      EXTRACT(MONTH FROM AGE(wh.transaction_date, wh.last_similar_date))::INT AS months_gap
    FROM with_history wh
  )
  SELECT
    s.ticker::TEXT,
    s.company_name::TEXT,
    CASE
      WHEN s.cluster_insiders >= 3 THEN 'cluster'
      WHEN s.months_gap > 6 THEN 'first-buy'
      WHEN s.total_value >= 1000000 THEN 'unusual-size'
      WHEN s.insider_title ILIKE '%ceo%' OR s.insider_title ILIKE '%cfo%' THEN 'c-suite'
      ELSE 'insider'
    END::TEXT AS signal_type,
    -- Headline
    CONCAT(
      COALESCE(s.insider_title, CASE WHEN s.is_officer THEN 'Officer' WHEN s.is_director THEN 'Director' ELSE 'Insider' END),
      ' ',
      CASE WHEN s.transaction_type IN ('P', 'A', 'M') THEN 'bought' ELSE 'sold' END,
      ' $',
      CASE
        WHEN s.total_value >= 1000000000 THEN ROUND(s.total_value / 1000000000.0, 1)::TEXT || 'B'
        WHEN s.total_value >= 1000000 THEN ROUND(s.total_value / 1000000.0, 1)::TEXT || 'M'
        WHEN s.total_value >= 1000 THEN ROUND(s.total_value / 1000.0, 0)::TEXT || 'K'
        ELSE s.total_value::TEXT
      END
    )::TEXT AS headline,
    -- Context
    CASE
      WHEN s.months_gap > 6 THEN CONCAT('First ', CASE WHEN s.transaction_type IN ('P', 'A', 'M') THEN 'purchase' ELSE 'sale' END, ' in ', s.months_gap, ' months')
      WHEN s.cluster_insiders >= 3 THEN CONCAT('Part of ', s.cluster_txns, ' insider transactions this week')
      ELSE s.insider_name
    END::TEXT AS context,
    s.total_value::BIGINT AS value,
    CASE WHEN s.transaction_type IN ('P', 'A', 'M') THEN 'buy' ELSE 'sell' END::TEXT AS direction,
    s.insider_name::TEXT,
    s.insider_title::TEXT,
    s.transaction_date,
    s.filing_id,
    s.final_score AS significance_score,
    (s.cluster_insiders >= 3) AS is_cluster,
    s.cluster_insiders::INT AS cluster_count,
    (s.months_gap > 6) AS is_first_in_months,
    s.months_gap AS months_since_last
  FROM scored s
  ORDER BY s.final_score DESC, s.total_value DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get watchlist pulse for quick status
-- Returns activity summary for each watchlist ticker
CREATE OR REPLACE FUNCTION public.get_watchlist_pulse(p_user_id UUID)
RETURNS TABLE (
  ticker TEXT,
  company_name TEXT,
  insider_buys_30d INT,
  insider_sells_30d INT,
  net_flow_30d BIGINT,
  last_insider_date DATE,
  last_insider_name TEXT,
  last_insider_action TEXT,
  has_cluster BOOLEAN,
  has_congress_trade BOOLEAN,
  has_13f_activity BOOLEAN,
  activity_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH watchlist_items AS (
    SELECT w.ticker, w.company_name
    FROM public.watchlists w
    WHERE w.user_id = p_user_id
  ),
  insider_stats AS (
    SELECT
      wi.ticker,
      wi.company_name,
      COUNT(*) FILTER (WHERE it.transaction_type IN ('P', 'A', 'M')) AS buys,
      COUNT(*) FILTER (WHERE it.transaction_type IN ('S', 'D', 'F')) AS sells,
      COALESCE(SUM(CASE WHEN it.transaction_type IN ('P', 'A', 'M') THEN it.total_value ELSE -it.total_value END), 0) AS net_flow,
      MAX(it.transaction_date) AS last_date,
      COUNT(DISTINCT it.insider_cik) AS unique_insiders
    FROM watchlist_items wi
    LEFT JOIN public.insider_transactions it ON it.ticker = wi.ticker
      AND it.transaction_date >= CURRENT_DATE - 30
    GROUP BY wi.ticker, wi.company_name
  ),
  last_insider AS (
    SELECT DISTINCT ON (it.ticker)
      it.ticker,
      it.insider_name,
      it.transaction_type
    FROM public.insider_transactions it
    WHERE it.ticker IN (SELECT ticker FROM watchlist_items)
      AND it.transaction_date >= CURRENT_DATE - 30
    ORDER BY it.ticker, it.transaction_date DESC
  ),
  congress_check AS (
    SELECT DISTINCT ct.ticker
    FROM public.congressional_transactions ct
    WHERE ct.ticker IN (SELECT ticker FROM watchlist_items)
      AND ct.disclosure_date >= CURRENT_DATE - 30
  ),
  holdings_check AS (
    SELECT DISTINCT h.ticker
    FROM public.holdings_13f h
    WHERE h.ticker IN (SELECT ticker FROM watchlist_items)
      AND h.report_date >= CURRENT_DATE - 90
  )
  SELECT
    ist.ticker::TEXT,
    ist.company_name::TEXT,
    ist.buys::INT AS insider_buys_30d,
    ist.sells::INT AS insider_sells_30d,
    ist.net_flow::BIGINT AS net_flow_30d,
    ist.last_date AS last_insider_date,
    li.insider_name::TEXT AS last_insider_name,
    CASE WHEN li.transaction_type IN ('P', 'A', 'M') THEN 'bought' ELSE 'sold' END::TEXT AS last_insider_action,
    (ist.unique_insiders >= 3 AND (ist.buys + ist.sells) >= 3) AS has_cluster,
    (cc.ticker IS NOT NULL) AS has_congress_trade,
    (hc.ticker IS NOT NULL) AS has_13f_activity,
    CASE
      WHEN (ist.buys + ist.sells) >= 5 THEN 'high'
      WHEN (ist.buys + ist.sells) >= 2 THEN 'medium'
      WHEN (ist.buys + ist.sells) >= 1 THEN 'low'
      ELSE 'none'
    END::TEXT AS activity_level
  FROM insider_stats ist
  LEFT JOIN last_insider li ON li.ticker = ist.ticker
  LEFT JOIN congress_check cc ON cc.ticker = ist.ticker
  LEFT JOIN holdings_check hc ON hc.ticker = ist.ticker
  ORDER BY (ist.buys + ist.sells) DESC, ist.net_flow DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get trending tickers
-- Returns tickers with most insider activity in the past 7 days
CREATE OR REPLACE FUNCTION public.get_trending_tickers(p_limit INT DEFAULT 10)
RETURNS TABLE (
  ticker TEXT,
  company_name TEXT,
  transaction_count INT,
  unique_insiders INT,
  total_buy_value BIGINT,
  total_sell_value BIGINT,
  net_flow BIGINT,
  has_cluster BOOLEAN,
  top_insider_name TEXT,
  top_insider_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH ticker_stats AS (
    SELECT
      it.ticker,
      MAX(it.company_name) AS company_name,
      COUNT(*) AS txn_count,
      COUNT(DISTINCT it.insider_cik) AS unique_insiders,
      COALESCE(SUM(CASE WHEN it.transaction_type IN ('P', 'A', 'M') THEN it.total_value ELSE 0 END), 0) AS buy_value,
      COALESCE(SUM(CASE WHEN it.transaction_type IN ('S', 'D', 'F') THEN it.total_value ELSE 0 END), 0) AS sell_value
    FROM public.insider_transactions it
    WHERE it.transaction_date >= CURRENT_DATE - 7
      AND it.total_value > 0
    GROUP BY it.ticker
    HAVING COUNT(*) >= 2
  ),
  top_insiders AS (
    SELECT DISTINCT ON (it.ticker)
      it.ticker,
      it.insider_name,
      it.insider_title
    FROM public.insider_transactions it
    WHERE it.transaction_date >= CURRENT_DATE - 7
    ORDER BY it.ticker, it.total_value DESC
  )
  SELECT
    ts.ticker::TEXT,
    ts.company_name::TEXT,
    ts.txn_count::INT AS transaction_count,
    ts.unique_insiders::INT,
    ts.buy_value::BIGINT AS total_buy_value,
    ts.sell_value::BIGINT AS total_sell_value,
    (ts.buy_value - ts.sell_value)::BIGINT AS net_flow,
    (ts.unique_insiders >= 3) AS has_cluster,
    ti.insider_name::TEXT AS top_insider_name,
    ti.insider_title::TEXT AS top_insider_title
  FROM ticker_stats ts
  LEFT JOIN top_insiders ti ON ti.ticker = ts.ticker
  ORDER BY ts.txn_count DESC, ts.unique_insiders DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unified activity feed
-- Returns combined insider + congress + 13F activity
CREATE OR REPLACE FUNCTION public.get_unified_activity(
  p_user_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'all',
  p_direction TEXT DEFAULT 'all',
  p_min_value BIGINT DEFAULT 0,
  p_watchlist_only BOOLEAN DEFAULT FALSE,
  p_ticker TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  ticker TEXT,
  company_name TEXT,
  headline TEXT,
  subtext TEXT,
  value BIGINT,
  direction TEXT,
  event_date DATE,
  signals JSONB
) AS $$
DECLARE
  v_watchlist_tickers TEXT[];
BEGIN
  -- Get watchlist tickers if needed
  IF p_watchlist_only AND p_user_id IS NOT NULL THEN
    SELECT ARRAY_AGG(w.ticker) INTO v_watchlist_tickers
    FROM public.watchlists w
    WHERE w.user_id = p_user_id;

    IF v_watchlist_tickers IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH insider_items AS (
    SELECT
      it.id,
      'insider'::TEXT AS source,
      it.ticker,
      it.company_name,
      CONCAT(
        COALESCE(it.insider_title, CASE WHEN it.is_officer THEN 'Officer' ELSE 'Insider' END),
        ' ',
        CASE WHEN it.transaction_type IN ('P', 'A', 'M') THEN 'bought' ELSE 'sold' END,
        ' $',
        CASE
          WHEN it.total_value >= 1000000 THEN ROUND(it.total_value / 1000000.0, 1)::TEXT || 'M'
          WHEN it.total_value >= 1000 THEN ROUND(it.total_value / 1000.0, 0)::TEXT || 'K'
          ELSE it.total_value::TEXT
        END
      ) AS headline,
      it.insider_name AS subtext,
      it.total_value AS value,
      CASE WHEN it.transaction_type IN ('P', 'A', 'M') THEN 'buy' ELSE 'sell' END AS direction,
      it.transaction_date AS event_date,
      JSONB_BUILD_ARRAY(
        CASE WHEN it.insider_title ILIKE '%ceo%' OR it.insider_title ILIKE '%cfo%'
             THEN JSONB_BUILD_OBJECT('type', 'c-suite') END,
        CASE WHEN it.total_value >= 1000000
             THEN JSONB_BUILD_OBJECT('type', 'unusual-size', 'label', '$1M+') END
      ) - NULL AS signals
    FROM public.insider_transactions it
    WHERE (p_source = 'all' OR p_source = 'insider')
      AND (p_ticker IS NULL OR it.ticker = UPPER(p_ticker))
      AND (NOT p_watchlist_only OR it.ticker = ANY(v_watchlist_tickers))
      AND it.total_value >= p_min_value
      AND (p_direction = 'all'
           OR (p_direction = 'buys' AND it.transaction_type IN ('P', 'A', 'M'))
           OR (p_direction = 'sells' AND it.transaction_type IN ('S', 'D', 'F')))
      AND it.transaction_date >= CURRENT_DATE - 30
  ),
  congress_items AS (
    SELECT
      ct.id,
      'congress'::TEXT AS source,
      ct.ticker,
      ct.asset_description AS company_name,
      CONCAT(ct.member_name, ' ', ct.transaction_type) AS headline,
      CONCAT(CASE WHEN ct.chamber = 'senate' THEN 'Senator' ELSE 'Rep.' END, ' • ', ct.amount_range) AS subtext,
      COALESCE(ct.amount_low, 0)::BIGINT AS value,
      CASE WHEN ct.transaction_type ILIKE '%purchase%' THEN 'buy'
           WHEN ct.transaction_type ILIKE '%sale%' THEN 'sell'
           ELSE 'neutral' END AS direction,
      ct.disclosure_date AS event_date,
      JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('type', 'congress')) AS signals
    FROM public.congressional_transactions ct
    WHERE (p_source = 'all' OR p_source = 'congress')
      AND ct.ticker IS NOT NULL
      AND (p_ticker IS NULL OR ct.ticker = UPPER(p_ticker))
      AND (NOT p_watchlist_only OR ct.ticker = ANY(v_watchlist_tickers))
      AND COALESCE(ct.amount_low, 0) >= p_min_value
      AND (p_direction = 'all'
           OR (p_direction = 'buys' AND ct.transaction_type ILIKE '%purchase%')
           OR (p_direction = 'sells' AND ct.transaction_type ILIKE '%sale%'))
      AND ct.disclosure_date >= CURRENT_DATE - 30
  ),
  holdings_items AS (
    SELECT
      h.id,
      '13f'::TEXT AS source,
      h.ticker,
      h.issuer_name AS company_name,
      CONCAT(h.fund_name, ' holds $',
        CASE
          WHEN h.value_usd >= 1000000000 THEN ROUND(h.value_usd / 1000000000.0, 1)::TEXT || 'B'
          WHEN h.value_usd >= 1000000 THEN ROUND(h.value_usd / 1000000.0, 0)::TEXT || 'M'
          ELSE h.value_usd::TEXT
        END
      ) AS headline,
      h.shares::TEXT || ' shares' AS subtext,
      h.value_usd::BIGINT AS value,
      'neutral'::TEXT AS direction,
      h.report_date AS event_date,
      JSONB_BUILD_ARRAY(JSONB_BUILD_OBJECT('type', 'institutional')) AS signals
    FROM public.holdings_13f h
    WHERE (p_source = 'all' OR p_source = '13f')
      AND (p_ticker IS NULL OR h.ticker = UPPER(p_ticker))
      AND (NOT p_watchlist_only OR h.ticker = ANY(v_watchlist_tickers))
      AND h.value_usd >= p_min_value
      AND p_direction = 'all'
      AND h.report_date >= CURRENT_DATE - 90
  ),
  combined AS (
    SELECT * FROM insider_items
    UNION ALL
    SELECT * FROM congress_items
    UNION ALL
    SELECT * FROM holdings_items
  )
  SELECT
    c.id,
    c.source,
    c.ticker,
    c.company_name,
    c.headline,
    c.subtext,
    c.value,
    c.direction,
    c.event_date,
    c.signals
  FROM combined c
  ORDER BY c.event_date DESC, c.value DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_top_signal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_signal(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_watchlist_pulse(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_tickers(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_tickers(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_unified_activity(UUID, TEXT, TEXT, BIGINT, BOOLEAN, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_activity(UUID, TEXT, TEXT, BIGINT, BOOLEAN, TEXT, INT, INT) TO anon;

-- Add helpful indexes for the new functions
CREATE INDEX IF NOT EXISTS idx_insider_txn_date_value
  ON public.insider_transactions(transaction_date DESC, total_value DESC)
  WHERE total_value > 0;

CREATE INDEX IF NOT EXISTS idx_insider_ticker_date
  ON public.insider_transactions(ticker, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_holdings_ticker_date
  ON public.holdings_13f(ticker, report_date DESC);
