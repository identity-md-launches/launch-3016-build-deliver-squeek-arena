import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "./game/engine";
import { Renderer } from "./game/renderer";
import { AudioEngine } from "./game/audio";
import { Persistence } from "./adapters/persistence";
import { WalletControls } from "./ui/Wallet";
import { Modal } from "./ui/Modal";
import { Icon } from "./ui/Icon";
import { HamsterPortrait, PixelItem, RegionArt } from "./ui/PixelArt";
import {
  CharacterPanel,
  SettingsPanel,
  LeaderboardPanel,
  IntegrationNotes,
  ProfileMini,
  formatTime,
} from "./ui/Panels";
import { Wheel } from "./ui/Wheel";
import type { Action, GameSnapshot, Settings } from "./game/types";
import type { HeldNft } from "./adapters/external";

type Tab = "play" | "character" | "leaderboard" | "settings";
function GameCanvas({
  game,
  canvasRef,
}: {
  game: Game;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const [error, setError] = useState("");
  useEffect(() => {
    let renderer: Renderer | undefined;
    try {
      if (canvasRef.current) renderer = new Renderer(canvasRef.current, game);
    } catch {
      setError(
        "This browser cannot open the game canvas. Try a current browser with hardware acceleration.",
      );
    }
    return () => renderer?.destroy();
  }, [game, canvasRef]);
  return (
    <>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        tabIndex={0}
        aria-label="Squeek Arena game. Move with A and D, jump with Space, attack with J, dash with K. Escape pauses."
      />
      {error && (
        <p className="canvas-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export default function App() {
  const [storage] = useState(() => new Persistence()),
    [audio] = useState(() => new AudioEngine(storage.profile.settings)),
    [game] = useState(() => new Game(storage, audio));
  const [snapshot, setSnapshot] = useState<GameSnapshot>(game.snapshot),
    [tab, setTab] = useState<Tab>("play"),
    [settings, setSettings] = useState(storage.profile.settings),
    [version, setVersion] = useState(0),
    [modal, setModal] = useState<
      "help" | "integrations" | "settings" | "new-run" | null
    >(null),
    [nft, setNft] = useState<HeldNft | null>(null),
    [networkOffline, setNetworkOffline] = useState(!navigator.onLine);
  const canvasRef = useRef<HTMLCanvasElement>(null),
    walletAddress = useRef<string | undefined>(undefined);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const pauseForUI = useCallback(() => {
    if (game.mode === "playing") game.pause();
  }, [game]);
  const walletChanged = useCallback((address?: string) => {
    if (walletAddress.current !== address) {
      walletAddress.current = address;
      setNft(null);
    }
  }, []);
  useEffect(() => {
    game.onChange = (s) => setSnapshot(s);
    const visibility = () => {
        if (document.visibilityState === "hidden") {
          if (game.mode === "playing") game.pause();
          game.input.clear();
          game.persist();
        }
      },
      pagehide = () => {
        if (!["menu", "victory"].includes(game.mode)) game.persist();
      },
      online = () => setNetworkOffline(!navigator.onLine);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
      game.destroy();
    };
  }, [game]);
  useEffect(() => {
    const playing = snapshot.mode === "playing";
    document.body.classList.toggle("in-adventure", playing);
    return () => document.body.classList.remove("in-adventure");
  }, [snapshot.mode]);
  useEffect(() => {
    game.input.enabled = tab === "play" && modal === null;
    game.input.clear();
  }, [tab, modal, game]);
  useEffect(() => {
    if (!nft) return;
    const t = setTimeout(
      () => setNft(null),
      Math.max(0, 120000 - (Date.now() - nft.checkedAt)),
    );
    return () => clearTimeout(t);
  }, [nft]);
  const focusGame = () =>
    requestAnimationFrame(() =>
      canvasRef.current?.focus({ preventScroll: true }),
    );
  const start = async (resume = false) => {
    await audio.unlock();
    setTab("play");
    game.start(resume);
    refresh();
    focusGame();
  };
  const resume = () => {
    game.pause();
    audio.unlock();
    focusGame();
  };
  const go = (next: Tab) => {
    if (next !== "play") pauseForUI();
    setTab(next);
    setModal(null);
    audio.sfx("ui");
    window.scrollTo({ top: 0 });
  };
  const updateSettings = (s: Settings) => {
    setSettings(s);
    storage.profile.settings = s;
    game.player.hp = Math.min(game.player.hp, game.maxHp);
    game.emit();
    audio.set(s);
    storage.write();
    refresh();
  };
  const changeNft = (n: HeldNft | null) => setNft(n);
  const touch = (action: Action, label: string, icon: string) => (
    <button
      className={`touch-button touch-${action}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        game.input.touch(e.pointerId, action, true);
      }}
      onPointerUp={(e) => {
        game.input.touch(e.pointerId, action, false);
      }}
      onPointerCancel={(e) => game.input.touch(e.pointerId, action, false)}
      onLostPointerCapture={(e) => game.input.touch(e.pointerId, action, false)}
    >
      <Icon name={icon} size={action === "jump" ? 25 : 22} />
      <span>{label}</span>
    </button>
  );
  const isMenu = snapshot.mode === "menu",
    isActive = snapshot.mode === "playing",
    isBoss = snapshot.level === 3;
  void version;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to game
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#play"
          onClick={(e) => {
            e.preventDefault();
            go("play");
          }}
          aria-label="Squeek Arena home"
        >
          <HamsterPortrait size={44} />
          <span>
            Squeek Arena
            <span className="brand-sub">A little out of your burrow.</span>
          </span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          {(
            [
              { id: "play", label: "Play", icon: "play" },
              { id: "character", label: "Character", icon: "character" },
              { id: "leaderboard", label: "Leaderboard", icon: "trophy" },
              { id: "settings", label: "Settings", icon: "settings" },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon} size={17} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <WalletControls
          beforeOpen={pauseForUI}
          onAddressChange={walletChanged}
        />
      </header>
      <main
        id="main"
        className={`main-content ${isActive ? "adventure-active" : ""}`}
      >
        <div className="page-intro">
          <div>
            <p className="page-title">
              {tab === "play"
                ? "Your next little adventure"
                : tab === "character"
                  ? "Meet your little legend."
                  : tab === "leaderboard"
                    ? "The burrow record book."
                    : "Play your own way."}
            </p>
            <p className="intro-caption">
              {tab === "play"
                ? "An original hamster adventure on Squeekchain."
                : tab === "character"
                  ? "Every adventure leaves a little mark."
                  : tab === "leaderboard"
                    ? "Real adventures, remembered here."
                    : "A few comforts for the road ahead."}
            </p>
          </div>
          <button
            className="text-button help-button"
            onClick={() => {
              pauseForUI();
              setModal("help");
            }}
          >
            <Icon name="help" size={17} />
            How to play
          </button>
        </div>
        <div className="play-layout" hidden={tab !== "play"}>
          <div className="game-column">
            <section
              className={`game-stage ${isActive ? "is-playing" : ""}`}
              aria-label="Adventure game"
            >
              <div className="stage-bar">
                {isMenu ? (
                  <div className="stage-mode">
                    <Icon name="flag" size={17} />
                    <span>Adventure mode</span>
                  </div>
                ) : (
                  <div
                    className="health-hud"
                    aria-label={`${snapshot.hp} of ${game.maxHp} hearts, ${snapshot.lives} lives`}
                  >
                    <div className="hearts">
                      {Array.from({ length: game.maxHp }, (_, i) => (
                        <PixelItem
                          key={i}
                          kind="heart"
                          size={21}
                          empty={i >= snapshot.hp}
                        />
                      ))}
                    </div>
                    <span className="lives">× {snapshot.lives}</span>
                  </div>
                )}
                <div className="stage-status">
                  {isMenu ? (
                    <span>Three worlds + a final boss</span>
                  ) : (
                    <>
                      <span className="seed-hud">
                        <PixelItem kind="seed" size={21} />
                        {snapshot.levelSeeds}
                        <span className="muted">
                          /{snapshot.totalSeeds || "—"}
                        </span>
                      </span>
                      <span className="score-hud">
                        {snapshot.score.toLocaleString()} pts
                      </span>
                    </>
                  )}
                </div>
                <div className="stage-utilities">
                  <button
                    className="icon-button"
                    aria-label={settings.muted ? "Unmute audio" : "Mute audio"}
                    aria-pressed={settings.muted}
                    onClick={() => {
                      audio.unlock();
                      updateSettings({ ...settings, muted: !settings.muted });
                      if (isActive) focusGame();
                    }}
                  >
                    <Icon
                      name={settings.muted ? "muted" : "volume"}
                      size={18}
                    />
                  </button>
                  {!isMenu && (
                    <button
                      className="icon-button"
                      aria-label={
                        snapshot.mode === "paused"
                          ? "Resume adventure"
                          : "Pause adventure"
                      }
                      onClick={() => {
                        if (snapshot.mode === "paused") resume();
                        else if (isActive) game.pause();
                      }}
                      disabled={!isActive && snapshot.mode !== "paused"}
                    >
                      <Icon
                        name={snapshot.mode === "paused" ? "play" : "pause"}
                        size={18}
                      />
                    </button>
                  )}
                </div>
              </div>
              <div className="stage-scene">
                <GameCanvas game={game} canvasRef={canvasRef} />
                {isMenu && (
                  <div className="title-screen">
                    <span className="small-pixel-art">
                      <Icon name="spark" size={18} />
                      <span>A heartseed to save.</span>
                    </span>
                    <h1>
                      Squeek
                      <br />
                      Arena<span className="title-period">.</span>
                    </h1>
                    <p className="title-tagline">Small paws. Big trouble.</p>
                    <p className="title-description">
                      Explore, scrap, and squeek your way
                      <br className="desktop-only" /> through an oversized
                      world.
                    </p>
                    <div className="title-actions">
                      {storage.profile.save ? (
                        <>
                          <button
                            className="primary start-button"
                            onClick={() => start(true)}
                          >
                            Continue adventure <Icon name="arrow" size={19} />
                          </button>
                          <button
                            className="text-button new-run-button"
                            onClick={() => setModal("new-run")}
                          >
                            Start a new adventure
                          </button>
                        </>
                      ) : (
                        <button
                          className="primary start-button"
                          onClick={() => start(false)}
                        >
                          Start adventure <Icon name="arrow" size={19} />
                        </button>
                      )}
                    </div>
                    <p className="no-wallet">
                      <Icon name="check" size={14} /> Free to play, no wallet
                      needed.
                    </p>
                  </div>
                )}
                {!isMenu && (
                  <>
                    <div className="in-game-location">
                      <span>
                        {snapshot.level < 3
                          ? `World ${snapshot.level + 1} of 3`
                          : "Final encounter"}
                      </span>
                      <strong>{snapshot.name}</strong>
                    </div>
                    {isBoss && (
                      <div className="boss-hud">
                        <div>
                          <strong>The Iron Gnaw</strong>
                          <span>
                            {snapshot.bossState === "exposed"
                              ? "Core open"
                              : snapshot.bossState === "defeated"
                                ? "Defeated"
                                : snapshot.bossHp <= 9
                                  ? "Phase two"
                                  : "Armored core"}
                          </span>
                        </div>
                        <div
                          className="boss-track"
                          role="progressbar"
                          aria-label="Iron Gnaw health"
                          aria-valuemin={0}
                          aria-valuemax={snapshot.bossMax}
                          aria-valuenow={snapshot.bossHp}
                        >
                          <span
                            style={{
                              width: `${(snapshot.bossHp / snapshot.bossMax) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {snapshot.notice && isActive && (
                      <div className="game-notice" role="status">
                        {snapshot.notice}
                      </div>
                    )}
                  </>
                )}
                {snapshot.mode === "paused" && (
                  <div className="game-overlay">
                    <div className="state-screen">
                      <Icon name="pause" size={28} />
                      <h2>A little breather.</h2>
                      <p>Your checkpoint is saved.</p>
                      <button className="primary" onClick={resume}>
                        Resume adventure <Icon name="play" size={17} />
                      </button>
                      <div className="pause-actions">
                        <button
                          className="secondary"
                          onClick={() => setModal("settings")}
                        >
                          Settings
                        </button>
                        <button
                          className="secondary"
                          onClick={() => {
                            game.restartLevel();
                            focusGame();
                          }}
                        >
                          Restart level
                        </button>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          game.toMenu();
                          refresh();
                        }}
                      >
                        Save and return to menu
                      </button>
                    </div>
                  </div>
                )}
                {(snapshot.mode === "defeat" ||
                  snapshot.mode === "gameover") && (
                  <div className="game-overlay">
                    <div className="state-screen">
                      <HamsterPortrait
                        size={84}
                        animation="defeat"
                        reducedMotion={settings.reducedMotion}
                      />
                      <h2>
                        {snapshot.mode === "gameover"
                          ? "Down, but never out."
                          : "Dust off those paws."}
                      </h2>
                      <p>
                        {snapshot.mode === "gameover"
                          ? "Your checkpoint and collected items are safe."
                          : "A fresh set of hearts is waiting at your checkpoint."}
                      </p>
                      <p className="caption">
                        {snapshot.lives > 0
                          ? `${snapshot.lives} ${snapshot.lives === 1 ? "life" : "lives"} left`
                          : "Retry with three lives"}{" "}
                        · {snapshot.score.toLocaleString()} points earned
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          game.retry();
                          focusGame();
                        }}
                      >
                        Retry checkpoint <Icon name="refresh" size={17} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          game.toMenu();
                          refresh();
                        }}
                      >
                        Return to menu
                      </button>
                    </div>
                  </div>
                )}
                {snapshot.mode === "transition" && (
                  <div className="game-overlay">
                    <div className="state-screen">
                      <Icon name="flag" size={32} />
                      <p className="completion-label">
                        World {snapshot.level + 1} complete
                      </p>
                      <h2>
                        {
                          [
                            "Out of the burrow.",
                            "A spark in the dark.",
                            "Time to face the giant.",
                          ][snapshot.level]
                        }
                      </h2>
                      <div className="run-stats">
                        <div>
                          <strong>{snapshot.levelSeeds}</strong>
                          <span>Seeds found</span>
                        </div>
                        <div>
                          <strong>+{300 + snapshot.level * 100}</strong>
                          <span>Arena Points</span>
                        </div>
                        <div>
                          <strong>+1</strong>
                          <span>Life restored</span>
                        </div>
                      </div>
                      <button
                        className="primary"
                        onClick={() => {
                          game.continueLevel();
                          refresh();
                          focusGame();
                        }}
                      >
                        {snapshot.level === 2
                          ? "Face the Iron Gnaw"
                          : "Continue adventure"}{" "}
                        <Icon name="arrow" size={18} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          game.toMenu();
                          refresh();
                        }}
                      >
                        Save and return to menu
                      </button>
                    </div>
                  </div>
                )}
                {snapshot.mode === "victory" && (
                  <div className="game-overlay victory-overlay">
                    <div className="state-screen">
                      <HamsterPortrait
                        size={96}
                        cosmetic="champion"
                        animation="victory"
                        reducedMotion={settings.reducedMotion}
                      />
                      <p className="completion-label">Heartseed recovered</p>
                      <h2>A very small legend.</h2>
                      <p>The burrow is safe. And the story is yours.</p>
                      <div className="run-stats">
                        <div>
                          <strong>{snapshot.score.toLocaleString()}</strong>
                          <span>Run score</span>
                        </div>
                        <div>
                          <strong>{snapshot.seeds}</strong>
                          <span>Seeds found</span>
                        </div>
                        <div>
                          <strong>{formatTime(snapshot.seconds)}</strong>
                          <span>Adventure time</span>
                        </div>
                      </div>
                      <p className="caption">
                        {snapshot.kills} enemies defeated · {snapshot.relics} /
                        3 keepsakes · Champion crown unlocked
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          game.toMenu();
                          refresh();
                          go("character");
                        }}
                      >
                        See your rewards <Icon name="trophy" size={18} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          game.toMenu();
                          refresh();
                        }}
                      >
                        Return to menu
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div
                className={`touch-controls ${settings.touch ? "force-touch" : ""}`}
                hidden={!isActive}
              >
                <div className="touch-directions">
                  {touch("left", "Left", "left")}
                  {touch("right", "Right", "right")}
                </div>
                <div className="touch-actions">
                  {touch("dash", "Dash", "dash")}
                  {touch("attack", "Attack", "attack")}
                  {touch("jump", "Jump", "up")}
                </div>
              </div>
              <div className="stage-bottom">
                <span>
                  <span className="status-dot fresh" />
                  {isMenu
                    ? "Adventure ready"
                    : snapshot.mode === "victory"
                      ? "Adventure complete."
                      : snapshot.mode === "paused"
                        ? "Paused. Take your time."
                        : snapshot.objective}
                </span>
                <span className="save-label">
                  <Icon name="flag" size={13} />
                  {storage.unavailable
                    ? "Session only"
                    : "Progress saves locally"}
                </span>
              </div>
            </section>
            <div className="controls-guide">
              <div>
                <span className="guide-label">Move</span>
                <kbd>A</kbd>
                <kbd>D</kbd>
                <span className="control-or">/</span>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </div>
              <div>
                <span className="guide-label">Jump</span>
                <kbd>Space</kbd>
              </div>
              <div>
                <span className="guide-label">Attack</span>
                <kbd>J</kbd>
              </div>
              <div>
                <span className="guide-label">Dash</span>
                <kbd>K</kbd>
              </div>
              <div>
                <span className="guide-label">Pause</span>
                <kbd>Esc</kbd>
              </div>
            </div>
            <section className="journey-section">
              <div className="section-heading">
                <h2>A world beyond the burrow</h2>
                <span className="muted">The adventure route</span>
              </div>
              <div className="journey-map">
                {[
                  { name: "Burrow Entrance", type: "Find your feet", index: 0 },
                  {
                    name: "Crystal Caverns",
                    type: "Follow the light",
                    index: 1,
                  },
                  {
                    name: "Forgotten Factory",
                    type: "Wake the giant",
                    index: 2,
                  },
                ].map((l) => (
                  <div
                    key={l.index}
                    className={`journey-stop ${storage.profile.completed.includes(l.index) ? "completed" : ""} ${!isMenu && snapshot.level === l.index ? "current" : ""}`}
                  >
                    <div className="journey-art">
                      <RegionArt index={l.index} />
                      <span className="world-number">0{l.index + 1}</span>
                      {storage.profile.completed.includes(l.index) && (
                        <span className="world-check" aria-label="Completed">
                          <Icon name="check" size={17} />
                        </span>
                      )}
                    </div>
                    <div className="journey-copy">
                      <h3>{l.name}</h3>
                      <p>{l.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <aside className="adventure-sidebar">
            <ProfileMini
              profile={storage.profile}
              nft={nft}
              onOpen={() => go("character")}
            />
            <section className="quest-panel">
              <div className="section-heading">
                <h3>The heartseed hunt</h3>
                <Icon name="flag" size={18} />
              </div>
              <p>
                The Iron Gnaw took the burrow’s heartseed. A twig, a little
                courage, and you stand in its way.
              </p>
              <div className="quest-detail">
                <Icon name="spark" size={21} />
                <div>
                  <strong>Leave no nook unexplored</strong>
                  <span>Find all 3 hidden keepsakes.</span>
                </div>
              </div>
              <p className="caption">
                In-game challenge ·{" "}
                {isMenu
                  ? "Three worlds to explore"
                  : `${snapshot.relics} / 3 keepsakes found`}
              </p>
            </section>
            <section className="checkin-panel">
              <div className="section-heading">
                <h3>Daily check-in</h3>
                <Icon name="lock" size={17} />
              </div>
              <p className="muted">On-chain check-in is unavailable.</p>
              <button
                className="text-button"
                onClick={() => {
                  pauseForUI();
                  setModal("integrations");
                }}
              >
                Why unavailable? <Icon name="right" size={15} />
              </button>
            </section>
            <Wheel />
          </aside>
        </div>
        {tab === "character" && (
          <section className="panel-page">
            <h1 className="panel-title">Character</h1>
            <CharacterPanel
              storage={storage}
              onChange={refresh}
              nft={nft}
              onNft={changeNft}
            />
          </section>
        )}
        {tab === "leaderboard" && (
          <section className="panel-page">
            <h1 className="panel-title">Leaderboard</h1>
            <LeaderboardPanel storage={storage} onPlay={() => go("play")} />
          </section>
        )}
        {tab === "settings" && (
          <section className="panel-page settings-page">
            <h1 className="panel-title">Settings</h1>
            <SettingsPanel
              settings={settings}
              onChange={updateSettings}
              audioFailed={audio.failed}
            />
            <section className="settings-integrations">
              <h3>Connections & local data</h3>
              <p>
                Wallet identity is optional. Progress and scores are stored on
                this browser.
              </p>
              <button
                className="secondary"
                onClick={() => setModal("integrations")}
              >
                View integration details <Icon name="external" size={16} />
              </button>
            </section>
          </section>
        )}
        <footer className="site-footer">
          <span>
            <span className="status-dot" /> Squeekchain · Sepolia testnet
          </span>
          <span className="footer-center">
            Made for small paws and big adventures.
          </span>
          <button
            className="text-button"
            onClick={() => {
              pauseForUI();
              setModal("integrations");
            }}
          >
            About & connections <Icon name="external" size={13} />
          </button>
        </footer>
        {networkOffline && (
          <p className="offline-notice" role="status">
            You’re offline. The adventure still works; wallet and live activity
            need a connection.
          </p>
        )}
      </main>
      {modal === "help" && (
        <Modal
          title="A field guide for small paws"
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              Recover the heartseed through three worlds, then defeat the Iron
              Gnaw. Collect enough seeds to open each passage.
            </p>
            <dl className="help-controls">
              <div>
                <dt>Move</dt>
                <dd>A / D or left / right arrows</dd>
              </div>
              <div>
                <dt>Jump</dt>
                <dd>Space / W / up arrow. Hold for height.</dd>
              </div>
              <div>
                <dt>Attack</dt>
                <dd>J or X. Hold to keep swinging.</dd>
              </div>
              <div>
                <dt>Dash / dodge</dt>
                <dd>K / Shift / Z. Briefly pass through attacks.</dd>
              </div>
              <div>
                <dt>Pause</dt>
                <dd>Escape or the pause button</dd>
              </div>
              <div>
                <dt>On a phone</dt>
                <dd>Use the touch buttons. Hold a direction and tap Jump.</dd>
              </div>
            </dl>
            <h3>A few friendly tips</h3>
            <ul>
              <li>
                Enemies signal their attacks. Jump on beetles or strike with
                your twig.
              </li>
              <li>Flags save your checkpoint and restore your hearts.</li>
              <li>
                Jump the boss’s shockwaves. Its exposed core is your chance to
                attack.
              </li>
              <li>
                Try Gentle adventure in Settings for more hearts and longer
                protection.
              </li>
            </ul>
            <button className="primary full" onClick={() => setModal(null)}>
              Ready to explore
            </button>
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <SettingsPanel
            settings={settings}
            onChange={updateSettings}
            audioFailed={audio.failed}
          />
        </Modal>
      )}
      {modal === "integrations" && (
        <Modal title="About & connections" wide onClose={() => setModal(null)}>
          <IntegrationNotes />
        </Modal>
      )}
      {modal === "new-run" && (
        <Modal title="Start a new adventure?" onClose={() => setModal(null)}>
          <p>
            Your current checkpoint will be replaced. Earned XP, points,
            cosmetics, and achievements stay with you.
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setModal(null)}>
              Keep current adventure
            </button>
            <button
              className="primary"
              onClick={() => {
                setModal(null);
                start(false);
              }}
            >
              Start new adventure
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
