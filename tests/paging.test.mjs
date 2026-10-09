import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/components/paging/model.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { replacementTrace, TRANSLATIONS, translate, binary, nibbles } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const expected = {
  FIFO: { frames: [[7,null,null],[7,0,null],[7,0,1],[2,0,1],[2,0,1],[2,3,1],[2,3,0],[4,3,0],[4,2,0],[4,2,3]], outcomes:'FFFFHFFFFF', count:9 },
  'Second Chance': { frames:[[7,null,null],[7,0,null],[7,0,1],[2,0,1],[2,0,1],[2,0,3],[2,0,3],[4,0,3],[4,0,2],[3,0,2]], outcomes:'FFFFHFHFFF', count:8 },
  LRU: { frames:[[7,null,null],[7,0,null],[7,0,1],[2,0,1],[2,0,1],[2,0,3],[2,0,3],[4,0,3],[4,0,2],[4,3,2]], outcomes:'FFFFHFHFFF', count:8 },
};
for (const [policy, answer] of Object.entries(expected)) {
  test(`${policy}: every completed request agrees with the course trace`, () => {
    const trace = replacementTrace(policy);
    const ends = trace.filter((s, i) => s.history.length > (trace[i-1]?.history.length ?? 0));
    assert.deepEqual(ends.map(s => s.frames), answer.frames);
    assert.equal(ends.map(s => s.outcome).join(''), answer.outcomes);
    assert.equal(trace.at(-1).faults, answer.count);
    assert.equal(trace.at(-1).hits + trace.at(-1).faults, 10);
    for (const s of ends) {
      assert.equal(s.frames[s.frame], s.page);
      assert.deepEqual([...s.order].sort(), s.frames.filter(p => p !== null).sort());
    }
    assert.deepEqual(trace[0].frames,[null,null,null]);
    for (const s of trace.slice(1)) assert.equal(s.hits+s.faults,s.request+1);
  });
}
test('Second Chance clears and rotates without moving resident pages or double-counting faults', () => {
  const trace = replacementTrace('Second Chance');
  const before = trace.find(s=>s.request===5 && s.title==='Inspect page 0: R = 1');
  const after = trace.find(s=>s.request===5 && s.title==='Give page 0 a second chance');
  assert.equal(before.bits[0],1); assert.equal(after.bits[0],0);
  assert.deepEqual(before.frames,after.frames); assert.deepEqual(after.order,[1,2,0]);
  assert.equal(before.faults,after.faults);
});
test('Second Chance terminates when every resident reference bit is set', () => {
  const trace = replacementTrace('Second Chance',[1,2,3,1,2,3,4]);
  const end = trace.at(-1);
  assert.deepEqual(end.frames,[4,2,3]);
  assert.equal(end.faults,4); assert.equal(end.hits,3);
  assert.equal(trace.filter(s=>s.request===6 && s.title.startsWith('Give page')).length,3);
});
test('FIFO preserves order on hits; LRU updates it', () => {
  const fifo=replacementTrace('FIFO',[1,2,3,1]).at(-1);
  const lru=replacementTrace('LRU',[1,2,3,1]).at(-1);
  assert.deepEqual(fifo.order,[1,2,3]); assert.deepEqual(lru.order,[2,3,1]);
  assert.deepEqual(fifo.frames,lru.frames);
});
test('Both address examples preserve offsets and use the correct bit widths', () => {
  assert.equal(translate(TRANSLATIONS[0]).physical,0x3a4a);
  assert.equal(translate(TRANSLATIONS[1]).physical,0x569c);
  for(const e of TRANSLATIONS) {
    const t=translate(e);
    assert.equal(t.physical % 2**e.offsetBits,e.address % 2**e.offsetBits);
    assert.equal(binary(t.frame,t.frameBits)+binary(t.offset,e.offsetBits),binary(t.physical,e.physicalBits));
    assert.equal(parseInt(nibbles(t.physical,e.physicalBits).replaceAll(' ',''),2),t.physical);
  }
});
