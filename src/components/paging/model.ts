export const REQUESTS = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3];
export type Policy = 'FIFO' | 'Second Chance' | 'LRU';
export type Result = { request: number; page: number; outcome: 'H' | 'F'; frame: number; victim: number | null };
export type Snapshot = {
  frames: (number | null)[]; order: number[]; bits: Record<number, number>;
  request: number; page: number | null; outcome: 'H' | 'F' | null;
  frame: number | null; candidate: number | null; victim: number | null;
  hits: number; faults: number; title: string; explanation: string; history: Result[];
};

/** Course convention: a newly loaded page starts with R=0; a resident hit sets R=1. */
export function replacementTrace(policy: Policy, requests = REQUESTS, capacity = 3): Snapshot[] {
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Frame count must be positive.');
  const frames: (number | null)[] = Array(capacity).fill(null);
  let order: number[] = [];
  const bits: Record<number, number> = {};
  const history: Result[] = [];
  let hits = 0, faults = 0;
  const steps: Snapshot[] = [];
  function emit(request: number, title: string, explanation: string, detail: Partial<Snapshot> = {}) {
    steps.push({ frames: [...frames], order: [...order], bits: { ...bits }, request,
      page: requests[request] ?? null, outcome: null, frame: null, candidate: null, victim: null,
      hits, faults, title, explanation, history: history.map(row => ({ ...row })), ...detail });
  }
  emit(-1, 'Three frames. One request at a time.', 'All frames start empty. Follow the same request string with each policy. F means fault; H means hit.');
  requests.forEach((page, request) => {
    let frame = frames.indexOf(page);
    const outcome = frame >= 0 ? 'H' : 'F';
    if (outcome === 'H') hits++; else faults++;
    emit(request, `Request ${request + 1}: page ${page} — ${outcome === 'H' ? 'Hit' : 'Fault'}`, frame >= 0
      ? `Page ${page} is already in frame ${frame}. No page needs to be loaded or evicted.`
      : `Page ${page} is absent. This request counts as one fault, including when a free frame is available.`, { outcome, frame: frame >= 0 ? frame : null });
    let victim: number | null = null;
    if (outcome === 'H') {
      if (policy === 'LRU') order = [...order.filter(p => p !== page), page];
      if (policy === 'Second Chance') bits[page] = 1;
      history.push({ request, page, outcome, frame, victim });
      emit(request, 'Hit: update the bookkeeping', policy === 'FIFO'
        ? 'FIFO keeps arrival order unchanged on a hit. The page stays in its physical frame.'
        : policy === 'LRU' ? `Page ${page} becomes most recently used. Only the recency list moves; physical frames stay fixed.`
        : `Set page ${page}’s reference bit to 1. Its queue position and physical frame stay unchanged.`, { outcome, frame });
      return;
    }
    frame = frames.indexOf(null);
    if (frame < 0) {
      if (policy === 'Second Chance') {
        while (true) {
          const candidate = order[0];
          emit(request, `Inspect page ${candidate}: R = ${bits[candidate]}`, bits[candidate]
            ? 'This page has been referenced. Give it a second chance before considering an eviction.'
            : 'This page has no remaining second chance. Select it as the victim.', { outcome, candidate, frame: frames.indexOf(candidate) });
          if (!bits[candidate]) break;
          bits[candidate] = 0;
          order.push(order.shift()!);
          emit(request, `Give page ${candidate} a second chance`, `Clear its reference bit to 0 and move its queue entry to the end. Page ${candidate} stays in frame ${frames.indexOf(candidate)}. Continue the same request; this is not another fault.`, { outcome, candidate, frame: frames.indexOf(candidate) });
        }
      }
      victim = order[0];
      frame = frames.indexOf(victim);
      emit(request, `Evict page ${victim} from frame ${frame}`, policy === 'FIFO'
        ? `Page ${victim} arrived earliest among the resident pages.`
        : policy === 'LRU' ? `Page ${victim} was accessed least recently.`
        : `Page ${victim} is at the queue head with R=0. Its frame can be reused.`, { outcome, frame, candidate: victim, victim });
      order.shift();
      delete bits[victim];
    } else {
      emit(request, `Use empty frame ${frame}`, 'No eviction is necessary. We use free frames in increasing frame-number order.', { outcome, frame });
    }
    frames[frame] = page;
    order.push(page);
    bits[page] = 0;
    history.push({ request, page, outcome, frame, victim });
    emit(request, `Load page ${page} into frame ${frame}`, `${victim === null ? 'Fill the free frame.' : `Replace page ${victim}. A modified victim would first need a write-back.`} ${policy === 'Second Chance' ? 'Add the new page to the queue with R=0, following the course convention.' : policy === 'LRU' ? 'The loaded page is now most recently used.' : 'The loaded page is now the newest arrival.'}`, { outcome, frame, victim });
  });
  return steps;
}

export const TRANSLATIONS = [
  { label: '4 KB pages', physicalBits: 15, logicalBits: 14, offsetBits: 12, address: 0x1a4a, table: [7, 3, 1, 5] },
  { label: '8 KB pages', physicalBits: 16, logicalBits: 16, offsetBits: 13, address: 0x969c, table: [1, 6, 3, 5, 2, 4, 7, 0] },
];
export function translate(example: typeof TRANSLATIONS[number]) {
  const size = 2 ** example.offsetBits;
  const page = Math.floor(example.address / size);
  const offset = example.address % size;
  const frame = example.table[page];
  return { page, offset, frame, physical: frame * size + offset, pageBits: example.logicalBits - example.offsetBits, frameBits: example.physicalBits - example.offsetBits };
}
export const binary = (value: number, width: number) => value.toString(2).padStart(width, '0');
export const hex = (value: number) => '0x' + value.toString(16).toUpperCase();
export const nibbles = (value: number, width: number) => binary(value, Math.ceil(width / 4) * 4).match(/.{4}/g)!.join(' ');
