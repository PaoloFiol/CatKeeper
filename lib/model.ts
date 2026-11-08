export type CatRecord = { id:string; name:string; colony:string; coat:number; fixed:boolean|null; note:string; photo?:string; originReport?:string };
export type Task = { id:string; title:string; detail:string; colony:string; cat?:string; sighting?:string; urgent:boolean; owner:string; ownerId?:string; done:boolean; dueAt?:string; reportId?:string };
export type Sighting = { id:string; name:string; colony:string; coat:number; candidate:string; reportId?:string; source:string; reporter:string; photo?:string };
export type Activity = { id:string; title:string; detail:string; colony:string; time:string; type:string; photo?:string; catId?:string; reportId?:string };
export type Report = {id:string; source:string; sourceKey:string; colony:string; reporter:string; observedAt:string; createdAt:string; confirmedBy:string; catId?:string; photo?:string; feeding:boolean; urgent:boolean; coverage:boolean; label:string; coat:number; reviewStatus:"pending"|"linked"|"new"|"colony"; decisions:{at:string; by:string; note:string}[]};
export type Data = { cats:CatRecord[]; tasks:Task[]; matches:Sighting[]; feedings:Record<string,{by:string;time:string;observedAt?:string;reportId?:string}>; activity:Activity[]; reports:Report[]; applied:string[] };
export const COLONIES = [
 {id:"laundromat",name:"Laundromat Lane",location:"Behind the little blue laundromat",color:"#dbe4d2",x:29,y:40},
 {id:"palm",name:"Palm Court",location:"The courtyard by the old café",color:"#f0ddc2",x:61,y:28},
 {id:"harbor",name:"Harbor Garden",location:"Beside the community garden",color:"#d3e2df",x:73,y:69}
];
export const colonyName=(id:string)=>COLONIES.find(c=>c.id===id)?.name||id;
export const uid=()=>Math.random().toString(36).slice(2,10);
export const SEED:Data={
 reports:[],applied:[],
 cats:[
 {id:"mango",name:"Mango",colony:"laundromat",coat:0,fixed:true,note:"Orange coat, white chest. Usually first in line for breakfast."},
 {id:"olive",name:"Olive",colony:"laundromat",coat:2,fixed:true,note:"Calico markings and a little pink nose. A quiet observer."},
 {id:"pebble",name:"Pebble",colony:"laundromat",coat:1,fixed:null,note:"Gray coat with a white chin. Neuter status needs confirmation."},
 {id:"boots",name:"Boots",colony:"laundromat",coat:3,fixed:true,note:"Black coat and four white paws. Loves the shady steps."},
 {id:"poppy",name:"Poppy",colony:"palm",coat:2,fixed:false,note:"Small calico. Waiting for a TNR appointment."},
 {id:"fig",name:"Fig",colony:"palm",coat:1,fixed:true,note:"Silver gray coat. Often beside the courtyard pots."},
 {id:"toast",name:"Toast",colony:"palm",coat:0,fixed:true,note:"Ginger tabby with bright eyes. Friendly with familiar feeders."},
 {id:"dot",name:"Dot",colony:"palm",coat:3,fixed:null,note:"Tuxedo coat with a white nose. Status still being checked."},
 {id:"fern",name:"Fern",colony:"harbor",coat:1,fixed:true,note:"Soft gray fur. Keeps watch over the garden gate."},
 {id:"sunny",name:"Sunny",colony:"harbor",coat:0,fixed:true,note:"Orange tabby with a white muzzle. Likes the afternoon sun."},
 {id:"cleo",name:"Cleo",colony:"harbor",coat:2,fixed:false,note:"Calico with a dark ear. Waiting for TNR."},
 {id:"socks",name:"Socks",colony:"harbor",coat:3,fixed:true,note:"White socks and a black coat. Often seen with Fern."}],
 tasks:[
 {id:"t1",title:"Check on Mango",detail:"Ana reported: Fed the colony at 8:15. Mango came over but was limping on his front paw.",colony:"laundromat",cat:"mango",urgent:true,owner:"",done:false},
 {id:"t2",title:"Cover the evening feeding",detail:"Leo reported: I am away this evening. Can someone cover Palm Court?",colony:"palm",urgent:false,owner:"",done:false},
 {id:"t3",title:"Arrange Poppy’s TNR visit",detail:"Maya reported: Poppy is still awaiting TNR. Please coordinate her appointment.",colony:"palm",cat:"poppy",urgent:false,owner:"Maya",done:false}],
 matches:[{id:"s1",name:"Orange cat sighting",colony:"laundromat",coat:0,candidate:"mango",source:"Saw this orange-and-white cat behind the laundromat this morning. Is he already on our list?",reporter:"Devon"}],
 feedings:{laundromat:{by:"Ana",time:"Today, 8:15 AM"},palm:{by:"Leo",time:"Today, 7:40 AM"},harbor:{by:"Maya",time:"Today, 9:05 AM"}},
 activity:[
 {id:"a1",title:"Breakfast served at Harbor Garden",detail:"Maya fed the colony and refreshed the water bowls.",colony:"harbor",time:"9:05 AM",type:"feeding"},
 {id:"a2",title:"A familiar face?",detail:"Devon added an orange cat sighting. Identity review needed.",colony:"laundromat",time:"8:50 AM",type:"sighting"},
 {id:"a3",title:"Mango needs a check-in",detail:"Ana reported a limp. A care task was opened.",colony:"laundromat",time:"8:15 AM",type:"care"},
 {id:"a4",title:"Palm Court checked in",detail:"Leo recorded the morning feeding. Evening coverage needed.",colony:"palm",time:"7:40 AM",type:"feeding"}]
};
