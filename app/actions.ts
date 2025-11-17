'use server';

import { suggestAlternativeDomains as suggestAlternativeDomainsFlow } from '@/ai/flows/suggest-alternative-domains';
import type { SuggestAlternativeDomainsOutput } from '@/ai/flows/suggest-alternative-domains';

export async function getAlternativeDomains(
  desiredDomain: string
): Promise<SuggestAlternativeDomainsOutput> {
  // Simulate a delay to show loading state
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    const result = await suggestAlternativeDomainsFlow({ desiredDomain });
    return result;
  } catch (error) {
    console.error('Error suggesting alternative domains:', error);
    return { suggestedDomains: [] };
  }
}
