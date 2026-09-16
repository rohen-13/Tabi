import { z } from "zod";
import { PLACES } from "./places.ts";
import { allocation, dayCapacity, estimatedDayHours } from "./planner.ts";
export const preferencesSchema=z.object({
 days:z.number().int().min(7).max(14),travellers:z.number().int().min(1).max(6),
 budget:z.number().min(100).max(100000),flight:z.number().min(0).max(20000),
 nightly:z.number().min(0).max(5000),food:z.number().min(0).max(1000),
 interests:z.array(z.enum(["Culture","Food","Nature","City life"])).min(1).max(4),
 pace:z.enum(["relaxed","balanced","full"]),style:z.enum(["classic","culture","nature"]),
 origin:z.string().trim().min(1).max(50)
}).strict();
export const tripSchema=z.object({
 name:z.string().trim().min(1).max(80),
 preferences:preferencesSchema,
 days:z.array(z.object({day:z.number().int(),city:z.enum(["Tokyo","Kyoto","Osaka"]),places:z.array(z.string()).max(4)}).strict()).min(7).max(14)
}).strict().superRefine((trip,ctx)=>{
 const seen=new Set<string>(),split=allocation(trip.preferences),expected=(["Tokyo","Kyoto","Osaka"] as const).flatMap(c=>Array(split[c]).fill(c));
 if(trip.days.length!==trip.preferences.days)ctx.addIssue({code:"custom",message:"Day count does not match trip length"});
 trip.days.forEach((day,i)=>{
  if(day.day!==i+1||day.city!==expected[i])ctx.addIssue({code:"custom",message:"Invalid day order"});
  for(const id of day.places){const place=PLACES.find(p=>p.id===id);if(!place||place.city!==day.city||seen.has(id))ctx.addIssue({code:"custom",message:"Invalid or duplicate place"});seen.add(id);}
  if(estimatedDayHours(day)>dayCapacity(trip.preferences,i>0&&trip.days[i-1].city!==day.city))ctx.addIssue({code:"custom",message:"Day exceeds available time"});
 });
});
