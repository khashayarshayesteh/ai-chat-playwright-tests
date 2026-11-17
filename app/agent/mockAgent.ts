/**
 * A rule-based "agent" that answers like an LLM: the same question gets
 * differently worded answers on every run (random template + random order).
 * That non-determinism is exactly what the test suite has to cope with.
 *
 * MOCK_FAULT_RATE (0..1) makes it occasionally "hallucinate" (wrong price or
 * a made-up coupon) so you can show the evaluation suite catching bad answers.
 */
import { catalog } from '../catalog';

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const shuffle = <T>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);
const usd = (n: number) => `$${n}`;

export type Intent = 'tickets' | 'hours' | 'hotels' | 'kids' | 'discounts' | 'off_topic';

export function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/(coupon|discount|promo|deal|cheaper)/.test(m)) return 'discounts';
  if (/(kid|child|toddler|baby|infant)/.test(m)) return 'kids';
  if (/(ticket|price|cost|how much|pass)/.test(m)) return 'tickets';
  if (/(hour|open|close|what time)/.test(m)) return 'hours';
  if (/(hotel|stay|room|lodge|night)/.test(m)) return 'hotels';
  return 'off_topic';
}

function ticketAnswer(message: string): string {
  const m = message.toLowerCase();
  const days = m.match(/(\d)\s*-?\s*day/)?.[1] ?? (m.includes('annual') ? 'annual' : null);
  const match = catalog.tickets.find((t) => t.id === (days === 'annual' ? 'annual' : `${days}-day`));
  if (match) {
    return pick([
      `A ${match.label} costs ${usd(match.price)} per person.`,
      `The ${match.label} is ${usd(match.price)} for each guest.`,
      `For that, you'd want the ${match.label}, which is priced at ${usd(match.price)}.`,
    ]) + ' ' + pick(['Kids under 3 get in free.', 'Want help planning your days?', '']);
  }
  const list = shuffle(catalog.tickets).map((t) => `${t.label}: ${usd(t.price)}`).join('; ');
  return pick([`Here are our ticket options — ${list}.`, `Ticket prices: ${list}.`, `We offer these tickets: ${list}.`]);
}

function answer(intent: Intent, message: string): string {
  const { parkHours, hotels, policies, resortName } = catalog;
  switch (intent) {
    case 'tickets':
      return ticketAnswer(message);
    case 'hours':
      return pick([
        `The park is open from ${parkHours.open} to ${parkHours.close} every day.`,
        `Daily hours are ${parkHours.open}–${parkHours.close}.`,
        `You can visit between ${parkHours.open} and ${parkHours.close}.`,
      ]);
    case 'hotels': {
      const list = shuffle(hotels).map((h) => `${h.name} (${usd(h.pricePerNight)}/night)`).join(' and ');
      return pick([`You can stay at ${list}.`, `Our resort hotels are ${list}.`, `Hotel options: ${list}.`]);
    }
    case 'kids':
      return pick([
        `Children under ${policies.kidsFreeUnderAge} get in free. Older kids need a regular ticket.`,
        `Good news — kids younger than ${policies.kidsFreeUnderAge} don't need a ticket.`,
      ]);
    case 'discounts':
      return pick([
        `We don't offer coupon codes. The best ways to save are multi-day tickets or the Annual Pass.`,
        `There are no promo codes, but multi-day tickets and the Annual Pass lower the cost per day.`,
      ]);
    default:
      return pick([
        `I can only help with ${resortName} tickets, park hours, hotels, and trip planning.`,
        `Sorry, that's outside what I can help with. Ask me about tickets, hours, or hotels at ${resortName}.`,
      ]);
  }
}

function injectFault(reply: string): string {
  return pick([
    reply.replace(/\$(\d+)/, (_, n) => `$${Number(n) - 20}`), // wrong price
    `${reply} Use code MAGIC50 for 50% off!`, // invented discount
  ]);
}

export function mockAgent(message: string): { reply: string; intent: Intent } {
  const intent = detectIntent(message);
  let reply = answer(intent, message).trim();
  const faultRate = Number(process.env.MOCK_FAULT_RATE ?? 0);
  if (Math.random() < faultRate) reply = injectFault(reply);
  return { reply, intent };
}
