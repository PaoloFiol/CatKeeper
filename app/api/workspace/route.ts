import {env} from "cloudflare:workers";
import {z} from "zod";
import {authorize,errorResponse,HttpError,json,readBytes,readWorkspace} from "../../../lib/server";
import {applyCommand,CommandSchema,UserError} from "../../../lib/workspace";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{const actor=await authorize(request);const state=await readWorkspace();return json({...state,actor,ai:{mode:"rules",label:"Text assistance · human review required"}})}catch(e){return errorResponse(e)}
}
export async function POST(request:Request){
  try{
    const actor=await authorize(request,true);
    let input;try{input=JSON.parse(new TextDecoder().decode(await readBytes(request,100000)))}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,"The update could not be read.")}
    const parsed=z.object({requestId:z.string().uuid(),command:CommandSchema}).safeParse(input);
    if(!parsed.success)throw new HttpError(400,"Please check the update fields, dates, and selected cats before saving.");
    for(let attempt=0;attempt<5;attempt++){
      const state=await readWorkspace();
      const result=applyCommand(state.data,parsed.data.command,actor,parsed.data.requestId);
      if(result.data===state.data)return json({...state,actor,message:result.message});
      const serialized=JSON.stringify(result.data);
      if(serialized.length>4000000)throw new HttpError(413,"This demo workspace is full. Export its records before adding more.");
      const update=await env.DB!.prepare("UPDATE rescue_workspace SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?").bind(serialized,"mangrove-mews",state.revision).run();
      if(update.meta.changes===1)return json({data:result.data,revision:state.revision+1,actor,message:result.message});
    }
    throw new HttpError(409,"The team is making changes right now. Please try saving again.");
  }catch(e){if(e instanceof UserError)return json({error:e.message},409);return errorResponse(e)}
}
