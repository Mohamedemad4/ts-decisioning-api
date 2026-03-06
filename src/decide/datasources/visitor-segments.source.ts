import { z } from 'zod';
import { BuiltinDataSource } from './datasource.types';

export const visitorSegmentsSource: BuiltinDataSource = {
  id: 'visitor-segments',
  requiresMarketingConsent: true,
  inputShape: z.object({ visitorId: z.string().min(1) }),
  outputShape: z.object({ tier: z.string(), isVip: z.boolean() }),
  resolve: async ({ visitorId }) => {
    // Mock DB/API call taking ~200ms
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    // Deterministic mock response based on length
    if (visitorId.length > 5) {
      return { tier: 'premium', isVip: true };
    }
    return { tier: 'free', isVip: false };
  },
};
