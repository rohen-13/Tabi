"use client";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import { CITY_INFO, CITIES, type City, type Place } from "@/lib/places";
import "leaflet/dist/leaflet.css";
export default function TripMap({city,places,onCity}:{city:City|null;places:Place[];onCity:(city:City)=>void}){
 const el=useRef<HTMLDivElement>(null),map=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(false);
 const callback=useRef(onCity);callback.current=onCity;
 useEffect(()=>{let active=true; import("leaflet").then(L=>{
  if(!active||!el.current)return; const m=L.map(el.current,{scrollWheelZoom:false,attributionControl:true,zoomControl:true}).setView([35,137.2],6);map.current=m;
  let loaded=false;const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:18});
  tiles.on("tileload",()=>{loaded=true;setError(false)});tiles.on("tileerror",()=>{if(!loaded)setError(true)});tiles.addTo(m);layer.current=L.layerGroup().addTo(m);setReady(true);
  const observer=new ResizeObserver(()=>m.invalidateSize());observer.observe(el.current);(m as L.Map & {_tabiObserver?:ResizeObserver})._tabiObserver=observer;
 }).catch(()=>setError(true));
 return()=>{active=false;if(map.current){(map.current as L.Map & {_tabiObserver?:ResizeObserver})._tabiObserver?.disconnect();map.current.remove();map.current=null;}};
 },[]);
 useEffect(()=>{if(!ready||!map.current||!layer.current)return;import("leaflet").then(L=>{
 if(!map.current||!layer.current)return;const m=map.current,group=layer.current;group.clearLayers();
 const points: [number,number][]=[];
 if(city&&places.length){places.forEach((p,i)=>{const point:[number,number]=[p.lat,p.lng];points.push(point);const label=document.createElement("div");const title=document.createElement("strong");title.textContent=p.name;label.appendChild(title);const sub=document.createElement("p");sub.textContent=p.area;label.appendChild(sub);
 L.marker(point,{title:p.name,alt:p.name,icon:L.divIcon({className:"tabi-marker",html:'<span>'+(i+1)+'</span>',iconSize:[30,30],iconAnchor:[15,15]})}).bindPopup(label).addTo(group);});}
 else CITIES.forEach((c,i)=>{const p=CITY_INFO[c];points.push([p.lat,p.lng]);L.marker([p.lat,p.lng],{icon:L.divIcon({className:"tabi-marker city-marker",html:'<span>'+(i+1)+'</span><b>'+c+'</b>',iconSize:[30,30],iconAnchor:[15,15]})}).on("click",()=>callback.current(c)).addTo(group);});
 if(points.length>1)L.polyline(points,{color:"#d96642",weight:3,dashArray:"6 8",opacity:.85}).addTo(group);
 if(points.length===1)m.setView(points[0],13);else if(points.length>1)m.fitBounds(L.latLngBounds(points),{padding:[45,45],maxZoom:13});
 });},[ready,city,places]);
 return <div className="map-wrapper"><div ref={el} className="live-map" aria-label={city?city+" activity map":"Japan route map"}/>{error&&<div className="map-error">Map tiles are unavailable. Your route and places are still listed below.</div>}<div className="map-note">Dotted lines show stop order, not navigation.</div></div>;
}
