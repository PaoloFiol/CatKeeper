import {env} from "cloudflare:workers";
import {authorize,errorResponse,HttpError,json,readBytes} from "../../../lib/server";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  try{
    await authorize(request,true);if(!env.BUCKET)throw new HttpError(503,"Photo storage is temporarily unavailable.");
    const mime=request.headers.get("content-type")||"";
    if(!["image/jpeg","image/png","image/webp"].includes(mime))throw new HttpError(400,"Choose a JPG, PNG, or WebP image.");
    const bytes=await readBytes(request,1500000);
    const signature=mime==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==="image/png"?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
    if(!signature)throw new HttpError(400,"The file does not match its image type.");
    const id=crypto.randomUUID();await env.BUCKET.put(`photos/${id}`,bytes,{httpMetadata:{contentType:mime}});
    return json({url:`/api/photos/${id}`});
  }catch(e){return errorResponse(e)}
}
