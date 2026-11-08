import {COLONIES,type CatRecord} from "./model.ts";
import type {ProposedUpdate} from "./workspace.ts";

export const SAMPLE_CHAT="[8:15 AM] Ana: Fed the laundromat colony and refreshed the water bowls.\n[8:22 AM] Kevin: Saw an orange-and-white cat behind the laundromat. He was limping on his front paw. Is this Mango?\n[9:05 AM] Raf: I cannot cover the evening feeding at Palm Court. Can someone help?";
export function splitMessages(text:string){
  const lines=text.trim().split(/\r?\n/);const messages:string[]=[];let buffer="";
  for(const line of lines){
    const starts=/^\s*(?:\[[^\]]+\]|\d{1,2}[\/:.-]\d|\d{1,2}:\d{2}|[\p{L}][\p{L} .'-]{0,45}:)/u.test(line);
    if(!line.trim()||starts){if(buffer.trim())messages.push(buffer.trim());buffer=line.trim()}
    else buffer+=(buffer?"\n":"")+line.trim();
  }
  if(buffer.trim())messages.push(buffer.trim());
  return messages;
}
export function proposeUpdates(text:string,cats:CatRecord[],defaultColony:string,date:string):ProposedUpdate[]{
  return splitMessages(text).map(source=>{
    const lower=source.toLowerCase();let warnings=["Check the observation date and time."];
    const found=COLONIES.filter(c=>lower.includes(c.name.toLowerCase())||lower.includes(c.id==="laundromat"?"laundromat":c.id==="palm"?"palm court":"harbor garden"));
    const col=found.length===1?found[0].id:defaultColony;
    if(found.length!==1)warnings.push(found.length>1?"More than one colony mentioned. Split this into separate updates before saving.":"Colony inferred from your selection. Please confirm.");
    const reporter=source.match(/^(?:\[[^\]]+\]\s*|\d{1,2}:\d{2}(?:\s*[AP]M)?\s*[-–]\s*)?([^:\n]{1,50}):\s/i)?.[1]?.trim()||"Volunteer";
    let body=source.replace(/^(?:\[[^\]]+\]\s*)?[^:\n]{1,50}:\s/,"");
    const time=source.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)||source.match(/\b(\d{1,2}):(\d{2})\b/);
    const stamp=new Date(`${date}T12:00:00`);
    if(time){let hour=Number(time[1]);if(time[3])hour=(hour%12)+(time[3].toLowerCase()==="pm"?12:0);if(hour<24&&Number(time[2]||0)<60)stamp.setHours(hour,Number(time[2]||0),0,0)}
    const explicitDate=source.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if(explicitDate){const explicit=new Date(`${explicitDate[1]}T12:00:00`);if(!isNaN(+explicit)){stamp.setFullYear(explicit.getFullYear(),explicit.getMonth(),explicit.getDate())}}
    const known=cats.filter(c=>c.colony===col&&new RegExp(`\\b${c.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(body));
    const uncertain=/\?|\b(maybe|possibly|might|is this|looks like|could be)\b/i.test(body);
    const sighting=/\b(saw|seen|spotted|sighting|cat|kitten|mango|pebble)\b/i.test(body);
    const negativeFeeding=/\b(not fed|haven['’]?t fed|didn['’]?t feed|couldn['’]?t feed|cannot feed|can['’]?t feed|need to feed|will feed|going to feed)\b/i.test(body);
    const feeding=/\b(fed|feeding complete|gave food|filled.{0,12}bowls)\b/i.test(body)&&!negativeFeeding;
    const concernClauses=body.split(/[.!?;]|\bbut\b/i);
    const urgent=concernClauses.some(s=>/\b(limp\w*|injur\w*|bleed\w*|sick|trapped|struggling)\b/i.test(s)&&!/\b(not|no longer|isn['’]?t|wasn['’]?t|no signs? of)\b/i.test(s));
    const coverage=/\b(cover|coverage|no feeder|cannot feed|can['’]?t feed|away)\b/i.test(body)&&/\b(feed\w*|evening|morning)\b/i.test(body);
    const coat=/\b(gray|grey|silver)\b/i.test(body)?1:/\bcalico\b/i.test(body)?2:/\b(black|tuxedo)\b/i.test(body)?3:/\b(orange|ginger|tabby)\b/i.test(body)?0:4;
    if(known.length>1)warnings.push("Multiple cats mentioned. Split this into separate updates if each needs a record.");
    if(uncertain&&sighting)warnings.push("Identity is uncertain. This sighting will wait for a human match review.");
    if(urgent)warnings.push("Reported care concern; this is not a diagnosis.");
    return {source,colony:col as ProposedUpdate["colony"],reporter,observedAt:stamp.toISOString(),cat:known.length===1&&!uncertain?known[0].id:sighting?"new":"",label:coat===4?"Unidentified cat":["Orange cat sighting","Gray cat sighting","Calico sighting","Tuxedo sighting"][coat],coat,feeding,urgent,coverage,warnings,selected:found.length<2&&known.length<2};
  });
}
