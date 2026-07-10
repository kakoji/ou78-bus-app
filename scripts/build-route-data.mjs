import fs from "node:fs/promises";
import AdmZip from "adm-zip";
const URL="https://api-public.odpt.org/api/v4/files/Toei/data/ToeiBus-GTFS.zip",ROUTE="王78",ORIGIN="南常盤台",DEST="王子五丁目",HEADS=["王子駅前","王子"];
const norm=v=>String(v||"").normalize("NFKC").replace(/[［\[].*?[］\]]/g,"").replace(/[＜<].*?[＞>]/g,"").replace(/[（）()]/g,"").replace(/\s+/g,"").trim();
const has=(v,t)=>norm(v).includes(norm(t));
function csv(text){const rows=[];let row=[],f="",q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c=='"'&&text[i+1]=='"'){f+='"';i++}else if(c=='"')q=false;else f+=c}else{if(c=='"')q=true;else if(c==","){row.push(f);f=""}else if(c=="\n"){row.push(f.replace(/\r$/,""));rows.push(row);row=[];f=""}else f+=c}}if(f.length||row.length){row.push(f);rows.push(row)}const h=rows.shift().map(x=>x.trim());return rows.filter(r=>r.some(v=>v!=="")).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]??""])))} 
function sec(t){const[a,b,c="0"]=String(t).split(":").map(Number);return a*3600+b*60+c}
function hhmm(s){const h=Math.floor(s/3600)%24,m=Math.floor((s%3600)/60);return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`}
function day(c){if(["monday","tuesday","wednesday","thursday","friday"].some(k=>c[k]=="1"))return"weekday";if(c.saturday=="1")return"saturday";if(c.sunday=="1")return"holiday";return"unknown"}
const res=await fetch(URL);if(!res.ok)throw new Error(`download failed ${res.status}`);
const zip=new AdmZip(Buffer.from(await res.arrayBuffer()));
const read=n=>zip.getEntries().find(e=>e.entryName.endsWith(n)).getData().toString("utf8");
const routes=csv(read("routes.txt")),trips=csv(read("trips.txt")),stops=csv(read("stops.txt")),stopTimes=csv(read("stop_times.txt")),calendar=csv(read("calendar.txt"));
const routeIds=new Set(routes.filter(r=>[r.route_short_name,r.route_long_name,r.route_id].some(v=>has(v,ROUTE))).map(r=>r.route_id));
const routeTrips=trips.filter(t=>routeIds.has(t.route_id)),tripIds=new Set(routeTrips.map(t=>t.trip_id)),stopById=new Map(stops.map(s=>[s.stop_id,s])),calByService=new Map(calendar.map(c=>[c.service_id,c]));
const byTrip=new Map();for(const st of stopTimes){if(!tripIds.has(st.trip_id))continue;if(!byTrip.has(st.trip_id))byTrip.set(st.trip_id,[]);byTrip.get(st.trip_id).push(st)}for(const list of byTrip.values())list.sort((a,b)=>Number(a.stop_sequence)-Number(b.stop_sequence));
let candidates=[];for(const trip of routeTrips){const list=byTrip.get(trip.trip_id)||[],oi=list.findIndex(x=>norm(stopById.get(x.stop_id)?.stop_name)===norm(ORIGIN)||has(stopById.get(x.stop_id)?.stop_name,ORIGIN)),di=list.findIndex(x=>norm(stopById.get(x.stop_id)?.stop_name)===norm(DEST)||has(stopById.get(x.stop_id)?.stop_name,DEST)),head=!trip.trip_headsign||HEADS.some(h=>has(trip.trip_headsign,h));if(oi>=0&&di>oi&&head)candidates.push({...trip,stopTimes:list,originIndex:oi,destIndex:di})}
if(!candidates.length){for(const trip of routeTrips){const list=byTrip.get(trip.trip_id)||[],oi=list.findIndex(x=>has(stopById.get(x.stop_id)?.stop_name,ORIGIN)),di=list.findIndex(x=>has(stopById.get(x.stop_id)?.stop_name,DEST));if(oi>=0&&di>oi)candidates.push({...trip,stopTimes:list,originIndex:oi,destIndex:di})}}
if(!candidates.length)throw new Error("target segment not found");
const sample=candidates[0],stopsOut=sample.stopTimes.slice(sample.originIndex,sample.destIndex+1).map(st=>{const s=stopById.get(st.stop_id);return{id:st.stop_id,name:s?.stop_name||st.stop_id,lat:Number(s?.stop_lat||0),lon:Number(s?.stop_lon||0)}});
const timetable={weekday:[],saturday:[],holiday:[]},seen={weekday:new Set(),saturday:new Set(),holiday:new Set()};
for(const trip of candidates){const c=calByService.get(trip.service_id);if(!c)continue;const type=day(c);if(!timetable[type])continue;const segment=trip.stopTimes.slice(trip.originIndex,trip.destIndex+1),departSec=sec(segment[0].departure_time);if(seen[type].has(departSec))continue;seen[type].add(departSec);timetable[type].push({tripId:trip.trip_id,depart:hhmm(departSec),departSec,stopTimes:segment.map(x=>hhmm(sec(x.arrival_time||x.departure_time)))})}
for(const k of Object.keys(timetable))timetable[k].sort((a,b)=>a.departSec-b.departSec);
await fs.writeFile("route-data.json",JSON.stringify({generatedAt:new Date().toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}),route:"王78",origin:ORIGIN,destination:DEST,stops:stopsOut,timetable},null,2));
console.log("route-data.json created");
