import {env} from "cloudflare:workers";
import {getChatGPTUser} from "../app/chatgpt-auth";
import {initialData,type Actor} from "./workspace";
import type {Data} from "./model";

export class HttpError extends Error {constructor(public status:number,message:string){super(message)}}
export async function authorize(request:Request,write=false):Promise<Actor>{
  if(write&&request.headers.get("origin")!==new URL(request.url).origin)throw new HttpError(403,"Please submit changes from CatKeeper.");
  const user=await getChatGPTUser();
  if(!user){if(write)throw new HttpError(401,"Sign in to save updates or claim tasks.");return {userId:"",displayName:"Visitor"}}
  return {userId:user.userId,displayName:user.displayName.includes("@")?user.displayName.split("@")[0]:user.displayName};
}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}})}
export async function readBytes(request:Request,max:number){
  if(Number(request.headers.get("content-length")||0)>max)throw new HttpError(413,"This upload is too large.");
  if(!request.body)throw new HttpError(400,"No data received.");
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new HttpError(413,"This upload is too large.")}chunks.push(value)}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length}return bytes;
}
export async function readWorkspace(){
  if(!env.DB)throw new HttpError(503,"Shared storage is not available yet. Please try again shortly.");
  let row=await env.DB.prepare("SELECT data, revision FROM rescue_workspace WHERE id = ?").bind("mangrove-mews").first<{data:string;revision:number}>();
  if(!row){await env.DB.prepare("INSERT OR IGNORE INTO rescue_workspace (id, data, revision) VALUES (?, ?, 0)").bind("mangrove-mews",JSON.stringify(initialData())).run();row=await env.DB.prepare("SELECT data, revision FROM rescue_workspace WHERE id = ?").bind("mangrove-mews").first<{data:string;revision:number}>()}
  if(!row)throw new HttpError(503,"Could not open the workspace.");
  return {data:JSON.parse(row.data) as Data,revision:row.revision};
}
export function errorResponse(error:unknown){
  if(error instanceof HttpError)return json({error:error.message},error.status);
  console.error("CatKeeper request failed",error instanceof Error?error.message:"Unknown error");
  return json({error:"Could not save or load the workspace. Your draft is still here; please try again."},500);
}
