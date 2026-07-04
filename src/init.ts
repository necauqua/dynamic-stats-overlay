import mod from "@noita-ts/base";
import pollnet from "@noita-ts/pollnet";
import GLOBAL_STATS from "@noita-ts/ffi/global_stats";

const reactor = pollnet.Reactor();
const clients = new Set<pollnet.Socket>();

const buildPayload = () => {
  const streak = GLOBAL_STATS.session.streak;
  const endroomWins = GLOBAL_STATS.KEY_VALUE_STATS.get("progress_ending0") ?? 0;
  const altarWins = GLOBAL_STATS.KEY_VALUE_STATS.get("progress_ending1") ?? 0;
  return {
    deaths: GLOBAL_STATS.global.death_count,
    wins: endroomWins + altarWins,
    streak: GLOBAL_STATS.session.streak,
    record: Math.max(GLOBAL_STATS.highest.streak, streak),
  };
};

const broadcast = () => {
  if (clients.size === 0) {
    return;
  }
  const frame = `data: ${JSON.stringify(buildPayload())}\n\n`;
  for (const sock of clients) {
    sock.send(frame);
  }
};

let updates = 0;

const update = () => {
  reactor.update();
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
    #wins { --label: 'Wins: '; }
    #streak { --label: 'Streak: '; }
    #record { --label: 'PB: '; }
    .stat::before { content: var(--label); }
  </style>
  <div id="stats" class="stale">
    <span class="stat" id="deaths"></span>
    <span class="stat" id="wins"></span>
    <span class="stat" id="streak"></span>
    <span class="stat" id="record"></span>
  </div>
  <script>
    navigator.serviceWorker?.register("/sw.js");
    const render = (data) => {
      deaths.textContent = data.deaths;
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
const indexResp = `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${index.length}\r\nConnection: close\r\n\r\n${index}`;

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
const swResp = `HTTP/1.1 200 OK\r\nContent-Type: application/javascript\r\nContent-Length: ${sw.length}\r\nConnection: close\r\n\r\n${sw}`;

// rawdog some very basic http over raw tcp for nice single-port SSE
reactor.run_server(
  pollnet.listen_tcp(`127.0.0.1:${mod.settings.port}`),
  (sock) => {
    const reqList: string[] = [];

    let chunk: string | false = false;
    do {
      [chunk] = sock.await();
      if (!chunk) {
        sock.close();
        return;
      }
      reqList.push(chunk);
    } while (!chunk.includes("\r\n\r\n"));

    const req = reqList.join("");
    const [path] = string.match(req, "^GET (%S+)") ?? [];

    if (path === "/" || path === "/index.html") {
      sock.send(indexResp);
      sock.close();
    } else if (path === "/sw.js") {
      sock.send(swResp);
      sock.close();
    } else if (path === "/events") {
      // immediately send the initial payload there
      sock.send(
        `HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nConnection: keep-alive\r\n\r\ndata: ${JSON.stringify(buildPayload())}\n\n`,
      );
      clients.add(sock);
      // just wait for client to disconnect
      // no pings needed as we send something every 3s
      while (sock.await()[0]) {}
      clients.delete(sock);
      sock.close();
    } else {
      sock.send(
        "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
      );
      sock.close();
    }
  },
);
