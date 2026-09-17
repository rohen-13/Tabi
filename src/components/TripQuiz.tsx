import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, Users, Wallet, CalendarDays } from "lucide-react";
import { INTERESTS } from "../../shared/places";
import { type Quiz, quizSchema } from "../../shared/recommendations";
import { destinationFor } from "../../shared/destinations";

export default function TripQuiz({
  value,
  onChange,
  onBack,
  onSubmit,
  busy,
  error,
}: {
  value: Quiz;
  onChange: (q: Quiz) => void;
  onBack: () => void;
  onSubmit: () => void;
  busy: boolean;
  error: string;
}) {
  const [step, setStep] = useState(0),
    [issue, setIssue] = useState("");
  const update = (key: keyof Quiz, next: unknown) => {
    onChange({ ...value, [key]: next });
    setIssue("");
  };
  const next = () => {
    const fields = [
      ["startDate", "days"],
      ["travellers", "budget", "budgetMode"],
      ["interests", "pace"],
    ][step];
    const result = quizSchema.safeParse(value);
    if (!result.success) {
      const invalid = result.error.issues.find((i) => fields.includes(String(i.path[0])));
      if (invalid) {
        setIssue(invalid.message);
        return;
      }
    }
    setIssue("");
    if (step < 2) setStep(step + 1);
    else onSubmit();
  };
  return (
    <section className="quiz-shell">
      <button className="text-button" onClick={() => (step ? setStep(step - 1) : onBack())}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="quiz-layout">
        <aside>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h1>
            {destinationFor(value.destination).name},<br />
            <em>your way.</em>
          </h1>
          <p>
            From {value.origin}. A few answers now.
            <br />A trip that makes sense for you.
          </p>
          <ol className="steps">
            {["Your time", "Your budget", "Your kind of trip"].map((label, i) => (
              <li key={label} className={i === step ? "active" : i < step ? "done" : ""}>
                <span>{i < step ? <Check size={15} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="quiet-note">We calculate the costs. You choose what matters.</div>
        </aside>
        <form
          className="quiz-card"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          <p className="eyebrow">STEP {step + 1} OF 3</p>
          {step === 0 && (
            <>
              <CalendarDays className="section-icon" />
              <h2>When does the adventure begin?</h2>
              <p>These are days at your destination. Allow extra time for international travel.</p>
              <label>
                First day at destination
                <input
                  type="date"
                  required
                  value={value.startDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => update("startDate", e.target.value)}
                  onInput={(e) => update("startDate", e.currentTarget.value)}
                  onBlur={(e) => update("startDate", e.currentTarget.value)}
                />
              </label>
              <label>
                How long would you like to stay?
                <select value={value.days} onChange={(e) => update("days", Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i} value={i + 7}>
                      {i + 7} days · {i + 6} nights
                    </option>
                  ))}
                </select>
              </label>
              <div className="info-box">
                Your month affects our seasonal estimate. Exact fares and room availability will
                need checking before booking.
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <Wallet className="section-icon" />
              <h2>A good trip starts with a clear budget.</h2>
              <p>
                Include flights, stays, meals, transport and activities. We’ll work out the split.
              </p>
              <div className="form-pair">
                <label>
                  <Users size={16} /> Travellers
                  <select
                    value={value.travellers}
                    onChange={(e) => update("travellers", Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} adult{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget is
                  <select
                    value={value.budgetMode}
                    onChange={(e) => update("budgetMode", e.target.value)}
                  >
                    <option value="group">For the whole group</option>
                    <option value="person">Per person</option>
                  </select>
                </label>
              </div>
              <label>
                {value.budgetMode === "group" ? "Total group budget" : "Budget per person"} (€)
                <input
                  required
                  type="number"
                  min="100"
                  max="100000"
                  step="50"
                  value={value.budget || ""}
                  onChange={(e) => update("budget", Number(e.target.value))}
                />
              </label>
              <div className="info-box">
                {value.travellers} adult{value.travellers > 1 ? "s" : ""} ·{" "}
                {Math.ceil(value.travellers / 2)} private room{value.travellers > 2 ? "s" : ""},
                with up to 2 adults per room. Group budget: €
                {(
                  value.budget * (value.budgetMode === "person" ? value.travellers : 1)
                ).toLocaleString("en-IE")}
                .
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <Compass className="section-icon" />
              <h2>What makes a trip feel like you?</h2>
              <p>
                Pick at least one interest. We’ll use these to choose places and shape your days.
              </p>
              <div className="interest-grid">
                {INTERESTS.map((interest) => (
                  <button
                    type="button"
                    aria-pressed={value.interests.includes(interest)}
                    key={interest}
                    className={value.interests.includes(interest) ? "selected" : ""}
                    onClick={() =>
                      update(
                        "interests",
                        value.interests.includes(interest)
                          ? value.interests.filter((i) => i !== interest)
                          : [...value.interests, interest],
                      )
                    }
                  >
                    {interest}
                    <span>{value.interests.includes(interest) ? <Check size={17} /> : "+"}</span>
                  </button>
                ))}
              </div>
              <fieldset>
                <legend>Your pace</legend>
                {(
                  [
                    ["relaxed", "Slow mornings", "Up to 4 hours of exploring"],
                    ["balanced", "A little of everything", "Up to 6 hours of exploring"],
                    ["full", "Make the most of it", "Up to 8 hours of exploring"],
                  ] as const
                ).map(([id, title, description]) => (
                  <label className="radio-choice" key={id}>
                    <input
                      type="radio"
                      name="pace"
                      value={id}
                      checked={value.pace === id}
                      onChange={() => update("pace", id)}
                    />
                    <span>
                      <b>{title}</b>
                      <small>{description}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
            </>
          )}
          {(issue || error) && (
            <p className="error" role="alert">
              {issue || error}
            </p>
          )}
          <button disabled={busy} className="primary wide" type="submit">
            {busy ? "Working out your options…" : step === 2 ? "Find my trip options" : "Continue"}
            <ArrowRight size={17} />
          </button>
          <small className="footnote">
            No account. No booking. Just a thoughtful starting point.
          </small>
        </form>
      </div>
    </section>
  );
}
