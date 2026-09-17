/**
 * The format library. Each entry is a post *skeleton* — a proven shape that a
 * topic gets poured into. This is the difference between "write a LinkedIn
 * post about X" (slop) and a post with a real spine.
 *
 * Add your own as you find shapes that work for you. Seeding is by stable id,
 * so new entries appear on next boot and existing weights survive.
 */
export interface SeedFormat {
  id: string;
  name: string;
  description: string;
  skeleton: string;
  when_to_use: string;
  tags: string;
}

export const SEED_FORMATS: SeedFormat[] = [
  {
    id: 'contrarian-take',
    name: 'Contrarian Take',
    description: 'Name a belief your industry holds, then dismantle it with specifics.',
    skeleton: [
      '1. State the common advice plainly, in one line, without strawmanning it.',
      '2. "That is wrong" / "That was true in 2019" — the turn.',
      '3. Why it fails: 2-3 concrete consequences you have actually seen.',
      '4. What to do instead, specific enough to act on today.',
      '5. One-line close that restates the new rule.',
    ].join('\n'),
    when_to_use: 'You genuinely disagree with received wisdom and can back it with lived evidence. Do not fake this — manufactured contrarianism is transparent.',
    tags: 'authority,engagement,opinion',
  },
  {
    id: 'client-story',
    name: 'Client Story',
    description: 'A single anonymised engagement told as a narrative with a turning point.',
    skeleton: [
      '1. Drop into the moment: the situation as it stood, with one vivid detail.',
      '2. What everyone assumed the problem was.',
      '3. What it actually was — the discovery.',
      '4. What changed as a result, with a real number if you have one.',
      '5. The generalisable lesson, stated once, without over-claiming.',
    ].join('\n'),
    when_to_use: 'You have a real engagement with a genuine turning point. Anonymise the client unless you have explicit permission to name them.',
    tags: 'trust,sales,story',
  },
  {
    id: 'i-was-wrong',
    name: 'I Was Wrong About X',
    description: 'Public revision of a position you used to hold.',
    skeleton: [
      '1. "I used to believe [specific position]." State it without hedging.',
      '2. Why it seemed right — make the old view sympathetic.',
      '3. What changed your mind: the specific experience or evidence.',
      '4. What you believe now, and what it costs you to believe it.',
      '5. No moral. Let it sit.',
    ].join('\n'),
    when_to_use: 'Highest-trust format available. Only works if the revision is real and the old position was genuinely yours.',
    tags: 'trust,authority,vulnerability',
  },
  {
    id: 'teardown',
    name: 'Teardown',
    description: 'Walk through something publicly visible and analyse why it works or fails.',
    skeleton: [
      '1. Name the thing being analysed and why it caught your attention.',
      '2. 3-5 specific observations, each with the mechanism behind it.',
      '3. The one thing most people miss.',
      '4. How the reader applies this to their own work.',
    ].join('\n'),
    when_to_use: 'Demonstrates expertise by showing your eye rather than claiming it. Be generous — teardowns that punch down read badly.',
    tags: 'authority,educational',
  },
  {
    id: 'objection-answered',
    name: 'The Objection You Keep Hearing',
    description: 'Take the objection prospects raise most and answer it in public.',
    skeleton: [
      '1. Quote the objection as people actually phrase it.',
      '2. Concede the legitimate part — there always is one.',
      '3. The reframe: what the objection misunderstands.',
      '4. The evidence that settles it.',
      '5. What you would tell someone sitting on the fence.',
    ].join('\n'),
    when_to_use: 'Directly sales-useful. Mine your actual calls for the phrasing — real objection language outperforms your paraphrase of it.',
    tags: 'sales,objection,trust',
  },
  {
    id: 'process-breakdown',
    name: 'How I Actually Do It',
    description: 'Transparent walkthrough of your real process, including the unglamorous parts.',
    skeleton: [
      '1. The outcome this process produces, stated first.',
      '2. Numbered steps — real ones, including the tedious middle.',
      '3. The step everyone skips and what it costs them.',
      '4. How long it genuinely takes.',
      '5. Offer: what you would want to know if you were trying this.',
    ].join('\n'),
    when_to_use: 'Give away the method. Buyers hire you for judgement and execution, not for the secret list of steps.',
    tags: 'educational,trust,value',
  },
  {
    id: 'numbered-lessons',
    name: 'N Lessons From X',
    description: 'Compressed lessons from a defined experience.',
    skeleton: [
      '1. The experience and its scale, in one line, to earn the right to the list.',
      '2. 5-9 lessons. Each is a bolded claim plus one sentence of substance.',
      '3. Vary the lengths — uniform bullets read as generated.',
      '4. Close on the lesson that cost you the most to learn.',
    ].join('\n'),
    when_to_use: 'Reliable reach, moderate depth. Do not use more than once every two weeks or your feed turns into listicle soup.',
    tags: 'reach,educational',
  },
  {
    id: 'before-after',
    name: 'Before / After',
    description: 'Two states of the same thing, with the mechanism in between.',
    skeleton: [
      '1. "Before:" the specific old state, with its cost.',
      '2. "After:" the specific new state, with its benefit.',
      '3. The single change that moved one to the other.',
      '4. Why that change is harder than it sounds.',
    ].join('\n'),
    when_to_use: 'Works for process changes, tooling, positioning. Needs a real delta — vague improvement reads as an ad.',
    tags: 'sales,clarity',
  },
  {
    id: 'question-to-audience',
    name: 'Genuine Question',
    description: 'Ask something you actually want answered, with enough context to make answering easy.',
    skeleton: [
      '1. The situation prompting the question.',
      '2. The two or three positions you can see.',
      '3. Where you currently lean and why you are unsure.',
      '4. The question, phrased so a one-line reply is a valid answer.',
    ].join('\n'),
    when_to_use: 'Real engagement driver, but only when the question is sincere. Engagement bait ("Thoughts??") is obvious and costs credibility.',
    tags: 'engagement,community',
  },
  {
    id: 'myth-vs-reality',
    name: 'Myth vs Reality',
    description: 'Paired corrections in a tight rhythm.',
    skeleton: [
      '1. Frame: "Things I believed before [experience] vs after."',
      '2. 4-6 pairs. Myth line, then reality line. Keep them short.',
      '3. The pair that matters most, expanded into a short paragraph.',
      '4. Close.',
    ].join('\n'),
    when_to_use: 'Scannable and shareable. Needs specificity — generic myths make it forgettable.',
    tags: 'reach,educational',
  },
  {
    id: 'behind-the-number',
    name: 'Behind The Number',
    description: 'Lead with a concrete metric, then explain what actually produced it.',
    skeleton: [
      '1. The number, alone, on its own line.',
      '2. What it measures and over what period — no ambiguity.',
      '3. The 2-3 decisions that produced it.',
      '4. The one that mattered most.',
      '5. What you would do differently.',
    ].join('\n'),
    when_to_use: 'You have a real, checkable number. Never inflate — one caught exaggeration undoes a year of posts.',
    tags: 'authority,proof',
  },
  {
    id: 'what-i-learned-this-week',
    name: 'This Week I Learned',
    description: 'Low-ceremony post about one thing that landed recently.',
    skeleton: [
      '1. The thing, stated in a sentence.',
      '2. The context in which you hit it.',
      '3. Why it surprised you.',
      '4. What it changes about how you work.',
    ].join('\n'),
    when_to_use: 'Your consistency workhorse. Low effort, keeps cadence, humanises the feed between bigger swings.',
    tags: 'cadence,human',
  },
  {
    id: 'the-tell',
    name: 'The Tell',
    description: 'A diagnostic signal only an expert would notice.',
    skeleton: [
      '1. "When I see [signal], I know [conclusion]."',
      '2. Why the signal is reliable — the underlying mechanism.',
      '3. Two or three other tells in the same family.',
      '4. What to do once you have spotted it.',
    ].join('\n'),
    when_to_use: 'Extremely strong expertise signal. Requires genuine pattern recognition — invented tells are spotted instantly.',
    tags: 'authority,expertise',
  },
  {
    id: 'steal-this',
    name: 'Steal This',
    description: 'Hand over a specific reusable asset — a script, checklist, or framework.',
    skeleton: [
      '1. What the asset is and the problem it solves.',
      '2. The asset itself, in full, in the post. No gate.',
      '3. How to adapt it to a different context.',
      '4. The mistake people make when they use it.',
    ].join('\n'),
    when_to_use: 'Generosity compounds. Put the whole thing in the post — "comment for the link" suppresses reach and annoys people.',
    tags: 'value,reach,trust',
  },
  {
    id: 'industry-reaction',
    name: 'Reaction To News',
    description: 'Timely response to something that just happened in your space.',
    skeleton: [
      '1. The news in one neutral line, so readers who missed it can follow.',
      '2. The take everyone is having.',
      '3. Your different read, and what you are seeing that they are not.',
      '4. The second-order consequence nobody is discussing yet.',
      '5. What you will be watching next.',
    ].join('\n'),
    when_to_use: 'Post within 48 hours or skip it. Requires a genuine angle — pure commentary adds nothing.',
    tags: 'timely,reach,opinion',
  },
  {
    id: 'two-kinds-of-people',
    name: 'Two Kinds',
    description: 'A clarifying distinction between two approaches, without villainising either.',
    skeleton: [
      '1. The distinction, named crisply.',
      '2. Group A: how they operate, what it gets them, what it costs.',
      '3. Group B: the same treatment, fairly.',
      '4. When each is correct — resist declaring a winner.',
      '5. Which one you are, and why.',
    ].join('\n'),
    when_to_use: 'Good for nuanced positioning. The fairness is the point; a rigged comparison reads as self-promotion.',
    tags: 'clarity,positioning',
  },
  {
    id: 'question-i-get-asked',
    name: 'The Question I Get Asked Most',
    description: 'Answer your highest-frequency inbound question publicly and completely.',
    skeleton: [
      '1. The question, in the asker’s words.',
      '2. The short answer, immediately. Do not bury it.',
      '3. The longer answer with the conditions and exceptions.',
      '4. The follow-up question people ask next, answered too.',
    ].join('\n'),
    when_to_use: 'Direct lead-gen value and saves you repeating yourself. Mine your inbox and calls for the real phrasing.',
    tags: 'sales,educational,trust',
  },
  {
    id: 'small-observation',
    name: 'Small Observation',
    description: 'A short, specific noticing. No framework, no lesson, no call to action.',
    skeleton: [
      '1. The observation, concretely.',
      '2. One line about why it stuck with you.',
      '3. Stop. Genuinely stop — no takeaway, no question.',
    ].join('\n'),
    when_to_use: 'The palate cleanser. Signals you are a person rather than a content program. Keep it under 60 words.',
    tags: 'human,cadence',
  },
  {
    id: 'cost-of-inaction',
    name: 'The Cost Of Waiting',
    description: 'Make the price of the status quo concrete and quantified.',
    skeleton: [
      '1. The decision people keep deferring.',
      '2. Why deferring feels rational.',
      '3. What it actually costs, in numbers, over a real time horizon.',
      '4. The smallest step that stops the bleeding.',
    ].join('\n'),
    when_to_use: 'Sales-adjacent. Keep it honest — manufactured urgency is the fastest way to lose a sophisticated audience.',
    tags: 'sales,urgency',
  },
  {
    id: 'annotated-example',
    name: 'Annotated Example',
    description: 'Show a real artefact and narrate what each part is doing.',
    skeleton: [
      '1. The artefact — an email, a slide, a clause, a config.',
      '2. Walk it line by line: what each part does and why it is there.',
      '3. The part that took the longest to get right.',
      '4. What breaks if you remove it.',
    ].join('\n'),
    when_to_use: 'Very high signal, very low bluff tolerance. Use real artefacts, redacted as needed.',
    tags: 'authority,educational,proof',
  },
];
