import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Download,
  Plane,
  BedDouble,
  Wallet,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import {
  calculateBudget,
  alternatives,
  euro,
  estimatedDayHours,
  type Trip,
} from "../../shared/planner";
import { placeById, type Place } from "../../shared/places";
import { destinationFor, seasonFactor } from "../../shared/destinations";
import { flightSuggestion, staySuggestions } from "../../shared/recommendations";
import TripMap from "./TripMap";

export default function TripDetail({
  trip,
  onChange,
  onBack,
  onSave,
}: {
  trip: Trip;
  onChange: (trip: Trip) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const [section, setSection] = useState("route"),
    [mapMode, setMapMode] = useState<"route" | "day">("route"),
    [dayIndex, setDayIndex] = useState(0),
    [swap, setSwap] = useState<{ day: number; slot: number } | null>(null),
    [method, setMethod] = useState(false);
  const p = trip.preferences,
    dest = destinationFor(p.destination),
    budget = calculateBudget(trip),
    flight = flightSuggestion(trip),
    stays = staySuggestions(trip);
  const day = trip.days[dayIndex] ?? trip.days[0],
    places = day.places.map(placeById).filter((x): x is Place => !!x);
  const choices = swap ? alternatives(trip, swap.day, swap.slot) : [];
  function remove(slot: number) {
    const previous = trip;
    onChange({
      ...trip,
      days: trip.days.map((d, i) =>
        i === dayIndex ? { ...d, places: d.places.filter((_, j) => j !== slot) } : d,
      ),
    });
    toast("Stop removed", { action: { label: "Undo", onClick: () => onChange(previous) } });
  }
  function exportPlan() {
    const lines = [
      trip.name,
      `${dest.name} | From ${p.origin} | ${p.days} days | ${p.travellers} adults`,
      `First destination day: ${p.startDate ?? "Not specified"}`,
      `Group estimate: ${euro(budget.total)} | Budget: ${euro(p.budget)}`,
      `Flight allowance: ${flight.origin} → ${flight.arrival}; ${flight.departure} → ${flight.origin}: ${euro(flight.total)}`,
      ...stays.map(
        (s) =>
          `Stay: ${s.city}, ${s.area}, ${s.type}, ${s.nights} nights × ${s.rooms} rooms: ${euro(s.total)}. ${s.url}`,
      ),
      "",
      ...trip.days.flatMap((d) => [
        `Day ${d.day} · ${d.city}`,
        ...d.places.map((id) => "- " + placeById(id)!.name),
        d.places.length ? "" : "Free time",
      ]),
      "",
      "Editorial estimates only; no bookings or live prices. Verify availability, opening times and transport. International travel days are additional.",
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabi-" + dest.id + "-plan.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const categories = [
    ["Flights", budget.flights],
    ["Accommodation", budget.stays],
    ["Food", budget.meals],
    ["Local & intercity transport", budget.transport],
    ["Activities", budget.activities],
    ["10% contingency", budget.buffer],
  ] as const;
  return (
    <section className="detail-page">
      <button className="text-button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to options
      </button>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER / {dest.name.toUpperCase()}</p>
          <h1>{trip.name}</h1>
          <p>
            {p.origin} → {dest.name} · {p.days} days · {p.travellers} adult
            {p.travellers > 1 ? "s" : ""}
            {p.startDate ? " · From " + p.startDate : ""}
          </p>
        </div>
        <div className="detail-actions">
          <button className="secondary" onClick={exportPlan}>
            <Download size={17} /> Export
          </button>
          <button className="primary" onClick={onSave}>
            <Bookmark size={17} /> Save trip
          </button>
        </div>
      </div>
      <div className="detail-summary">
        <div>
          <small>GROUP ESTIMATE</small>
          <strong>{euro(budget.total)}</strong>
        </div>
        <div>
          <small>PER PERSON</small>
          <strong>{euro(Math.round(budget.total / p.travellers))}</strong>
        </div>
        <div>
          <small>{budget.total <= p.budget ? "BUDGET REMAINING" : "ABOVE BUDGET"}</small>
          <strong className={budget.total > p.budget ? "over" : ""}>
            {euro(Math.abs(p.budget - budget.total))}
          </strong>
        </div>
        <button className="text-button" onClick={() => setMethod(true)}>
          <Info size={16} /> How we calculated this
        </button>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="Trip details">
        {[
          ["route", "Your itinerary", MapPin],
          ["travel", "Flights & stays", BedDouble],
          ["budget", "Budget breakdown", Wallet],
        ].map(([id, label, Icon]) => {
          const TabIcon = Icon as typeof MapPin;
          return (
            <button
              key={String(id)}
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(String(id))}
            >
              <TabIcon size={17} />
              {String(label)}
            </button>
          );
        })}
      </div>
      {section === "route" && (
        <div className="route-layout">
          <div>
            <div className="city-switch">
              {dest.cities.map((city) => (
                <button
                  key={city}
                  className={day.city === city ? "active" : ""}
                  onClick={() => setDayIndex(trip.days.findIndex((d) => d.city === city))}
                >
                  {city}
                  <small>{trip.days.filter((d) => d.city === city).length} days</small>
                </button>
              ))}
            </div>
            <div className="day-switch" aria-label="Choose a day">
              {trip.days.map(
                (d, i) =>
                  d.city === day.city && (
                    <button key={i} aria-pressed={dayIndex === i} onClick={() => setDayIndex(i)}>
                      Day {i + 1}
                    </button>
                  ),
              )}
            </div>
            <div className="day-heading">
              <div>
                <p className="eyebrow">
                  DAY {day.day} / {day.city.toUpperCase()}
                </p>
                <h2>
                  {dayIndex > 0 && trip.days[dayIndex - 1].city !== day.city
                    ? "A new city, a fresh chapter."
                    : "Follow your curiosity."}
                </h2>
              </div>
              <small>{estimatedDayHours(day)}h of exploring</small>
            </div>
            {dayIndex > 0 && trip.days[dayIndex - 1].city !== day.city && (
              <p className="transfer-note">
                Transfer from {trip.days[dayIndex - 1].city}: 3 hours reserved in your day. Check
                actual train times.
              </p>
            )}
            <div className="stops">
              {places.map((place, slot) => (
                <article className="stop-card" key={place.id}>
                  <span className="stop-number">{slot + 1}</span>
                  <div>
                    <small>
                      {place.category} · {place.hours}h
                    </small>
                    <h3>{place.name}</h3>
                    <p>{place.description}</p>
                    <span className="stop-cost">
                      {place.cost
                        ? euro(place.cost) + " entry allowance / person"
                        : "No entry allowance"}{" "}
                      · {place.area}
                    </span>
                    <div className="stop-actions">
                      <button
                        className="text-button"
                        onClick={() => setSwap({ day: dayIndex, slot })}
                      >
                        <RotateCcw size={14} /> Swap stop
                      </button>
                      <button
                        className="icon-button"
                        aria-label={"Remove " + place.name}
                        onClick={() => remove(slot)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!places.length && (
              <div className="empty-state">
                <h3>A little room to wander.</h3>
                <p>
                  No more unused places fit this day. Keep it free or move a stop from another day.
                </p>
              </div>
            )}
            <button
              className="add-stop"
              disabled={day.places.length >= 4}
              onClick={() => setSwap({ day: dayIndex, slot: day.places.length })}
            >
              <Plus size={16} /> Add a discovery
            </button>
            <p className="footnote">
              Approximate visit durations include 30 minutes between stops. Check opening times and
              travel times. Longer trips may include free days.
            </p>
          </div>
          <aside className="route-aside">
            <div className="section-heading">
              <h3>A little perspective</h3>
              <span>{day.city}</span>
            </div>
            <div className="map-switch" aria-label="Map view">
              <button aria-pressed={mapMode === "route"} onClick={() => setMapMode("route")}>
                Whole trip
              </button>
              <button aria-pressed={mapMode === "day"} onClick={() => setMapMode("day")}>
                Day {day.day}
              </button>
            </div>
            <TripMap
              city={mapMode === "day" ? day.city : null}
              cities={dest.cities}
              places={places}
              onCity={(c) => setDayIndex(trip.days.findIndex((d) => d.city === c))}
            />
            <div className="stay-peek">
              <BedDouble size={21} />
              <p className="eyebrow">WHERE TO STAY IN {day.city.toUpperCase()}</p>
              <h3>{stays.find((s) => s.city === day.city)?.area}</h3>
              <p>A suggested neighbourhood, not a specific hotel.</p>
              <button className="text-button" onClick={() => setSection("travel")}>
                See accommodation plan <ArrowUpRight size={15} />
              </button>
            </div>
            <a className="source-link" href={dest.source} target="_blank" rel="noreferrer">
              Official {dest.name} travel guide <ArrowUpRight size={15} />
            </a>
          </aside>
        </div>
      )}
      {section === "travel" && (
        <div className="travel-section">
          <div className="flight-card">
            <div>
              <p className="eyebrow">
                <Plane size={16} /> FLIGHT PLAN
              </p>
              <h2>
                {flight.origin} → {flight.arrival}
                <span className="flight-return">
                  {flight.departure} → {flight.origin}
                </span>
              </h2>
              <p>
                Arrive near {dest.cities[0]}, return from {dest.cities[2]}. This is an airport
                search plan, not a confirmed service.
              </p>
            </div>
            <div>
              <strong>{euro(flight.total)}</strong>
              <small>{euro(flight.perPerson)} per person · return-flight allowance</small>
              <a className="secondary" href={flight.url} target="_blank" rel="noreferrer">
                Check real flights <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">A GOOD PLACE TO COME HOME TO</p>
              <h2>Your accommodation plan</h2>
              <p>
                {budget.rooms} private room{budget.rooms > 1 ? "s" : ""} · {budget.nights} nights ·{" "}
                {euro(budget.stays)} estimated in total
              </p>
            </div>
          </div>
          <div className="stay-grid">
            {stays.map((s, i) => (
              <article className="stay-card" key={s.city}>
                <span className="stay-number">0{i + 1}</span>
                <p className="eyebrow">{s.city.toUpperCase()}</p>
                <h3>{s.area}</h3>
                <span className="pill">{s.type}</span>
                <p>{s.description}</p>
                <small>
                  {s.checkin} → {s.checkout}
                  <br />
                  {s.nights} night{s.nights > 1 ? "s" : ""} · {s.rooms} room{s.rooms > 1 ? "s" : ""}
                </small>
                <div className="stay-price">
                  <strong>{euro(s.total)}</strong>
                  <span>{euro(s.nightly)} / room / night</span>
                </div>
                <a className="secondary wide" href={s.url} target="_blank" rel="noreferrer">
                  Find hotels in {s.city} <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
          <p className="info-box">
            These are suggested areas and accommodation categories, not available hotel listings.
            The search opens with your city, dates, adults and room count; apply the suggested area
            and price filters there. Actual offers may differ.
          </p>
        </div>
      )}
      {section === "budget" && (
        <div className="budget-layout">
          <div>
            <p className="eyebrow">EVERY EURO HAS A PLACE</p>
            <h2>The numbers behind your trip.</h2>
            <p>
              Calculated automatically from your answers. You don’t need to guess a flight or hotel
              price.
            </p>
            <div className="cost-list">
              {categories.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{euro(value)}</strong>
                </div>
              ))}
              <div className="cost-total">
                <span>Estimated group total</span>
                <strong>{euro(budget.total)}</strong>
              </div>
            </div>
            <button className="text-button" onClick={() => setMethod(true)}>
              <Info size={16} /> View estimate assumptions
            </button>
          </div>
          <aside className="budget-card">
            <p className="eyebrow">YOUR BUDGET</p>
            <h2>{euro(p.budget)}</h2>
            <div className="budget-bar">
              <span style={{ width: Math.min(100, (budget.total / p.budget) * 100) + "%" }} />
            </div>
            <h3>
              {budget.total <= p.budget
                ? euro(p.budget - budget.total) + " to spare"
                : euro(budget.total - p.budget) + " over budget"}
            </h3>
            <p>
              {budget.total <= p.budget
                ? "You do not have to spend the remainder. Keep it for flexibility."
                : "Try a shorter trip, another destination or a larger budget. These are the model’s basic costs; we cannot promise cheaper offers."}
            </p>
            <small>
              Costs are illustrative EUR allowances. Booking availability, exchange rates and
              transport schedules are not queried.
            </small>
          </aside>
        </div>
      )}
      <Dialog open={!!swap} onOpenChange={(open) => !open && setSwap(null)}>
        <DialogContent>
          <DialogTitle>
            {swap && swap.slot >= trip.days[swap.day].places.length
              ? "Add a discovery"
              : "Find a different stop"}
          </DialogTitle>
          <DialogDescription>
            Unused places in this city that fit the remaining time.
          </DialogDescription>
          <div className="alternative-list">
            {choices.length ? (
              choices.map((place) => (
                <button
                  className="alternative"
                  key={place.id}
                  onClick={() => {
                    if (!swap) return;
                    onChange({
                      ...trip,
                      days: trip.days.map((d, i) =>
                        i === swap.day
                          ? {
                              ...d,
                              places: d.places
                                .map((id, j) => (j === swap.slot ? place.id : id))
                                .concat(swap.slot === d.places.length ? [place.id] : []),
                            }
                          : d,
                      ),
                    });
                    setSwap(null);
                  }}
                >
                  <b>{place.name}</b>
                  <small>
                    {place.category} · {place.hours}h · {euro(place.cost)} entry allowance
                  </small>
                </button>
              ))
            ) : (
              <p>
                No unused places fit. Remove a stop to free up time, or enjoy an open afternoon.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={method} onOpenChange={setMethod}>
        <DialogContent>
          <DialogTitle>How your estimate is calculated</DialogTitle>
          <DialogDescription>
            Transparent planning assumptions, not live market data.
          </DialogDescription>
          <div className="methodology">
            <p>
              <b>Flights:</b> an editorial allowance for {p.origin} → {dest.name}, adjusted for the
              destination month. No airlines, schedules or seats have been checked.
            </p>
            <p>
              <b>Season:</b> {p.startDate ? seasonFactor(dest.id, p.startDate) : 1}× the base room
              and flight allowance. This is a simple demo rule, not a fare forecast.
            </p>
            <p>
              <b>Stays:</b> {budget.rooms} rooms × {budget.nights} nights × {euro(p.nightly)}. Two
              adults share each private room. Options upgrade the room category only when the budget
              allows it.
            </p>
            <p>
              <b>Meals:</b> {p.travellers} adults × {p.days} days × {euro(p.food)}.
            </p>
            <p>
              <b>Transport:</b> {euro(dest.rail)} intercity + {euro(dest.dailyTransport)} per day,
              per adult. Actual tickets are not priced.
            </p>
            <p>
              <b>Activities:</b> the sum of entry allowances for selected stops, per adult. Food
              stops use the meal budget.
            </p>
            <p>
              <b>Buffer:</b> 10% of the subtotal. Airport transfers, luggage, local taxes and
              insurance may vary: check these before booking.
            </p>
            <small>
              Estimate model: {p.pricingVersion ?? "legacy manual snapshot"}. Old saved trips retain
              their original room, meal and flight inputs.
            </small>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
