import { env } from "cloudflare:workers";
function db(){if(!env.DB)throw new Error("Trip storage is unavailable");return env.DB;}
export async function listTrips(owner:string){return (await db().prepare("SELECT id, name, data, created_at FROM trips WHERE owner = ? ORDER BY created_at DESC LIMIT 50").bind(owner).all()).results;}
export async function saveTrip(id:string,owner:string,name:string,data:string){await db().prepare("INSERT INTO trips (id, owner, name, data, created_at) VALUES (?, ?, ?, ?, ?)").bind(id,owner,name,data,new Date().toISOString()).run();}
export async function deleteTrip(id:string,owner:string){return db().prepare("DELETE FROM trips WHERE id = ? AND owner = ?").bind(id,owner).run();}
