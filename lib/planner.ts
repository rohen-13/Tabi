import { CITIES, PLACES, placeById, type City, type Interest, type Place } from "./places.ts";
export type Preferences = { days:number; travellers:number; budget:number; flight:number; nightly:number; food:number; interests:Interest[]; pace:"relaxed"|"balanced"|"full"; style:"classic"|"culture"|"nature"; origin:string };
export type Day = { day:number; city:City; places:string[] };
export type Trip = { name:string; preferences:Preferences; days:Day[] };
export const DEFAULTS:Preferences = {days:10,travellers:1,budget:2500,flight:780,nightly:85,food:30,interests:["Culture","Food"],pace:"balanced",style:"classic",origin:"Dublin"};
export const euro = (n:number) => new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
export const dayCapacity = (p:Preferences, transfer=false) => (p.pace==="relaxed"?4:p.pace==="full"?8:6)-(transfer?3:0);
export function distanceKm(a:Pick<Place,"lat"|"lng">,b:Pick<Place,"lat"|"lng">) {
 const r=Math.PI/180, dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;
 return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function allocation(p:Preferences):Record<City,number>{
 const tokyo=Math.round(p.days*(p.style==="culture"?.3:.4));
 const kyoto=Math.round(p.days*(p.style==="classic"?.3:.4));
 return {Tokyo:tokyo,Kyoto:kyoto,Osaka:p.days-tokyo-kyoto};
}
export function generateTrip(p:Preferences):Trip {
 const used=new Set<string>(), days:Day[]=[]; const split=allocation(p);
 const interest=(x:Place)=>p.interests.includes(x.category)?5:0;
 const style=(x:Place)=>p.style==="nature"&&x.category==="Nature"?5:p.style==="culture"&&x.category==="Culture"?5:0;
 const activityBudget=Math.max(0,p.budget/(p.travellers*p.days)-p.flight/p.days-p.nightly/p.travellers-p.food-20);
 for(const city of CITIES) for(let d=0;d<split[city];d++){
   const transfer=d===0&&city!=="Tokyo";const limit=dayCapacity(p,transfer); let hours=0;
   const selected:Place[]=[];
   while(selected.length<(p.pace==="relaxed"?2:p.pace==="full"?4:3)){
     const candidates=PLACES.filter(x=>x.city===city&&!used.has(x.id)&&hours+x.hours+(selected.length?.5:0)<=limit);
     candidates.sort((a,b)=>{
       const score=(x:Place)=>interest(x)+style(x)-(x.cost>activityBudget?6:0)-(selected.length?distanceKm(selected[selected.length-1],x)*1.4:0);
       return score(b)-score(a)||a.id.localeCompare(b.id);
     });
     const next=candidates[0];if(!next)break;
     hours+=next.hours+(selected.length?.5:0); selected.push(next);used.add(next.id);
   }
   days.push({day:days.length+1,city,places:selected.map(x=>x.id)});
 }
 return {name:p.style==="culture"?"Stories of old Japan":p.style==="nature"?"Japan at a slower pace":"A first taste of Japan",preferences:{...p,interests:[...p.interests]},days};
}
export function estimatedDayHours(day:Day){return day.places.reduce((sum,id)=>sum+(placeById(id)?.hours??0),0)+Math.max(0,day.places.length-1)*.5;}
export function alternatives(trip:Trip,dayIndex:number,slot:number){
 const day=trip.days[dayIndex],old=placeById(day.places[slot]),used=new Set(trip.days.flatMap(d=>d.places));
 const transfer=dayIndex>0&&trip.days[dayIndex-1].city!==day.city;
 return PLACES.filter(p=>p.city===day.city&&!used.has(p.id)&&estimatedDayHours(day)-(old?.hours??0)+p.hours+(!old&&day.places.length?.5:0)<=dayCapacity(trip.preferences,transfer));
}
export function calculateBudget(trip:Trip){
 const p=trip.preferences, rooms=Math.ceil(p.travellers/2),nights=p.days-1;
 const flights=p.flight*p.travellers, stays=p.nightly*nights*rooms, meals=p.food*p.days*p.travellers;
 const transport=(130+7*p.days)*p.travellers;
 const activities=trip.days.flatMap(d=>d.places).reduce((sum,id)=>sum+(placeById(id)?.cost??0),0)*p.travellers;
 const subtotal=flights+stays+meals+transport+activities,buffer=Math.round(subtotal*.1);
 return {flights,stays,meals,transport,activities,buffer,total:subtotal+buffer,rooms,nights};
}
export function schedule(day:Day){
 let minute=day.day===1?10*60:9*60;
 return day.places.map(id=>{const time=String(Math.floor(minute/60)).padStart(2,"0")+":"+String(minute%60).padStart(2,"0");minute+=(placeById(id)?.hours??0)*60+30;return time;});
}
