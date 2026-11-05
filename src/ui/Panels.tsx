import { useEffect, useState } from "react";
import {
  Persistence,
  playerLevel,
  ACHIEVEMENTS,
  COSMETICS,
  safeName,
} from "../adapters/persistence";
import type { Profile, Settings } from "../game/types";
import { CHECK_IN, COLLECTION, type HeldNft } from "../adapters/external";
import { HamsterPortrait } from "./PixelArt";
import { NftIdentity } from "./Wallet";
import { Icon } from "./Icon";
export const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export function SettingsPanel({
  settings,
  onChange,
  audioFailed,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  audioFailed: boolean;
}) {
  const set = (key: keyof Settings, value: number | boolean) =>
    onChange({ ...settings, [key]: value });
  return (
    <div className="settings-panel">
      <section>
        <h3>Sound</h3>
        <label className="setting-range">
          <span>Music</span>
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            value={settings.music}
            onChange={(e) => set("music", +e.target.value)}
          />
          <output>{Math.round(settings.music * 100)}%</output>
        </label>
        <label className="setting-range">
          <span>Sound effects</span>
          <input
            type="range"
            min="0"
            max="1"
            step=".05"
            value={settings.sfx}
            onChange={(e) => set("sfx", +e.target.value)}
          />
          <output>{Math.round(settings.sfx * 100)}%</output>
        </label>
        <label className="setting-toggle">
          <span>
            <strong>Mute all audio</strong>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.muted}
            onChange={(e) => set("muted", e.target.checked)}
          />
        </label>
        {audioFailed && (
          <p role="status" className="inline-error">
            Audio is unavailable in this browser. The adventure is fully
            playable.
          </p>
        )}
      </section>
      <section>
        <h3>Make yourself at home</h3>
        <label className="setting-toggle">
          <span>
            <strong>Gentle adventure</strong>
            <small>Eight hearts and longer protection after a hit.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.assist}
            onChange={(e) => set("assist", e.target.checked)}
          />
        </label>
        <label className="setting-toggle">
          <span>
            <strong>Reduce motion</strong>
            <small>Disable camera shake and dash trails.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.reducedMotion}
            onChange={(e) => set("reducedMotion", e.target.checked)}
          />
        </label>
        <label className="setting-toggle">
          <span>
            <strong>Show touch controls</strong>
            <small>Touch buttons always appear on phones.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.touch}
            onChange={(e) => set("touch", e.target.checked)}
          />
        </label>
      </section>
      <p className="caption">
        Changes save automatically on this browser. Gentle adventure refills
        hearts at your next checkpoint or retry.
      </p>
    </div>
  );
}
export function CharacterPanel({
  storage,
  onChange,
  nft,
  onNft,
}: {
  storage: Persistence;
  onChange: () => void;
  nft: HeldNft | null;
  onNft: (n: HeldNft | null) => void;
}) {
  const p = storage.profile,
    [name, setName] = useState(p.name),
    [saved, setSaved] = useState(false);
  const level = playerLevel(p.xp),
    base = (level - 1) ** 2 * 100,
    next = level ** 2 * 100;
  return (
    <div className="character-content">
      <section className="character-overview">
        <div className="character-portrait">
          {nft?.image ? (
            <img src={nft.image} alt={nft.name} />
          ) : (
            <HamsterPortrait size={160} cosmetic={p.cosmetic} />
          )}
        </div>
        <div>
          <h2>{p.name}</h2>
          <p className="muted">
            Level {level} ·{" "}
            {p.victories ? "Heartseed guardian" : "Burrow explorer"}
          </p>
          <div
            className="xp-track"
            role="progressbar"
            aria-label="Experience to next level"
            aria-valuenow={p.xp - base}
            aria-valuemin={0}
            aria-valuemax={next - base}
          >
            <span
              style={{ width: `${((p.xp - base) / (next - base)) * 100}%` }}
            />
          </div>
          <p className="caption">
            {p.xp.toLocaleString()} / {next.toLocaleString()} XP
          </p>
          <div className="character-stats">
            <div>
              <strong>{p.points.toLocaleString()}</strong>
              <span>Arena Points</span>
            </div>
            <div>
              <strong>{p.seeds}</strong>
              <span>Seeds found</span>
            </div>
            <div>
              <strong>{p.kills}</strong>
              <span>Enemies defeated</span>
            </div>
          </div>
        </div>
      </section>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          p.name = safeName(name);
          setName(p.name);
          storage.write();
          setSaved(true);
          onChange();
        }}
      >
        <label htmlFor="player-name">Explorer name</label>
        <div className="button-row">
          <input
            id="player-name"
            maxLength={24}
            value={name}
            autoComplete="nickname"
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            required
          />
          <button className="secondary" type="submit">
            Save name
          </button>
        </div>
        <span className="caption" role="status">
          {saved
            ? "Explorer name saved."
            : "Stored on this browser. No account required."}
        </span>
      </form>
      <section className="cosmetics">
        <div className="section-heading">
          <h3>A little personal flair</h3>
          <span className="muted">Earn through play</span>
        </div>
        <div className="cosmetic-grid">
          {COSMETICS.map((s) => {
            const unlocked = s.unlocked(p);
            return (
              <button
                key={s.id}
                className={`cosmetic ${p.cosmetic === s.id ? "selected" : ""}`}
                disabled={!unlocked}
                onClick={() => {
                  p.cosmetic = s.id;
                  storage.write();
                  onChange();
                }}
              >
                <HamsterPortrait cosmetic={s.id} size={76} />
                <strong>{s.name}</strong>
                <span>
                  {unlocked ? (
                    p.cosmetic === s.id ? (
                      "Equipped"
                    ) : (
                      "Equip cosmetic"
                    )
                  ) : (
                    <>
                      <Icon name="lock" size={14} />
                      {s.requirement}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="achievements">
        <div className="section-heading">
          <h3>Little victories</h3>
          <span className="muted">
            {
              p.achievements.filter((a) => ACHIEVEMENTS.some((s) => s.id === a))
                .length
            }{" "}
            / {ACHIEVEMENTS.length} earned
          </span>
        </div>
        <div className="achievement-grid">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={`achievement ${p.achievements.includes(a.id) ? "earned" : ""}`}
            >
              <span className="achievement-icon">
                <Icon
                  name={p.achievements.includes(a.id) ? "trophy" : "lock"}
                  size={22}
                />
              </span>
              <div>
                <strong>{a.name}</strong>
                <p>{a.detail}</p>
              </div>
              {p.achievements.includes(a.id) && <Icon name="check" size={16} />}
            </div>
          ))}
        </div>
      </section>
      <NftIdentity selected={nft} onSelect={onNft} />
      <p className="caption">
        XP and Arena Points are local, game-only progress. They have no monetary
        value and cannot be bought, sold, transferred, or withdrawn.
      </p>
    </div>
  );
}
export function LeaderboardPanel({
  storage,
  onPlay,
}: {
  storage: Persistence;
  onPlay: () => void;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"),
    [filter, setFilter] = useState<"all" | "complete">("all"),
    [version, setVersion] = useState(0);
  useEffect(() => {
    setState("loading");
    const t = setTimeout(
      () => setState(storage.unavailable ? "error" : "ready"),
      80,
    );
    return () => clearTimeout(t);
  }, [storage, version]);
  const entries = storage.profile.scores.filter(
    (s) => filter === "all" || s.completed,
  );
  return (
    <div className="leaderboard-content">
      <div className="section-heading">
        <div>
          <h2>Make a little history.</h2>
          <p className="muted">Local leaderboard · This browser only</p>
        </div>
        <Icon name="trophy" size={40} />
      </div>
      <div className="leaderboard-toolbar">
        <div className="segmented" role="group" aria-label="Filter runs">
          <button
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All runs
          </button>
          <button
            aria-pressed={filter === "complete"}
            onClick={() => setFilter("complete")}
          >
            Victories
          </button>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh local leaderboard"
          disabled={state === "loading"}
          onClick={() => setVersion((v) => v + 1)}
        >
          <Icon name="refresh" />
        </button>
      </div>
      {state === "loading" ? (
        <div className="empty-state" role="status">
          Reading saved adventures…
        </div>
      ) : state === "error" ? (
        <div className="empty-state">
          <Icon name="help" size={36} />
          <h3>Saved runs are unavailable</h3>
          <p>
            Browser storage is blocked or full. Current-session progress stays
            playable.
          </p>
          <button
            className="secondary"
            onClick={() => {
              storage.write();
              setVersion((v) => v + 1);
            }}
          >
            Retry browser storage
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <Icon name="flag" size={40} />
          <h3>
            {filter === "complete"
              ? "Your first victory is waiting."
              : "Every legend starts somewhere."}
          </h3>
          <p>
            {filter === "complete"
              ? "Defeat the Iron Gnaw to record a victory."
              : "Finish an adventure to put your name on this board."}
          </p>
          <button className="primary" onClick={onPlay}>
            Play the adventure <Icon name="arrow" size={17} />
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Explorer</th>
                <th>Score</th>
                <th>Time</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{e.name}</strong>
                    <small>{new Date(e.date).toLocaleDateString()}</small>
                  </td>
                  <td>{e.score.toLocaleString()}</td>
                  <td>{formatTime(e.seconds)}</td>
                  <td>{e.completed ? "Victory" : "Run ended"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="leaderboard-note">
        <Icon name="help" size={18} />
        <p>
          Only your actual runs are shown. No shared score service is connected.
          Scores are stored locally and can be edited in your browser; they are
          not competitive or server-verified.
        </p>
      </div>
    </div>
  );
}
export function IntegrationNotes() {
  return (
    <div className="integration-notes">
      <section>
        <h3>Daily on-chain check-in</h3>
        <p className="unavailable-label">
          <Icon name="lock" size={17} />
          Unavailable
        </p>
        <p>{CHECK_IN.reason}</p>
        <p>
          Connecting a wallet does not check you in. No transaction is sent, and
          no points or streak are awarded.
        </p>
        <details>
          <summary>What is needed to enable it</summary>
          <p>{CHECK_IN.missing}</p>
          <p>
            A future check-in must explain the network fee, require an explicit
            wallet confirmation, confirm the receipt, prevent duplicate UTC-day
            rewards, and link its real transaction on the verified explorer.
          </p>
        </details>
      </section>
      <section>
        <h3>What is connected</h3>
        <ul>
          <li>
            Official wheel activity:{" "}
            <a
              href="https://api.squeekchain.com/v1/status"
              target="_blank"
              rel="noopener noreferrer"
            >
              Squeekchain status API
            </a>
            .
          </li>
          <li>
            Verified Sepolia deployment and NFT ownership: official economy,
            account, and Squeek metadata reads.
          </li>
          <li>
            EIP-6963 browser wallets, wallet app links, and Coinbase Smart
            Wallet.
          </li>
        </ul>
        <p className="caption break-word">
          Squeek collection · Sepolia 11155111
          <br />
          {COLLECTION}
        </p>
      </section>
      <section>
        <h3>Open adventure, local progress</h3>
        <p>
          All three worlds and the boss work without a wallet or internet
          connection after the page has loaded. Saves and the leaderboard belong
          to this browser. The keepsake hunt is an in-game challenge.
        </p>
        <p>
          Arena Points and XP have no monetary value. They are not tokens and
          cannot be bought, sold, transferred, or withdrawn.
        </p>
      </section>
      <section>
        <h3>Genesis</h3>
        <p>
          Built with the published Squeekchain APIs and Sepolia collection. No
          project registration, contract deployment, or Genesis submission has
          been performed.
        </p>
        <a
          className="text-link"
          href="https://squeekchain.com/genesis/code"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the official Code lane <Icon name="external" size={16} />
        </a>
      </section>
    </div>
  );
}
export function ProfileMini({
  profile,
  nft,
  onOpen,
}: {
  profile: Profile;
  nft: HeldNft | null;
  onOpen: () => void;
}) {
  const level = playerLevel(profile.xp),
    base = (level - 1) ** 2 * 100,
    next = level ** 2 * 100;
  return (
    <section className="profile-mini">
      <div className="section-heading">
        <h3>Your adventurer</h3>
        <button
          className="icon-button"
          aria-label="Open character profile"
          onClick={onOpen}
        >
          <Icon name="right" size={17} />
        </button>
      </div>
      <div className="mini-identity">
        {nft?.image ? (
          <img src={nft.image} width="64" height="64" alt={nft.name} />
        ) : (
          <HamsterPortrait size={72} cosmetic={profile.cosmetic} />
        )}
        <div>
          <strong>{profile.name}</strong>
          <span>Level {level} explorer</span>
        </div>
      </div>
      <div className="xp-track">
        <span
          style={{
            width: `${Math.max(2, ((profile.xp - base) / (next - base)) * 100)}%`,
          }}
        />
      </div>
      <div className="xp-label">
        <span>{profile.xp.toLocaleString()} XP</span>
        <span>Next level {next.toLocaleString()}</span>
      </div>
      <div className="mini-points">
        <Icon name="spark" size={20} />
        <strong>{profile.points.toLocaleString()}</strong>
        <span>Arena Points</span>
      </div>
    </section>
  );
}
