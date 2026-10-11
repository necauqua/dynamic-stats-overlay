import mod from "@noita-ts/base";
import Scheduler from "@noita-ts/base/async";
import GLOBAL_STATS from "@noita-ts/ffi/global-stats";
import { EventChannel, HttpServer, Router } from "@noita-ts/http/server";

const channel = new EventChannel();

// The mod loads again for each new run, so this is the death count at the
// start of the current run: the runs counter changes when a new run starts,
// not when the player dies.
const runStartDeaths = GLOBAL_STATS.global.death_count;

const buildPayload = () => {
  const streak = GLOBAL_STATS.session.streak;
  const endroomWins = GLOBAL_STATS.KEY_VALUE_STATS.get("progress_ending0") ?? 0;
  const altarWins = GLOBAL_STATS.KEY_VALUE_STATS.get("progress_ending1") ?? 0;
  const deaths = GLOBAL_STATS.global.death_count;
  return {
    deaths,
    // not below zero, when the counter is reset after a death in this run
    runs: Math.max(0, runStartDeaths - (mod.settings.run_start_deaths ?? 0)),
    wins: endroomWins + altarWins,
    streak: GLOBAL_STATS.session.streak,
    record: Math.max(GLOBAL_STATS.highest.streak, streak),
  };
};

const broadcast = () => {
  if (channel.size() > 0) {
    channel.send(JSON.stringify(buildPayload()));
  }
};

let updates = 0;

const update = () => {
  if (updates++ % 180 == 0) {
    broadcast();
  }
};

mod.on("PlayerDied", broadcast);
mod.on("WorldPreUpdate", update);
mod.on("PausePreUpdate", update);

const index = `
  <style>
    #stats { display: flex; gap: 1em; transition: opacity 0.5s; }
    #stats.stale { opacity: 0; }
    #deaths { --label: 'Deaths: '; }
    #runs { --label: 'Runs: '; display: none; }
    #wins { --label: 'Wins: '; }
    #streak { --label: 'Streak: '; }
    #record { --label: 'PB: '; }
    .stat::before { content: var(--label); }
  </style>
  <div id="stats" class="stale">
    <span class="stat" id="deaths"></span>
    <span class="stat" id="runs"></span>
    <span class="stat" id="wins"></span>
    <span class="stat" id="streak"></span>
    <span class="stat" id="record"></span>
  </div>
  <script>
    navigator.serviceWorker?.register("/sw.js");
    const render = (data) => {
      deaths.textContent = data.deaths;
      runs.textContent = data.runs;
      wins.textContent = data.wins;
      streak.textContent = data.streak;
      record.textContent = data.record;
    };
    const last = localStorage.getItem("last");
    if (last) {
      render(JSON.parse(last));
    }
    const events = new EventSource("/events");
    events.onopen = () => stats.classList.remove("stale");
    events.onerror = () => stats.classList.add("stale");
    events.onmessage = (e) => {
      localStorage.setItem("last", e.data);
      render(JSON.parse(e.data));
    };
  </script>
`;

const sw = `
  self.addEventListener("install", (e) => {
    e.waitUntil(caches.open("cache").then((c) => c.addAll(["/"])));
    self.skipWaiting();
  });

  self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

  self.addEventListener("fetch", (e) => {
    if (new URL(e.request.url).pathname === "/events") {
      return;
    }
    e.respondWith(
      fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open("cache").then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match(e.request))
    );
  });
`;

const page = (body: string, type: string) => () => ({
  headers: { "Content-Type": type },
  body,
});

new HttpServer(
  Scheduler.get(),
  new Router()
    .get("/", page(index, "text/html"))
    .get("/index.html", page(index, "text/html"))
    .get("/sw.js", page(sw, "application/javascript"))
    .get("/events", () => {
      const stream = channel.open();
      // immediately send the initial payload there
      stream.send(JSON.stringify(buildPayload()));
      return stream.response();
    }),
  { port: mod.settings.port },
);
