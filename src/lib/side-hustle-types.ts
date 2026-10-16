export type SideHustleInsights = {
  scopeCreepScore: number;
  rushDetected: boolean;
  rushFeePercent: number;
  paidProbability?: number;
  recommendedAction: "send_change_order" | "negotiate" | "decline_or_defer";
  actionLabel: string;
  whyOpenSourceMatters: string;
};
