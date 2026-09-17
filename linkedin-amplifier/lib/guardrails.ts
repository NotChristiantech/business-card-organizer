/**
 * Content guardrails.
 *
 * These are hard rules layered on top of the voice spec. They exist because
 * some mistakes are not stylistic — a post that reads as a securities
 * solicitation, or that tells a client's story without consent, is a problem
 * that editing after the fact does not undo.
 *
 * Edit this list to match your own situation. Anything here is injected into
 * every generation prompt.
 */
export interface Guardrail {
  id: string;
  rule: string;
  why: string;
}

export const DEFAULT_GUARDRAILS: Guardrail[] = [
  {
    id: 'no-securities-solicitation',
    rule:
      'Never state, imply, or hint at an interest rate, yield, return, term length, minimum investment, or any other financial term of an investment offering. Never write anything that reads as an offer to sell a security, a solicitation to invest, or financial advice. Explaining what an instrument IS, and inviting readers to an information session, is allowed. Telling them what they would earn is not.',
    why:
      'Where an offering is regulated, its terms may only be communicated through the offering document and the registered portal. A post naming a rate is a securities communication.',
  },
  {
    id: 'no-client-stories-without-consent',
    rule:
      'Never include an identifiable client, participant, or entrepreneur story. No names, no company names, no detail specific enough to identify someone. If the source material contains one, generalise it past recognition or drop it.',
    why: 'Stories are shared only with explicit consent, which a generated draft cannot have.',
  },
  {
    id: 'no-partisan-politics',
    rule:
      'Never take a partisan political position or name political parties or politicians in a partisan frame.',
    why: 'Out of scope for this brand, and it alienates the target audience.',
  },
  {
    id: 'no-naming-peers-critically',
    rule:
      'Never criticise another non-profit, foundation, funder, or lender by name. Systemic critique of how capital gets allocated is fine; naming and shaming is not.',
    why: 'These organisations are current or prospective funding partners.',
  },
  {
    id: 'no-invented-numbers',
    rule:
      'Never invent, round up, or extrapolate a figure. Use only numbers present in the source material, exactly as given. If a claim needs a number you do not have, rewrite the claim without it.',
    why: 'One caught exaggeration costs more credibility than a year of posts earns.',
  },
];

export function guardrailsToPrompt(rails: Guardrail[]): string {
  return rails.map((g, i) => `${i + 1}. ${g.rule}\n   (Reason: ${g.why})`).join('\n\n');
}

/**
 * Cheap post-generation check for the securities rule — the one rule whose
 * consequences go beyond embarrassment. This is a safety net, not the primary
 * control (the prompt is), so it deliberately errs toward flagging.
 */
const MONEY_TERM =
  /(\d+(?:\.\d+)?\s?%|per annum|percent return|annual return|guaranteed return|\byield\b|\bROI\b|interest rate)/i;
const INVEST_CONTEXT = /\b(bond|invest|investor|investment|offering|series [ab]|debenture)\b/i;

export function flagSecuritiesRisk(text: string): string | null {
  if (MONEY_TERM.test(text) && INVEST_CONTEXT.test(text)) {
    const term = text.match(MONEY_TERM)?.[0] ?? 'a financial term';
    return `Mentions "${term}" alongside investment language. Offering terms must not appear in a post — review before publishing.`;
  }
  return null;
}
