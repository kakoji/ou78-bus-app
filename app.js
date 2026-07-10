
const STATIC_URL = "https://api-public.odpt.org/api/v4/files/Toei/data/ToeiBus-GTFS.zip";
const REALTIME_URL = "https://api-public.odpt.org/api/v4/gtfs/realtime/ToeiBus";

const state = {
  gtfs: null,
  realtime: null,
  selectedDay: "weekday",
  currentTrips: [],
  selectedTrip: null
};

const $ = (id) => document.getElementById(id);

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(v => v !== "")).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

function decodeFile(files, name) {
  const key = Object.keys(files).find(k => k.endsWith(name));
  if (!key) throw new Error(`${name} が見つかりません`);
  return new TextDecoder("utf-8").decode(files[key]);
}

function sec(time) {
  if (!time) return null;
  const [h, m, s = "0"] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}
function hhmm(total) {
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function nowSeconds() {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}
function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString("ja-JP", {hour:"2-digit", minute:"2-digit", second:"2-digit"});
}
function dateKey(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

async function loadGTFS() {
  const res = await fetch(STATIC_URL, {cache: "no-store"});
  if (!res.ok) throw new Error(`時刻表データを取得できませんでした（${res.status}）`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const files = fflate.unzipSync(bytes);
  const data = {
    routes: parseCSV(decodeFile(files, "routes.txt")),
    trips: parseCSV(decodeFile(files, "trips.txt")),
    stops: parseCSV(decodeFile(files, "stops.txt")),
    stopTimes: parseCSV(decodeFile(files, "stop_times.txt")),
    calendar: parseCSV(decodeFile(files, "calendar.txt")),
    calendarDates: Object.keys(files).some(k => k.endsWith("calendar_dates.txt"))
      ? parseCSV(decodeFile(files, "calendar_dates.txt")) : []
  };
  prepareRoute(data);
  return data;
}

function prepareRoute(data) {
  const routeIds = new Set(data.routes.filter(r => (r.route_short_name || "").replace(/\s/g,"") === "王78").map(r => r.route_id));
  const routeTrips = data.trips.filter(t => routeIds.has(t.route_id));
  const tripIds = new Set(routeTrips.map(t => t.trip_id));
  const st = data.stopTimes.filter(s => tripIds.has(s.trip_id));
  const byTrip = new Map();
  st.forEach(s => {
    if (!byTrip.has(s.trip_id)) byTrip.set(s.trip_id, []);
    byTrip.get(s.trip_id).push(s);
  });
  byTrip.forEach(list => list.sort((a,b) => Number(a.stop_sequence)-Number(b.stop_sequence)));

  const stopById = new Map(data.stops.map(s => [s.stop_id, s]));
  const candidates = [];
  for (const trip of routeTrips) {
    const list = byTrip.get(trip.trip_id) || [];
    const oi = list.findIndex(x => (stopById.get(x.stop_id)?.stop_name || "") === "南常盤台");
    const di = list.findIndex(x => (stopById.get(x.stop_id)?.stop_name || "") === "王子五丁目");
    if (oi >= 0 && di > oi) candidates.push({...trip, stopTimes: list, originIndex: oi, destIndex: di});
  }
  if (!candidates.length) throw new Error("王78の「南常盤台 → 王子五丁目」を公式データから特定できませんでした。");

  data.routeTrips = candidates;
  data.stopById = stopById;
  data.tripById = new Map(candidates.map(t => [t.trip_id, t]));
  data.calendarByService = new Map(data.calendar.map(c => [c.service_id, c]));
}

function serviceDayType(serviceId) {
  const c = state.gtfs.calendarByService.get(serviceId);
  if (!c) return "unknown";
  const weekdays = ["monday","tuesday","wednesday","thursday","friday"].map(k => c[k] === "1");
  if (weekdays.some(Boolean)) return "weekday";
  if (c.saturday === "1") return "saturday";
  if (c.sunday === "1") return "holiday";
  return "unknown";
}

function serviceActive(serviceId, date = new Date()) {
  const key = dateKey(date);
  const exception = state.gtfs.calendarDates.find(x => x.service_id === serviceId && x.date === key);
  if (exception) return exception.exception_type === "1";
  const c = state.gtfs.calendarByService.get(serviceId);
  if (!c || key < c.start_date || key > c.end_date) return false;
  const names = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  return c[names[date.getDay()]] === "1";
}

function tripsForDay(type) {
  let trips = state.gtfs.routeTrips;
  if (type === "auto") trips = trips.filter(t => serviceActive(t.service_id));
  else trips = trips.filter(t => serviceDayType(t.service_id) === type);
  const unique = new Map();
  for (const t of trips) {
    const depart = sec(t.stopTimes[t.originIndex].departure_time);
    const key = `${depart}`;
    if (!unique.has(key)) unique.set(key, {...t, depart});
  }
  return [...unique.values()].sort((a,b) => a.depart-b.depart);
}

const protoText = `
syntax = "proto2";
package transit_realtime;
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; optional uint64 timestamp = 3; }
message FeedEntity { required string id = 1; optional VehiclePosition vehicle = 4; }
message TripDescriptor { optional string trip_id = 1; optional string route_id = 5; }
message VehicleDescriptor { optional string id = 1; optional string label = 2; }
message Position { required float latitude = 1; required float longitude = 2; optional float bearing = 3; optional double odometer = 4; optional float speed = 5; }
message VehiclePosition {
  optional TripDescriptor trip = 1;
  optional Position position = 2;
  optional uint32 current_stop_sequence = 3;
  optional string stop_id = 7;
  optional uint64 timestamp = 5;
  optional VehicleDescriptor vehicle = 8;
}
`;

async function loadRealtime() {
  const res = await fetch(REALTIME_URL, {cache:"no-store"});
  if (!res.ok) throw new Error(`車両位置を取得できませんでした（${res.status}）`);
  const root = protobuf.parse(protoText).root;
  const FeedMessage = root.lookupType("transit_realtime.FeedMessage");
  const decoded = FeedMessage.decode(new Uint8Array(await res.arrayBuffer()));
  const obj = FeedMessage.toObject(decoded, {longs:Number, defaults:false});
  const map = new Map();
  (obj.entity || []).forEach(e => {
    const v = e.vehicle;
    if (v?.trip?.tripId) map.set(v.trip.tripId, v);
  });
  return {map, timestamp: obj.header?.timestamp ? obj.header.timestamp * 1000 : Date.now()};
}

function nearestStopIndex(trip, vehicle) {
  if (vehicle.currentStopSequence != null) {
    const n = Number(vehicle.currentStopSequence);
    const idx = trip.stopTimes.findIndex(s => Number(s.stop_sequence) === n);
    if (idx >= 0) return idx;
  }
  if (vehicle.stopId) {
    const idx = trip.stopTimes.findIndex(s => s.stop_id === vehicle.stopId);
    if (idx >= 0) return idx;
  }
  if (!vehicle.position) return null;
  let best = null, bestDist = Infinity;
  trip.stopTimes.forEach((st, i) => {
    const stop = state.gtfs.stopById.get(st.stop_id);
    if (!stop) return;
    const dy = Number(stop.stop_lat) - vehicle.position.latitude;
    const dx = Number(stop.stop_lon) - vehicle.position.longitude;
    const d = dx*dx + dy*dy;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

function delayInfo(trip) {
  const v = state.realtime?.map.get(trip.trip_id);
  if (!v) return {text:"運行開始前・未判定", cls:"unknown", vehicle:null, delay:null};
  const idx = nearestStopIndex(trip, v);
  if (idx == null) return {text:"位置取得中", cls:"unknown", vehicle:v, delay:null};
  const scheduled = sec(trip.stopTimes[idx].arrival_time || trip.stopTimes[idx].departure_time);
  if (scheduled == null) return {text:"位置取得中", cls:"unknown", vehicle:v, delay:null};
  let diff = Math.round((nowSeconds() - scheduled) / 60);
  if (Math.abs(diff) <= 1) return {text:"ほぼ定刻", cls:"ok", vehicle:v, delay:diff, currentIndex:idx};
  if (diff > 1) return {text:`約${diff}分遅れ`, cls:"late", vehicle:v, delay:diff, currentIndex:idx};
  return {text:"ほぼ定刻", cls:"ok", vehicle:v, delay:diff, currentIndex:idx};
}

function renderNext() {
  const type = $("dayType").value;
  const selected = sec($("timeInput").value + ":00");
  const trips = tripsForDay(type).filter(t => t.depart >= selected).slice(0,3);
  state.currentTrips = trips;
  if (!trips.length) {
    $("nextBuses").innerHTML = `<div class="loading">指定時刻以降の便がありません。</div>`;
    return;
  }
  $("nextBuses").innerHTML = trips.map((t,i) => {
    const info = delayInfo(t);
    const stopCount = t.destIndex - t.originIndex;
    return `<button class="bus-card" data-trip-index="${i}">
      <div class="bus-top">
        <div>
          <div class="departure">${hhmm(t.depart)}発</div>
          <div class="destination">南常盤台 → 王子五丁目</div>
        </div>
        <div class="delay ${info.cls}">${info.text}</div>
      </div>
      <div class="bus-sub">王78・王子駅前方面　${stopCount}区間 <span class="chevron">›</span></div>
    </button>`;
  }).join("");
  document.querySelectorAll(".bus-card").forEach(btn => btn.addEventListener("click", () => openTrip(Number(btn.dataset.tripIndex))));
}

function renderTimetable(type = state.selectedDay) {
  state.selectedDay = type;
  document.querySelectorAll(".day-switch button").forEach(b => b.classList.toggle("active", b.dataset.day === type));
  const trips = tripsForDay(type);
  const grouped = new Map();
  trips.forEach(t => {
    const h = Math.floor(t.depart / 3600);
    const m = Math.floor((t.depart % 3600) / 60);
    if (!grouped.has(h)) grouped.set(h, []);
    grouped.get(h).push(m);
  });
  const n = nowSeconds();
  $("timetable").innerHTML = [...grouped.entries()].map(([h,mins]) =>
    `<div class="timetable-hour"><div class="hour">${String(h).padStart(2,"0")}</div>
      <div class="minutes">${mins.map(m => {
        const s = h*3600+m*60;
        const cls = s < n ? "past" : (s >= n && s === trips.find(t => t.depart >= n)?.depart ? "next" : "");
        return `<span class="minute ${cls}">${String(m).padStart(2,"0")}</span>`;
      }).join("")}</div></div>`
  ).join("");
}

function openTrip(index) {
  const trip = state.currentTrips[index];
  if (!trip) return;
  state.selectedTrip = trip;
  const info = delayInfo(trip);
  $("nextPanel").classList.add("hidden");
  $("timetablePanel").classList.add("hidden");
  $("detailPanel").classList.remove("hidden");
  document.querySelector(".tabs").classList.add("hidden");

  $("detailHeader").innerHTML = `<div class="detail-card">
    <div class="detail-title">${hhmm(trip.depart)}発　${info.text}</div>
    <div class="detail-meta">南常盤台 → 王子五丁目／王78・王子駅前方面</div>
  </div>`;

  const segment = trip.stopTimes.slice(trip.originIndex, trip.destIndex + 1);
  const currentGlobal = info.currentIndex;
  $("stopList").innerHTML = segment.map((st, localIndex) => {
    const globalIndex = trip.originIndex + localIndex;
    const stop = state.gtfs.stopById.get(st.stop_id);
    let cls = "";
    if (currentGlobal != null) {
      if (globalIndex < currentGlobal) cls = "passed";
      else if (globalIndex === currentGlobal) cls = "current";
    }
    const marker = cls === "current" ? `<span class="bus-marker">🚌 バスはこの停留所付近です</span>` : "";
    return `<li class="stop-item ${cls}">${stop?.stop_name || st.stop_id}${marker}</li>`;
  }).join("");
}

function showTab(name) {
  $("detailPanel").classList.add("hidden");
  document.querySelector(".tabs").classList.remove("hidden");
  $("nextPanel").classList.toggle("hidden", name !== "next");
  $("timetablePanel").classList.toggle("hidden", name !== "timetable");
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  if (name === "timetable") renderTimetable();
}

async function refresh(all = false) {
  try {
    $("refreshBtn").disabled = true;
    if (all || !state.gtfs) state.gtfs = await loadGTFS();
    try {
      state.realtime = await loadRealtime();
      $("lastUpdated").textContent = `最終更新 ${fmtClock(state.realtime.timestamp)}`;
    } catch (e) {
      state.realtime = {map:new Map(), timestamp:Date.now()};
      $("lastUpdated").textContent = `時刻表は取得済み／車両位置は取得できませんでした`;
    }
    renderNext();
    renderTimetable();
  } catch (e) {
    $("nextBuses").innerHTML = `<div class="error">${e.message}<br><small>通信環境またはデータ提供元の状態を確認してください。</small></div>`;
    $("lastUpdated").textContent = "読み込み失敗";
  } finally {
    $("refreshBtn").disabled = false;
  }
}

function init() {
  const d = new Date();
  $("timeInput").value = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  $("dayType").value = "auto";

  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  document.querySelectorAll(".day-switch button").forEach(b => b.addEventListener("click", () => renderTimetable(b.dataset.day)));
  $("backBtn").addEventListener("click", () => showTab("next"));
  $("refreshBtn").addEventListener("click", () => refresh(false));
  $("timeInput").addEventListener("change", renderNext);
  $("dayType").addEventListener("change", renderNext);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
  refresh(true);
  setInterval(() => refresh(false), 60000);
}
document.addEventListener("DOMContentLoaded", init);
