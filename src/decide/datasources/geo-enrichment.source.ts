import { z } from 'zod';
import { BuiltinDataSource } from './datasource.types';

export const geoEnrichmentSource: BuiltinDataSource = {
  id: 'geo-enrichment',
  requiresMarketingConsent: false,
  inputShape: z.object({ country: z.string().length(2) }),
  outputShape: z.object({ region: z.string(), currency: z.string() }),
  resolve: async ({ country }) => {
    // Fast mock API call ~50ms
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL'];
    if (euCountries.includes(country.toUpperCase())) {
      return { region: 'EMEA', currency: 'EUR' };
    }
    if (country.toUpperCase() === 'US') {
      return { region: 'NAMER', currency: 'USD' };
    }
    if (country.toUpperCase() === 'JP') {
      return { region: 'APAC', currency: 'JPY' };
    }
    
    return { region: 'UNKNOWN', currency: 'USD' };
  },
};
