export interface CardRewards {
  online_spend: string;
  offline_spend: string;
}

export interface FuelCard {
  card_id: number;
  card_name: string;
  bank: string;
  annual_fee: number;
  joining_fee: number;
  card_network: string;
  tracking_url: string;
  image_url: string;
  bg_image_url?: string;
  annual_saving: number;
  monthly_saving: number;
  fuel_savings_monthly: number;
  tags: string[];
  features: string[];
  rewards: CardRewards;
  brand_options: string[];
  roi: number;
  rating: number;
  lounges: number;
}

export interface CardApiResponse {
  status: string;
  data: FuelCard[];
}

export interface RankedCard extends FuelCard {
  annual_saving_net: number;
  cashback_rate: number;
  fuel_tags: string[];
}

export type FeeRange = "ltf" | "1-1000" | "1001-2000" | "2000+";

export interface FuelFiltersState {
  feeRanges: FeeRange[];
  networks: string[];
}

export interface DeepLinkParams {
  fuel: number;
  pincode?: string;
  inhandIncome?: number;
  empStatus?: "salaried" | "self-employed";
}

export interface EligibleCardsApiResponse {
  status: string;
  data: FuelCard[];
  meta?: {
    fuel_spend: number;
    has_eligibility: boolean;
    total_cards: number;
  };
}
