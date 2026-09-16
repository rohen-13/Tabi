"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Bookmark, Map, Plane, CalendarDays, Wallet, SlidersHorizontal, ArrowRight, ArrowUpRight, Clock, Check, Sparkles, TrainFront, Download, MapPin, X, Plus, RotateCcw, Trash2, Wifi, CreditCard, Heart, ExternalLink, BedDouble, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import TripMap from "./trip-map";
import { CITIES, CITY_INFO, INTERESTS, PLACES, placeById, type City, type Place } from "@/lib/places";
import { DEFAULTS, generateTrip, calculateBudget, estimatedDayHours, dayCapacity, alternatives, allocation, euro, type Preferences, type Trip } from "@/lib/planner";
import { preferencesSchema, tripSchema } from "@/lib/validation";

type Saved = {id:string;createdAt:string;trip:Trip};
const STYLES = [
 {id:"classic",title:"The first-timer",subtitle:"A little of everything",icon:"01"},
 {id:"culture",title:"The culture seeker",subtitle:"More time in Kyoto",icon:"02"},
 {id:"nature",title:"The slow explorer",subtitle:"Gardens & quieter corners",icon:"03"}
] as const;

function Choice({id,value,onChange,options}:{id:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[]}){
 return <Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="form-select"><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>;
}
export default function Planner({signedIn,signInUrl}:{signedIn:boolean;signInUrl:string}) {
 const [trip,setTrip]=useState<Trip>(()=>generateTrip(DEFAULTS));
 const [city,setCity]=useState<City>("Tokyo"),[dayIndex,setDayIndex]=useState(0),[mapMode,setMapMode]=useState("route"),[tab,setTab]=useState("itinerary");
 const [edit,setEdit]=useState(false),[draft,setDraft]=useState<Preferences>(DEFAULTS),[formError,setFormError]=useState("");
 const [swap,setSwap]=useState<{day:number;slot:number}|null>(null);
 const [saveOpen,setSaveOpen]=useState(false),[savedOpen,setSavedOpen]=useState(false),[name,setName]=useState(""),[busy,setBusy]=useState(false);
 const [saved,setSaved]=useState<Saved[]>([]),[loading,setLoading]=useState(false),[savedError,setSavedError]=useState(""),[deleteId,setDeleteId]=useState<string|null>(null);
 const budget=useMemo(()=>calculateBudget(trip),[trip]),split=allocation(trip.preferences),day=trip.days[dayIndex]??trip.days[0];
 const dayPlaces=useMemo(()=>day.places.map(placeById).filter((x):x is Place=>!!x),[day]);
 const candidates=swap?alternatives(trip,swap.day,swap.slot):[];
 const p=trip.preferences,over=budget.total>p.budget,remaining=p.budget-budget.total;
 const current=useRef(trip); current.current=trip;
 const cityRef=useRef(city);cityRef.current=city;

 useEffect(()=>{
  try{const pending=sessionStorage.getItem("tabi-signin-draft");if(pending){sessionStorage.removeItem("tabi-signin-draft");const parsed=tripSchema.safeParse(JSON.parse(pending));if(parsed.success){setTrip(parsed.data);setName(parsed.data.name);if(signedIn)setSaveOpen(true);}}}catch{/* A blocked browser store does not stop the planner. */}
 },[signedIn]);

 const goCity=(next:City)=>{setCity(next);setDayIndex(trip.days.findIndex(d=>d.city===next));};
 const update=(next:Trip)=>{setTrip(next);setCity("Tokyo");setDayIndex(0);setTab("itinerary");};
 const openEdit=()=>{setDraft({...p,interests:[...p.interests]});setFormError("");setEdit(true);};
 const signIn=()=>{try{sessionStorage.setItem("tabi-signin-draft",JSON.stringify(trip));}catch{toast.error("Your browser could not keep the draft. Export it before signing in.");}};

 useEffect(()=>{
  type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
  const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const tools:Tool[]=[
   {name:"read_trip",description:"Read the current visible itinerary and estimated budget.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({trip:current.current,budget:calculateBudget(current.current)})},
   {name:"configure_trip",description:"Replace the visible draft itinerary using complete trip preferences. Does not save or book anything.",inputSchema:{type:"object",properties:{days:{type:"integer",minimum:7,maximum:14},travellers:{type:"integer",minimum:1,maximum:6},budget:{type:"number",minimum:100,maximum:100000},flight:{type:"number",minimum:0,maximum:20000},nightly:{type:"number",minimum:0,maximum:5000},food:{type:"number",minimum:0,maximum:1000},interests:{type:"array",items:{type:"string",enum:INTERESTS},minItems:1,maxItems:4},pace:{type:"string",enum:["relaxed","balanced","full"]},style:{type:"string",enum:["classic","culture","nature"]},origin:{type:"string",minLength:1,maxLength:50}},required:["days","travellers","budget","flight","nightly","food","interests","pace","style","origin"],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input)=>{const parsed=preferencesSchema.parse(input);const next=generateTrip(parsed);current.current=next;update(next);await new Promise<void>(r=>requestAnimationFrame(()=>r()));return {name:next.name,days:next.days.length,estimatedTotal:calculateBudget(next).total};}}
  ];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability. */}}
  return()=>lifecycle.abort();
 },[]);

 async function loadSaved(){
  setSavedOpen(true);setLoading(true);setSavedError("");
  try{const r=await fetch("/api/trips");const data=await r.json() as {error?:string;trips?:Saved[];id?:string};if(!r.ok)throw Error(data.error);setSaved((data.trips??[]).filter((s:Saved)=>tripSchema.safeParse(s.trip).success));}
  catch(e){setSavedError(e instanceof Error?e.message:"Could not load saved trips.");}finally{setLoading(false);}
 }
 async function save(){
  setBusy(true);
  try{const r=await fetch("/api/trips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...trip,name:name.trim()})});const data=await r.json() as {error?:string;trips?:Saved[];id?:string};if(!r.ok)throw Error(data.error);setTrip({...trip,name:name.trim()});setSaveOpen(false);toast.success("Your Japan trip is saved.");}
  catch(e){toast.error(e instanceof Error?e.message:"Could not save your trip.");}finally{setBusy(false);}
 }
 async function removeSaved(id:string){
  setBusy(true);
  try{const r=await fetch("/api/trips?id="+encodeURIComponent(id),{method:"DELETE"});const data=await r.json() as {error?:string;trips?:Saved[];id?:string};if(!r.ok)throw Error(data.error);setSaved(s=>s.filter(t=>t.id!==id));toast.success("Saved trip deleted.");}
  catch(e){toast.error(e instanceof Error?e.message:"Could not delete trip.");}finally{setBusy(false);setDeleteId(null);}
 }
 function removePlace(slot:number){
  const old=trip;const next={...trip,days:trip.days.map((d,i)=>i===dayIndex?{...d,places:d.places.filter((_,s)=>s!==slot)}:d)};setTrip(next);
  toast("Stop removed",{action:{label:"Undo",onClick:()=>setTrip(old)}});
 }
 function exportTrip(){
  const lines=[trip.name,"Tabi — Japan trip plan",p.days+" days · "+p.travellers+" traveller(s) · From "+p.origin,"Estimated total: "+euro(budget.total)+" / budget "+euro(p.budget),"","All prices are planning assumptions, not quotes. Days are in Japan; allow extra time for international travel. Check opening hours and transfers before booking.",""];
  trip.days.forEach(d=>{lines.push("DAY "+d.day+" — "+d.city);d.places.forEach(id=>{const a=placeById(id)!;lines.push("- "+a.name+" ("+a.hours+"h, "+(a.cost?euro(a.cost)+" estimated entry":"no entry allowance")+") — "+a.description);});if(!d.places.length)lines.push("- Free time");lines.push("");});
  lines.push("BUDGET FOR THE WHOLE PARTY",...Object.entries(budget).filter(([k])=>!["rooms","nights","total"].includes(k)).map(([k,v])=>k+": "+euro(v)),"","Lodging: "+budget.rooms+" room(s), "+budget.nights+" nights","Transport includes illustrative local travel and two intercity transfers. Shopping and insurance are not included.","","Official travel guidance: https://www.japan.travel/en/plan/");
  const url=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="tabi-japan-itinerary.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast.success("Your itinerary has been exported.");
 }
 const details=[
 {key:"flights",label:"Flights",icon:Plane,detail:p.travellers+" × "+euro(p.flight)+" return / multi-city allowance"},
 {key:"stays",label:"Places to stay",icon:BedDouble,detail:budget.nights+" nights × "+budget.rooms+" room(s) × "+euro(p.nightly)},
 {key:"meals",label:"Food & little cafés",icon:Heart,detail:p.days+" days × "+p.travellers+" × "+euro(p.food)},
 {key:"transport",label:"Getting around",icon:TrainFront,detail:"Two intercity transfers + local transport allowance"},
 {key:"activities",label:"Sights & experiences",icon:Compass,detail:"Estimated entry costs for your selected stops"},
 {key:"buffer",label:"A little breathing room",icon:Wallet,detail:"10% contingency on the costs above"}
 ] as const;
 return <div className="app-shell">
 <Toaster theme="light" position="bottom-center" richColors/>
 <aside className="rail"><a href="/" className="brand" aria-label="Tabi home">t<span>•</span></a><div className="rail-links"><button className="rail-link selected" aria-label="Trip planner" onClick={()=>{setTab("itinerary");window.scrollTo({top:0,behavior:"smooth"});}}><Compass/></button><button className="rail-link" aria-label="Saved trips" onClick={loadSaved}><Bookmark/></button><button className="rail-link" aria-label="Export itinerary" onClick={exportTrip}><Download/></button></div><span className="rail-bottom">旅</span></aside>
 <div className="workspace"><header className="topbar"><a href="/" className="wordmark">tabi<span> / </span><small>TRAVEL WITH INTENTION</small></a><button className="text-button" onClick={loadSaved}><Bookmark size={16}/> My trips</button></header>
 <main><div className="page-heading"><div><div className="eyebrow">THE NEXT CHAPTER</div><h1>Japan, your way<span>.</span></h1><p>Big-city energy. Quiet little discoveries. One thoughtful trip.</p></div><button className="button dark" onClick={openEdit} aria-label="Make it yours"><SlidersHorizontal size={17}/> Make it yours</button></div>
 <div className="trip-summary"><div><Plane/><span><small>FLYING FROM</small>{p.origin}</span></div><div><CalendarDays/><span><small>TIME IN JAPAN</small>{p.days} days · {p.days-1} nights</span></div><div><Wallet/><span><small>GROUP BUDGET</small>{euro(p.budget)} · {p.travellers} {p.travellers===1?"traveller":"travellers"}</span></div><button className="text-button" onClick={openEdit}>Edit trip <ArrowUpRight size={16}/></button></div>
 <div className="planner-grid"><section className="itinerary-pane"><Tabs value={tab} onValueChange={setTab}><TabsList className="main-tabs" variant="line"><TabsTrigger value="itinerary">Your itinerary</TabsTrigger><TabsTrigger value="budget">Budget breakdown</TabsTrigger><TabsTrigger value="essentials">Good to know</TabsTrigger></TabsList>
 <TabsContent value="itinerary"><div className="section-heading"><h2>{trip.name}</h2><span className="pill"><Sparkles size={13}/> Made for the curious</span></div>
 <div className="city-tabs">{CITIES.map((c,i)=><button aria-pressed={city===c} className={city===c?"active":""} onClick={()=>goCity(c)} key={c}><span>0{i+1}</span>{c}<small>{split[c]} {split[c]===1?"day":"days"}</small></button>)}</div>
 <div className="city-cover"><img src={CITY_INFO[city].image} alt={city==="Tokyo"?"Tokyo skyline":city==="Kyoto"?"Red torii gates at Fushimi Inari in Kyoto":"Dōtonbori at night in Osaka"}/><div className="cover-shade"/><div className="cover-copy"><span className="eyebrow">JAPAN / {String(CITIES.indexOf(city)+1).padStart(2,"0")}</span><h2>{city}</h2><p>{CITY_INFO[city].tagline}</p></div><span className="cover-stamp">日本</span></div>
 <div className="days-selector" aria-label="Choose a day">{trip.days.map((d,i)=>d.city===city&&<button key={d.day} aria-pressed={dayIndex===i} className={dayIndex===i?"active":""} onClick={()=>setDayIndex(i)}>Day {d.day}</button>)}</div>
 <div className="day-heading"><div className="day-number">{String(day.day).padStart(2,"0")}</div><div><h3>{dayIndex===0?"A gentle landing":dayIndex>0&&trip.days[dayIndex-1].city!==city?"A change of scenery":"A day of little discoveries"}</h3><p>{city} · {estimatedDayHours(day)}h suggested exploring, including local buffers</p></div><button className="icon-button" title="Show this day on the map" aria-label="Show this day on the map" onClick={()=>setMapMode("day")}><MapPin size={17}/></button></div>
 {dayIndex>0&&trip.days[dayIndex-1].city!==city&&<div className="transfer"><TrainFront size={18}/><div><strong>{trip.days[dayIndex-1].city} → {city}</strong><span>Travel day · extra time reserved for the transfer. Check live timetables.</span></div></div>}
 <div className="activity-list">{dayPlaces.map((a,i)=><article className="activity" key={a.id}><div className="timeline"><span>STOP {i+1}</span><i>{i+1}</i></div><div className="activity-card"><div className="activity-meta"><span className={"category-"+a.category.split(" ")[0].toLowerCase()}>{a.category}</span><small><Clock size={12}/> {a.hours} hours</small></div><h4>{a.name}</h4><p>{a.description}</p><div className="activity-footer"><span>{a.cost?euro(a.cost)+" est. / person":"No entry allowance"} · {a.area}</span><div className="card-actions"><button className="text-button" onClick={()=>setSwap({day:dayIndex,slot:i})}>Swap <RotateCcw size={13}/></button><button className="icon-button" onClick={()=>removePlace(i)} aria-label={"Remove "+a.name}><X size={15}/></button></div></div></div></article>)}</div>
 {!day.places.length&&<div className="empty-state"><Compass/><h3>A day to follow your curiosity</h3><p>No scheduled stops. Add one below or leave this day open.</p></div>}
 {day.places.length<4&&<button className="add-stop" onClick={()=>setSwap({day:dayIndex,slot:day.places.length})}><Plus size={16}/> Add a discovery</button>}
 <div className="stay-card"><BedDouble size={23}/><div><span className="eyebrow">A GOOD PLACE TO CALL HOME</span><h3>{CITY_INFO[city].area}</h3><p>{CITY_INFO[city].stay}</p><a href={"https://www.booking.com/searchresults.html?ss="+encodeURIComponent(city+", Japan")} target="_blank" rel="noreferrer">Explore stays in {city} <ExternalLink size={13}/></a></div></div>
 <div className="plan-actions"><button className="button dark" onClick={()=>{setName(trip.name);setSaveOpen(true);}}><Bookmark size={16}/> Save this trip</button><button className="button" onClick={exportTrip}><Download size={16}/> Export plan</button></div>
 <p className="fine-print">A flexible starting point, not a timed booking. Verify opening hours, accessibility and travel times. International travel days are additional.</p>
 </TabsContent>
 <TabsContent value="budget"><div className="section-heading"><h2>Every part of the adventure</h2><button className="text-button" onClick={openEdit}>Adjust costs <SlidersHorizontal size={15}/></button></div>
 <p className="intro-copy">A transparent estimate for {p.travellers} {p.travellers===1?"traveller":"travellers"}. Your choices, your numbers.</p>
 <div className={"budget-hero "+(over?"over":"")}><span>ESTIMATED TRIP TOTAL</span><strong>{euro(budget.total)}</strong><p>{over?euro(-remaining)+" over your budget":euro(remaining)+" left in your budget"}</p></div>
 <div className="cost-list">{details.map(d=><div className="cost-row" key={d.key}><d.icon size={20}/><div><h3>{d.label}</h3><p>{d.detail}</p></div><strong>{euro(budget[d.key])}</strong></div>)}</div>
 <div className="info-box"><strong>What these numbers mean</strong><p>Illustrative EUR planning allowances, not live prices. Flights and nightly rates are your inputs. One room is budgeted per two travellers. Meals are counted once, including market stops. Transport allows €130 per person for intercity travel plus €7 per day for local travel.</p><p>Shopping, insurance and special experiences are extra. Costs do not change automatically with dates or exchange rates.</p></div>
 <button className="button dark" onClick={openEdit}>Make the budget yours <ArrowRight size={16}/></button>
 </TabsContent>
 <TabsContent value="essentials"><h2>A little knowledge goes a long way</h2><p className="intro-copy">Useful starting points before you go. Always check the linked guidance for your dates.</p><div className="essentials-grid">
 {[{icon:Wifi,title:"Stay connected",text:"Compare an eSIM, physical SIM or pocket Wi-Fi. Check your phone’s compatibility, coverage and data allowance before buying.",href:"https://www.japan.travel/en/plan/",label:"Japan travel planning"},
 {icon:CreditCard,title:"Tap into the city",text:"IC cards can make local travel easier where the IC logo is shown. Intercity journeys may need separate tickets. Check the routes you will actually take before choosing a pass.",href:"https://www.japan.travel/en/plan/cashless-payments-in-japan/",label:"JNTO payment guidance"},
 {icon:TrainFront,title:"Move at your own pace",text:"Allow time for stations, luggage and transfers. Check routes and train times before committing to a busy travel day.",href:"https://kyoto.travel/en/getting-to",label:"Getting to Kyoto"},
 {icon:Heart,title:"Be a considerate guest",text:"Follow local signs, respect private streets and ask before photographing people. Leave room for other passengers and keep shared spaces comfortable.",href:"https://www.japan.travel/en/plan/",label:"Official visitor guidance"}].map(item=><article className="essential-card" key={item.title}><item.icon size={24}/><h3>{item.title}</h3><p>{item.text}</p><a href={item.href} target="_blank" rel="noreferrer">{item.label}<ArrowUpRight size={14}/></a></article>)}</div>
 <div className="info-box"><strong>Before booking</strong><p>Check passport and entry requirements with official authorities, confirm opening hours, and arrange suitable insurance. These notes are general planning prompts.</p><small>Source links reviewed 16 September 2026.</small></div>
 <details className="credits"><summary>Photo credits & destination sources</summary><p>Photos: Joe Lewandowski (Tokyo), M338 (Kyoto), Sakai Yayoi (Osaka), via Wikimedia Commons. All CC0.</p><a target="_blank" rel="noreferrer" href="https://commons.wikimedia.org/wiki/File:Urban_Tokyo_panorama_(Unsplash).jpg">Tokyo photo</a> · <a target="_blank" rel="noreferrer" href="https://commons.wikimedia.org/wiki/File:Fushimi_Inari-taisha_sembon-torii.jpg">Kyoto photo</a> · <a target="_blank" rel="noreferrer" href="https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_yoru_00.jpg">Osaka photo</a><p>Destination guides: {CITIES.map(c=><a key={c} href={CITY_INFO[c].source} target="_blank" rel="noreferrer">{c} · </a>)}</p></details>
 </TabsContent></Tabs></section>
 <aside className="map-pane"><div className="map-heading"><div><Map size={17}/><strong>The bigger picture</strong></div><span>3 cities, endless stories</span></div><Tabs value={mapMode} onValueChange={setMapMode} className="map-tabs"><TabsList><TabsTrigger value="route">Whole trip</TabsTrigger><TabsTrigger value="day">Day {day.day}</TabsTrigger></TabsList></Tabs><TripMap city={mapMode==="day"?city:null} places={mapMode==="day"?dayPlaces:[]} onCity={goCity}/><div className="route-legend">{CITIES.map((c,i)=><span key={c}>{i>0&&<ArrowRight size={13}/>}<button onClick={()=>goCity(c)} className={city===c?"active":""}>{c}</button></span>)}</div>
 <div className={"budget-card "+(over?"over":"")}><div className="eyebrow">{over?"LET’S MAKE THE NUMBERS WORK":"ROOM FOR A LITTLE EXTRA"}</div><div className="budget-total">{euro(budget.total)} <span>/ {euro(p.budget)}</span></div><Progress className="budget-progress" value={Math.min(100,budget.total/p.budget*100)} aria-label="Estimated budget used"/><p>{!over&&<Check size={15}/>} {over?euro(-remaining)+" over budget":euro(remaining)+" left for little discoveries"}</p><small>Planning estimates, not live booking prices.</small><button className="text-button" onClick={()=>setTab("budget")}>See the breakdown <ArrowRight size={14}/></button></div>
 <div className="tip-card"><span>✳</span><p><strong>Leave a little room for getting lost.</strong>The best part of a trip isn’t always on the itinerary.</p></div></aside></div>
 <footer><span>tabi — less searching, more discovering.</span><span>Thoughtfully planned. Freely explored.</span></footer></main></div>

 <Dialog open={edit} onOpenChange={setEdit}><DialogContent className="trip-dialog"><DialogTitle>Make Japan your own</DialogTitle><DialogDescription>A few details to shape your adventure. Updating creates a fresh itinerary.</DialogDescription>
 <form onSubmit={e=>{e.preventDefault();const parsed=preferencesSchema.safeParse(draft);if(!parsed.success){setFormError(parsed.error.issues[0].message);return;}update(generateTrip(parsed.data));setEdit(false);toast.success("Your new itinerary is ready.");}} className="trip-form">
 <div className="form-grid"><label>Flying from<input maxLength={50} required value={draft.origin} onChange={e=>setDraft({...draft,origin:e.target.value})}/></label><div><label htmlFor="days">Days in Japan</label><Choice id="days" value={String(draft.days)} onChange={v=>setDraft({...draft,days:Number(v)})} options={Array.from({length:8},(_,i)=>({value:String(i+7),label:(i+7)+" days"}))}/></div>
 <div><label htmlFor="travellers">Travellers</label><Choice id="travellers" value={String(draft.travellers)} onChange={v=>setDraft({...draft,travellers:Number(v)})} options={Array.from({length:6},(_,i)=>({value:String(i+1),label:(i+1)+(i?" travellers":" traveller")}))}/></div><label>Total group budget (€)<input required type="number" min={100} max={100000} value={draft.budget} onChange={e=>setDraft({...draft,budget:Number(e.target.value)})}/></label></div>
 <fieldset><legend>What draws you in?</legend><div className="interest-options">{INTERESTS.map(i=><label key={i}><Checkbox checked={draft.interests.includes(i)} onCheckedChange={checked=>setDraft({...draft,interests:checked?[...draft.interests,i]:draft.interests.filter(x=>x!==i)})}/>{i}</label>)}</div></fieldset>
 <div className="form-grid"><div><label htmlFor="pace">Your pace</label><Choice id="pace" value={draft.pace} onChange={v=>setDraft({...draft,pace:v as Preferences["pace"]})} options={[{value:"relaxed",label:"Easy-going · up to 2 stops"},{value:"balanced",label:"Balanced · up to 3 stops"},{value:"full",label:"Make the most · up to 4"}]}/></div><div><label htmlFor="style">Trip style</label><Choice id="style" value={draft.style} onChange={v=>setDraft({...draft,style:v as Preferences["style"]})} options={STYLES.map(s=>({value:s.id,label:s.title}))}/></div></div>
 <details className="cost-inputs"><summary>Your cost assumptions</summary><p>Editable allowances, not live prices.</p><div className="form-grid"><label>Return / multi-city flight (€ / person)<input required type="number" min={0} max={20000} value={draft.flight} onChange={e=>setDraft({...draft,flight:Number(e.target.value)})}/></label><label>Room per night (€)<input required type="number" min={0} max={5000} value={draft.nightly} onChange={e=>setDraft({...draft,nightly:Number(e.target.value)})}/></label><label>Food per day (€ / person)<input required type="number" min={0} max={1000} value={draft.food} onChange={e=>setDraft({...draft,food:Number(e.target.value)})}/></label></div></details>
 {formError&&<p className="error-message" role="alert">{formError}</p>}<button type="submit" className="button dark full-width">Build my itinerary <Sparkles size={17}/></button></form>
 </DialogContent></Dialog>

 <Dialog open={!!swap} onOpenChange={open=>!open&&setSwap(null)}><DialogContent className="trip-dialog"><DialogTitle>{swap&&swap.slot<trip.days[swap.day].places.length?"A different kind of discovery":"Add a little discovery"}</DialogTitle><DialogDescription>Places in {swap?trip.days[swap.day].city:city} that fit the day and aren’t already in your trip.</DialogDescription><div className="swap-list">{candidates.map(a=><button className="swap-option" key={a.id} onClick={()=>{if(!swap)return;setTrip({...trip,days:trip.days.map((d,i)=>i===swap.day?{...d,places:d.places.map((id,s)=>s===swap.slot?a.id:id).concat(swap.slot===d.places.length?[a.id]:[])}:d)});setSwap(null);toast.success(a.name+" added to your day.");}}><span className="swap-icon"><MapPin size={19}/></span><div><strong>{a.name}</strong><span>{a.category} · {a.hours}h · {a.cost?euro(a.cost)+" entry est.":"No entry allowance"}</span></div><Plus size={17}/></button>)}
 {!candidates.length&&<div className="empty-state"><Compass/><h3>A little breathing room</h3><p>No unused places fit this day. Remove a stop or choose a different day.</p></div>}</div></DialogContent></Dialog>

 <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent><DialogTitle>Keep this adventure</DialogTitle><DialogDescription>{signedIn?"Save a snapshot of your itinerary and budget.":"Explore freely. Sign in when you’re ready to save your trip."}</DialogDescription>{signedIn?<form className="trip-form" onSubmit={e=>{e.preventDefault();void save();}}><label>Trip name<input required minLength={1} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="button dark full-width" disabled={busy||!name.trim()}>{busy?<Loader2 size={17} className="animate-spin"/>:<Bookmark size={17}/>} {busy?"Saving…":"Save trip"}</button></form>:<><a className="button dark" href={signInUrl} target="_top" onClick={signIn}>Sign in with ChatGPT <ArrowRight size={17}/></a><button className="button" onClick={exportTrip}><Download size={16}/> Export without signing in</button></>}</DialogContent></Dialog>

 <Dialog open={savedOpen} onOpenChange={setSavedOpen}><DialogContent className="trip-dialog"><DialogTitle>Your next chapters</DialogTitle><DialogDescription>Saved snapshots of your Japan adventures.</DialogDescription>{!signedIn?<div className="empty-state"><Bookmark/><h3>Your plans, all in one place</h3><p>Sign in to save trips and return to them later.</p><a className="button dark" href={signInUrl} target="_top" onClick={signIn}>Sign in with ChatGPT</a></div>:loading?<p role="status" className="loading-state"><Loader2 className="animate-spin" size={18}/> Loading your trips…</p>:savedError?<div role="alert" className="info-box"><p>{savedError}</p><button className="button" onClick={loadSaved}>Try again</button></div>:!saved.length?<div className="empty-state"><Compass/><h3>Your first adventure is waiting</h3><p>Save your current itinerary to find it here.</p><button className="button dark" onClick={()=>{setSavedOpen(false);setName(trip.name);setSaveOpen(true);}}>Save current trip</button></div>:<div className="saved-list">{saved.map(s=><article key={s.id}><img src="/images/kyoto.jpg" alt="Kyoto shrine gates"/><div><h3>{s.trip.name}</h3><p>{s.trip.preferences.days} days · {euro(calculateBudget(s.trip).total)} estimated</p><div><button className="text-button" onClick={()=>{update(s.trip);setSavedOpen(false);toast.success("Saved itinerary opened.");}}>Open trip <ArrowRight size={14}/></button><button className="icon-button" aria-label={"Delete "+s.trip.name} onClick={()=>setDeleteId(s.id)}><Trash2 size={16}/></button></div></div></article>)}</div>}</DialogContent></Dialog>
 <AlertDialog open={!!deleteId} onOpenChange={open=>!open&&setDeleteId(null)}><AlertDialogContent><AlertDialogTitle>Delete this saved trip?</AlertDialogTitle><AlertDialogDescription>This removes the saved snapshot. Your current open itinerary won’t change.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();if(deleteId)void removeSaved(deleteId);}}>Delete trip</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div>;
}
