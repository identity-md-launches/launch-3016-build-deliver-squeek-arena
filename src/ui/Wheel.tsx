import { useEffect, useState } from "react";
import {
  readWheel,
  type WheelStatus,
  ExternalError,
} from "../adapters/external";
import { Icon } from "./Icon";
export function Wheel() {
  const [data, setData] = useState<WheelStatus | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0),
    [retryAt, setRetryAt] = useState(0),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const a = new AbortController();
    setLoading(true);
    readWheel(a.signal)
      .then((s) => {
        setData(s);
        setError("");
      })
      .catch((e) => {
        if (!a.signal.aborted) {
          setError(
            e instanceof ExternalError
              ? e.message
              : "Wheel activity is unavailable. Check your connection and retry.",
          );
          if (e instanceof ExternalError)
            setRetryAt(Date.now() + e.retryAfter * 1000);
        }
      })
      .finally(() => {
        if (!a.signal.aborted) setLoading(false);
      });
    return () => a.abort();
  }, [attempt]);
  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") setAttempt((n) => n + 1);
    }, 60000);
    return () => clearInterval(tick);
  }, []);
  const fresh =
    data &&
    data.freshness === "online" &&
    now - Date.parse(data.receivedAt) < data.staleAfter * 1000;
  return (
    <section className="wheel-panel">
      <div className="section-heading">
        <h3>From the real wheel</h3>
        <Icon name="globe" size={17} />
      </div>
      {loading && !data ? (
        <p className="muted" role="status">
          Reading Squeekchain…
        </p>
      ) : error ? (
        <>
          <p className="muted" role="status">
            {error}
          </p>
          <button
            className="text-button"
            disabled={Date.now() < retryAt || loading}
            onClick={() => setAttempt((v) => v + 1)}
          >
            {loading ? "Reading…" : "Retry activity"}
          </button>
        </>
      ) : data ? (
        <>
          <div className="wheel-reading">
            <span className={`status-dot ${fresh ? "fresh" : ""}`} />
            <strong>
              {fresh
                ? data.coreStatus === "ACTIVE"
                  ? "Wheel moving"
                  : data.coreStatus === "IDLE"
                    ? "Wheel resting"
                    : "Wheel status unknown"
                : "Last known activity"}
            </strong>
            <span>
              {(data.rpmMilli / 1000).toLocaleString(undefined, {
                maximumFractionDigits: 1,
              })}{" "}
              rpm
            </span>
          </div>
          <p className="caption">
            {data.provenance === "hardware"
              ? "Hardware measurement"
              : `${data.provenance} measurement`}{" "}
            ·{" "}
            {new Date(data.observedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {!fresh ? " · stale" : ""}
          </p>
          <a
            className="text-link"
            href="https://api.squeekchain.com/v1/status"
            target="_blank"
            rel="noopener noreferrer"
          >
            View official source <Icon name="external" size={14} />
          </a>
        </>
      ) : (
        <p className="muted">No measurement available.</p>
      )}
      <p className="caption wheel-caption">
        Official activity, independent of your adventure.
      </p>
    </section>
  );
}
