import React, { useId } from "react";
import { Clock3 } from "lucide-react";
import { FORECAST_MINUTES } from "../scenario.mjs";
import { formatCityTime } from "../time.mjs";
import "./ForecastTimeline.css";

export default function ForecastTimeline({
  value = 60,
  onChange,
  anchor = Date.now(),
  compact = false,
}) {
  const id = useId();
  const when = new Date(Number(anchor) + value * 60_000);
  return (
    <div
      className={`forecast-timeline ${compact ? "compact" : ""}`}
      data-presentation-shortcuts="off"
    >
      <span className="forecast-timeline-label" id={id}>
        <Clock3 size={14} />
        Forecast horizon
      </span>
      <div
        className="forecast-timeline-options"
        role="group"
        aria-labelledby={id}
      >
        {FORECAST_MINUTES.map((minutes) => (
          <button
            key={minutes}
            className={`${value === minutes ? "selected" : ""} ${minutes === 0 ? "now" : ""}`}
            aria-pressed={value === minutes}
            aria-label={
              minutes === 0
                ? "Show current conditions"
                : `Show forecast in ${minutes} minutes`
            }
            onClick={() => onChange(minutes)}
          >
            {minutes === 0 ? "Now" : `+${minutes} min`}
          </button>
        ))}
      </div>
      <span
        className={`forecast-time-status ${value === 0 ? "live" : "modelled"}`}
      >
        <i />
        {value === 0 ? "LIVE" : "MODELLED"}
        <time dateTime={when.toISOString()}>
          {formatCityTime(when, { seconds: false })}
        </time>
      </span>
      <small>Synthetic scenario</small>
    </div>
  );
}
