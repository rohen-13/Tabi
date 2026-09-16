import { getChatGPTUser } from "@/app/chatgpt-auth";
import { listTrips, saveTrip, deleteTrip } from "@/db/trips";
import { tripSchema } from "@/lib/validation";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin;}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({signedIn:false,trips:[]});
 try {const rows=await listTrips(user.userId);return json({signedIn:true,trips:rows.map(row=>({id:row.id,createdAt:row.created_at,trip:JSON.parse(String(row.data))}))});}
 catch(e){console.error("Trip list failed",e);return json({error:"Saved trips are temporarily unavailable. Please try again."},503);}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:"Invalid request origin"},403);
 const user=await getChatGPTUser();if(!user)return json({error:"Sign in to save trips"},401);
 try{
 const body=await request.text();if(body.length>30000)return json({error:"Trip is too large"},413);
 let raw;try{raw=JSON.parse(body)}catch{return json({error:"Invalid JSON"},400)}
 const parsed=tripSchema.safeParse(raw);if(!parsed.success)return json({error:"Please check your trip details."},400);
 const existing=await listTrips(user.userId);if(existing.length>=50)return json({error:"You have 50 saved trips. Delete an old trip first."},409);
 const id=crypto.randomUUID();await saveTrip(id,user.userId,parsed.data.name,JSON.stringify(parsed.data));return json({id},201);
 }catch(e){console.error("Trip save failed",e);return json({error:"We couldn’t save your trip. Your current plan is still here."},503);}
}
export async function DELETE(request:Request){
 if(!sameOrigin(request))return json({error:"Invalid request origin"},403);
 const user=await getChatGPTUser();if(!user)return json({error:"Sign in required"},401);
 const id=new URL(request.url).searchParams.get("id");if(!id||!/^[a-f0-9-]{36}$/.test(id))return json({error:"Invalid trip"},400);
 try{const result=await deleteTrip(id,user.userId);return result.meta.changes?json({deleted:true}):json({error:"Trip not found"},404);}
 catch(e){console.error("Trip deletion failed",e);return json({error:"Could not delete the trip. Please try again."},503);}
}
