const ROUTES_DATA_URL = "./routes_data.json?v=7";
const REALTIME_URL = "https://api-public.odpt.org/api/v4/gtfs/realtime/ToeiBus";
const STORAGE_KEY = "bus-routes-app.selected-route.v1";
const KOKUSAI_BUS_LOCATION_URL = "https://transfer.navitime.biz/5931bus/pc/map/Top?window=busLocation";
const KOKUSAI_TIMETABLE_URL = "https://transfer.navitime.biz/5931bus/pc/map/Top?window=transfer";

const EXTERNAL_ROUTE_PAIRS = [
  {
    pairId: "kokusai-aka53-tokiwadai-akabane-west",
    operator: "国際興業バス",
    routeShortName: "赤53",
    title: "ときわ台駅 ⇄ 赤羽駅西口",
    routes: [
      { id: "kokusai-aka53-tokiwadai-akabane-west", routeShortName: "赤53", origin: "ときわ台駅", destination: "赤羽駅西口", directionLabel: "赤羽駅西口方面" },
      { id: "kokusai-aka53-akabane-west-tokiwadai", routeShortName: "赤53", origin: "赤羽駅西口", destination: "ときわ台駅", directionLabel: "ときわ台駅方面" }
    ]
  },
  {
    pairId: "kokusai-aka51-57-nakacho-akabane-west",
    operator: "国際興業バス",
    routeShortName: "赤51・赤57",
    title: "仲町区民事務所 ⇄ 赤羽駅西口",
    routes: [
      { id: "kokusai-aka51-nakacho-akabane-west", routeShortName: "赤51", origin: "仲町区民事務所", destination: "赤羽駅西口", directionLabel: "赤羽駅西口方面" },
      { id: "kokusai-aka57-akabane-west-nakacho", routeShortName: "赤57", origin: "赤羽駅西口", destination: "仲町区民事務所", directionLabel: "日大病院方面・仲町区民事務所下車" }
    ]
  },
  {
    pairId: "kokusai-aka31-minamitokiwadai-akabane-east",
    operator: "国際興業バス",
    routeShortName: "赤31",
    title: "南常盤台 ⇄ 赤羽駅東口",
    routes: [
      { id: "kokusai-aka31-minamitokiwadai-akabane-east", routeShortName: "赤31", origin: "南常盤台", destination: "赤羽駅東口", directionLabel: "赤羽駅東口方面" },
      { id: "kokusai-aka31-akabane-east-minamitokiwadai", routeShortName: "赤31", origin: "赤羽駅東口", destination: "南常盤台", directionLabel: "高円寺駅北口方面・南常盤台下車" }
    ]
  },
  {
    pairId: "kokusai-ou54-oji-tokiwadai",
    operator: "国際興業バス",
    routeShortName: "王54",
    title: "王子駅 ⇄ ときわ台駅",
    routes: [
      { id: "kokusai-ou54-oji-tokiwadai", routeShortName: "王54", origin: "王子駅", destination: "ときわ台駅", directionLabel: "上板橋駅方面・ときわ台駅下車" },
      { id: "kokusai-ou54-tokiwadai-oji", routeShortName: "王54", origin: "ときわ台駅", destination: "王子駅", directionLabel: "王子駅方面" }
    ]
  },
  {
    pairId: "kokusai-ou54-oji5-tokiwadai",
    operator: "国際興業バス",
    routeShortName: "王54",
    title: "王子五丁目 ⇄ ときわ台駅",
    routes: [
      { id: "kokusai-ou54-oji5-tokiwadai", routeShortName: "王54", origin: "王子五丁目", destination: "ときわ台駅", directionLabel: "上板橋駅方面・ときわ台駅下車" },
      { id: "kokusai-ou54-tokiwadai-oji5", routeShortName: "王54", origin: "ときわ台駅", destination: "王子五丁目", directionLabel: "王子駅方面・王子五丁目下車" }
    ]
  },
  {
    pairId: "kokusai-aka51-ikebukuro-akabane-west",
    operator: "国際興業バス",
    routeShortName: "赤51",
    title: "池袋駅東口 ⇄ 赤羽駅西口",
    routes: [
      { id: "kokusai-aka51-ikebukuro-akabane-west", routeShortName: "赤51", origin: "池袋駅東口", destination: "赤羽駅西口", directionLabel: "赤羽駅西口方面" },
      { id: "kokusai-aka51-akabane-west-ikebukuro", routeShortName: "赤51", origin: "赤羽駅西口", destination: "池袋駅東口", directionLabel: "池袋駅東口方面" }
    ]
  },
  {
    pairId: "kokusai-hikari02-ikebukuro-shimozubashi",
    operator: "国際興業バス",
    routeShortName: "光02",
    title: "池袋駅東口 ⇄ 下頭橋",
    routes: [
      { id: "kokusai-hikari02-ikebukuro-shimozubashi", routeShortName: "光02", origin: "池袋駅東口", destination: "下頭橋", directionLabel: "光が丘駅方面・下頭橋下車" },
      { id: "kokusai-hikari02-shimozubashi-ikebukuro", routeShortName: "光02", origin: "下頭橋", destination: "池袋駅東口", directionLabel: "池袋駅東口方面" }
    ]
  }
];

const externalRoutesById = new Map();
for (const pair of EXTERNAL_ROUTE_PAIRS) {
  for (const route of pair.routes) {
    externalRoutesById.set(route.id, { ...route, pairId: pair.pairId, pairTitle: pair.title, operator: pair.operator });
  }
}

const state = {
  data: null,
  tripsById: new Map(),
  routesById: new Map(),
  calendarByService: new Map(),
  calendarDateMap: new Map(),
  realtime: null,
  selectedRoute: null,
  selectedExternalRoute: null,
  selectedDay: "weekday",
  currentTrips: [],
  selectedTrip: null
};

const $ = (id) => document.getElementById(id);

function sec(time) {
  if (typeof time === "number") return time;
  if (!time) return null;
  const [h, m, s = "0"] = String(time).split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function hhmm(total) {
  if (total == null || Number.isNaN(total)) return "--:--";
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function secondsOfDate(date = new Date()) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function nowSeconds() {
  return secondsOfDate(new Date());
}

function fmtClock(timestampMs) {
  return new Date(timestampMs).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function todayDayType() {
  const day = new Date().getDay();
  if (day === 0) return "holiday";
  if (day === 6) return "saturday";
  return "weekday";
}

function routeDisplay(route) {
  return `${route.origin} → ${route.destination}`;
}

async function clearLegacyServiceWorker() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("ou78-bus-")).map((key) => caches.delete(key)));
    }
  } catch (_) {
    // 古いキャッシュの削除に失敗しても通常利用は続ける。
  }
}

async function loadRoutesData() {
  const response = await fetch(ROUTES_DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("routes_data.json が見つかりません。build_routes_data.py を実行して作成したファイルをGitHubへアップロードしてください。");
  }

  const data = await response.json();
  if (!data.ok || !Array.isArray(data.routePairs) || !data.routePairs.length || !data.trips) {
    throw new Error("routes_data.json が未作成または不完全です。build_routes_data.py を実行して作り直してください。");
  }

  state.data = data;
  state.tripsById = new Map(Object.entries(data.trips));
  state.routesById = new Map();

  for (const pair of data.routePairs) {
    for (const route of pair.routes || []) {
      state.routesById.set(route.id, { ...route, pairId: pair.pairId, pairTitle: pair.title, operator: pair.operator });
    }
  }

  state.calendarByService = new Map((data.calendar || []).map((calendar) => [calendar.service_id, calendar]));
  state.calendarDateMap = new Map();
  for (const exception of data.calendarDates || []) {
    state.calendarDateMap.set(`${exception.service_id}:${exception.date}`, String(exception.exception_type));
  }
}

function serviceActive(serviceId, date = new Date()) {
  const key = dateKey(date);
  const exception = state.calendarDateMap.get(`${serviceId}:${key}`);
  if (exception) return exception === "1";

  const calendar = state.calendarByService.get(serviceId);
  if (!calendar) return false;
  if (key < calendar.start_date || key > calendar.end_date) return false;

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return String(calendar[dayNames[date.getDay()]]) === "1";
}

function serviceMatchesDayType(serviceId, type) {
  const calendar = state.calendarByService.get(serviceId);
  if (!calendar) return false;

  if (type === "weekday") {
    return ["monday", "tuesday", "wednesday", "thursday", "friday"].some((key) => String(calendar[key]) === "1");
  }
  if (type === "saturday") return String(calendar.saturday) === "1";
  if (type === "holiday") return String(calendar.sunday) === "1";
  return false;
}

function combineTrip(reference) {
  const base = state.tripsById.get(reference.trip_id);
  if (!base) return null;
  return {
    ...base,
    ...reference,
    depart: sec(reference.origin_departure_time)
  };
}

function tripsForRouteDay(route, type) {
  let trips = (route.tripRefs || []).map(combineTrip).filter(Boolean);

  if (type === "auto") {
    trips = trips.filter((trip) => serviceActive(trip.service_id));
  } else {
    trips = trips.filter((trip) => serviceMatchesDayType(trip.service_id, type));
  }

  trips.sort((a, b) => a.depart - b.depart);

  const byDeparture = new Map();
  for (const trip of trips) {
    const current = byDeparture.get(trip.depart);
    if (!current) {
      byDeparture.set(trip.depart, trip);
      continue;
    }

    const currentHasVehicle = Boolean(state.realtime?.map.get(current.trip_id));
    const candidateHasVehicle = Boolean(state.realtime?.map.get(trip.trip_id));
    if (!currentHasVehicle && candidateHasVehicle) byDeparture.set(trip.depart, trip);
  }

  return [...byDeparture.values()].sort((a, b) => a.depart - b.depart);
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
  if (!window.protobuf) throw new Error("車両位置の解析機能を読み込めませんでした");

  const response = await fetch(REALTIME_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`車両位置を取得できませんでした（${response.status}）`);

  const root = protobuf.parse(protoText).root;
  const FeedMessage = root.lookupType("transit_realtime.FeedMessage");
  const decoded = FeedMessage.decode(new Uint8Array(await response.arrayBuffer()));
  const feed = FeedMessage.toObject(decoded, { longs: Number, defaults: false });
  const map = new Map();

  for (const entity of feed.entity || []) {
    const vehicle = entity.vehicle;
    if (vehicle?.trip?.tripId) map.set(vehicle.trip.tripId, vehicle);
  }

  return {
    map,
    timestamp: feed.header?.timestamp ? feed.header.timestamp * 1000 : Date.now()
  };
}

function nearestStopIndex(trip, vehicle) {
  if (vehicle.currentStopSequence != null) {
    const sequence = Number(vehicle.currentStopSequence);
    const index = trip.stopTimes.findIndex((stop) => Number(stop.stop_sequence) === sequence);
    if (index >= 0) return index;
  }

  if (vehicle.stopId) {
    const index = trip.stopTimes.findIndex((stop) => stop.stop_id === vehicle.stopId);
    if (index >= 0) return index;
  }

  if (!vehicle.position) return null;

  let bestIndex = null;
  let bestDistance = Infinity;
  trip.stopTimes.forEach((stop, index) => {
    if (stop.stop_lat == null || stop.stop_lon == null) return;
    const latitudeDistance = Number(stop.stop_lat) - vehicle.position.latitude;
    const longitudeDistance = Number(stop.stop_lon) - vehicle.position.longitude;
    const distance = latitudeDistance * latitudeDistance + longitudeDistance * longitudeDistance;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function delayInfo(trip) {
  if (!serviceActive(trip.service_id)) {
    return { text: "時刻表のみ", cls: "unknown", vehicle: null, delay: null, currentIndex: null };
  }

  const vehicle = state.realtime?.map.get(trip.trip_id);
  if (!vehicle) {
    const text = nowSeconds() < trip.depart ? "運行開始前・未判定" : "位置情報なし";
    return { text, cls: "unknown", vehicle: null, delay: null, currentIndex: null };
  }

  const currentIndex = nearestStopIndex(trip, vehicle);
  if (currentIndex == null) {
    return { text: "位置取得中", cls: "unknown", vehicle, delay: null, currentIndex: null };
  }

  const stop = trip.stopTimes[currentIndex];
  const scheduled = sec(stop.arrival_time || stop.departure_time);
  if (scheduled == null) {
    return { text: "位置取得中", cls: "unknown", vehicle, delay: null, currentIndex };
  }

  const observedDate = vehicle.timestamp ? new Date(Number(vehicle.timestamp) * 1000) : new Date();
  const observed = secondsOfDate(observedDate);
  const differenceMinutes = Math.round((observed - scheduled) / 60);

  if (differenceMinutes > 90 || differenceMinutes < -30) {
    return { text: "位置確認中", cls: "unknown", vehicle, delay: null, currentIndex };
  }
  if (Math.abs(differenceMinutes) <= 1 || differenceMinutes < 0) {
    return { text: "ほぼ定刻", cls: "ok", vehicle, delay: differenceMinutes, currentIndex };
  }
  return { text: `約${differenceMinutes}分遅れ`, cls: "late", vehicle, delay: differenceMinutes, currentIndex };
}

function renderRoutePairs() {
  const lastRouteId = localStorage.getItem(STORAGE_KEY);
  const html = state.data.routePairs.map((pair) => {
    const directions = (pair.routes || []).map((route) => {
      const lastUsed = route.id === lastRouteId ? '<span class="last-used-badge">前回使用</span>' : "";
      const primaryClass = route.role === "primary" ? " primary" : "";
      return `
        <button class="route-direction-button${primaryClass}" type="button" data-route-id="${route.id}">
          <span class="route-direction-main">
            <span class="route-direction-name">${route.origin} → ${route.destination}${lastUsed}</span>
            <span class="route-direction-label">${route.directionLabel}</span>
          </span>
          <span class="route-direction-arrow">›</span>
        </button>`;
    }).join("");

    return `
      <article class="route-pair-card">
        <div class="route-pair-head">
          <span class="route-code">${pair.routeShortName}</span>
          <span class="route-operator">${pair.operator}</span>
        </div>
        <div class="route-pair-title">${pair.title}</div>
        <div class="route-direction-list">${directions}</div>
      </article>`;
  }).join("");

  $("routePairsList").innerHTML = html;
  document.querySelectorAll(".route-direction-button").forEach((button) => {
    button.addEventListener("click", () => selectRoute(button.dataset.routeId));
  });

  renderExternalRoutePairs();
}


function renderExternalRoutePairs() {
  const lastRouteId = localStorage.getItem(STORAGE_KEY);
  $("externalRoutesSection").classList.remove("hidden");
  $("externalRoutePairsList").innerHTML = EXTERNAL_ROUTE_PAIRS.map((pair) => {
    const directions = pair.routes.map((route, index) => {
      const lastUsed = lastRouteId === `external:${route.id}` ? '<span class="last-used-badge">前回使用</span>' : "";
      const primaryClass = index === 0 ? " primary" : "";
      return `
        <button class="route-direction-button external-direction-button${primaryClass}" type="button" data-external-route-id="${route.id}">
          <span class="route-direction-main">
            <span class="route-direction-name">${route.origin} → ${route.destination}${lastUsed}</span>
            <span class="route-direction-label">${route.routeShortName}・${route.directionLabel}</span>
          </span>
          <span class="route-direction-arrow">›</span>
        </button>`;
    }).join("");

    return `
      <article class="route-pair-card external-pair-card">
        <div class="route-pair-head">
          <span class="route-code external-route-code">${pair.routeShortName}</span>
          <span class="route-operator">${pair.operator}</span>
        </div>
        <div class="route-pair-title">${pair.title}</div>
        <div class="route-direction-list">${directions}</div>
      </article>`;
  }).join("");

  document.querySelectorAll(".external-direction-button").forEach((button) => {
    button.addEventListener("click", () => selectExternalRoute(button.dataset.externalRouteId));
  });
}

function updateHeaderForExternalRoute(route) {
  $("headerEyebrow").textContent = `${route.operator} ${route.routeShortName}`;
  $("headerTitle").textContent = `${route.origin} → ${route.destination}`;
  $("routeListBtn").classList.remove("hidden");
  $("refreshBtn").classList.add("hidden");
  document.title = `${route.routeShortName} ${route.origin} → ${route.destination}`;
}

function selectExternalRoute(routeId, options = {}) {
  const route = externalRoutesById.get(routeId);
  if (!route) return;

  state.selectedRoute = null;
  state.selectedExternalRoute = route;
  state.selectedTrip = null;
  localStorage.setItem(STORAGE_KEY, `external:${route.id}`);

  $("routePickerPanel").classList.add("hidden");
  $("routeView").classList.add("hidden");
  $("externalRouteView").classList.remove("hidden");
  updateHeaderForExternalRoute(route);

  $("externalRouteCode").textContent = route.routeShortName;
  $("externalRouteTitle").textContent = `${route.origin} → ${route.destination}`;
  $("externalRouteDirection").textContent = route.directionLabel;
  $("externalOrigin").textContent = route.origin;
  $("externalDestination").textContent = route.destination;
  $("copyStatus").textContent = "";
  $("busLocationLink").href = KOKUSAI_BUS_LOCATION_URL;
  $("timetableSearchLink").href = KOKUSAI_TIMETABLE_URL;

  window.scrollTo({ top: 0, behavior: options.initial ? "auto" : "smooth" });
}

async function copyRouteText(kind) {
  const route = state.selectedExternalRoute;
  if (!route) return;
  const text = kind === "origin" ? route.origin : route.destination;
  const label = kind === "origin" ? "出発地" : "目的地";

  try {
    await navigator.clipboard.writeText(text);
    $("copyStatus").textContent = `${label}「${text}」をコピーしました。`;
  } catch (_) {
    $("copyStatus").textContent = `${label}：${text}`;
  }
}

function updateHeaderForPicker() {
  $("headerEyebrow").textContent = "バス時刻表";
  $("headerTitle").textContent = "ルートを選ぶ";
  $("routeListBtn").classList.add("hidden");
  $("refreshBtn").classList.add("hidden");
  document.title = "バス時刻表";
}

function updateHeaderForRoute(route) {
  $("headerEyebrow").textContent = `${route.operator} ${route.routeShortName}`;
  $("headerTitle").textContent = routeDisplay(route);
  $("routeListBtn").classList.remove("hidden");
  $("refreshBtn").classList.remove("hidden");
  document.title = `${route.routeShortName} ${routeDisplay(route)}`;
}

function showRoutePicker() {
  state.selectedTrip = null;
  state.selectedExternalRoute = null;
  $("routePickerPanel").classList.remove("hidden");
  $("routeView").classList.add("hidden");
  $("externalRouteView").classList.add("hidden");
  updateHeaderForPicker();
  renderRoutePairs();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function selectRoute(routeId, options = {}) {
  const route = state.routesById.get(routeId);
  if (!route) return;

  state.selectedRoute = route;
  state.selectedExternalRoute = null;
  state.selectedTrip = null;
  localStorage.setItem(STORAGE_KEY, route.id);

  $("routePickerPanel").classList.add("hidden");
  $("externalRouteView").classList.add("hidden");
  $("routeView").classList.remove("hidden");
  updateHeaderForRoute(route);
  showTab("next");
  window.scrollTo({ top: 0, behavior: options.initial ? "auto" : "smooth" });

  if (!state.realtime || options.reloadRealtime) {
    await refresh(false);
  } else {
    renderNext();
    renderTimetable();
    updateLastUpdatedText();
  }
}

function updateLastUpdatedText(realtimeError = false) {
  const dataTime = state.data?.generatedAt || "";
  if (state.realtime && !realtimeError) {
    $("lastUpdated").textContent = `最終更新 ${fmtClock(state.realtime.timestamp)}／時刻表データ ${dataTime}`;
  } else {
    $("lastUpdated").textContent = `時刻表は取得済み／車両位置は取得できませんでした　${dataTime}`;
  }
}

function renderNext() {
  const route = state.selectedRoute;
  if (!route) return;

  const selectedTime = sec(`${$("timeInput").value}:00`);
  const trips = tripsForRouteDay(route, $("dayType").value)
    .filter((trip) => trip.depart >= selectedTime)
    .slice(0, 3);

  state.currentTrips = trips;

  if (!trips.length) {
    $("nextBuses").innerHTML = '<div class="loading">指定時刻以降の便がありません。</div>';
    return;
  }

  $("nextBuses").innerHTML = trips.map((trip, index) => {
    const info = delayInfo(trip);
    const stopCount = trip.destIndex - trip.originIndex;
    return `
      <button class="bus-card" type="button" data-trip-index="${index}">
        <div class="bus-top">
          <div>
            <div class="departure">${hhmm(trip.depart)}発</div>
            <div class="destination">${routeDisplay(route)}</div>
          </div>
          <div class="delay ${info.cls}">${info.text}</div>
        </div>
        <div class="bus-sub">${route.routeShortName}・${route.directionLabel}　${stopCount}区間 <span class="chevron">›</span></div>
      </button>`;
  }).join("");

  document.querySelectorAll(".bus-card").forEach((button) => {
    button.addEventListener("click", () => openTrip(Number(button.dataset.tripIndex)));
  });
}

function isTodayLikeView(type) {
  return type === "auto" || type === todayDayType();
}

function renderTimetable(type = state.selectedDay) {
  const route = state.selectedRoute;
  if (!route) return;

  state.selectedDay = type;
  document.querySelectorAll(".day-switch button").forEach((button) => {
    button.classList.toggle("active", button.dataset.day === type);
  });

  const trips = tripsForRouteDay(route, type);
  const grouped = new Map();
  trips.forEach((trip) => {
    const hour = Math.floor(trip.depart / 3600);
    const minute = Math.floor((trip.depart % 3600) / 60);
    if (!grouped.has(hour)) grouped.set(hour, []);
    grouped.get(hour).push({ minute, depart: trip.depart });
  });

  if (!grouped.size) {
    $("timetable").innerHTML = '<div class="loading">この運行日の時刻表がありません。</div>';
    return;
  }

  const todayView = isTodayLikeView(type);
  const nextDeparture = todayView ? trips.find((trip) => trip.depart >= nowSeconds())?.depart : null;

  $("timetable").innerHTML = [...grouped.entries()].map(([hour, minutes]) => `
    <div class="timetable-hour">
      <div class="hour">${String(hour).padStart(2, "0")}</div>
      <div class="minutes">${minutes.map((item) => {
        const pastClass = todayView && item.depart < nowSeconds() ? "past" : "";
        const nextClass = item.depart === nextDeparture ? "next" : "";
        return `<span class="minute ${pastClass} ${nextClass}">${String(item.minute).padStart(2, "0")}</span>`;
      }).join("")}</div>
    </div>`).join("");
}

function detailPositionText(trip, info) {
  if (info.currentIndex == null || !info.vehicle) return "現在位置はまだ取得できません。";

  const currentStop = trip.stopTimes[info.currentIndex];
  const currentName = currentStop?.stop_name || "現在地";

  if (info.currentIndex < trip.originIndex) {
    return `現在地：${currentName}付近。${state.selectedRoute.origin}へ向け走行中です。`;
  }
  if (info.currentIndex > trip.destIndex) {
    return `現在地：${currentName}付近。${state.selectedRoute.destination}を通過済みの可能性があります。`;
  }

  const remaining = Math.max(0, trip.destIndex - info.currentIndex);
  return `現在地：${currentName}付近。${state.selectedRoute.destination}まであと${remaining}停留所です。`;
}

function openTrip(index) {
  const trip = state.currentTrips[index];
  if (!trip || !state.selectedRoute) return;

  state.selectedTrip = trip;
  const info = delayInfo(trip);
  $("nextPanel").classList.add("hidden");
  $("timetablePanel").classList.add("hidden");
  $("detailPanel").classList.remove("hidden");
  document.querySelector(".tabs").classList.add("hidden");

  $("detailHeader").innerHTML = `
    <div class="detail-card">
      <div class="detail-title">${hhmm(trip.depart)}発　${info.text}</div>
      <div class="detail-meta">${routeDisplay(state.selectedRoute)}／${state.selectedRoute.routeShortName}・${state.selectedRoute.directionLabel}</div>
      <div class="detail-position">${detailPositionText(trip, info)}</div>
    </div>`;

  const segment = trip.stopTimes.slice(trip.originIndex, trip.destIndex + 1);
  const currentGlobalIndex = info.currentIndex;

  $("stopList").innerHTML = segment.map((stop, localIndex) => {
    const globalIndex = trip.originIndex + localIndex;
    let className = "";
    if (currentGlobalIndex != null) {
      if (globalIndex < currentGlobalIndex) className = "passed";
      else if (globalIndex === currentGlobalIndex) className = "current";
    }

    const marker = className === "current" ? '<span class="bus-marker">🚌 バスはこの停留所付近です</span>' : "";
    const scheduled = hhmm(sec(stop.arrival_time || stop.departure_time));
    return `
      <li class="stop-item ${className}">
        ${stop.stop_name || stop.stop_id}
        <span class="stop-time">予定 ${scheduled}</span>
        ${marker}
      </li>`;
  }).join("");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showTab(name) {
  $("detailPanel").classList.add("hidden");
  document.querySelector(".tabs").classList.remove("hidden");
  $("nextPanel").classList.toggle("hidden", name !== "next");
  $("timetablePanel").classList.toggle("hidden", name !== "timetable");
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  if (name === "timetable") renderTimetable();
}

async function refresh(reloadData = false) {
  try {
    $("refreshBtn").disabled = true;

    if (reloadData || !state.data) {
      await loadRoutesData();
      renderRoutePairs();
    }

    if (!state.selectedRoute) return;

    let realtimeError = false;
    try {
      state.realtime = await loadRealtime();
    } catch (_) {
      realtimeError = true;
      state.realtime = { map: new Map(), timestamp: Date.now() };
    }

    updateLastUpdatedText(realtimeError);
    renderNext();
    renderTimetable();
  } catch (error) {
    if (state.selectedRoute) {
      $("nextBuses").innerHTML = `<div class="error">${error.message}</div>`;
      $("lastUpdated").textContent = "読み込み失敗";
    } else {
      $("routePairsList").innerHTML = `<div class="error">${error.message}</div>`;
    }
  } finally {
    $("refreshBtn").disabled = false;
  }
}

async function init() {
  const now = new Date();
  $("timeInput").value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  $("dayType").value = "auto";
  state.selectedDay = todayDayType();

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });
  document.querySelectorAll(".day-switch button").forEach((button) => {
    button.addEventListener("click", () => renderTimetable(button.dataset.day));
  });
  $("backBtn").addEventListener("click", () => showTab("next"));
  $("routeListBtn").addEventListener("click", showRoutePicker);
  $("refreshBtn").addEventListener("click", () => refresh(false));
  $("copyOriginBtn").addEventListener("click", () => copyRouteText("origin"));
  $("copyDestinationBtn").addEventListener("click", () => copyRouteText("destination"));
  $("timeInput").addEventListener("change", renderNext);
  $("dayType").addEventListener("change", renderNext);

  clearLegacyServiceWorker();

  window.setInterval(() => {
    const routeIsVisible = !$("routeView").classList.contains("hidden");
    if (state.selectedRoute && routeIsVisible) refresh(false);
  }, 60000);

  try {
    await loadRoutesData();
    renderRoutePairs();

    const lastRouteId = localStorage.getItem(STORAGE_KEY);
    if (lastRouteId?.startsWith("external:")) {
      const externalId = lastRouteId.slice("external:".length);
      if (externalRoutesById.has(externalId)) {
        selectExternalRoute(externalId, { initial: true });
      } else {
        showRoutePicker();
      }
    } else if (lastRouteId && state.routesById.has(lastRouteId)) {
      await selectRoute(lastRouteId, { initial: true });
    } else {
      showRoutePicker();
    }
  } catch (error) {
    updateHeaderForPicker();
    $("routePairsList").innerHTML = `<div class="error">${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
