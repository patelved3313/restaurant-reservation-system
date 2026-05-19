export type Trade = {
  id: number;
  strategy_id?: number | null;
  symbol: string;
  side: "buy" | "sell";
  order_type: string;
  quantity: number;
  price: number;
  fees: number;
  slippage: number;
  status: string;
  broker: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export type Position = {
  id: number;
  symbol: string;
  quantity: number;
  average_price: number;
  market_price: number;
  realized_pnl: number;
  unrealized_pnl: number;
  updated_at: string;
};

export type Strategy = {
  id: number;
  name: string;
  description?: string | null;
  symbol: string;
  rules: Record<string, unknown>;
  status: string;
  created_at: string;
};

export type Backtest = {
  id: number;
  strategy_id?: number | null;
  name: string;
  symbol: string;
  start_date: string;
  end_date: string;
  starting_cash: number;
  ending_cash: number;
  metrics: Record<string, number>;
  trades: Record<string, unknown>[];
  equity_curve: { date: string; value: number }[];
  created_at: string;
};

export type Dashboard = {
  portfolio_value: number;
  cash_balance: number;
  open_positions: number;
  daily_pnl: number;
  total_return: number;
  win_rate: number;
  max_drawdown: number;
  recent_trades: Trade[];
  equity_curve: { date: string; value: number }[];
  warning: string;
};

export type RiskSettings = {
  id: number;
  max_risk_per_trade: number;
  max_daily_loss: number;
  max_weekly_loss: number;
  max_position_size: number;
  stop_loss_required: boolean;
  kill_switch_enabled: boolean;
  allow_after_hours: boolean;
  updated_at: string;
};

export type SystemLog = {
  id: number;
  level: string;
  event_type: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
};

export type MarketCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  daily_return: number;
};

export type MarketData = {
  symbol: string;
  start_date: string;
  end_date: string;
  source: string;
  summary: {
    first_close: number;
    last_close: number;
    change: number;
    change_pct: number;
    high: number;
    low: number;
    average_volume: number;
  };
  candles: MarketCandle[];
};
