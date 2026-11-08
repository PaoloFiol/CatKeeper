import {z} from "zod";
import {COLONIES, SEED, type Data, type Report} from "./model.ts";

const colony = z.enum(["laundromat","palm","harbor"]);
const id = z.string().min(1).max(100);
const photo = z.string().regex(/^\/api\/photos\/[a-f0-9-]{36}$/).optional();
export const UpdateSchema = z.object({
  source:z.string().trim().min(1).max(2000), colony, reporter:z.string().trim().min(1).max(70),
  observedAt:z.string().datetime({offset:true}), cat:z.string().max(100),
  label:z.string().trim().min(1).max(70), coat:z.number().int().min(0).max(4),
  feeding:z.boolean(), urgent:z.boolean(), coverage:z.boolean(), photo,
});
export type ProposedUpdate = z.infer<typeof UpdateSchema> & {warnings?:string[]; selected?:boolean};
export const CommandSchema = z.discriminatedUnion("type",[
  z.object({type:z.literal("confirm_batch"),updates:z.array(UpdateSchema).min(1).max(20)}),
  z.object({type:z.literal("resolve_match"),id,catId:z.string().max(100)}),
  z.object({type:z.literal("reopen_identity"),id}),
  z.object({type:z.literal("set_tnr"),id,fixed:z.boolean().nullable()}),
  z.object({type:z.literal("task_claim"),id}),
  z.object({type:z.literal("task_resolve"),id}),
  z.object({type:z.literal("task_due"),id,dueAt:z.string().datetime({offset:true})}),
]);
export type Command = z.infer<typeof CommandSchema>;
export type Actor={userId:string;displayName:string};
export function sourceKey(u:{colony:string;source:string;observedAt:string}){
  return `${u.colony}|${u.observedAt.slice(0,10)}|${u.source.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()}`;
}
export function initialData():Data {return structuredClone(SEED)}
export class UserError extends Error {}
const newId=()=>crypto.randomUUID();

export function applyCommand(current:Data, command:Command, actor:Actor, requestId:string, at=new Date().toISOString()){
  if(current.applied.includes(requestId))return {data:current,message:"Already saved. Workspace refreshed."};
  const d=structuredClone(current); let message="Saved to the shared workspace.";
  const log=(title:string,detail:string,col:string,catId?:string,reportId?:string)=>d.activity.unshift({id:newId(),title,detail,colony:col,time:at,type:"care",catId,reportId});
  if(command.type==="confirm_batch"){
    let added=0,duplicates=0;
    for(const u of command.updates){
      const key=sourceKey(u);
      if(d.reports.some(r=>r.sourceKey===key)){duplicates++;continue}
      const known=d.cats.find(c=>c.id===u.cat);
      if(u.cat!=="new"&&u.cat!==""&&(!known||known.colony!==u.colony))throw new UserError("Choose a cat from the selected colony.");
      const report:Report={id:newId(),source:u.source,sourceKey:key,colony:u.colony,reporter:u.reporter,observedAt:u.observedAt,createdAt:at,confirmedBy:actor.displayName,catId:known?.id,photo:u.photo,feeding:u.feeding,urgent:u.urgent,coverage:u.coverage,label:u.label,coat:u.coat,reviewStatus:u.cat==="new"?"pending":known?"linked":"colony",decisions:[{at,by:actor.displayName,note:known?`Confirmed as ${known.name}`:u.cat==="new"?"Identity awaiting review":"Colony update confirmed"}]};
      d.reports.unshift(report);added++;
      if(u.cat==="new")d.matches.unshift({id:newId(),name:u.label,colony:u.colony,coat:u.coat,candidate:u.coat===4?"":d.cats.find(c=>c.colony===u.colony&&c.coat===u.coat)?.id||"",reportId:report.id,source:u.source,reporter:u.reporter,photo:u.photo});
      const previous=d.feedings[u.colony];
      if(u.feeding&&(!previous?.observedAt||new Date(u.observedAt)>=new Date(previous.observedAt)))d.feedings[u.colony]={by:u.reporter,time:u.observedAt,observedAt:u.observedAt,reportId:report.id};
      for(const kind of ["care","coverage"] as const){
        if(kind==="care"?!u.urgent:!u.coverage)continue;
        const care=kind==="care";
        d.tasks.unshift({id:newId(),title:care?(known?`Check on ${known.name}`:"Review a reported care concern"):`Cover feeding at ${COLONIES.find(c=>c.id===u.colony)?.name}`,detail:u.source,colony:u.colony,cat:known?.id,sighting:d.matches.find(m=>m.reportId===report.id)?.id,reportId:report.id,urgent:care,owner:"",done:false,dueAt:new Date(new Date(at).getTime()+(care?2:12)*3600000).toISOString()});
      }
      d.activity.unshift({id:newId(),title:`${u.reporter} reported${known?` on ${known.name}`:" a colony update"}`,detail:u.source,colony:u.colony,time:u.observedAt,type:u.urgent?"care":u.feeding?"feeding":"sighting",photo:u.photo,catId:known?.id,reportId:report.id});
    }
    message=`${added} update${added===1?"":"s"} saved${duplicates?`; ${duplicates} duplicate${duplicates===1?"":"s"} skipped`:""}.`;
  }else if(command.type==="resolve_match"){
    const m=d.matches.find(m=>m.id===command.id);if(!m)throw new UserError("This sighting was already reviewed. Refresh to see the result.");
    let cat=command.catId?d.cats.find(c=>c.id===command.catId):undefined;
    if(command.catId&&(!cat||cat.colony!==m.colony))throw new UserError("Choose an existing cat in this colony.");
    const created=!cat;
    if(!cat){cat={id:newId(),name:m.name,colony:m.colony,coat:m.coat,fixed:null,note:m.source,photo:m.photo,originReport:m.reportId};d.cats.push(cat)}
    d.matches=d.matches.filter(x=>x.id!==m.id);
    const r=d.reports.find(r=>r.id===m.reportId);
    if(r){r.catId=cat.id;r.reviewStatus=created?"new":"linked";r.decisions.push({at,by:actor.displayName,note:created?`Confirmed new cat: ${cat.name}`:`Linked sighting to ${cat.name}`})}
    d.tasks=d.tasks.map(t=>t.sighting===m.id||!!r&&t.reportId===r.id?{...t,cat:cat.id,title:t.urgent?`Check on ${cat.name}`:t.title}:t);
    d.activity=d.activity.map(a=>r&&a.reportId===r.id?{...a,catId:cat.id}:a);
    log(created?`${cat.name} added to the census`:`Sighting linked to ${cat.name}`,`Identity confirmed by ${actor.displayName}. Original report: ${m.source}`,m.colony,cat.id,m.reportId);
    message=created?"New cat confirmed. Census updated.":`Confirmed as ${cat.name}. Census unchanged.`;
  }else if(command.type==="reopen_identity"){
    const r=d.reports.find(r=>r.id===command.id);if(!r||r.reviewStatus==="pending"||r.reviewStatus==="colony")throw new UserError("This report has no confirmed cat identity to reopen.");
    const cat=d.cats.find(c=>c.id===r.catId);
    if(r.reviewStatus==="new"&&cat){
      if(cat.fixed!==null||d.reports.some(x=>x.id!==r.id&&x.catId===cat.id))throw new UserError("This cat now has other confirmed records. Keep its history and review the identity with your coordinator before changing it.");
      d.cats=d.cats.filter(c=>c.id!==cat.id);
    }
    const m={id:newId(),name:r.label,colony:r.colony,coat:r.coat,candidate:r.reviewStatus==="linked"?r.catId||"":"",reportId:r.id,source:r.source,reporter:r.reporter,photo:r.photo};
    d.matches.unshift(m);r.catId=undefined;r.reviewStatus="pending";
    r.decisions.push({at,by:actor.displayName,note:"Identity decision reopened; original evidence preserved"});
    d.tasks=d.tasks.map(t=>t.reportId===r.id?{...t,cat:undefined,sighting:m.id,title:t.urgent?"Review a reported care concern":t.title}:t);
    d.activity=d.activity.map(a=>a.reportId===r.id?{...a,catId:undefined}:a);
    log("Identity review reopened",`${actor.displayName} returned the sighting to review.`,r.colony,undefined,r.id);message="Sighting returned to identity review.";
  }else if(command.type==="set_tnr"){
    const c=d.cats.find(c=>c.id===command.id);if(!c)throw new UserError("Cat record not found.");c.fixed=command.fixed;
    log(`${c.name}’s TNR status updated`,`${actor.displayName} confirmed: ${c.fixed===null?"unknown":c.fixed?"fixed":"awaiting TNR"}.`,c.colony,c.id);
  }else{
    const t=d.tasks.find(t=>t.id===command.id);if(!t)throw new UserError("Task not found.");
    if(command.type==="task_claim"){
      if(t.done||t.owner)throw new UserError("This task has already been claimed or completed. Refresh to see who is responding.");
      t.owner=actor.displayName;t.ownerId=actor.userId;log(`${actor.displayName} claimed: ${t.title}`,"Task assigned.",t.colony,t.cat,t.reportId);message="Task assigned to you.";
    }else if(command.type==="task_resolve"){
      if(t.done)throw new UserError("This task is already resolved.");if(!t.owner)throw new UserError("Claim the task before resolving it.");
      t.done=true;log(`Resolved: ${t.title}`,`Marked complete by ${actor.displayName}.`,t.colony,t.cat,t.reportId);message="Task resolved.";
    }else{t.dueAt=command.dueAt;log(`Deadline updated: ${t.title}`,`${actor.displayName} set a follow-up deadline.`,t.colony,t.cat,t.reportId)}
  }
  d.applied=[requestId,...d.applied].slice(0,300);
  return {data:d,message};
}
