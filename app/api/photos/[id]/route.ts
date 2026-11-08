import {env} from "cloudflare:workers";
import {authorize,errorResponse,HttpError} from "../../../../lib/server";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await authorize(request);const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(404,"Photo not found.");
    const photo=await env.BUCKET?.get(`photos/${id}`);if(!photo)throw new HttpError(404,"Photo not found.");
    return new Response(photo.body,{headers:{"Content-Type":photo.httpMetadata?.contentType||"application/octet-stream","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(e){return errorResponse(e)}
}
