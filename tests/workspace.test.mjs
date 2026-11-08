import test from "node:test";
import assert from "node:assert/strict";
import {applyCommand,initialData,CommandSchema} from "../lib/workspace.ts";
import {proposeUpdates,SAMPLE_CHAT,splitMessages} from "../lib/intake.ts";
const actor={userId:"test-kevin",displayName:"Kevin"};
const at="2026-11-07T15:00:00.000Z";
const run=(data,command,requestId=crypto.randomUUID())=>applyCommand(data,CommandSchema.parse(command),actor,requestId,at);
const sample=()=>proposeUpdates(SAMPLE_CHAT,initialData().cats,"laundromat","2026-11-07");
test("sample conversation produces feeding, uncertain identity, and coverage events",()=>{
  const u=sample();assert.equal(u.length,3);assert.equal(u[0].feeding,true);assert.equal(u[0].cat,"");assert.equal(u[1].cat,"new");assert.equal(u[1].urgent,true);assert.equal(u[1].coat,0);assert.equal(u[2].coverage,true);assert.equal(u[2].colony,"palm");assert.equal(u[2].cat,"");assert.equal(u[1].reporter,"Kevin");
});
test("unknown coat never suggests ginger by default; negation does not record a feeding or limp",()=>{
  const u=proposeUpdates("Ana: I haven't fed the colony. Saw a cat. It is not limping.",initialData().cats,"laundromat","2026-11-07")[0];assert.equal(u.feeding,false);assert.equal(u.urgent,false);assert.equal(u.coat,4);
  const d=run(initialData(),{type:"confirm_batch",updates:[u]}).data;assert.equal(d.matches[0].candidate,"");
});
test("batch save updates evidence, creates tasks, and leaves census unchanged",()=>{
  const original=initialData();const {data}=run(original,{type:"confirm_batch",updates:sample()});assert.equal(data.reports.length,3);assert.equal(data.cats.length,12);assert.equal(data.tasks.length,5);assert.equal(data.matches.length,2);assert.equal(original.reports.length,0);assert.ok(data.tasks[0].dueAt);assert.ok(data.reports.every(r=>r.source&&r.decisions.length));
});
test("same messages imported twice do not create duplicate reports or tasks",()=>{
  const first=run(initialData(),{type:"confirm_batch",updates:sample()}).data;const second=run(first,{type:"confirm_batch",updates:sample()});assert.equal(second.data.reports.length,3);assert.equal(second.data.tasks.length,first.tasks.length);assert.match(second.message,/3 duplicates skipped/);
});
test("retrying an acknowledged request is idempotent",()=>{
  const requestId=crypto.randomUUID();const command={type:"confirm_batch",updates:sample()};const first=run(initialData(),command,requestId).data;assert.strictEqual(run(first,command,requestId).data,first);
});
test("identity confirmation links source, activity, and task without a duplicate cat",()=>{
  let d=run(initialData(),{type:"confirm_batch",updates:sample()}).data;const m=d.matches.find(m=>m.reportId);d=run(d,{type:"resolve_match",id:m.id,catId:"mango"}).data;assert.equal(d.cats.length,12);assert.equal(d.reports.find(r=>r.id===m.reportId).catId,"mango");assert.equal(d.tasks.find(t=>t.reportId===m.reportId).cat,"mango");assert.equal(d.activity.find(a=>a.reportId===m.reportId).catId,"mango");
});
test("reopening an identity retains source and history, clears the link, and requeues review",()=>{
  let d=run(initialData(),{type:"confirm_batch",updates:sample()}).data;const m=d.matches.find(m=>m.reportId);d=run(d,{type:"resolve_match",id:m.id,catId:"mango"}).data;d=run(d,{type:"reopen_identity",id:m.reportId}).data;const r=d.reports.find(r=>r.id===m.reportId);assert.equal(r.reviewStatus,"pending");assert.equal(r.catId,undefined);assert.equal(r.decisions.length,3);assert.equal(d.cats.length,12);assert.ok(d.matches.some(m=>m.reportId===r.id));
});
test("a new identity increments census once and can be safely reopened",()=>{
  let d=run(initialData(),{type:"confirm_batch",updates:sample()}).data;const m=d.matches.find(m=>m.reportId);d=run(d,{type:"resolve_match",id:m.id,catId:""}).data;assert.equal(d.cats.length,13);assert.throws(()=>run(d,{type:"resolve_match",id:m.id,catId:""}),/already reviewed/);d=run(d,{type:"reopen_identity",id:m.reportId}).data;assert.equal(d.cats.length,12);
});
test("reopening cannot erase a new cat with later confirmed history",()=>{
  let d=run(initialData(),{type:"confirm_batch",updates:sample()}).data;const m=d.matches.find(m=>m.reportId);d=run(d,{type:"resolve_match",id:m.id,catId:""}).data;const cat=d.cats.find(c=>c.originReport===m.reportId);d=run(d,{type:"set_tnr",id:cat.id,fixed:true}).data;assert.throws(()=>run(d,{type:"reopen_identity",id:m.reportId}),/other confirmed records/);
});
test("second volunteer cannot claim an already claimed task",()=>{
  let d=run(initialData(),{type:"task_claim",id:"t1"}).data;assert.equal(d.tasks.find(t=>t.id==="t1").ownerId,actor.userId);assert.throws(()=>applyCommand(d,{type:"task_claim",id:"t1"},{userId:"raf",displayName:"Raf"},crypto.randomUUID(),at),/already been claimed/);d=run(d,{type:"task_resolve",id:"t1"}).data;assert.equal(d.tasks.find(t=>t.id==="t1").done,true);
});
test("older feeding reports do not replace newer feeding status",()=>{
  const recent={...sample()[0],observedAt:"2026-11-07T17:00:00.000Z",source:"Lunch feeding completed"};const old={...recent,observedAt:"2026-11-07T12:00:00.000Z",source:"Breakfast feeding completed"};let d=run(initialData(),{type:"confirm_batch",updates:[recent]}).data;d=run(d,{type:"confirm_batch",updates:[old]}).data;assert.equal(d.feedings.laundromat.observedAt,recent.observedAt);
});
test("server rejects cross-colony identities and arbitrary photo URLs",()=>{
  assert.throws(()=>run(initialData(),{type:"confirm_batch",updates:[{...sample()[0],cat:"fern"}]}),/selected colony/);
  assert.equal(CommandSchema.safeParse({type:"confirm_batch",updates:[{...sample()[0],photo:"https://example.com/tracker"}]}).success,false);
});
test("multiline messages stay together and multi-colony messages require manual selection",()=>{
  assert.equal(splitMessages("[8:00 AM] Ana: First line\ncontinuation\n[9:00 AM] Kevin: Next").length,2);
  const u=proposeUpdates("Ana: Fed Palm Court and the laundromat.",initialData().cats,"laundromat","2026-11-07")[0];assert.equal(u.selected,false);
});
