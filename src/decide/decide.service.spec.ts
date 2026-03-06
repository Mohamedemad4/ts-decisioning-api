import { Test, TestingModule } from '@nestjs/testing';
import { DecideService } from './decide.service';
import { DataSourceRegistry } from './datasources/datasource.registry';
import { SiteService } from '../site/site.service';
import { RulesService } from '../rules/rules.service';
import { DecideRequest } from './decide.schema';

describe('DecideService', () => {
  let service: DecideService;

  // Mocks
  const siteServiceMock = {
    getSite: jest.fn(),
  };

  const rulesServiceMock = {
    listRules: jest.fn(),
  };

  const registry = new DataSourceRegistry();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecideService,
        { provide: DataSourceRegistry, useValue: registry },
        { provide: SiteService, useValue: siteServiceMock },
        { provide: RulesService, useValue: rulesServiceMock },
      ],
    }).compile();

    service = module.get<DecideService>(DecideService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const siteId = 'site-1';
  
  // Base request setup
  const baseRequest: DecideRequest = {
    siteId,
    visitorId: 'user-vip',
    url: 'https://example.com/test',
    consent: { marketing: true },
    traits: {
      country: 'DE',
      deviceType: 'mobile',
    },
  };

  const setupMockData = () => {
    // 1. Mock Site Config (SPECIFICITY mode)
    siteServiceMock.getSite.mockResolvedValue({
      siteId,
      configVersion: 'v1',
      ruleEvalMode: 'SPECIFICITY',
      dataSources: [
        {
          id: 'segments',
          type: 'BUILTIN',
          builtinId: 'visitor-segments',
          params: { visitorId: '{{visitorId}}' },
          requiresMarketingConsent: true,
          cache: false,
        },
      ],
    });

    // 2. Mock Rules at varying specificity levels
    rulesServiceMock.listRules.mockResolvedValue([
      {
        id: 'rule-1-segment', // Specificity 1 (requires segment datasource)
        description: 'VIP users',
        dataSources: ['segments'],
        conditions: { 'segments.tier': 'premium' },
        variantId: 'vip-variant',
        headline: 'Welcome VIP',
      },
      {
        id: 'rule-2-mobile-de', // Specificity 2 (consent-safe traits)
        description: 'German Mobile',
        conditions: { country: 'DE', deviceType: 'mobile' },
        variantId: 'de-mobile-variant',
        headline: 'Willkommen Mobil',
      },
      {
        id: 'rule-3-fallback', // Specificity 0
        description: 'Fallback',
        conditions: {},
        variantId: 'default-variant',
        headline: 'Hello',
      },
    ]);
  };

  it('1. Rule match (SPECIFICITY) - matches the most specific rule', async () => {
    setupMockData();

    // marketing=true -> all datasources/traits allowed.
    // 'segments.tier' = 'premium' will match (mock resolves to premium if visitorId.length > 5)
    // Rule 1 has 1 condition. Rule 2 has 2 conditions.
    // Therefore, Rule 2 should win because SPECIFICITY mode sorts by condition count DESC.
    
    const response = await service.evaluateRules({ ...baseRequest });
    
    expect(response.variantId).toBe('de-mobile-variant');
    expect(response.headline).toBe('Willkommen Mobil');
  });

  it('2. Consent boundary test - skips segment rule when marketing=false', async () => {
    setupMockData();

    // Update rules so the VIP rule has MORE conditions (specificity 3)
    // If marketing=true, it would win.
    rulesServiceMock.listRules.mockResolvedValue([
      {
        id: 'rule-1-segment-de', // Specificity 2
        description: 'VIP German users',
        dataSources: ['segments'],
        conditions: { 'segments.tier': 'premium', country: 'DE' },
        variantId: 'vip-de-variant',
        headline: 'Willkommen VIP',
      },
      {
        id: 'rule-2-mobile-de', // Specificity 2 (same, fallback tiebreaker)
        description: 'German Mobile',
        conditions: { country: 'DE', deviceType: 'mobile' },
        variantId: 'de-mobile-variant',
        headline: 'Willkommen Mobil',
      },
      {
        id: 'rule-3-fallback', // Specificity 0
        conditions: {},
        variantId: 'default-variant',
        headline: 'Hello',
      },
    ]);

    // Test with marketing=false
    const requestNoConsent: DecideRequest = {
      ...baseRequest,
      consent: { marketing: false },
    };

    const response = await service.evaluateRules(requestNoConsent);
    
    // Because marketing=false, the 'segments' datasource is stripped out,
    // and 'rule-1-segment-de' is entirely skipped.
    // Thus 'rule-2-mobile-de' matches and wins, even if rule 1 had equal or higher specificity.
    expect(response.variantId).toBe('de-mobile-variant');
  });
});
