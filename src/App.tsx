import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Compass,
  Plane,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  DESTINATIONS,
  DESTINATION_IDS,
  ORIGINS,
  AIRPORTS,
  destinationFor,
  STAY_LEVELS,
} from "../shared/destinations";
import { DEFAULT_QUIZ, type Quiz, type Recommendation } from "../shared/recommendations";
import { calculateBudget, euro, type Trip } from "../shared/planner";
import * as api from "./api";
import TripQuiz from "./components/TripQuiz";
import TripDetail from "./components/TripDetail";

export default function App() {
  const [page, setPage] = useState<"home" | "quiz" | "results" | "trip">("home");
  const [quiz, setQuiz] = useState<Quiz>(DEFAULT_QUIZ),
    [options, setOptions] = useState<Recommendation[]>([]),
    [trip, setTrip] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [savedOpen, setSavedOpen] = useState(false),
    [saved, setSaved] = useState<api.SavedTrip[]>([]),
    [libraryError, setLibraryError] = useState(""),
    [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false),
    [name, setName] = useState(""),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = (next: typeof page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  async function generate() {
    setBusy(true);
    setError("");
    try {
      setOptions(await api.recommendations(quiz));
      navigate("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate options.");
    } finally {
      setBusy(false);
    }
  }
  async function library() {
    setSavedOpen(true);
    setLoading(true);
    setLibraryError("");
    try {
      setSaved(await api.listTrips());
    } catch (e) {
      setLibraryError(e instanceof Error ? e.message : "Could not load trips.");
    } finally {
      setLoading(false);
    }
  }
  async function save() {
    if (!trip) return;
    setBusy(true);
    try {
      await api.saveTrip({ ...trip, name: name.trim() });
      setTrip({ ...trip, name: name.trim() });
      setSaveOpen(false);
      toast.success("Trip saved to your library.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await api.deleteTrip(id);
      setSaved(saved.filter((s) => s.id !== id));
      setDeleteId(null);
      toast.success("Trip deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }
  const totalBudget = quiz.budget * (quiz.budgetMode === "person" ? quiz.travellers : 1);
  return (
    <>
      <Toaster />
      <header className="topbar">
        <button className="brand" aria-label="Tabi home" onClick={() => navigate("home")}>
          tabi<span>●</span>
        </button>
        <span className="brand-caption">LESS SEARCHING. MORE GOING.</span>
        <nav>
          <button className={page === "home" ? "nav-active" : ""} onClick={() => navigate("home")}>
            Explore
          </button>
          <button onClick={library}>
            <Bookmark size={16} /> My trips
          </button>
        </nav>
      </header>
      <main>
        {page === "home" && (
          <>
            <section className="home-hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span className="tiny-dot" /> A LITTLE CURIOSITY GOES A LONG WAY
                </p>
                <h1>
                  The world is calling.
                  <br />
                  <em>Find your kind of trip.</em>
                </h1>
                <p>
                  Tell us where you dream of going and what you want to spend. We’ll connect the
                  places, the stays and the numbers.
                </p>
                <div className="hero-proof">
                  <span>
                    <Check size={15} /> A budget that adds up
                  </span>
                  <span>
                    <Check size={15} /> A route that feels like you
                  </span>
                </div>
              </div>
              <div className="travel-art" aria-hidden="true">
                <div className="art-orbit" />
                <div className="art-sun" />
                <div className="art-ticket">
                  <small>YOUR NEXT CHAPTER</small>
                  <div>
                    <b>{AIRPORTS[quiz.origin]}</b>
                    <Plane size={26} />
                    <b>{destinationFor(quiz.destination).airports[0]}</b>
                  </div>
                  <span>A little less planning. A lot more possibility.</span>
                  <div className="ticket-rule" />
                  <strong>
                    {destinationFor(quiz.destination).name}
                    <i>→</i>
                  </strong>
                </div>
                <div className="art-stamp">
                  GO
                  <br />
                  SOMEWHERE
                  <br />
                  <b>good.</b>
                </div>
              </div>
            </section>
            <form
              className="journey-search"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");
                navigate("quiz");
              }}
            >
              <label>
                <span>
                  <Plane size={14} /> FLYING FROM
                </span>
                <select
                  aria-label="Departure city"
                  value={quiz.origin}
                  onChange={(e) => setQuiz({ ...quiz, origin: e.target.value as Quiz["origin"] })}
                >
                  {ORIGINS.map((o) => (
                    <option key={o} value={o}>
                      {o} ({AIRPORTS[o]})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  <Compass size={14} /> DREAMING OF
                </span>
                <select
                  aria-label="Destination country"
                  value={quiz.destination}
                  onChange={(e) =>
                    setQuiz({ ...quiz, destination: e.target.value as Quiz["destination"] })
                  }
                >
                  {DESTINATION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {DESTINATIONS[id].name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" type="submit">
                Build my trip <ArrowRight size={18} />
              </button>
            </form>
            <section className="destinations-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">GOOD PLACES TO BEGIN</p>
                  <h2>Where will your curiosity take you?</h2>
                </div>
                <span>3 countries. Plenty of possibilities.</span>
              </div>
              <div className="destination-grid">
                {DESTINATION_IDS.map((id, i) => {
                  const d = DESTINATIONS[id];
                  return (
                    <button
                      key={id}
                      className={"destination-card " + id}
                      onClick={() => {
                        setQuiz({ ...quiz, destination: id });
                        setError("");
                        navigate("quiz");
                      }}
                    >
                      <div className="destination-art">
                        {id === "japan" ? (
                          <img src="/images/kyoto.jpg" alt="Shrine gates in Kyoto" />
                        ) : (
                          <div className={"city-illustration " + id} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                            <span />
                            <i />
                          </div>
                        )}
                        <span className="country-label">
                          0{i + 1} / {d.symbol}
                        </span>
                        <span className="card-arrow">
                          <ArrowUpRight size={20} />
                        </span>
                      </div>
                      <div className="destination-copy">
                        <h3>{d.name}</h3>
                        <p>{d.tagline}</p>
                        <small>{d.cities.join(" · ")}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="how-it-works">
              <div>
                <span>01</span>
                <h3>Start with you</h3>
                <p>Your dates, your people, your interests.</p>
              </div>
              <div>
                <span>02</span>
                <h3>See what fits</h3>
                <p>Compare routes and automatically estimated costs.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Make it happen</h3>
                <p>Adjust, save and check real offers before booking.</p>
              </div>
            </section>
          </>
        )}
        {page === "quiz" && (
          <TripQuiz
            value={quiz}
            onChange={setQuiz}
            onBack={() => navigate("home")}
            onSubmit={generate}
            busy={busy}
            error={error}
          />
        )}
        {page === "results" && (
          <section className="results-page">
            <button className="text-button" onClick={() => navigate("quiz")}>
              <ArrowLeft size={16} /> Change answers
            </button>
            <div className="results-intro">
              <p className="eyebrow">THOUGHTFULLY MATCHED TO YOU</p>
              <h1>
                Three ways to meet <em>{destinationFor(quiz.destination).name}.</em>
              </h1>
              <p>
                {quiz.origin} → {destinationFor(quiz.destination).name} · {quiz.days} days ·{" "}
                {quiz.travellers} adult{quiz.travellers > 1 ? "s" : ""} · {euro(totalBudget)} group
                budget
              </p>
            </div>
            <div className="estimate-banner">
              <Sparkles size={19} />
              <div>
                <b>Calculated for you, with room for reality.</b>
                <p>
                  Editorial estimates, not live offers. Flights use your departure city and season;
                  stays adjust to the available budget. Every total includes a 10% buffer.
                </p>
              </div>
            </div>
            <div className="option-grid">
              {options.map((o, i) => {
                const b = calculateBudget(o.trip),
                  fits = b.total <= totalBudget;
                return (
                  <article className={"option-card " + (i === 1 ? "featured" : "")} key={o.id}>
                    <div className="option-top">
                      <span className="eyebrow">OPTION 0{i + 1}</span>
                      {i === 1 && <span className="pill">Interest-led</span>}
                    </div>
                    <h2>{o.title}</h2>
                    <p>{o.description}</p>
                    <div className="option-price">
                      <strong>{euro(b.total)}</strong>
                      <span>
                        estimated for your group
                        <br />
                        {euro(Math.round(b.total / quiz.travellers))} per person
                      </span>
                    </div>
                    <p className={"budget-status " + (!fits ? "over" : "")}>
                      {fits ? <Check size={16} /> : <WalletIcon />}
                      {fits
                        ? euro(totalBudget - b.total) + " left in your budget"
                        : euro(b.total - totalBudget) + " above your budget"}
                    </p>
                    <div className="option-route">
                      {destinationFor(o.trip.preferences.destination).cities.join(" → ")}
                    </div>
                    <ul className="option-facts">
                      <li>
                        <b>Stay</b>
                        <span>{STAY_LEVELS[o.trip.preferences.stayLevel ?? 0]}</span>
                      </li>
                      <li>
                        <b>Rooms</b>
                        <span>
                          {b.rooms} × {b.nights} nights
                        </span>
                      </li>
                      <li>
                        <b>Food</b>
                        <span>{euro(o.trip.preferences.food)} / person / day</span>
                      </li>
                      <li>
                        <b>Highlights</b>
                        <span>{o.trip.days.flatMap((d) => d.places).length} planned stops</span>
                      </li>
                    </ul>
                    {!fits && (
                      <p className="small-warning">
                        Basic costs exceed this budget. Try fewer days, a bigger budget or another
                        destination.
                      </p>
                    )}
                    <button
                      className={i === 1 ? "primary wide" : "secondary wide"}
                      onClick={() => {
                        setTrip(o.trip);
                        navigate("trip");
                      }}
                    >
                      Explore this trip <ArrowRight size={17} />
                    </button>
                  </article>
                );
              })}
            </div>
            <p className="footnote">
              If your budget only supports simple stays, multiple options may share that room
              category. We never invent cheaper availability.
            </p>
          </section>
        )}
        {page === "trip" && trip && (
          <TripDetail
            trip={trip}
            onChange={setTrip}
            onBack={() => navigate(options.length ? "results" : "home")}
            onSave={() => {
              setName(trip.name);
              setSaveOpen(true);
            }}
          />
        )}
      </main>
      <footer>
        <span className="brand">
          tabi<span>●</span>
        </span>
        <p>Thoughtfully planned. Freely explored.</p>
        <span>Estimates, not bookings.</span>
      </footer>
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogTitle>Keep this adventure</DialogTitle>
          <DialogDescription>
            Save a snapshot of this itinerary and its estimates.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Trip name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="primary wide" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Save trip"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent className="library-dialog">
          <DialogTitle>Your next chapters</DialogTitle>
          <DialogDescription>
            Saved trip snapshots. Reopen a plan whenever you like.
          </DialogDescription>
          {loading ? (
            <p>Loading your trips…</p>
          ) : libraryError ? (
            <div role="alert">
              <p>{libraryError}</p>
              <button className="secondary" onClick={library}>
                Try again
              </button>
            </div>
          ) : !saved.length ? (
            <div className="empty-state">
              <Bookmark />
              <h3>Your next chapter is unwritten.</h3>
              <p>Build a trip, then save it here.</p>
            </div>
          ) : (
            <div className="saved-list">
              {saved.map((s) => (
                <article key={s.id}>
                  <div>
                    <small>
                      {destinationFor(s.trip.preferences.destination).name} ·{" "}
                      {s.trip.preferences.days} days
                    </small>
                    <h3>{s.trip.name}</h3>
                    <p>{euro(calculateBudget(s.trip).total)} estimated</p>
                  </div>
                  {deleteId === s.id ? (
                    <div>
                      <p>Delete this saved trip?</p>
                      <button disabled={busy} className="danger" onClick={() => remove(s.id)}>
                        Delete
                      </button>
                      <button className="text-button" onClick={() => setDeleteId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="saved-actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          setTrip(s.trip);
                          setSavedOpen(false);
                          navigate("trip");
                        }}
                      >
                        Open trip
                      </button>
                      <button
                        className="icon-button"
                        aria-label={"Delete " + s.trip.name}
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function WalletIcon() {
  return <span aria-hidden="true">!</span>;
}
