'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { binary, hex, nibbles, replacementTrace, REQUESTS, TRANSLATIONS, translate, type Policy } from './model';
import styles from './walkthrough.module.css';

type Mode = 'mapping' | 'translation' | 'replacement' | 'fifo' | 'second-chance' | 'lru';
const colors = ['#c56a13', '#7e2944', '#bc3434', '#245ac3'];
const mappings = [[5, 6, 2], [1, 4, 10, 8], [7, 0], [9, 3, 11]];
const processNames = ['A', 'B', 'C', 'D'];
function Label({ x, y, children, small = false, accent = false }: { x: number; y: number; children: React.ReactNode; small?: boolean; accent?: boolean }) {
  return <text x={x} y={y} className={`${styles.svgText} ${small ? styles.small : ''} ${accent ? styles.accent : ''}`}>{children}</text>;
}
function Box({ x, y, width, height = 36, children, active = false, fill }: { x: number; y: number; width: number; height?: number; children?: React.ReactNode; active?: boolean; fill?: string }) {
  return <g><rect x={x} y={y} width={width} height={height} rx={4} className={`${styles.box} ${active ? styles.activeBox : ''}`} style={fill ? { fill } : undefined} /><text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" className={styles.svgText} style={fill ? { fill: '#fff' } : undefined}>{children}</text></g>;
}
function Arrow({ d, id, active = false }: { d: string; id: string; active?: boolean }) {
  return <path d={d} fill="none" className={`${styles.arrow} ${active ? styles.activeArrow : ''}`} markerEnd={`url(#${id})`} />;
}
function Arrowhead({ id }: { id: string }) {
  return <defs><marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>;
}
function Diagram({ title, children, height = 460 }: { title: string; children: React.ReactNode; height?: number }) {
  return <div className={styles.diagram}><svg viewBox={`0 0 800 ${height}`} role="img" aria-label={title}>{children}</svg></div>;
}
function Controls({ step, total, setStep }: { step: number; total: number; setStep: (n: number) => void }) {
  return <div className={styles.controls}><button onClick={() => setStep(0)} disabled={step === 0}>Reset</button><span>Step {step + 1} / {total}</span><button onClick={() => setStep(step - 1)} disabled={step === 0}>← Previous</button><button className={styles.next} onClick={() => setStep(step + 1)} disabled={step === total - 1}>Next →</button></div>;
}
function Explanation({ title, children, variants }: { title: string; children: React.ReactNode; variants: readonly (readonly string[])[] }) {
  return <div className={styles.explanationStack}>
    {variants.map(([heading, text], index) => <div key={index} className={`${styles.explanation} ${styles.reserve}`} aria-hidden="true"><h2>{heading}</h2><p>{text}</p></div>)}
    <div className={styles.explanation} aria-live="polite" aria-atomic="true"><h2>{title}</h2><p>{children}</p></div>
  </div>;
}

function Mapping() {
  const [step, setStep] = useState(0);
  const id = useId();
  const selected = Math.min(Math.max(step - 2, 0), 3);
  const frame = mappings[1][selected];
  const messages = [
    ['Separate logical pages from physical frames', 'Each color and letter identifies a different process. Each numbered slot on the left is a physical frame. Page numbers restart at 0 for each process.'],
    ['Contiguous placement is possible', 'Here the processes happen to occupy adjacent frames. Paging does not require this arrangement.'],
    ...mappings[1].map((f, p) => [`Process B: page ${p} → frame ${f}`, `This is an alternative, scattered placement. Read row ${p} in B’s page table: it stores frame number ${f}. Follow the highlighted path to physical frame ${f}.`]),
    ['The page table connects the two views', 'B’s consecutive logical pages occupy frames 1, 4, 10, and 8. Other processes use the remaining frames. Each process has its own page table.'],
  ];
  const ordered = mappings.flatMap((m, process) => m.map((_, page) => ({ process, page })));
  const scattered = Array.from({ length: 12 }, (_, f) => {
    const process = mappings.findIndex(m => m.includes(f));
    return { process, page: mappings[process].indexOf(f) };
  });
  return <><Diagram title={`Page mapping. ${messages[step][0]}`} height={570}><Arrowhead id={id} />
    <Label x={44} y={34}>Physical memory</Label><Label x={44} y={55} small>Frame # · stored page</Label>
    {Array.from({ length: 12 }, (_, f) => {
      const item = step === 1 ? ordered[f] : scattered[f];
      return <g key={f}><Label x={46} y={92 + f * 38}>{f}</Label><Box x={82} y={70 + f * 38} width={142} height={34} active={step >= 2 && step <= 5 && f === frame} fill={step ? colors[item.process] : undefined}>{step ? `${processNames[item.process]} · page ${item.page}` : 'empty'}</Box></g>;
    })}
    <Label x={566} y={34}>Logical process pages</Label>
    {mappings.map((m, process) => <g key={process}><Label x={566} y={76 + process * 124} small>Process {processNames[process]}</Label>{m.map((_, page) => <Box key={page} x={566} y={86 + process * 124 + page * 24} width={150} height={23} fill={colors[process]} active={step >= 2 && step <= 5 && process === 1 && page === selected}>page {page}</Box>)}</g>)}
    {step >= 2 && <><Label x={320} y={206}>B’s page table</Label><Label x={298} y={228} small>Page #</Label><Label x={374} y={228} small>Frame #</Label>{mappings[1].map((f, p) => <g key={p}><Label x={317} y={256 + p * 36}>{p}</Label><Box x={371} y={234 + p * 36} width={80} height={32} active={step <= 5 && p === selected}>{f}</Box></g>)}
      {(step === 6 ? [0, 1, 2, 3] : [selected]).map(p => <g key={p}><Arrow id={id} active={step < 6} d={`M566,${221.5 + p * 24} L490,${250 + p * 36} L451,${250 + p * 36}`} /><Arrow id={id} active={step < 6} d={`M371,${250 + p * 36} L270,${250 + p * 36} L224,${87 + mappings[1][p] * 38}`} /></g>)}</>}
    </Diagram><Explanation variants={messages} title={messages[step][0]}>{messages[step][1]}</Explanation><Controls step={step} total={messages.length} setStep={setStep} /></>;
}

function TranslationExample({ index }: { index: number }) {
  const [step, setStep] = useState(0);
  const id = useId();
  const example = TRANSLATIONS[index];
  const t = translate(example);
  const offset = binary(t.offset, example.offsetBits);
  const logical = binary(example.address, example.logicalBits);
  const physical = binary(t.physical, example.physicalBits);
  const hexDigits = example.address.toString(16).toUpperCase();
  const padding = Math.ceil(example.logicalBits / 4) * 4 - example.logicalBits;
  const messages = [
    ['Derive the address-field widths', `Pages contain 2^${example.offsetBits} bytes, so the offset needs ${example.offsetBits} bits. Logical page number: ${example.logicalBits} − ${example.offsetBits} = ${t.pageBits} bits. Physical frame number: ${example.physicalBits} − ${example.offsetBits} = ${t.frameBits} bits.`],
    ['Start with a logical hexadecimal address', `The CPU requests ${hex(example.address)}. The prefix 0x means hexadecimal. Each hexadecimal digit represents four binary bits.`],
    ['Expand every hex digit into four bits', `${hex(example.address)} = ${nibbles(example.address, example.logicalBits)}. ${padding ? `The first ${padding} zeros are display padding; the actual logical address has ${example.logicalBits} bits.` : `All ${example.logicalBits} bits belong to the logical address.`}`],
    ['Split page number from offset', `Keep the rightmost ${example.offsetBits} bits as the offset. The remaining ${t.pageBits} bits are page ${t.page}. The split is determined by page size, not by spaces between hexadecimal digits.`],
    ['Index the page table', `Use page ${t.page} as the row index. This example’s pages are present. Row ${t.page} maps to physical frame ${t.frame}; page and frame numbers need not match.`],
    ['Build the physical address', `Write frame ${t.frame} as ${binary(t.frame, t.frameBits)} (${t.frameBits} bits), then append the unchanged ${example.offsetBits}-bit offset. The result is ${example.physicalBits} bits long.`],
    ['Regroup into four-bit chunks', `${nibbles(t.physical, example.physicalBits)}. Group from the right; add leading display zeros if needed. This regrouping changes notation, not the address value.`],
    ['Read the physical address in hex', `${nibbles(t.physical, example.physicalBits)} → ${hex(t.physical)}. Check: frame ${t.frame} × ${2 ** example.offsetBits} bytes + offset ${t.offset} = ${t.physical} (${hex(t.physical)}).`],
  ];
  return <><div className={styles.specs}><span>Physical <strong>{2 ** example.physicalBits / 1024} KB · {example.physicalBits} bits</strong></span><span>Logical <strong>{2 ** example.logicalBits / 1024} KB · {example.logicalBits} bits</strong></span><span>Page size <strong>{2 ** example.offsetBits / 1024} KB · {example.offsetBits}-bit offset</strong></span><span>Frames / pages <strong>{2 ** t.frameBits} / {2 ** t.pageBits}</strong></span></div>
    <Diagram title={`Logical to physical translation. ${messages[step][0]}`} height={560}><Arrowhead id={id} />
      <Box x={25} y={108} width={78} height={62}>CPU</Box>
      <Label x={153} y={89}>Logical address</Label><Box x={151} y={108} width={260} active={step >= 1 && step <= 3}>{step < 1 ? '[ page | offset ]' : step < 3 ? hex(example.address) : `${binary(t.page, t.pageBits)} | ${offset}`}</Box>
      <Arrow d="M103,139 L151,126" id={id} active={step >= 1 && step <= 3} />
      <Label x={170} y={177} small>Page: {step >= 3 ? `${t.page} (${t.pageBits} bits)` : `${t.pageBits} bits`}</Label>
      <Label x={347} y={177} small>Offset: {example.offsetBits} bits</Label>
      <Label x={411} y={263}>Physical address</Label><Box x={404} y={278} width={243} active={step >= 5}>{step >= 5 ? `${binary(t.frame, t.frameBits)} | ${offset}` : '[ frame | offset ]'}</Box>
      <Arrow d="M360,108 L360,54 L611,54 L611,278" id={id} active={step >= 5} />
      <Label x={413} y={43} small>Offset passes through unchanged</Label>
      <Label x={164} y={269}>Page table</Label><Label x={128} y={289} small>Page #</Label><Label x={210} y={289} small>Frame #</Label>
      {example.table.map((f, p) => <g key={p}><Label x={144} y={316 + p * 29}>{p}</Label><Box x={208} y={297 + p * 29} width={74} height={26} active={step >= 4 && p === t.page}>{f}</Box></g>)}
      <Arrow d={`M182,144 L182,${310 + t.page * 29} L208,${310 + t.page * 29}`} id={id} active={step === 4} />
      <Arrow d={`M282,${310 + t.page * 29} L350,${310 + t.page * 29} L350,296 L404,296`} id={id} active={step >= 5} />
      <Label x={680} y={89} small>Memory</Label>
      {Array.from({ length: 2 ** t.frameBits }, (_, f) => <g key={f}><Label x={666} y={130 + f * 43} small>{f}</Label><Box x={691} y={108 + f * 43} width={82} height={40} active={step >= 5 && f === t.frame}>{example.table.includes(f) ? `page ${example.table.indexOf(f)}` : '—'}</Box></g>)}
      {step >= 5 && <Arrow d={`M647,296 L657,296 L657,${128 + t.frame * 43} L691,${128 + t.frame * 43}`} id={id} active />}
    </Diagram>
    <div className={styles.bits} aria-label="Address conversion details">
      {step === 0 && <><span>Logical: [{t.pageBits}-bit page | {example.offsetBits}-bit offset]</span><span>Physical: [{t.frameBits}-bit frame | {example.offsetBits}-bit offset]</span></>}
      {step === 1 && <strong>Logical address: {hex(example.address)}</strong>}
      {step === 2 && <div className={styles.hexDigits}>{Array.from(hexDigits).map((digit, i) => <span key={i}><strong>{digit}</strong><code>{binary(parseInt(digit, 16), 4)}</code></span>)}</div>}
      {step >= 3 && step <= 5 && <><span>Logical <code><b>{logical.slice(0, t.pageBits)}</b> | {offset}</code></span>{step >= 5 && <span>Physical <code><b>{physical.slice(0, t.frameBits)}</b> | {offset}</code></span>}</>}
      {step >= 6 && <><span>Physical binary <code>{nibbles(t.physical, example.physicalBits)}</code></span>{step === 7 && <strong>Physical hexadecimal: {hex(t.physical)}</strong>}</>}
    </div><Explanation variants={messages} title={messages[step][0]}>{messages[step][1]}</Explanation><Controls step={step} total={messages.length} setStep={setStep} /></>;
}
function Translation() {
  const [index, setIndex] = useState(0);
  return <><label className={styles.select}>Memory example <select value={index} onChange={event => setIndex(Number(event.target.value))}>{TRANSLATIONS.map((e, i) => <option key={i} value={i}>{e.label}</option>)}</select></label><TranslationExample key={index} index={index} /></>;
}

function ReplacementExample({ policy }: { policy: Policy }) {
  const [step, setStep] = useState(0);
  const steps = useMemo(() => replacementTrace(policy), [policy]);
  const state = steps[step];
  const id = useId();
  const completed = state.history.some(row => row.request === state.request);
  return <><div className={styles.stats}><span><strong>{state.hits}</strong> hits</span><span><strong>{state.faults}</strong> faults</span><span>{state.request < 0 ? 'Ready' : `Request ${state.request + 1} / ${REQUESTS.length}`}</span></div>
    <div className={styles.requests} aria-label="Page reference string">{REQUESTS.map((page, index) => {
      const result = state.history.find(row => row.request === index)?.outcome ?? (index === state.request ? state.outcome : null);
      return <span key={index} className={index === state.request ? styles.currentRequest : ''} aria-current={index === state.request ? 'step' : undefined}><small>{index + 1}</small><strong>{page}</strong><em>{result ?? '·'}</em></span>;
    })}</div>
    <Diagram title={`${policy}. ${state.title}. Frames: ${state.frames.map((p, f) => `${f}: ${p ?? 'empty'}`).join(', ')}`} height={340}><Arrowhead id={id} />
      <Label x={42} y={35}>Physical memory</Label><Label x={42} y={60} small>Frame # · stored page</Label>
      {state.frames.map((page, frame) => <g key={frame}><Label x={47} y={121 + frame * 67}>{frame}</Label><Box x={87} y={83 + frame * 67} width={140} height={62} active={state.frame === frame}>{page === null ? 'empty' : `page ${page}`}</Box></g>)}
      <Label x={324} y={35}>Page request: {state.page ?? '—'}</Label><Label x={324} y={67} accent>{state.outcome === 'F' ? 'F · FAULT' : state.outcome === 'H' ? 'H · HIT' : 'H = hit · F = fault'}</Label>
      <Label x={324} y={117}>{policy === 'LRU' ? 'Recency: least → most recent' : 'Queue: next candidate → newest'}</Label>
      {state.order.length === 0 ? <Label x={324} y={162} small>No resident pages yet</Label> : state.order.map((page, index) => <g key={page} className={styles.queueItem} style={{ transform: `translate(${324 + index * 130}px, 136px)` }}><Box x={0} y={0} width={104} height={44} active={state.candidate === page}>page {page}</Box><Label x={0} y={70} small>frame {state.frames.indexOf(page)}</Label>{policy === 'Second Chance' && <Label x={0} y={96} accent>R = {state.bits[page]}</Label>}{index < state.order.length - 1 && <Arrow id={id} d="M107,22 L127,22" />}{state.candidate === page && <><Arrow id={id} active d="M52,130 L52,105" /><Label x={0} y={151} small>Inspect</Label></>}</g>)}
      {state.frame !== null && <Arrow id={id} active d={`M308,76 L263,76 L263,${114 + state.frame * 67} L227,${114 + state.frame * 67}`} />}
      <Label x={42} y={315} small>{completed ? `Resolved: page ${state.page} is in frame ${state.frame}.` : state.page === null ? 'Empty frames are filled from top to bottom.' : 'Follow the highlighted request through each decision.'}</Label>
    </Diagram><Explanation variants={steps.map(item => [item.title, item.explanation])} title={state.title}>{state.explanation}</Explanation><Controls step={step} total={steps.length} setStep={setStep} />
    <p className={styles.note}>{policy === 'Second Chance' ? 'Course convention: load with R=0; a later hit sets R=1. Inspecting or clearing bits does not create another request or fault.' : policy === 'LRU' ? 'Every access updates recency. The list can change on a hit even when physical memory does not.' : 'FIFO hits leave arrival order unchanged. Only loading a page adds a new arrival.'}</p></>;
}
function Replacement() {
  const [policy, setPolicy] = useState<Policy>('FIFO');
  return <><div className={styles.policies} role="group" aria-label="Replacement algorithm">{(['FIFO', 'Second Chance', 'LRU'] as Policy[]).map(p => <button key={p} aria-pressed={policy === p} onClick={() => setPolicy(p)}>{p}</button>)}</div><ReplacementExample key={policy} policy={policy} /></>;
}

export default function PagingWalkthrough({ mode }: { mode: Mode }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.parent === window) return;
    let parentRoot: HTMLElement | undefined;
    try { parentRoot = window.parent.document.documentElement; } catch { return; }
    const syncTheme = () => { document.documentElement.dataset.theme = parentRoot!.dataset.theme ?? 'dark'; };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(parentRoot, { attributes: true, attributeFilter: ['data-theme'] });
    const reportSize = () => window.parent.postMessage({ type: 'paging-height', mode, height: Math.ceil(root.current?.getBoundingClientRect().height ?? 900) + 4 }, window.location.origin);
    const resize = new ResizeObserver(reportSize);
    if (root.current) resize.observe(root.current);
    reportSize();
    return () => { observer.disconnect(); resize.disconnect(); };
  }, [mode]);
  return <main ref={root} className={styles.walkthrough}>{mode === 'mapping' ? <Mapping /> : mode === 'translation' ? <Translation /> : mode === 'replacement' ? <Replacement /> : <ReplacementExample policy={mode === 'fifo' ? 'FIFO' : mode === 'second-chance' ? 'Second Chance' : 'LRU'} />}</main>;
}
