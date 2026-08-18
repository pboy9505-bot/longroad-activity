import React, { useReducer } from "react";
import {
  initSetup, reducer, startJourney, advanceDay, maybeCombat, maybeEvent, resolveEvent,
  chooseBranch, crossFerry, resupply, sellCargo, buyGoods, seasonStage, coldFor, totalRemaining,
  loadoutCost, teamSize, cargoUsed, optionAvailable, actorFor,
  buildRoadBattle, buildBossBattle, bossModsFromFlags, battleDispatch, finishBattle, stepToPlayer, playerAction, moveUsable, checkResult, statusMods, living, getC, curUid,
  combatChanceFor, regionTable, resolveBeat, winGame, sellPrice, buyPrice,
  ZONES, ROUTE, ROSTER, BY_ID, EVENTS, BEATS, BRANCHES, GOODS, ANIMALS, WAGONS, ROLES, ROLE_ORDER,
  MOVES, ENEMIES, ENCOUNTERS, REGION_COMBAT, WILD_BY_ZONE, COMBAT_ITEMS, STRAND_DAY,
  VALUABLES, RELICS, ITEMS, relicFx, repFx, XP_THRESH, MAX_LEVEL,
  clamp, roll, startBuyPrice, SANDPOINT, ZONE_COST, DRIVER_FEE, DRIVER_WAGE, INTRO, INTRO_START, PACES, SKILL_LABEL, dfmt,
} from "./engine.js";

/* =============================== THEME ============================= */
/* Ancient tome: aged vellum, iron-gall ink, oxblood wax seals, faded indigo.
   Signature: frost creeps across the parchment from the edges as winter nears. */
const VELLUM = "#e8dcbf", VELLUM2 = "#ddceac", INK = "#2a2013", INK2 = "#4a3a24";
const SEPIA = "#7a5a32", WAX = "#7c2a1c", INDIGO = "#3a4664", GILT = "#9c7a34", MOSS = "#5f6a34", FROST = "#3f6a86";

function GlobalStyle() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=IM+Fell+English+SC&display=swap');
    .tome * { box-sizing: border-box; }
    .tome { font-family:'EB Garamond',Georgia,serif; color:${INK}; }
    .disp { font-family:'Cinzel',serif; letter-spacing:.02em; }
    .sc { font-family:'IM Fell English SC',serif; letter-spacing:.04em; }
    .btn { font-family:'IM Fell English SC',serif; letter-spacing:.03em; cursor:pointer; border:1px solid ${INK2};
      background:linear-gradient(${VELLUM},${VELLUM2}); color:${INK}; padding:9px 13px; border-radius:2px;
      transition:transform .08s ease, box-shadow .12s ease, background .12s ease; box-shadow:0 1px 0 rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.35); }
    .btn:hover:not(:disabled){ transform:translateY(-1px); box-shadow:0 3px 8px rgba(40,25,10,.22), inset 0 1px 0 rgba(255,255,255,.4); }
    .btn:active:not(:disabled){ transform:translateY(0); }
    .btn:disabled{ opacity:.4; cursor:not-allowed; }
    .btn:focus-visible{ outline:2px solid ${WAX}; outline-offset:2px; }
    .btn.seal{ border-color:${WAX}; color:${WAX}; }
    .btn.on{ background:linear-gradient(${INK},#3a2c18); color:${VELLUM}; border-color:${INK}; }
    .card{ border:1px solid rgba(74,58,36,.5); background:rgba(255,250,235,.28); border-radius:3px; }
    .rule{ height:1px; background:linear-gradient(90deg,transparent,rgba(74,58,36,.5),transparent); border:0; margin:14px 0; }
    .stepbtn{ font-family:'IM Fell English SC',serif; width:26px; height:26px; line-height:1; cursor:pointer; border:1px solid ${INK2}; background:${VELLUM}; color:${INK}; border-radius:2px; }
    .stepbtn:hover{ background:${VELLUM2}; }
    .link{ cursor:pointer; text-decoration:underline dotted; }
    .classcard{ font-family:'IM Fell English SC',serif; cursor:pointer; border:1px solid ${INK2}; background:linear-gradient(${VELLUM},${VELLUM2}); color:${INK}; border-radius:3px; padding:12px 10px 10px; display:flex; flex-direction:column; align-items:center; text-align:center; transition:box-shadow .15s ease, transform .1s ease, border-color .15s ease; box-shadow:0 1px 0 rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.35); }
    .classcard:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 5px 14px rgba(40,25,10,.2), inset 0 1px 0 rgba(255,255,255,.4); }
    .classcard:disabled{ opacity:.4; cursor:not-allowed; }
    .classcard:focus-visible{ outline:2px solid ${WAX}; outline-offset:2px; }
    .classcard.on{ border-color:${WAX}; box-shadow:inset 0 0 0 2px ${WAX}; background:linear-gradient(#f0e7cf,#e6d9b8); }
    .cc-name{ font-family:'Cinzel',serif; font-size:15px; margin-top:6px; color:${INK}; }
    .cc-cls{ font-size:11px; color:${SEPIA}; margin-top:1px; }
    .cc-caret{ font-size:9.5px; letter-spacing:.06em; color:${SEPIA}; opacity:.65; margin-top:4px; transition:opacity .2s ease; }
    .classcard:hover .cc-caret, .classcard:focus-within .cc-caret, .classcard.on .cc-caret{ opacity:0; height:0; margin:0; }
    .cc-details{ width:100%; max-height:0; opacity:0; overflow:hidden; text-align:left; transition:max-height .3s ease, opacity .22s ease, margin-top .22s ease; }
    .classcard:hover .cc-details, .classcard:focus-within .cc-details, .classcard.on .cc-details{ max-height:340px; opacity:1; margin-top:9px; }
    .cc-row{ font-size:11.5px; color:${INK}; line-height:1.45; padding:2px 0; border-top:1px dotted rgba(74,58,36,.2); }
    .cc-row:first-child{ border-top:0; }
    .cc-lab{ color:${SEPIA}; font-size:9.5px; letter-spacing:.04em; margin-right:5px; text-transform:uppercase; }
    .cc-role{ font-style:italic; color:${INK2}; font-family:'EB Garamond',serif; font-size:12px; margin-top:5px; line-height:1.4; }
    .tok{ cursor:default; transition:transform .1s ease, box-shadow .12s ease; }
    .tok.sel:hover{ transform:translateY(-2px); }
    .fx{ position:absolute; font-family:'Cinzel',serif; font-weight:700; animation:floatUp 1s ease forwards; pointer-events:none; }
    @keyframes floatUp{ 0%{opacity:0;transform:translateY(4px)} 20%{opacity:1} 100%{opacity:0;transform:translateY(-22px)} }
    @keyframes fadeUp{ from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dieRoll{ 0%{transform:rotate(-10deg) scale(.85);opacity:0} 60%{transform:rotate(5deg) scale(1.06)} 100%{transform:rotate(0) scale(1);opacity:1} }
    @media (prefers-reduced-motion: reduce){ .btn,.anim,.fx,.tok{ transition:none!important; animation:none!important; } }
    `}</style>
  );
}

/* =============================== UI: SHARED ======================= */
function Bar({ v, max, tint, low }) {
  const pct = clamp((v / max) * 100, 0, 100);
  const danger = low != null && v <= low;
  return (
    <div style={{ height: 9, background: "rgba(60,44,24,.16)", borderRadius: 1, overflow: "hidden", border: "1px solid rgba(74,58,36,.35)" }}>
      <div style={{ width: pct + "%", height: "100%", background: danger ? WAX : tint, transition: "width .3s ease" }} />
    </div>
  );
}
function Stat({ label, value, sub }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="sc" style={{ fontSize: 12, color: SEPIA }}>{label}</span>
        <span className="disp" style={{ fontSize: 13, color: INK }}>{value}</span>
      </div>
      {sub}
    </div>
  );
}
function Die({ chk }) {
  if (!chk) return null;
  const face = chk.took10 ? "10" : chk.die;
  const col = chk.tier === "critsuccess" ? MOSS : chk.tier === "success" ? INK : chk.tier === "fail" ? SEPIA : WAX;
  return (
    <div className="anim" style={{ display: "inline-flex", alignItems: "center", gap: 8, animation: "dieRoll .4s ease", margin: "2px 0" }}>
      <span className="disp" style={{ width: 30, height: 30, border: `1.5px solid ${col}`, color: col, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 14, background: "rgba(255,250,235,.5)" }}>{face}</span>
      <span className="sc" style={{ fontSize: 12, color: SEPIA }}>{chk.who ? chk.who + " · " : ""}{chk.skill} {chk.mod >= 0 ? "+" + chk.mod : chk.mod} vs {chk.dc} → <b style={{ color: col }}>{chk.tier}</b></span>
    </div>
  );
}
function Section({ title, right, children }) {
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="disp" style={{ fontSize: 14, color: INK, textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
function Heading({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="disp" style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: ".03em" }}>{children}</div>
      {sub && <div style={{ fontSize: 14, color: INK2, fontStyle: "italic", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* --- Party select (all eleven; compact glyphs that open on hover) --- */
function PartyScreen({ s, dispatch }) {
  return (
    <div>
      <Heading sub="Eleven answer the call, one of each calling. Hover or tap a sigil for the full sheet; choose four to make the run.">Assemble the Company</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(158px,1fr))", gap: 10, alignItems: "start" }}>
        {ROSTER.map((m) => {
          const on = s.picked.includes(m.id);
          const full = s.picked.length >= 4 && !on;
          const C = m.combat;
          const topSkills = Object.entries(m.skills).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${SKILL_LABEL[k] || k} ${v}`).join(" · ");
          const roles = m.best.map((r) => ROLES[r].label.split(" ")[0]).join(" · ");
          const moves = C.moves.map((id) => MOVES[id].name).join(" · ");
          return (
            <button key={m.id} className={"classcard anim" + (on ? " on" : "")} onClick={() => dispatch({ type: "PICK", id: m.id })} disabled={full} aria-pressed={on} style={{ animation: "fadeUp .3s ease" }}>
              <ClassGlyph cls={m.cls} />
              <div className="cc-name">{m.name}</div>
              <div className="cc-cls">{on ? "✦ chosen" : m.cls}</div>
              <div className="cc-caret">▾ details</div>
              <div className="cc-details">
                <div className="cc-row"><span className="cc-lab">Vitals</span>HP {C.hp} · AC {C.ac} · atk +{C.atk}</div>
                <div className="cc-row"><span className="cc-lab">Saves</span>Fort +{C.saves.fort} · Ref +{C.saves.ref} · Will +{C.saves.will}</div>
                <div className="cc-row"><span className="cc-lab">Sharp at</span>{topSkills}</div>
                <div className="cc-row"><span className="cc-lab">Road roles</span>{roles}</div>
                <div className="cc-row"><span className="cc-lab">Kit</span>{moves}</div>
                <div className="cc-role">{C.role}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
        <span className="sc" style={{ color: SEPIA }}>{s.picked.length} / 4 chosen{s.picked.length ? " · " + s.picked.map((id) => BY_ID[id].name).join(", ") : ""}</span>
        <button className="btn seal on" disabled={s.picked.length !== 4} onClick={() => dispatch({ type: "CONFIRM_PARTY" })}>Outfit the caravan →</button>
      </div>
    </div>
  );
}

/* --- Outfitting --- */
function Stepper({ label, note, value, unit, onDec, onInc, decOff, incOff }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        {note && <span className="sc" style={{ fontSize: 10.5, color: SEPIA, marginLeft: 6 }}>{note}</span>}
      </div>
      <button className="stepbtn" onClick={onDec} disabled={decOff}>–</button>
      <span className="disp" style={{ minWidth: 44, textAlign: "center", fontSize: 14 }}>{value}{unit}</span>
      <button className="stepbtn" onClick={onInc} disabled={incOff}>+</button>
    </div>
  );
}
function OutfitScreen({ s, dispatch }) {
  const lo = s.loadout; const spent = loadoutCost(lo); const left = s.START_GOLD - spent;
  const cap = WAGONS[lo.wagons].cap; const used = cargoUsed(lo);
  const ORDU = ROUTE.find((n) => n.name === "Ordu-Aganhei");
  const eastPrice = (g) => Math.round(GOODS[g].base * ((ORDU.market && ORDU.market[g]) || 0.8));
  const projected = Object.entries(lo.cargo).reduce((t, [g, q]) => t + q * eastPrice(g), 0);
  const offered = Object.keys(GOODS).filter((g) => SANDPOINT.offers && SANDPOINT.offers[g] != null);
  return (
    <div>
      <Heading sub={`A purse of ${s.START_GOLD} gp against fourteen hundred miles. Sandpoint sells cloth, glass, iron, and reagents cheap, but furs and whale-oil for the ice you must buy later, in the north.`}>Outfit at Sandpoint</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Section title="Draft team">
          {Object.entries(ANIMALS).map(([k, a]) => (
            <button key={k} className={"btn anim" + (lo.animal === k ? " on" : "")} onClick={() => dispatch({ type: "SET_ANIMAL", animal: k })}
              style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "7px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{a.label}</span><span className="disp">{a.cost} gp ea.</span></div>
              <div className="sc" style={{ fontSize: 10.5, color: lo.animal === k ? VELLUM2 : SEPIA }}>{a.note}</div>
            </button>
          ))}
          <div className="sc" style={{ fontSize: 11, color: SEPIA, marginTop: 4 }}>Team of {teamSize(lo.wagons)} needed for {lo.wagons} wagon{lo.wagons > 1 ? "s" : ""}.</div>
        </Section>
        <Section title="Caravan">
          {Object.entries(WAGONS).map(([n, w]) => (
            <button key={n} className={"btn anim" + (String(lo.wagons) === n ? " on" : "")} onClick={() => dispatch({ type: "SET_WAGONS", n: Number(n) })}
              style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "7px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>{n} wagon{n > "1" ? "s" : ""}</span><span className="disp">{w.cost} gp · cap {w.cap}</span></div>
              <div className="sc" style={{ fontSize: 10.5, color: String(lo.wagons) === n ? VELLUM2 : SEPIA }}>{w.note}</div>
            </button>
          ))}
          <button className={"btn anim" + (lo.hiredDriver ? " on" : "")} onClick={() => dispatch({ type: "HIRE_DRIVER_OUTFIT" })}
            style={{ display: "block", width: "100%", textAlign: "left", marginTop: 4, padding: "7px 10px", borderColor: lo.hiredDriver ? MOSS : undefined }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{lo.hiredDriver ? "✓ Teamster hired" : "Hire a teamster"}</span><span className="disp">{DRIVER_FEE} gp · {DRIVER_WAGE}/day</span></div>
            <div className="sc" style={{ fontSize: 10.5, color: lo.hiredDriver ? VELLUM2 : SEPIA }}>A hired hand drives the team, freeing all four of your company for other work.</div>
          </button>
        </Section>
      </div>
      <Section title="Provisions">
        {[["food", "Food", "for the party"], ["water", "Water", "for the party"], ["feed", "Feed", "for the team"], ["medicine", "Medicine", "6 gp ea.; also field draughts in a fight"], ["repair", "Repair stock", "4 gp ea."], ["ammo", "Arrows", "hunting, and thrown flasks in a fight"]].map(([k, label, note]) => (
          <Stepper key={k} label={label} note={note} value={lo[k]} unit="" onDec={() => dispatch({ type: "SET_SUPPLY", k, d: -2 })} onInc={() => dispatch({ type: "SET_SUPPLY", k, d: 2 })} decOff={lo[k] <= 0} />
        ))}
      </Section>
      <Section title="Trade goods (Sandpoint prices)" right={<span className="sc" style={{ fontSize: 11, color: used > cap ? WAX : SEPIA }}>hold {used} / {cap}</span>}>
        {offered.map((g) => { const gd = GOODS[g]; const bp = startBuyPrice(g); return (
          <div key={g} style={{ borderBottom: "1px dotted rgba(74,58,36,.25)", padding: "4px 0" }}>
            <Stepper label={gd.label} note={`buy ${bp} gp · Ordu ~${eastPrice(g)} gp · bulk ${gd.bulk}`} value={lo.cargo[g] || 0} unit=""
              onDec={() => dispatch({ type: "SET_CARGO", g, d: -1 })} onInc={() => dispatch({ type: "SET_CARGO", g, d: 1 })} decOff={(lo.cargo[g] || 0) <= 0} incOff={used + gd.bulk > cap} />
            <div className="sc" style={{ fontSize: 10.5, color: SEPIA, marginTop: -2 }}>{gd.note}</div>
          </div>
        ); })}
        {projected > 0 && <div className="sc" style={{ fontSize: 11, color: MOSS, marginTop: 6 }}>Projected value at Ordu-Aganhei: ~{projected} gp (before the market shifts under you).</div>}
      </Section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, position: "sticky", bottom: 0, background: "rgba(232,220,191,.9)", padding: "8px 0" }}>
        <button className="btn" onClick={() => dispatch({ type: "BACK_PARTY" })}>← Party</button>
        <span className="disp" style={{ fontSize: 15, color: left < 0 ? WAX : INK }}>Spent {spent} · {left < 0 ? `over by ${-left}` : `${left} gp left`}</span>
        <button className="btn seal on" disabled={left < 0} onClick={() => dispatch({ type: "START" })}>Roll out →</button>
      </div>
    </div>
  );
}

/* =============================== UI: COMBAT ======================= */
function HpBar({ c }) {
  const pct = clamp((c.hp / c.maxHp) * 100, 0, 100);
  const col = c.side === "foe" ? WAX : c.hp / c.maxHp < 0.3 ? WAX : MOSS;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ height: 8, background: "rgba(60,44,24,.16)", borderRadius: 1, border: "1px solid rgba(74,58,36,.35)", overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: col, transition: "width .35s ease" }} />
      </div>
      {c.tempHp > 0 && <div className="sc" style={{ fontSize: 9, color: INDIGO, position: "absolute", right: 0, top: 8 }}>+{c.tempHp} vigour</div>}
    </div>
  );
}
function StatusChips({ c }) {
  if (!c.statuses.length) return null;
  return <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 3 }}>
    {c.statuses.map((s, i) => { const good = (s.atk > 0 || s.dmg > 0 || (s.soak && s.soak < 1) || s.ac > 0); return <span key={i} className="sc" style={{ fontSize: 9, padding: "0 4px", borderRadius: 2, border: `1px solid ${good ? MOSS : WAX}`, color: good ? MOSS : WAX }}>{s.k}{s.dur > 1 ? " " + s.dur : ""}</span>; })}
  </div>;
}
function Fx({ fx, uid }) {
  if (!fx || fx.uid !== uid || !fx.amount) return null;
  const col = fx.kind === "heal" ? MOSS : fx.kind === "crit" ? WAX : INK;
  return <span className="fx" style={{ color: col, left: "50%", top: -6, fontSize: fx.kind === "crit" ? 20 : 16 }}>{fx.kind === "heal" ? "+" : "−"}{fx.amount}{fx.kind === "crit" ? "!" : ""}</span>;
}
function Combatant({ c, selectable, onClick, fx, dim }) {
  return (
    <div className={"card tok" + (selectable ? " sel" : "")} onClick={selectable ? onClick : undefined}
      style={{ padding: "8px 10px", position: "relative", opacity: c.hp <= 0 ? 0.4 : dim ? 0.75 : 1, borderColor: selectable ? WAX : "rgba(74,58,36,.5)", boxShadow: selectable ? `0 0 0 1px ${WAX}` : undefined, cursor: selectable ? "pointer" : "default", filter: c.hp <= 0 ? "grayscale(1)" : undefined }}>
      <Fx fx={fx} uid={c.uid} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="disp" style={{ fontSize: 13, color: c.boss ? WAX : INK }}>{c.name}{c.boss ? " ✦" : ""}</span>
        <span className="sc" style={{ fontSize: 11, color: c.hp <= 0 ? WAX : SEPIA }}>{c.hp <= 0 ? "down" : `${c.hp}/${c.maxHp}`}</span>
      </div>
      <HpBar c={c} />
      <StatusChips c={c} />
    </div>
  );
}
const labelRes = (k) => ({ spells1: "1st", spells2: "2nd", spells3: "3rd", channels: "channel", rage: "rage", performance: "song", ki: "ki", smite: "smite", layOnHands: "hands" }[k] || k);
function ResPips({ c }) {
  const keys = Object.keys(c.res || {}).filter((k) => c.res[k] != null);
  if (!keys.length) return <span className="sc" style={{ fontSize: 10, color: SEPIA }}>at-will</span>;
  return <span className="sc" style={{ fontSize: 10, color: SEPIA }}>{keys.map((k) => `${labelRes(k)} ${c.res[k]}`).join(" · ")}</span>;
}
function moveTag(mv) {
  const cost = mv.cost ? Object.entries(mv.cost).map(([k, v]) => `${v} ${labelRes(k)}`).join(", ") : null;
  const bits = [];
  if (mv.dmg) bits.push(dfmt(mv.dmg) + (mv.sneak ? " +sneak" : mv.extraTargets ? " ×2 foes" : mv.extraHits ? " ×2 hits" : mv.kind === "save" ? " AoE save" : mv.kind === "touch" || mv.touchHit ? " touch" : mv.kind === "auto" ? " auto-hit" : ""));
  if (mv.heal) bits.push("heal " + dfmt(mv.heal));
  if (mv.kind === "buff" || mv.kind === "debuff" || mv.kind === "rage") bits.push(mv.status ? mv.status.k : "effect");
  if (cost) bits.push(cost); else if (!mv.heal && mv.kind !== "buff") bits.push("at-will");
  return bits.join(" · ");
}
function CommandMenu({ b, dispatch }) {
  const actor = getC(b, b.awaiting);
  if (!actor) return null;
  if (b.ui.mode === "item") {
    const items = Object.keys(COMBAT_ITEMS).filter((k) => (b.supply[COMBAT_ITEMS[k].supply] || 0) >= COMBAT_ITEMS[k].cost);
    const satchel = Object.keys(ITEMS).filter((k) => (b.bag && b.bag[k] || 0) > 0);
    return (
      <div className="card" style={{ padding: 12 }}>
        <div className="disp" style={{ fontSize: 13, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>{actor.name} · the stores</div>
        {items.length ? items.map((k) => { const it = COMBAT_ITEMS[k]; return (
          <button key={k} className="btn" onClick={() => dispatch({ type: "BT_CHOOSE_ITEM", id: k })} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}>
            {it.name} <span className="sc" style={{ fontSize: 10, color: SEPIA }}>×{b.supply[it.supply]} {it.supply} · {it.desc}</span>
          </button>
        ); }) : <div className="sc" style={{ fontSize: 12, color: SEPIA }}>No draughts or flasks to hand.</div>}
        {satchel.length > 0 && <div className="sc" style={{ fontSize: 10.5, color: WAX, margin: "8px 0 4px", letterSpacing: ".06em" }}>RARE FINDS</div>}
        {satchel.map((k) => { const it = ITEMS[k]; return (
          <button key={k} className="btn" onClick={() => dispatch({ type: "BT_CHOOSE_ITEM", id: k })} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, borderColor: WAX }}>
            {it.name} <span className="sc" style={{ fontSize: 10, color: SEPIA }}>×{b.bag[k]} · {it.desc}</span>
          </button>
        ); })}
        <button className="btn seal" onClick={() => dispatch({ type: "BT_CANCEL" })} style={{ marginTop: 4 }}>← Back</button>
      </div>
    );
  }
  if (b.ui.mode === "target") {
    return <div className="card" style={{ padding: 12 }}>
      <div className="sc" style={{ fontSize: 12, color: WAX, marginBottom: 6 }}>Choose a target.</div>
      <button className="btn seal" onClick={() => dispatch({ type: "BT_CANCEL" })}>← Back</button>
    </div>;
  }
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="disp" style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: ".06em" }}>{actor.name}</span>
        <ResPips c={actor} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {actor.moves.map((mid) => { const mv = MOVES[mid]; const usable = moveUsable(actor, mv); return (
          <button key={mid} className="btn" disabled={!usable} onClick={() => dispatch({ type: "BT_CHOOSE_MOVE", id: mid })} title={mv.desc}
            style={{ textAlign: "left", padding: "7px 9px", minHeight: 46 }}>
            <div style={{ fontSize: 12.5 }}>{mv.name}</div>
            <div className="sc" style={{ fontSize: 9.5, color: usable ? SEPIA : WAX }}>{moveTag(mv)}</div>
          </button>
        ); })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="btn seal" style={{ flex: 1 }} onClick={() => dispatch({ type: "BT_OPEN_BAG" })} title="Use a draught, flask, or rare find from the satchel.">Item</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => dispatch({ type: "BT_STRIKE" })} title="A basic weapon attack, always available, never runs out. Your reliable option when spells, ki, or rage are spent.">Strike</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => dispatch({ type: "BT_FLEE" })} title="Try to break contact and escape the fight. Harder against more foes; fleeing a story boss loses the run.">Flee</button>
      </div>
      <div className="sc" style={{ fontSize: 10, color: SEPIA, marginTop: 8, fontStyle: "italic" }}>Hover a move for what it does. Draughts and flasks are drawn from the caravan's stores.</div>
    </div>
  );
}

function RoadBattle({ s, dispatch }) {
  const b = s.battle;
  const foes = b.combatants.filter((c) => c.side === "foe");
  const party = b.combatants.filter((c) => c.side === "party");
  const targeting = b.ui.mode === "target";
  const tSide = targeting ? (b.ui.pending.target === "enemy" ? "foe" : b.ui.pending.target === "ally" ? "party" : null) : null;
  const cur = b.awaiting ? getC(b, b.awaiting) : null;
  return (
    <div className="card anim" style={{ padding: 14, animation: "fadeUp .35s ease", borderColor: WAX, borderWidth: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="disp" style={{ fontSize: 18, color: WAX }}>{ENCOUNTERS[b.encId].name} ⚔</div>
        <div className="sc" style={{ fontSize: 12, color: SEPIA }}>Round {b.round}</div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {b.order.map((uid) => { const c = getC(b, uid); const isCur = uid === curUid(b) && !b.result; return (
          <span key={uid} className="sc" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 2, border: `1px solid ${isCur ? WAX : "rgba(74,58,36,.4)"}`, background: isCur ? "rgba(124,42,28,.1)" : c.hp <= 0 ? "transparent" : "rgba(255,250,235,.3)", color: c.hp <= 0 ? SEPIA : c.side === "foe" ? WAX : INK, textDecoration: c.hp <= 0 ? "line-through" : "none", opacity: c.hp <= 0 ? 0.5 : 1 }}>{c.name}</span>
        ); })}
      </div>
      <div className="card" style={{ padding: "10px 12px", marginBottom: 10 }}>
        <div className="sc" style={{ fontSize: 11, color: WAX, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>The foe</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
          {foes.map((c) => <Combatant key={c.uid} c={c} fx={b.lastFx} selectable={targeting && tSide === "foe" && c.hp > 0} onClick={() => dispatch({ type: "BT_TARGET", uid: c.uid })} />)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 10, alignItems: "start" }}>
        <div className="card" style={{ padding: "10px 12px" }}>
          <div className="sc" style={{ fontSize: 11, color: MOSS, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>The company</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {party.map((c) => <Combatant key={c.uid} c={c} fx={b.lastFx} dim={cur && cur.uid !== c.uid} selectable={targeting && tSide === "party" && c.hp > 0} onClick={() => dispatch({ type: "BT_TARGET", uid: c.uid })} />)}
          </div>
        </div>
        <div>
          {cur && <CommandMenu b={b} dispatch={dispatch} />}
          <div className="card" style={{ padding: "8px 12px", marginTop: 10 }}>
            <div className="sc" style={{ fontSize: 10, color: SEPIA, marginBottom: 4, textTransform: "uppercase" }}>Battle log</div>
            <div style={{ maxHeight: 170, overflowY: "auto" }}>
              {b.log.map((l, i) => <div key={i} style={{ fontSize: 12, lineHeight: 1.4, padding: "2px 0", borderBottom: "1px dotted rgba(74,58,36,.16)", color: l.k === "heal" ? MOSS : l.k === "buff" ? INDIGO : l.k === "debuff" || l.k === "bad" ? WAX : l.k === "start" ? INDIGO : INK2 }}>{l.t}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================== UI: ROAD ========================= */
function RoleBoard({ s, dispatch }) {
  return (
    <Section title="The day's work" right={<span className="sc" style={{ fontSize: 11, color: SEPIA }}>assign each hand</span>}>
      {s.party.map((p) => {
        const M = BY_ID[p.id]; const down = p.hp <= 0;
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", opacity: down ? 0.45 : 1, borderBottom: "1px dotted rgba(74,58,36,.2)" }}>
            <div style={{ width: 92 }}>
              <div className="disp" style={{ fontSize: 13 }}>{M.name}</div>
              <div className="sc" style={{ fontSize: 10, color: p.injury || p.disease ? WAX : SEPIA }}>{down ? "down" : p.disease ? `ill: ${p.disease}` : p.injury ? `hurt: ${p.injury}` : M.cls}</div>
            </div>
            <div style={{ flex: 1 }}>
              <select className="btn" disabled={down} value={s.roles[p.id] || "drive"} onChange={(e) => dispatch({ type: "SET_ROLE", id: p.id, role: e.target.value })}
                title={ROLES[s.roles[p.id] || "drive"].desc}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}>
                {ROLE_ORDER.map((r) => <option key={r} value={r} title={ROLES[r].desc}>{ROLES[r].label}{M.best.includes(r) ? " ✦" : ""}</option>)}
              </select>
              {!down && <div className="sc" style={{ fontSize: 10, color: SEPIA, marginTop: 3, lineHeight: 1.35 }}>{ROLES[s.roles[p.id] || "drive"].desc}</div>}
            </div>
          </div>
        );
      })}
      <div className="sc" style={{ fontSize: 10.5, color: SEPIA, marginTop: 6 }}>✦ marks a role this traveler is suited to; they reach outcomes others cannot. Keep at least one hand on the reins, and a guard to blunt the next ambush.</div>
    </Section>
  );
}
function TradePanel({ s, dispatch }) {
  const node = ROUTE[s.legIndex]; if (!node.town) return null;
  const cap = WAGONS[s.wagons].cap; const used = cargoUsed(s);
  const sellable = Object.keys(GOODS).filter((g) => (s.cargo[g] || 0) > 0);
  const buyable = Object.keys(GOODS).filter((g) => node.offers && node.offers[g] != null);
  const zoneMul = ZONE_COST[node.zone] || 1;
  return (
    <Section title={`Market at ${node.name}`} right={<span className="sc" style={{ fontSize: 10.5, color: SEPIA }}>hold {used}/{cap}</span>}>
      <button className="btn" onClick={() => dispatch({ type: "RESUPPLY" })} style={{ marginBottom: 8 }}>Resupply provisions{zoneMul >= 2 ? " (dear, this far north)" : ""}</button>
      {s.hiredDriver
        ? <button className="btn" onClick={() => dispatch({ type: "DRIVER", hire: false })} style={{ marginBottom: 8, marginLeft: 6 }}>Pay off the teamster</button>
        : <button className="btn" disabled={s.res.gold < DRIVER_FEE} onClick={() => dispatch({ type: "DRIVER", hire: true })} style={{ marginBottom: 8, marginLeft: 6 }}>Hire a teamster ({DRIVER_FEE} gp)</button>}
      <button className="btn" disabled={s.rumorDone} onClick={() => dispatch({ type: "RUMOR" })} style={{ marginBottom: 8, marginLeft: 6 }} title="Work the market talk (Perception/Diplomacy) to learn what the region ahead pays well for.">{s.rumorDone ? "Asked around ✓" : "Ask around the market"}</button>
      {s.rumor && s.rumor.goods && s.rumor.goods.length > 0 && (
        <div className="sc" style={{ fontSize: 11, color: MOSS, marginBottom: 8, padding: "4px 6px", border: "1px dotted rgba(95,106,52,.5)" }}>
          Rumor, {ZONES[s.rumor.zone].label} pays dear for: {s.rumor.goods.map((g) => GOODS[g].label).join(", ")}.
        </div>
      )}
      {(() => {
        const finds = Object.keys(s.valuables || {}).filter((id) => s.valuables[id] > 0);
        if (!finds.length) return null;
        const mul = relicFx(s).sellMul;
        const total = finds.reduce((t, id) => t + Math.round((VALUABLES[id]?.value || 0) * s.valuables[id] * mul), 0);
        return (
          <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px dotted rgba(74,58,36,.3)" }}>
            <div className="sc" style={{ fontSize: 11, color: WAX, marginBottom: 3 }}>Sell finds (trophies off the fallen):</div>
            <div className="sc" style={{ fontSize: 11.5, color: INK2, marginBottom: 5 }}>{finds.map((id) => `${s.valuables[id]}× ${VALUABLES[id].name}`).join(" · ")}</div>
            <button className="btn seal on" onClick={() => dispatch({ type: "SELL_FINDS" })}>Sell all finds → {total} gp</button>
          </div>
        );
      })()}
      <div className="sc" style={{ fontSize: 11, color: SEPIA, marginBottom: 3 }}>Sell (this town's demand):</div>
      {sellable.length ? sellable.map((g) => (
        <div key={g} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
          <span style={{ fontSize: 12.5 }}>{s.cargo[g]} × {GOODS[g].label} <span className="sc" style={{ color: MOSS, fontSize: 10.5 }}>@ {sellPrice(s, node, g)} gp</span></span>
          <span>
            <button className="stepbtn" onClick={() => dispatch({ type: "SELL", good: g, qty: 1 })}>–1</button>
            <button className="btn" style={{ padding: "2px 8px", marginLeft: 5, fontSize: 11 }} onClick={() => dispatch({ type: "SELL", good: g, qty: 999 })}>sell all</button>
          </span>
        </div>
      )) : <div className="sc" style={{ fontSize: 11, color: SEPIA }}>No wares to sell.</div>}
      {buyable.length ? <>
        <div className="sc" style={{ fontSize: 11, color: SEPIA, margin: "8px 0 3px" }}>Buy (local supply):</div>
        {buyable.map((g) => { const bp = buyPrice(s, node, g); const room = used + GOODS[g].bulk <= cap; const afford = s.res.gold >= bp; return (
          <div key={g} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 0" }}>
            <span style={{ fontSize: 12.5 }}>{GOODS[g].label} <span className="sc" style={{ color: GILT, fontSize: 10.5 }}>@ {bp} gp · bulk {GOODS[g].bulk}</span></span>
            <span>
              <button className="stepbtn" disabled={!room || !afford} onClick={() => dispatch({ type: "BUY", good: g, qty: 1 })}>+1</button>
              <button className="btn" style={{ padding: "2px 8px", marginLeft: 5, fontSize: 11 }} disabled={!room || !afford} onClick={() => dispatch({ type: "BUY", good: g, qty: 5 })}>+5</button>
            </span>
          </div>
        ); })}
      </> : null}
      {(node.zone === "linnorm") && <div className="sc" style={{ fontSize: 10, color: FROST, marginTop: 6 }}>Last chance to lay in furs and whale-oil before the ice. Both keep the cold from killing you, and both sell for a fortune in Tian Xia.</div>}
    </Section>
  );
}
function StoryBeatView({ s, dispatch }) {
  const beat = BEATS[s.beat.key];
  const classesHere = s.picked.map((id) => BY_ID[id].cls);
  return (
    <div className="card anim" style={{ padding: 16, animation: "fadeUp .35s ease", borderColor: WAX, borderWidth: 2 }}>
      <div className="disp" style={{ fontSize: 20, color: WAX, marginBottom: 4 }}>✦ {beat.title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>{beat.body}</div>
      <div style={{ marginBottom: 12 }}>
        {Object.entries(beat.info).filter(([cls]) => classesHere.includes(cls)).map(([cls, txt]) => (
          <div key={cls} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <span className="sc" style={{ fontSize: 10.5, color: INDIGO, minWidth: 62 }}>{cls}</span>
            <span style={{ fontSize: 13, fontStyle: "italic", color: INK2 }}>{txt}</span>
          </div>
        ))}
      </div>
      <hr className="rule" />
      {beat.options.map((o) => {
        const ok = optionAvailable(s, o);
        const locked = o.gate && !ok;
        return (
          <button key={o.id} className="btn" disabled={!ok} onClick={() => dispatch({ type: "BEAT", opt: o.id })}
            style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, borderColor: WAX }}>
            {o.label}{o.skill ? ` · DC ${o.dc}` : ""}
            {locked ? <span className="sc" style={{ fontSize: 10, color: SEPIA }}>  · need the right hand for this</span> : null}
          </button>
        );
      })}
      <div className="sc" style={{ fontSize: 10.5, color: SEPIA, marginTop: 6, fontStyle: "italic" }}>However you go in, a guardian waits beyond. This is do or die, there is no retreat from what comes next.</div>
    </div>
  );
}
function EventView({ s, dispatch }) {
  const ev = EVENTS[s.event.key];
  const classesHere = s.picked.map((id) => BY_ID[id].cls);
  return (
    <div className="card anim" style={{ padding: 16, animation: "fadeUp .35s ease", borderColor: ev.major ? WAX : "rgba(74,58,36,.5)", borderWidth: ev.major ? 2 : 1 }}>
      <div className="disp" style={{ fontSize: 18, color: ev.major ? WAX : INK, marginBottom: 4 }}>{ev.major ? "⚜ " : ""}{ev.title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10 }}>{ev.body}</div>
      <div style={{ marginBottom: 12 }}>
        {Object.entries(ev.info || {}).filter(([cls]) => classesHere.includes(cls)).map(([cls, txt]) => (
          <div key={cls} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <span className="sc" style={{ fontSize: 10.5, color: INDIGO, minWidth: 62 }}>{cls}</span>
            <span style={{ fontSize: 13, fontStyle: "italic", color: INK2 }}>{txt}</span>
          </div>
        ))}
      </div>
      <hr className="rule" />
      {ev.options.map((o) => {
        const ok = optionAvailable(s, o);
        const locked = o.gate && !ok;
        return (
          <button key={o.id} className="btn" disabled={!ok} onClick={() => dispatch({ type: "EVENT", opt: o.id })}
            style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, borderColor: o.battle ? WAX : undefined }}>
            {o.label}{o.skill ? ` · DC ${o.dc}` : ""}
            {locked ? <span className="sc" style={{ fontSize: 10, color: SEPIA }}>  · need the right hand for this</span> : null}
            {!locked && !ok ? <span className="sc" style={{ fontSize: 10, color: WAX }}>  · can't afford it</span> : null}
          </button>
        );
      })}
    </div>
  );
}
function ChoiceView({ title, body, options, onPick, accent }) {
  return (
    <div className="card anim" style={{ padding: 16, animation: "fadeUp .35s ease" }}>
      <div className="disp" style={{ fontSize: 17, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 12 }}>{body}</div>
      {options.map((o) => (
        <button key={o.id} className="btn" onClick={() => onPick(o.id)} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, borderColor: o.tag === "fast" ? accent : undefined }}>
          {o.label} {o.tag ? <span className="sc" style={{ fontSize: 10, color: o.tag === "fast" ? WAX : MOSS }}>· {o.tag}</span> : null}
          {o.note ? <span className="sc" style={{ fontSize: 10.5, color: SEPIA }}>  {o.note}</span> : null}
        </button>
      ))}
    </div>
  );
}
function FerryView({ s, dispatch }) {
  const ice = !!s.ferry.ice;
  const fee = ice ? 55 : 25;
  return (
    <ChoiceView title={`Crossing: ${s.ferry.name}`}
      body={ice ? `Ovorikheer and its like are no place to guess your way. An Aganhei guide will lead the caravan through the ice safe for ${fee} gp, or your own best hand can try to read the ice and save the coin.` : `The ${s.ferry.name} runs high and dark. A ferryman waits with his flat barge (${fee} gp), or you can chance the ford and keep your coin.`}
      options={[{ id: "ferry", label: ice ? `Hire an Aganhei guide (${fee} gp)` : `Take the ferry (${fee} gp)`, tag: "safe" }, { id: "ford", label: ice ? "Navigate the ice yourselves (Survival)" : "Ford it and save the coin", tag: "fast", note: "risk to wagon, team, and party" }]}
      onPick={(id) => dispatch({ type: "FERRY", mode: id })} accent={WAX} />
  );
}

function RoadScreen({ s, dispatch }) {
  const stg = seasonStage(s.day);
  const node = ROUTE[s.legIndex];
  const zone = ZONES[node.zone];
  const cold = coldFor(s);
  const rem = totalRemaining(s);
  const busy = s.event || s.pending || s.ferry || s.beat || s.battle;
  const risk = combatChanceFor(s); // hidden from the player; drives only the mood line
  const danger = s.legDanger[s.legIndex] || 1;
  const threat = node.town || node.type === "city"
    ? "You are within a settlement's walls. Rest easy here, resupply, sell, and see to the wagons."
    : s.scouted
      ? (risk >= 0.28 ? "Your scout comes back grim: fresh sign of trouble, and plenty of it. Ride ready." : risk >= 0.16 ? "Your scout reads old tracks and open country. Stay watchful." : "Your scout finds the way ahead clear enough. Easy going, for now.")
      : (danger >= 3 || zone.cold >= 1 ? "This is hard, lonely country. Anything could be waiting past the next rise." : danger >= 2 ? "The road runs quiet, but you have felt eyes on you before out here." : "The road runs easy under open sky.");
  const coldTxt = cold <= 0 ? null : cold >= 0.9 ? "Killing cold" : cold >= 0.5 ? "Deep cold" : "Cold";
  const fuel = s.cargo.whaleoil || 0, furs = s.cargo.furs || 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="disp" style={{ fontSize: 22, color: INK }}>Day {s.day} · {node.name}</div>
          <div className="sc" style={{ fontSize: 12, color: cold > 0 ? FROST : SEPIA }}>{zone.label} · {s.weather.t}{coldTxt ? ` · ${coldTxt}` : ""} · {rem} mi to Minkai</div>
        </div>
        <div className="sc" style={{ fontSize: 12, color: SEPIA, textAlign: "right" }}>
          {cold > 0
            ? <span>On the ice · <b className="disp" style={{ color: fuel > 0 ? FROST : WAX }}>{fuel}</b> oil · <b className="disp" style={{ color: furs > 0 ? MOSS : WAX }}>{furs}</b> furs<br /></span>
            : <span>{stg.label}<br /></span>}
          Purse <b className="disp" style={{ color: GILT }}>{s.res.gold} gp</b>{s.earned > 0 ? ` · earned ${s.earned}` : ""}
          {(() => {
            const lvl = s.level || 5;
            const next = XP_THRESH[lvl + 1];
            return <div className="sc" style={{ fontSize: 10.5, color: INDIGO, marginTop: 1 }}>Company · Level {lvl}{lvl < MAX_LEVEL && next ? ` · ${Math.min(s.xp || 0, next)}/${next} to next` : " · fully seasoned"}</div>;
          })()}
        </div>
      </div>
      <div className="sc" style={{ fontSize: 11, color: risk > 0 ? WAX : MOSS, marginBottom: 10, borderTop: "1px dotted rgba(74,58,36,.3)", borderBottom: "1px dotted rgba(74,58,36,.3)", padding: "4px 0" }}>{threat}</div>
      {(() => {
        const relics = s.relics || [];
        const findsN = Object.values(s.valuables || {}).reduce((t, q) => t + q, 0);
        const itemsN = Object.values(s.items || {}).reduce((t, q) => t + q, 0);
        const rep = s.reputation || 0;
        const repTxt = rep >= 3 ? "renowned for kindness" : rep >= 1 ? "well thought of" : rep <= -3 ? "a name to fear" : rep <= -1 ? "ill-reputed" : null;
        if (!relics.length && !findsN && !itemsN && !repTxt) return null;
        return (
          <div className="sc" style={{ fontSize: 11, color: SEPIA, marginBottom: 10, marginTop: -4 }}>
            <span style={{ color: WAX }}>Satchel:</span>{" "}
            {relics.length > 0 && <span title={relics.map((r) => RELICS[r].desc).join(" · ")} style={{ color: INDIGO }}>{relics.map((r) => RELICS[r].name).join(" · ")}</span>}
            {relics.length > 0 && (findsN || itemsN) ? " · " : ""}
            {itemsN > 0 && <span>{Object.keys(s.items).filter((k) => s.items[k] > 0).map((k) => `${s.items[k]}× ${ITEMS[k].name}`).join(", ")}</span>}
            {itemsN > 0 && findsN ? " · " : ""}
            {findsN > 0 && <span>{findsN} find{findsN === 1 ? "" : "s"} to sell</span>}
            {repTxt && <span style={{ color: rep >= 1 ? MOSS : WAX }}>{(relics.length || findsN || itemsN) ? " · " : ""}The caravan is {repTxt}.</span>}
          </div>
        );
      })()}

      {s.battle ? (
        <RoadBattle s={s} dispatch={dispatch} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(230px,1fr) minmax(300px,1.4fr) minmax(220px,1fr)", gap: 12, alignItems: "start" }}>
          <div>
            <Section title="Stores">
              <Stat label="Food" value={s.res.food} sub={<Bar v={s.res.food} max={80} tint={MOSS} low={8} />} />
              <Stat label="Water" value={s.res.water} sub={<Bar v={s.res.water} max={80} tint={FROST} low={8} />} />
              <Stat label="Feed" value={s.res.feed} sub={<Bar v={s.res.feed} max={60} tint={GILT} low={6} />} />
              <div style={{ display: "flex", gap: 12, marginTop: 4 }} className="sc">
                <span style={{ fontSize: 11, color: SEPIA }}>Med {s.res.medicine}</span>
                <span style={{ fontSize: 11, color: SEPIA }}>Repair {s.res.repair}</span>
                <span style={{ fontSize: 11, color: SEPIA }}>Arrows {s.res.ammo}</span>
              </div>
            </Section>
            <Section title="Caravan">
              <Stat label={`Wagons (${s.wagons})`} value={Math.round(s.wagon)} sub={<Bar v={s.wagon} max={100} tint={SEPIA} low={15} />} />
              <Stat label={`Team (${s.animals}/${s.animalsNeeded} ${ANIMALS[s.animal].label.toLowerCase()})`} value={Math.round(s.animalCond)} sub={<Bar v={s.animalCond} max={100} tint={s.animals < s.animalsNeeded ? WAX : MOSS} low={20} />} />
              <Stat label="Morale" value={Math.round(s.morale)} sub={<Bar v={s.morale} max={100} tint={INDIGO} low={20} />} />
            </Section>
            <Section title="Company">
              {s.party.map((p) => { const M = BY_ID[p.id]; return (
                <div key={p.id} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13 }}>{M.name} <span className="sc" style={{ fontSize: 10, color: p.injury || p.disease ? WAX : SEPIA }}>{p.disease ? p.disease : p.injury ? p.injury : M.cls}</span></span><span className="disp" style={{ fontSize: 12, color: p.hp <= 0 ? WAX : INK }}>{p.hp}/{p.maxHp}</span></div>
                  <Bar v={p.hp} max={p.maxHp} tint={WAX} low={0} />
                </div>
              ); })}
            </Section>
          </div>

          <div>
            {s.beat ? <StoryBeatView s={s} dispatch={dispatch} />
              : s.event ? <EventView s={s} dispatch={dispatch} />
              : s.pending ? <ChoiceView title="A fork in the road" body={BRANCHES[s.pending.kind].prompt} options={BRANCHES[s.pending.kind].options} onPick={(id) => dispatch({ type: "BRANCH", opt: id })} accent={WAX} />
                : s.ferry ? <FerryView s={s} dispatch={dispatch} />
                  : (
                    <div>
                      <RoleBoard s={s} dispatch={dispatch} />
                      <Section title="Pace">
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          {Object.entries(PACES).map(([k, p]) => (
                            <button key={k} className={"btn" + (s.pace === k ? " on" : "")} style={{ flex: 1, padding: "7px 4px", fontSize: 11 }} onClick={() => dispatch({ type: "PACE", pace: k })}>{p.label}</button>
                          ))}
                        </div>
                        <div className="sc" style={{ fontSize: 11, color: SEPIA }}>{PACES[s.pace].hint}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button className="btn seal on" style={{ flex: 2 }} onClick={() => dispatch({ type: "DAY" })}>Break camp & travel</button>
                          <button className="btn" style={{ flex: 1 }} onClick={() => dispatch({ type: "CAMP" })}>Hold camp</button>
                        </div>
                      </Section>
                      {node.town && <TradePanel s={s} dispatch={dispatch} />}
                    </div>
                  )}
            {s.lastCheck && !busy && <div style={{ marginTop: 8 }}><Die chk={s.lastCheck} /></div>}
          </div>

          <div>
            <Section title="The journal">
              <div style={{ maxHeight: 460, overflowY: "auto" }}>
                {s.log.map((l, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.45, padding: "3px 0", borderBottom: "1px dotted rgba(74,58,36,.18)", color: l.k === "bad" ? WAX : l.k === "good" ? MOSS : l.k === "warn" ? SEPIA : l.k === "arrive" ? INDIGO : INK2 }}>
                    {l.t}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function EndScreen({ s, dispatch }) {
  const win = s.over === "win";
  return (
    <div className="card anim" style={{ padding: 22, textAlign: "center", animation: "fadeUp .4s ease", borderColor: win ? MOSS : WAX, borderWidth: 2 }}>
      <div className="disp" style={{ fontSize: 30, color: win ? MOSS : WAX, marginBottom: 8 }}>{win ? "The Road is Beaten" : "The Road Wins"}</div>
      <div style={{ fontSize: 16, lineHeight: 1.55, maxWidth: 560, margin: "0 auto 14px" }}>{s.overWhy}</div>
      {win && s.ledger && (
        <div className="card" style={{ padding: 14, maxWidth: 480, margin: "0 auto 14px", textAlign: "left" }}>
          <div className="disp" style={{ fontSize: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>The chronicle of the road</div>
          <div className="sc" style={{ fontSize: 12, color: SEPIA }}>Ameiko Kaijitsu crowned Empress of Minkai on day {s.ledger.day} of the journey.</div>
          {s.ledger.boons && s.ledger.boons.length > 0
            ? <div style={{ fontSize: 13, marginTop: 6, color: MOSS }}>You came to the throne with {s.ledger.boons.join("; ")}.</div>
            : <div style={{ fontSize: 13, marginTop: 6, color: SEPIA }}>You came to the throne with nothing but grit and steel, and it was, barely, enough.</div>}
          <div className="disp" style={{ fontSize: 18, color: GILT, marginTop: 8 }}>Final purse: {s.ledger.gold} gp{s.ledger.cargoVal > 0 ? <span className="sc" style={{ fontSize: 12, color: SEPIA }}> · {s.ledger.cargoVal} gp still in the wagons</span> : null}</div>
          <div className="sc" style={{ fontSize: 12, color: MOSS }}>Earned trading the length of the world: {s.earned} gp.</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button className="btn seal on" onClick={() => dispatch({ type: "REPLAY" })}>Take the road again</button>
        <button className="btn" onClick={() => dispatch({ type: "TO_TITLE" })}>Back to Sandpoint</button>
      </div>
    </div>
  );
}

/* =============================== INTRO ============================ */
/* A scripted parley at the Bazaar of Sails: the offer that sets the road in
   motion. A small dialogue graph; every branch funnels to party creation. */

/* =============================== UI: FRONT ======================= */
function ClassGlyph({ cls, size = 52 }) {
  const inner = (() => {
    switch (cls) {
      case "Ranger": return (<g fill="none" strokeLinecap="round"><path d="M31 13 Q18 24 31 35" stroke={INK} strokeWidth="2" /><line x1="31" y1="13" x2="31" y2="35" stroke={INK} strokeWidth="1.4" /><line x1="15" y1="24" x2="34" y2="24" stroke={WAX} strokeWidth="2" /><path d="M34 24 l-4 -3 M34 24 l-4 3" stroke={WAX} strokeWidth="2" /></g>);
      case "Cleric": return (<g fill="none" stroke={INK} strokeWidth="2"><circle cx="24" cy="24" r="6" />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i * 45 * Math.PI) / 180; return <line key={i} x1={(24 + Math.cos(a) * 9).toFixed(1)} y1={(24 + Math.sin(a) * 9).toFixed(1)} x2={(24 + Math.cos(a) * 13).toFixed(1)} y2={(24 + Math.sin(a) * 13).toFixed(1)} strokeLinecap="round" />; })}</g>);
      case "Rogue": return (<g fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M24 12 L27 29 L24 32 L21 29 Z" /><line x1="18" y1="29" x2="30" y2="29" /><line x1="24" y1="32" x2="24" y2="37" /></g>);
      case "Wizard": return (<g><line x1="16" y1="33" x2="29" y2="19" stroke={INK} strokeWidth="2" strokeLinecap="round" /><path d="M31 12 L32.6 17 L31 22 L29.4 17 Z" fill={GILT} /><path d="M25 17 L30 18.6 L35 17 L30 15.4 Z" fill={GILT} /></g>);
      case "Fighter": return (<g stroke={INK} strokeLinecap="round"><line x1="24" y1="10" x2="24" y2="30" strokeWidth="2.4" /><line x1="18" y1="30" x2="30" y2="30" strokeWidth="2" /><line x1="24" y1="30" x2="24" y2="36" strokeWidth="2" /><circle cx="24" cy="37.6" r="1.6" fill={INK} stroke="none" /></g>);
      case "Barbarian": return (<g fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="37" x2="31" y2="11" stroke={INK} strokeWidth="2" /><path d="M29 11 C36 13 38 20 35 27 C31 24 27 24 25 25 Z" stroke={INK} strokeWidth="2" /></g>);
      case "Bard": return (<g fill="none" strokeLinecap="round"><path d="M18 34 C15 22 18 15 23 14" stroke={INK} strokeWidth="2" /><path d="M30 34 C33 22 30 15 25 14" stroke={INK} strokeWidth="2" /><line x1="18" y1="34" x2="30" y2="34" stroke={INK} strokeWidth="2" /><line x1="22" y1="18" x2="22" y2="33" stroke={GILT} strokeWidth="1" /><line x1="24" y1="16" x2="24" y2="33" stroke={GILT} strokeWidth="1" /><line x1="26" y1="18" x2="26" y2="33" stroke={GILT} strokeWidth="1" /></g>);
      case "Druid": return (<g fill="none" stroke={MOSS} strokeLinejoin="round"><path d="M24 11 C16 19 16 30 24 37 C32 30 32 19 24 11 Z" strokeWidth="2" /><line x1="24" y1="14" x2="24" y2="35" strokeWidth="1.2" /><path d="M24 21 l-4 2 M24 25 l4 2 M24 29 l-4 2" strokeWidth="1" /></g>);
      case "Monk": return (<g fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><rect x="18" y="21" width="12" height="12" rx="3" /><line x1="21" y1="21" x2="21" y2="18" /><line x1="24" y1="21" x2="24" y2="17" /><line x1="27" y1="21" x2="27" y2="18" /><path d="M18 25 q-3 1 -2 4" /></g>);
      case "Paladin": return (<g strokeLinejoin="round"><path d="M24 11 L34 15 V25 C34 31 29 35 24 37 C19 35 14 31 14 25 V15 Z" fill="none" stroke={INK} strokeWidth="2" /><path d="M24 18 L25.6 23 L24 28 L22.4 23 Z" fill={GILT} /><path d="M19 23 L24 24.6 L29 23 L24 21.4 Z" fill={GILT} /></g>);
      case "Sorcerer": return (<path d="M24 11 C29 17 30 22 26 25 C28 20 24 18 24 18 C24 22 19 23 20 29 C21 35 30 35 30 28 C30 21 26 19 24 11 Z" fill="none" stroke={WAX} strokeWidth="2" strokeLinejoin="round" />);
      default: return null;
    }
  })();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="rgba(255,250,235,.55)" stroke={INK2} strokeWidth="1.4" />
      <circle cx="24" cy="24" r="18" fill="none" stroke={SEPIA} strokeWidth="0.8" strokeDasharray="2 3" />
      {inner}
    </svg>
  );
}
function Portrait({ initial }) {
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden>
      <circle cx="29" cy="29" r="27" fill="rgba(255,250,235,.55)" stroke={INK2} strokeWidth="1.5" />
      <circle cx="29" cy="29" r="22" fill="none" stroke={SEPIA} strokeWidth="1" strokeDasharray="2 3" />
      <text x="29" y="37" textAnchor="middle" fontFamily="Cinzel, serif" fontSize="23" fill={INK}>{initial}</text>
    </svg>
  );
}
function WaxSeal({ size = 74 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 74 74" aria-hidden>
      <circle cx="37" cy="37" r="34" fill={WAX} opacity="0.92" />
      <circle cx="37" cy="37" r="34" fill="none" stroke="#5a1e12" strokeWidth="2" />
      <circle cx="37" cy="37" r="27" fill="none" stroke="#e8dcbf" strokeWidth="1" opacity=".5" />
      <path d="M37 13 L41 34 L37 61 L33 34 Z" fill="#e8dcbf" opacity=".9" />
      <path d="M13 37 L34 41 L61 37 L34 33 Z" fill="#e8dcbf" opacity=".62" />
      <circle cx="37" cy="37" r="3.4" fill="#5a1e12" />
    </svg>
  );
}
function CompassRose({ size = 220 }) {
  const c = size / 2;
  const arms = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ opacity: 0.12 }}>
      <circle cx={c} cy={c} r={c - 6} fill="none" stroke={INK} strokeWidth="1" />
      <circle cx={c} cy={c} r={c - 22} fill="none" stroke={SEPIA} strokeWidth="1" strokeDasharray="2 4" />
      {arms.map((a) => { const rad = (a * Math.PI) / 180, long = a % 90 === 0; const r1 = long ? c - 6 : c - 18; const x1 = c + Math.cos(rad) * r1, y1 = c + Math.sin(rad) * r1; const x2 = c + Math.cos(rad) * (c - 44), y2 = c + Math.sin(rad) * (c - 44); return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={long ? 1.5 : 0.75} />; })}
      <path d={`M ${c} ${10} L ${c + 11} ${c} L ${c} ${size - 10} L ${c - 11} ${c} Z`} fill="none" stroke={INK} strokeWidth="1" />
    </svg>
  );
}
function RouteMap() {
  const stops = ["Sandpoint", "Brinewall", "Kalsgard", "The Crown", "Ordu-Aganhei", "Kasai"];
  const W = 680, H = 118, pad = 46;
  const xs = stops.map((_, i) => pad + i * ((W - 2 * pad) / (stops.length - 1)));
  const ys = stops.map((_, i) => 66 + Math.sin(i * 1.05) * 20);
  const d = xs.map((x, i) => `${i ? "L" : "M"} ${x} ${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} aria-hidden>
      <path d={d} fill="none" stroke={SEPIA} strokeWidth="1.5" strokeDasharray="1 6" strokeLinecap="round" />
      {stops.map((s, i) => { const end = i === 0 || i === stops.length - 1; return (
        <g key={s}>
          <circle cx={xs[i]} cy={ys[i]} r={end ? 5 : 3} fill={end ? WAX : INK} />
          <text x={xs[i]} y={ys[i] - 11} textAnchor="middle" fontFamily="IM Fell English SC, serif" fontSize="10.5" fill={end ? WAX : SEPIA}>{s}</text>
        </g>
      ); })}
    </svg>
  );
}

function TitleScreen({ dispatch }) {
  return (
    <div className="anim" style={{ animation: "fadeUp .6s ease", textAlign: "center", padding: "14px 8px 8px", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}><CompassRose size={240} /></div>
      <div style={{ position: "relative" }}>
        <div className="sc" style={{ fontSize: 12, letterSpacing: ".28em", color: SEPIA, textTransform: "uppercase" }}>Pathfinder · the road to Minkai</div>
        <div className="disp" style={{ fontSize: "clamp(40px,7vw,66px)", fontWeight: 700, color: INK, letterSpacing: ".04em", lineHeight: 1.02, margin: "6px 0 4px" }}>The Long Road</div>
        <div className="sc" style={{ fontSize: 14, color: WAX, letterSpacing: ".06em" }}>Sandpoint to Kasai · fourteen hundred miles · carry the heir home</div>
        <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 4px" }}><WaxSeal /></div>
        <div style={{ maxWidth: 648, margin: "4px auto", textAlign: "left" }}>
          <p style={{ fontSize: 15.5, lineHeight: 1.62, color: INK2, marginBottom: 10 }}>
            <span className="disp" style={{ float: "left", fontSize: 54, lineHeight: 0.78, paddingRight: 10, paddingTop: 5, color: WAX }}>A</span>
            throne on the far side of the world belongs to the innkeeper of Sandpoint, and the only way to it runs east, up through the Land of the Linnorm Kings, over the polar ice of the Crown of the World, and down into the Dragon Empires of Tian Xia. Fill your wagons, for every mile east makes the cargo worth more; the trade is what buys your passage through the cold. But the road has three guardians on it, and each one must be broken before Ameiko Kaijitsu can take back Minkai.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.62, color: INK2 }}>
            Gather a company of four. Outfit your wagons. Read the weather, ration the feed, buy low and sell high, and settle what the road throws at you with word, coin, or steel. Cross the Crown, best the Hungry Storm and the oni that wait beyond, and set the heir on the Jade Throne.
          </p>
        </div>
        <div style={{ margin: "12px auto 8px", display: "flex", justifyContent: "center" }}><RouteMap /></div>
        <button className="btn seal on" style={{ fontSize: 15, padding: "11px 28px", letterSpacing: ".06em" }} onClick={() => dispatch({ type: "BEGIN" })}>Take the offer →</button>
        <div className="sc" style={{ fontSize: 11, color: SEPIA, marginTop: 12 }}>a level-5 company · eleven to choose from · one road, one winter</div>
      </div>
    </div>
  );
}

function IntroDialogue({ s, dispatch }) {
  const node = INTRO[s.introNode] || INTRO[INTRO_START];
  return (
    <div className="anim" style={{ animation: "fadeUp .4s ease", maxWidth: 720, margin: "8px auto" }}>
      <div className="sc" style={{ fontSize: 12.5, color: SEPIA, fontStyle: "italic", textAlign: "center", marginBottom: 12, letterSpacing: ".03em" }}>{node.stage}</div>
      <div className="card" style={{ padding: "18px 20px", borderColor: "rgba(74,58,36,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Portrait initial={node.art} />
          <div>
            <div className="disp" style={{ fontSize: 17, color: INK }}>{node.speaker}</div>
            <div className="sc" style={{ fontSize: 11.5, color: SEPIA }}>{node.role}</div>
          </div>
        </div>
        <div style={{ fontSize: 16.5, lineHeight: 1.62, color: INK }}>{node.body}</div>
        <hr className="rule" />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {node.choices.map((c, i) => (
            <button key={i} className={"btn" + (c.to === "party" ? " seal on" : "")} style={{ textAlign: "left" }} onClick={() => dispatch({ type: "INTRO_GO", to: c.to })}>{c.label}</button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button className="btn" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => dispatch({ type: "INTRO_GO", to: "party" })}>Skip the parley, muster the company →</button>
      </div>
    </div>
  );
}

/* =============================== APP ============================== */
export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, initSetup);
  const winter = s.phase === "road" ? seasonStage(s.day).winter : 0;
  return (
    <div className="tome" style={{ minHeight: "100%", position: "relative", padding: "22px 20px 40px", background: `radial-gradient(120% 90% at 15% 0%, #efe6cd 0%, ${VELLUM} 42%, ${VELLUM2} 100%)` }}>
      <GlobalStyle />
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5, background: "repeating-linear-gradient(0deg, rgba(120,90,50,.05) 0px, rgba(120,90,50,.05) 1px, transparent 1px, transparent 4px), radial-gradient(60% 40% at 80% 20%, rgba(120,90,50,.10), transparent 60%), radial-gradient(50% 40% at 10% 80%, rgba(90,60,30,.10), transparent 60%)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 90px rgba(74,48,20,.35), inset 0 0 12px rgba(74,48,20,.25)" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: winter, transition: "opacity 1s ease", background: `radial-gradient(120% 100% at 50% -10%, transparent 55%, rgba(63,106,134,.18) 78%, rgba(63,106,134,.4) 100%)`, mixBlendMode: "multiply" }} />

      <div style={{ position: "relative", maxWidth: 1120, margin: "0 auto" }}>
        {s.phase !== "title" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div className="disp" style={{ fontSize: 15, letterSpacing: ".18em", color: SEPIA, textTransform: "uppercase" }}>Pathfinder</div>
              <div className="sc" style={{ fontSize: 11, color: SEPIA }}>the long road · a varisian expedition</div>
            </div>
            <hr className="rule" style={{ marginTop: 2 }} />
          </>
        )}
        {s.phase === "title" && <TitleScreen dispatch={dispatch} />}
        {s.phase === "intro" && <IntroDialogue s={s} dispatch={dispatch} />}
        {s.phase === "party" && <PartyScreen s={s} dispatch={dispatch} />}
        {s.phase === "outfit" && <OutfitScreen s={s} dispatch={dispatch} />}
        {s.phase === "road" && (s.over ? <EndScreen s={s} dispatch={dispatch} /> : <RoadScreen s={s} dispatch={dispatch} />)}
      </div>
    </div>
  );
}

