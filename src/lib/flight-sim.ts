/**
 * flight-sim.ts — a TypeScript copy of the flight simulator's core (jovmarko11/flight-simulator-java):
 * Airplane (takeOff / redirect / update), FlightController (one takeoff per airport per 600 s)
 * and the order of work in SimulationEngine.onTick (launch, then move).
 *
 * Every arithmetic step is written the way the Java code writes it, so the doubles come out
 * bit-for-bit identical; this was checked against the Java classes on random scenarios with
 * random mid-flight redirects. No DOM here: used at build time by <FlightLegs> and <RunwayQueue>
 * and in the browser by scripts/flight-legs.ts.
 */

export interface Airport { code: string; x: number; y: number }
export interface Flight { from: string; to: string; dep: string; duration: number } // dep "HH:MM", duration in minutes
export type PlaneState = "WAITING" | "FLYING" | "LANDED";

export const TICK_SIM_SECONDS = 120; // SimulationClock: 200 ms of real time
export const RUNWAY_INTERVAL = 600; // FlightController

const distance = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x1 - x2, dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
};
const lerp = (a: number, b: number, t: number) => a + t * (b - a);
export const secondOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 3600 + m * 60;
};
export const formatSimTime = (now: number) => {
  const h = Math.floor(now / 3600) % 24, m = Math.floor((now % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export class Plane {
  state: PlaneState = "WAITING";
  startX: number; startY: number; startSimTime = 0;
  target: Airport; speed = 0;
  x: number; y: number;
  flight: Flight; from: Airport; to: Airport;

  constructor(flight: Flight, from: Airport, to: Airport) {
    this.flight = flight; this.from = from; this.to = to;
    this.startX = from.x; this.startY = from.y;
    this.x = this.startX; this.y = this.startY;
    this.target = to;
  }

  takeOff(now: number) {
    if (this.state !== "WAITING") return;
    this.state = "FLYING";
    this.startSimTime = now;
    const dist = distance(this.x, this.y, this.target.x, this.target.y);
    this.speed = dist / (this.flight.duration * 60);
  }

  redirect(dest: Airport, now: number): boolean {
    if (this.state === "FLYING") {
      this.startX = this.x; this.startY = this.y;
      this.startSimTime = now;
      this.target = dest;
      return true;
    }
    if (this.state === "WAITING") { this.target = dest; return true; }
    return false;
  }

  get heading() { return Math.atan2(this.target.y - this.startY, this.target.x - this.startX); }

  /** Returns true if the plane has just landed. */
  update(now: number): boolean {
    if (this.state !== "FLYING") return false;
    const traveled = this.speed * (now - this.startSimTime);
    const total = distance(this.startX, this.startY, this.target.x, this.target.y);
    if (traveled >= total) {
      this.x = this.target.x; this.y = this.target.y;
      this.state = "LANDED";
      return true;
    }
    const f = traveled / total;
    this.x = lerp(this.startX, this.target.x, f);
    this.y = lerp(this.startY, this.target.y, f);
    return false;
  }
}

export interface SimEvent { t: number; kind: "TAKEOFF" | "LANDED" | "REDIRECTED"; plane: number }
export interface Redirect { at: number; plane: number; to: string }

/**
 * The engine: planes sorted by departure time (stable, like List.sort), then for every tick
 * processTakeoffs() followed by update() on every plane. Redirects are applied after the tick
 * at time `at`, which is when a click lands in the real GUI (between two timer ticks).
 */
export class Sim {
  planes: Plane[];
  now = 0;
  events: SimEvent[] = [];
  private lastTakeoff = new Map<string, number>();
  private byCode: Map<string, Airport>;
  private redirects: Redirect[];

  constructor(airports: Airport[], flights: Flight[], redirects: Redirect[] = []) {
    this.redirects = redirects;
    this.byCode = new Map(airports.map((a) => [a.code, a]));
    this.planes = flights
      .map((f) => new Plane(f, this.byCode.get(f.from)!, this.byCode.get(f.to)!))
      .sort((a, b) => secondOfDay(a.flight.dep) - secondOfDay(b.flight.dep));
  }

  tick() {
    const now = (this.now += TICK_SIM_SECONDS);
    this.planes.forEach((a, i) => {
      if (a.state !== "WAITING") return;
      if (now < secondOfDay(a.flight.dep)) return;
      const last = this.lastTakeoff.get(a.flight.from);
      if (last !== undefined && now - last < RUNWAY_INTERVAL) return;
      a.takeOff(now);
      this.events.push({ t: now, kind: "TAKEOFF", plane: i });
      this.lastTakeoff.set(a.flight.from, now);
    });
    this.planes.forEach((a, i) => { if (a.update(now)) this.events.push({ t: now, kind: "LANDED", plane: i }); });
    for (const r of this.redirects)
      if (r.at === now && this.planes[r.plane].redirect(this.byCode.get(r.to)!, now))
        this.events.push({ t: now, kind: "REDIRECTED", plane: r.plane });
  }
}

/** The assignment's test data (data/test_data.csv in the repository). */
export const TEST_AIRPORTS: Airport[] = [
  { code: "LHR", x: 0, y: 51 }, { code: "JFK", x: -37, y: 41 }, { code: "CDG", x: 1, y: 49 },
  { code: "HND", x: 70, y: 36 }, { code: "DXB", x: 28, y: 25 }, { code: "SIN", x: 52, y: 1 },
  { code: "LAX", x: -59, y: 34 }, { code: "FRA", x: 4, y: 50 }, { code: "AMS", x: 3, y: 52 },
  { code: "IST", x: 15, y: 41 }, { code: "ATL", x: -42, y: 33 }, { code: "PEK", x: 58, y: 40 },
  { code: "SYD", x: 76, y: -34 }, { code: "GRU", x: -23, y: -23 }, { code: "YYZ", x: -40, y: 44 },
  { code: "BEG", x: 10, y: 45 },
];
const F = (s: string): Flight => {
  const [from, to, dep, d] = s.split(",");
  return { from, to, dep, duration: Number(d) };
};
export const TEST_FLIGHTS: Flight[] = [
  "LHR,JFK,08:30,420", "JFK,LAX,14:15,360", "LAX,HND,22:00,720", "HND,SIN,09:45,420", "SIN,DXB,13:30,420",
  "DXB,IST,18:20,300", "IST,FRA,09:10,180", "FRA,AMS,12:00,90", "AMS,CDG,15:15,80", "CDG,LHR,18:40,75",
  "ATL,JFK,07:00,150", "PEK,HND,11:30,240", "SYD,SIN,20:45,480", "GRU,ATL,23:10,600", "YYZ,LHR,21:30,420",
  "DXB,SYD,02:15,840", "LHR,DXB,10:00,420", "SIN,PEK,16:50,360", "AMS,IST,13:20,210", "JFK,YYZ,09:00,90",
  "BEG,IST,06:45,95", "BEG,FRA,13:20,120", "BEG,LHR,17:10,170", "DXB,BEG,11:30,330", "BEG,JFK,00:30,420",
  "BEG,FRA,00:30,120", "BEG,LHR,00:35,170",
].map(F);
