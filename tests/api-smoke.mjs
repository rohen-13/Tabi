import assert from "node:assert/strict";
import { generateTrip, DEFAULTS } from "../lib/planner.ts";
const base=process.env.TABI_TEST_URL||"http://127.0.0.1:5173";
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error("Smoke test is restricted to a local development server.");
const call=(path,options={})=>fetch(base+path,options);
const anon=await call("/api/trips");assert.equal(anon.status,200);assert.equal((await anon.json()).signedIn,false);
const trip=generateTrip(DEFAULTS);trip.name="Disposable API smoke test";
assert.equal((await call("/api/trips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(trip)})).status,401);
// The local Sites development sign-in endpoint issues a mock user cookie.
const login=await call("/signin-with-chatgpt?return_to=/",{redirect:"manual"});
const cookie=login.headers.getSetCookie().map(x=>x.split(";")[0]).join("; ");
assert.ok(cookie,"Mock sign-in must provide a cookie");
const headers={"Content-Type":"application/json",Cookie:cookie};
const post=await call("/api/trips",{method:"POST",headers,body:JSON.stringify(trip)});assert.equal(post.status,201,await post.clone().text());const {id}=await post.json();
try{
 const list=await (await call("/api/trips",{headers})).json();assert.ok(list.trips.some(x=>x.id===id));
 assert.equal((await call("/api/trips?id="+id,{method:"DELETE"})).status,401);
 assert.equal((await call("/api/trips",{method:"POST",headers:{...headers,Origin:"https://untrusted.example"},body:JSON.stringify(trip)})).status,403);
 assert.equal((await call("/api/trips",{method:"POST",headers,body:JSON.stringify({...trip,preferences:{...DEFAULTS,days:900}})})).status,400);
 console.log("PASS: anonymous demo, authentication, durable save/read, cross-origin rejection, invalid payload rejection");
}finally{
 const deletion=await call("/api/trips?id="+id,{method:"DELETE",headers});assert.equal(deletion.status,200);
 const list=await (await call("/api/trips",{headers})).json();assert.ok(!list.trips.some(x=>x.id===id));
 console.log("PASS: saved test trip deleted and deletion persisted");
}
