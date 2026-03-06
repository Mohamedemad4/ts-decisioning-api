import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMistral } from '@ai-sdk/mistral';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { Claim, GenerateCopyRequest } from './copy-assistant.schema';

@Injectable()
export class CopyAssistantService {
  private readonly logger = new Logger(CopyAssistantService.name);
  private readonly mistral: ReturnType<typeof createMistral>;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MISTRAL_API_KEY');
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }
    this.mistral = createMistral({ apiKey });
  }

  async generateCopy(request: GenerateCopyRequest) {
    const { visitorData, allowedClaims, context } = request;

    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        const result = await this.callLLM(
          visitorData,
          allowedClaims,
          context,
        );

        // Validate used claim IDs
        const allowedClaimIds = new Set(allowedClaims.map((c) => c.id));
        const isValid = result.usedClaimIds.every((id) =>
          allowedClaimIds.has(id),
        );

        if (isValid) {
          this.logger.log(
            `Generated copy successfully. Used claims: ${result.usedClaimIds.join(', ')}`,
          );
          return { ...result, retryCount };
        }

        this.logger.warn(
          `Invalid claim IDs detected: ${result.usedClaimIds.filter((id) => !allowedClaimIds.has(id)).join(', ')}. Retry ${retryCount + 1}/${maxRetries}`,
        );
        retryCount++;
      } catch (error) {
        this.logger.error(`LLM call failed: ${error.message}`, error.stack);
        throw error;
      }
    }

    // Fallback after max retries
    this.logger.warn('Max retries exceeded. Returning fallback copy.');
    return {
      headline1: 'Discover our latest offers',
      headline2: 'Shop now and save',
      usedClaimIds: [],
      retryCount,
    };
  }

  private async callLLM(
    visitorData: Record<string, any>,
    allowedClaims: Claim[],
    context: string | undefined,
  ) {
    const prompt = this.buildPrompt(visitorData, allowedClaims, context);

    const { object } = await generateObject({
      model: this.mistral('mistral-large-latest'),
      schema: z.object({
        headline1: z.string(),
        headline2: z.string(),
        usedClaimIds: z.array(z.string()),
      }),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'copy-assistant-generate',
      },
    });

    return object;
  }

  private buildPrompt(
    visitorData: Record<string, any>,
    allowedClaims: Claim[],
    context?: string,
  ): string {
    const claimsText = allowedClaims
      .map((c) => `- ID: ${c.id}, Text: "${c.text}"`)
      .join('\n');

    return `You are a marketing copy assistant. Generate two personalized headlines based on the visitor data and allowed marketing claims.

VISITOR DATA:
${JSON.stringify(visitorData, null, 2)}

ALLOWED CLAIMS (you MUST only use claim IDs from this list):
${claimsText}

${context ? `CONTEXT: ${context}\n` : ''}
Generate two compelling headlines that are personalized to the visitor. You must return:
- headline1: First headline variant
- headline2: Second headline variant  
- usedClaimIds: Array of claim IDs you referenced (MUST be from the allowed list above)

CRITICAL: Only use claim IDs from the allowed list. If you reference a claim in your headlines, include its ID in usedClaimIds.`;
  }
}
