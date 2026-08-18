/* =====================================================================
   The Long Road — GAME ENGINE (pure JavaScript, no React).
   Extracted from the original single-file build so any front-end
   (Discord Activity, bot, plain web) can import the same brain.
   ===================================================================== */


/* =====================================================================
   PATHFINDER - THE LONG ROAD
   Phase 7, Slice 4: the road and the battle become one book.

   New this slice, over the expedition frame:
     • The full company of eleven, one traveler for each core class:
       Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger,
       Rogue, Sorcerer, Wizard. Pick any four.
     • Real combat, woven into the road. The abstract skirmish stubs are
       gone. When steel is drawn, the JRPG-style turn engine takes over,
       then hands the survivors, their wounds, and their spent spells
       straight back to the caravan.
     • Region-keyed ambush tables. Every wild league carries a stated
       percentage chance of a fight, and WHICH foes you meet is drawn
       from a table appropriate to where you are on the map.
     • Level-5 baseline throughout, travel and battle alike.
     • The tome presentation carries into the fight: aged vellum,
       iron-gall ink, wax seals, and frost as winter closes in.

   Architecture (PROJECT_BIBLE §16): content is DATA, the engine is
   pure-ish functions over state, the UI only reads state + dispatches.
   Design law (options-not-numbers): classes unlock OPTIONS and reach
   better OUTCOME BANDS; every combat move is a CHOICE with a cost, never
   a flat passive bonus to a shared meter.
   ===================================================================== */

/* =============================== DICE =============================== */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const d20 = () => 1 + Math.floor(Math.random() * 20);
const roll = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(Math.random() * s); return t; };
const dice = (a) => (a ? roll(a[0], a[1]) + (a[2] || 0) : 0);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dfmt = (a) => `${a[0]}d${a[1]}${a[2] ? (a[2] > 0 ? "+" + a[2] : a[2]) : ""}`;
function weightedPick(table) {
  const total = table.reduce((t, [, w]) => t + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of table) { if ((r -= w) <= 0) return k; }
  return table[0][0];
}

/* =============================== TRAVEL DATA ======================== */

/* --- The four trade zones of the long road. `cold` drives daily attrition
   on the Crown of the World; `forage` scales what the land will give you. */
const ZONES = {
  varisia: { label: "Varisia", cold: 0, forage: 1.0, blurb: "Temperate coast. The road is kind, the markets rich." },
  linnorm: { label: "The Linnorm North", cold: 0.2, forage: 0.75, blurb: "Ulfen country, turning cold. The last real towns." },
  crown: { label: "The Crown of the World", cold: 1.0, forage: 0.12, blurb: "The polar ice. Nothing grows; the cold itself is the enemy." },
  tianxia: { label: "Tian Xia", cold: 0, forage: 0.85, blurb: "The Dragon Empires. Foreign, fertile, and full of silk." },
};

/* --- The route: the canon Amatatsu road, Sandpoint to Minkai. Varisia to
   Kalsgard, the Path of Aganhei across the Crown of the World to Ordu-Aganhei,
   then down through the Forest of Spirits to the throne at Kasai (~1480 mi).
   `beat` marks a fixed story pillar; `crossing` marks a ford or ice-pass.
   `market` = what a town PAYS (demand, >1 a premium); `offers` = what a town
   SELLS cheap (local supply, <1 a bargain). Prices float from there. */
const ROUTE = [
  { name: "Sandpoint", type: "city", zone: "varisia", town: true, note: "The Rusty Dragon at your back. Ameiko's road begins.",
    offers: { cloth: 0.7, glass: 0.72, iron: 0.72, reagents: 0.78 }, market: { furs: 1.15, tea: 1.2 } },
  { name: "Brinestump Marsh", type: "wild", zone: "varisia", note: "Goblin country. Fireworks in the reeds." },
  { name: "Brinewall", type: "town", zone: "varisia", town: true, beat: "brinewall", note: "The ruined castle on the coast. Ameiko's birthright sleeps here.",
    offers: { cloth: 0.75, iron: 0.75 }, market: { furs: 1.1, glass: 1.15 } },
  { name: "Grungir Forest", type: "wild", zone: "varisia", branch: "grungir", note: "Deep northern pinewood. The road forks toward the coast." },
  { name: "Kalsgard", type: "city", zone: "linnorm", town: true, note: "Greatest city of the Linnorm Kings. The Path of Aganhei starts at its gate.",
    offers: { furs: 0.58, amber: 0.62, whaleoil: 0.58, silk: 1.35 },
    market: { glass: 1.5, reagents: 1.4, cloth: 1.25, iron: 1.2 } },
  { name: "Stormspear Hills", type: "wild", zone: "linnorm", branch: "stormspear", note: "Windswept ridges. The tundra begins beyond." },
  { name: "Turvik", type: "town", zone: "linnorm", town: true, note: "Fortified frontier town. The last stout walls before the ice.",
    offers: { furs: 0.68, whaleoil: 0.7 }, market: { cloth: 1.35, iron: 1.3, glass: 1.4, reagents: 1.3 } },
  { name: "Rimethirst Pass", type: "wild", zone: "crown", crossing: "Rimethirst ice-pass", note: "The mountains climb into the true cold. Guides earn their fee here." },
  { name: "Ul-Angorn", type: "town", zone: "crown", town: true, note: "A trade-town huddled in a frozen basin. Everything costs, and costs dear.",
    offers: { furs: 0.95, whaleoil: 0.9 }, market: { furs: 1.7, whaleoil: 1.6, amber: 1.3 } },
  { name: "Dead Man's Dome", type: "wild", zone: "crown", note: "A pale dome of old ice. The dead are said to walk its skirts." },
  { name: "The High Ice", type: "wild", zone: "crown", beat: "highice", crossing: "Ovorikheer Pass", note: "The roof of the world. Ovorikheer Pass, and the storm that guards it." },
  { name: "Jaagiin", type: "town", zone: "crown", town: true, note: "A waystation where late caravans winter. The descent begins.",
    offers: { furs: 0.9, whaleoil: 0.85 }, market: { furs: 1.5, whaleoil: 1.45 } },
  { name: "Ordu-Aganhei", type: "city", zone: "tianxia", town: true, note: "Gateway to the Dragon Empires. Western goods cash out here at last.",
    offers: { silk: 0.6, jade: 0.64, tea: 0.6 },
    market: { furs: 1.8, amber: 1.9, glass: 1.7, reagents: 1.6, cloth: 1.5, iron: 1.4, whaleoil: 1.3 } },
  { name: "Forest of Spirits", type: "wild", zone: "tianxia", note: "Kami and kitsune in the mist. Not all of it means you harm." },
  { name: "Kasai", type: "city", zone: "tianxia", town: true, beat: "kasai", note: "The capital of Minkai. The empty throne, and the Jade Regent upon it.",
    offers: { silk: 0.72, jade: 0.72 },
    market: { furs: 1.55, amber: 1.7, glass: 1.6, cloth: 1.4, reagents: 1.5, iron: 1.35, silk: 1.1, jade: 1.1 } },
];
const LEG_MILES = [40, 70, 110, 150, 90, 80, 110, 110, 90, 90, 100, 120, 100, 90];

const BRANCHES = {
  grungir: {
    prompt: "The Grungir splits. The coast road is open and sure but longer. The forest track cuts deep and dark, shorter but thick with old things.",
    options: [
      { id: "coast", label: "Follow the coast road", tag: "safe", miles: 150, danger: 1, note: "Open, watched, dependable." },
      { id: "forest", label: "Cut through the forest", tag: "fast", miles: 116, danger: 3, note: "Saves ~34 mi. Wolves and worse." },
    ],
  },
  stormspear: {
    prompt: "Past the Stormspear Hills lie two lines to Turvik. The valley trail is slow and safe. The ridge line is quick, and the wind up there can strip a wagon bare.",
    options: [
      { id: "valley", label: "Keep to the valley", tag: "safe", miles: 80, danger: 1, note: "Sheltered, slower." },
      { id: "ridge", label: "Take the ridge line", tag: "fast", miles: 58, danger: 3, note: "Saves ~22 mi. Brutal wind." },
    ],
  },
};

const PACES = {
  cautious: { label: "Cautious", miles: 13, wear: 0.4, morale: +1, ration: 1.0, condWear: 0, hint: "Easy on wagon and beasts. Slow." },
  steady: { label: "Steady", miles: 22, wear: 0.8, morale: 0, ration: 1.0, condWear: 3, hint: "The dependable wagon pace." },
  grueling: { label: "Grueling", miles: 24, wear: 2.0, morale: -2, ration: 1.3, condWear: 8, hint: "Fast, but it breaks wagons and tires beasts." },
};

/* --- Draft animals: a real outfitting choice. speed/feed/hardy trade off.
   `cold` is how well they bear the ice: reindeer are born to it. */
const ANIMALS = {
  ox: { label: "Oxen", cost: 30, speed: 0.9, feed: 1.3, hardy: 1.3, cold: 0.9, note: "Strong and cheap. Slow, big eaters, and they feel the cold." },
  mule: { label: "Mules", cost: 42, speed: 1.0, feed: 0.8, hardy: 1.15, cold: 1.0, note: "Tough, thrifty, unbothered by bad ground." },
  horse: { label: "Draft horses", cost: 66, speed: 1.2, feed: 1.1, hardy: 0.85, cold: 0.8, note: "Fast and costly; delicate on hard roads and hard frost." },
  reindeer: { label: "Reindeer", cost: 78, speed: 1.05, feed: 0.7, hardy: 1.1, cold: 1.5, note: "Dear, but born to the ice; they forage the tundra and shrug off cold." },
};

/* --- Caravan size: capacity vs. weight. */
const WAGONS = {
  1: { cost: 0, cap: 16, wearMul: 1.0, speedMul: 1.05, note: "One wagon. Nimble, but little to sell." },
  2: { cost: 55, cap: 34, wearMul: 1.15, speedMul: 1.0, note: "Two wagons. The standard haul." },
  3: { cost: 130, cap: 54, wearMul: 1.35, speedMul: 0.9, note: "Three wagons. Heavy profit, heavy going." },
};

/* --- Trade goods, now priced from a BASE that every market bends. Buy where a
   good is made and cheap; sell where it is exotic and wanted. Some break, some
   are simply heavy. Local supply (a town's `offers`) is where you buy in. */
const GOODS = {
  cloth: { label: "Varisian textiles", base: 6, bulk: 1, note: "Light, always wanted. Worth more the farther east it travels." },
  glass: { label: "Magnimar glassware", base: 10, bulk: 2, fragile: true, note: "High margin, but a bad crossing shatters it." },
  iron: { label: "Ironmongery", base: 6, bulk: 3, note: "Heavy and dull, but it never spoils." },
  reagents: { label: "Alchemical reagents", base: 14, bulk: 1, note: "Compact, valuable, and useful in a pinch." },
  furs: { label: "Northern furs", base: 9, bulk: 2, note: "Cheap in Kalsgard; worth a fortune where no beast wears a coat." },
  amber: { label: "Kalsgard amber", base: 20, bulk: 1, note: "Scrimshaw charms of the Amber Quarter. Precious in the east." },
  whaleoil: { label: "Whale-oil", base: 7, bulk: 2, note: "Fuel and light. On the ice it is nearly life itself." },
  silk: { label: "Tian silk", base: 22, bulk: 1, note: "Featherlight luxury of the Dragon Empires." },
  jade: { label: "Carved jade", base: 30, bulk: 1, note: "The wealth of Minkai in a single crate." },
  tea: { label: "Tian tea", base: 11, bulk: 1, note: "Bricks of pressed leaf, traded like coin." },
};

/* Which goods a town will let you BUY (its local supply). */
const townOffers = (node) => node.offers || {};
/* The zone a given leg sits in. */
const zoneOf = (i) => ZONES[(ROUTE[i] || ROUTE[0]).zone] || ZONES.varisia;

/* =============================== THE COMPANY ======================= */
/* One traveler for each of the eleven core classes, all at level 5. Pick four.
   Each carries BOTH an expedition profile (skills, daily pools, road roles)
   and a `combat` block (defenses, attack bonus, saves, and a four-move kit)
   used the moment steel is drawn. HP is shared across road and battle, so a
   wound taken in a skirmish rides on into the next hungry night, and a spell
   burned on the road is gone from the caster's slots for the rest of the day. */
const ROSTER = [
  { id: "kass", name: "Kass", cls: "Ranger", blurb: "Ranger of the Sanos verges.",
    maxHp: 44, skills: { survival: 11, perception: 11, stealth: 9, heal: 5, athletics: 7, diplomacy: 2, disable: 1, knowledge: 4 },
    res: { arrows: true, companion: true }, kit: "Precise Shot and Rapid Shot, and a wolf at his heel.",
    best: ["scout", "forage", "hunt"], tag: "Reads terrain, tracks, and feeds the party off the land.",
    combat: { hp: 44, ac: 18, touch: 13, atk: 9, init: 4, saves: { fort: 5, ref: 8, will: 3 }, res: {}, moves: ["aimedShot", "rapidShot", "cripplingShot", "wolfMaul"], role: "Ranged skirmisher who fights with a beast at his side." } },

  { id: "halden", name: "Hayden", cls: "Cleric", blurb: "Priest of Erastil, road-blesser.",
    maxHp: 40, skills: { survival: 5, perception: 6, stealth: 0, heal: 12, athletics: 4, diplomacy: 8, disable: 0, knowledge: 8 },
    res: { channels: 5, spells1: 4, spells2: 3, spells3: 2, removeDisease: true }, kit: "Spells to 3rd and five channels a day; at last he can pray a fever from the blood.",
    best: ["medic", "tend"], tag: "Channels wounds shut, and can burn a sickness out of beast or man.",
    combat: { hp: 40, ac: 18, touch: 11, atk: 5, init: 1, saves: { fort: 7, ref: 3, will: 8 }, res: { spells1: 4, spells2: 3, channels: 5 }, moves: ["cureWounds", "channelEnergy", "bless", "searingLight"], role: "Healing, wards, and a lance of divine light." } },

  { id: "vex", name: "Vex", cls: "Rogue", blurb: "Unchained rogue, light of finger.",
    maxHp: 38, skills: { survival: 3, perception: 12, stealth: 12, heal: 3, athletics: 8, diplomacy: 10, disable: 12, knowledge: 6 },
    res: {}, kit: "Combat Expertise, Weapon Finesse, and a sneak attack that ends arguments.",
    best: ["scout", "repair"], tag: "Talks past trouble, or slips around it when talk fails.",
    combat: { hp: 38, ac: 19, touch: 14, atk: 8, init: 6, saves: { fort: 3, ref: 9, will: 4 }, res: {}, moves: ["rapierStrike", "sneakAttack", "feint", "alchemistFire"], role: "Puts a foe off its guard, then guts it." } },

  { id: "ondrel", name: "Ondrel", cls: "Wizard", blurb: "Evoker of the Magnimar academy.",
    maxHp: 28, skills: { survival: 1, perception: 5, stealth: 4, heal: 2, athletics: 1, diplomacy: 3, disable: 3, knowledge: 12 },
    res: { spells1: 4, spells2: 3, spells3: 2, light: true }, kit: "Spells to 3rd, fireball among them, and an answer for most problems until the day's slots run dry.",
    best: ["scout", "quarter"], tag: "A spell for every problem, until the day's slots run dry.",
    combat: { hp: 28, ac: 14, touch: 12, atk: 3, init: 3, saves: { fort: 3, ref: 5, will: 7 }, res: { spells1: 4, spells2: 3, spells3: 2 }, moves: ["magicMissile", "scorchingRay", "fireball", "enfeeble"], role: "Heavy evocation damage, until the slots run dry." } },

  { id: "dram", name: "Dram", cls: "Fighter", blurb: "Old caravan guard, twice-retired.",
    maxHp: 52, skills: { survival: 4, perception: 6, stealth: 2, heal: 4, athletics: 11, diplomacy: 3, disable: 2, knowledge: 3 },
    res: {}, kit: "Power Attack, Cleave, and Shield Focus. Hits hard, holds a line.",
    best: ["guard", "repair"], tag: "Wall of the caravan. Blunts an ambush, muscles a wagon free.",
    combat: { hp: 52, ac: 20, touch: 12, atk: 10, init: 3, saves: { fort: 8, ref: 4, will: 3 }, res: {}, moves: ["powerAttack", "cleave", "guardAlly", "sunder"], role: "Anchor of the line." } },

  { id: "sura", name: "Sura", cls: "Barbarian", blurb: "Shoanti of the Cinderlands.",
    maxHp: 56, skills: { survival: 8, perception: 7, stealth: 4, heal: 2, athletics: 12, diplomacy: 2, disable: 0, knowledge: 2 },
    res: { rage: 3 }, kit: "Unchained rage and Raging Vitality. Hauls the caravan out of trouble by force.",
    best: ["guard", "hunt"], tag: "Rage and raw strength, and a shoulder set to any stuck wheel.",
    combat: { hp: 56, ac: 17, touch: 12, atk: 9, init: 4, saves: { fort: 8, ref: 5, will: 4 }, res: { rage: 3 }, moves: ["rage", "recklessSwing", "charge", "roar"], role: "Rage and overwhelming force." } },

  { id: "lem", name: "Lem", cls: "Bard", blurb: "Halfling road-singer and dealer.",
    maxHp: 36, skills: { survival: 4, perception: 8, stealth: 6, heal: 5, athletics: 4, diplomacy: 12, disable: 6, knowledge: 9 },
    res: { spells1: 4, spells2: 2, performance: 5 }, kit: "Bardic performance, spells to 2nd, and the best haggler on the river.",
    best: ["medic", "scout", "quarter"], tag: "Keeps spirits up, prices down, and knows a rumor for every town.",
    combat: { hp: 36, ac: 17, touch: 13, atk: 6, init: 5, saves: { fort: 4, ref: 7, will: 6 }, res: { spells1: 4, spells2: 2, performance: 5 }, moves: ["crossbowShot", "inspireCourage", "lemCure", "discordantNote"], role: "Crossbow, buffs, and spells in one." } },

  { id: "yarrow", name: "Yarrow", cls: "Druid", blurb: "Green warden of the Sanos deeps.",
    maxHp: 46, skills: { survival: 12, perception: 10, stealth: 6, heal: 8, athletics: 5, diplomacy: 3, disable: 1, knowledge: 10 },
    res: { spells1: 5, spells2: 4, spells3: 2, companion: true }, kit: "Spells to 3rd, a beast at her side, and the weather read like a page.",
    best: ["forage", "hunt", "tend"], tag: "Reads the wild like scripture; feeds the party and mends the team.",
    combat: { hp: 46, ac: 17, touch: 12, atk: 6, init: 3, saves: { fort: 6, ref: 4, will: 8 }, res: { spells1: 5, spells2: 4, spells3: 2 }, moves: ["thornLash", "entangle", "callLightning", "naturesBalm"], role: "Snares the enemy line, then calls the sky down on it." } },

  { id: "rook", name: "Rook", cls: "Monk", blurb: "Wanderer of the Windsong cloisters.",
    maxHp: 42, skills: { survival: 5, perception: 11, stealth: 9, heal: 4, athletics: 12, diplomacy: 4, disable: 3, knowledge: 6 },
    res: { ki: 4 }, kit: "Flurry of blows, a ki pool to spend, and feet that never tire.",
    best: ["guard", "scout"], tag: "Fast hands and faster feet; walks point and holds the rear.",
    combat: { hp: 42, ac: 19, touch: 15, atk: 8, init: 5, saves: { fort: 6, ref: 8, will: 7 }, res: { ki: 4 }, moves: ["flurry", "stunningFist", "elementalFist", "craneStance"], role: "A blur of strikes who can stun a foe stone-still." } },

  { id: "ysolde", name: "Dame Ysolde", cls: "Paladin", blurb: "Sworn blade of Iomedae.",
    maxHp: 50, skills: { survival: 4, perception: 6, stealth: 1, heal: 10, athletics: 9, diplomacy: 10, disable: 1, knowledge: 7 },
    res: { layOnHands: 5, smite: 2, spells1: 1 }, kit: "Lay on hands to mend, a smite held in reserve, and a bearing that steadies the whole camp.",
    best: ["guard", "medic"], tag: "Shield of the caravan and its field-surgeon both.",
    combat: { hp: 50, ac: 20, touch: 12, atk: 9, init: 2, saves: { fort: 8, ref: 5, will: 7 }, res: { layOnHands: 5, smite: 2, spells1: 1 }, moves: ["smiteEvil", "layOnHands", "auraOfCourage", "shieldFallen"], role: "Holds the line, heals with a touch, and smites what most deserves it." } },

  { id: "ember", name: "Ember", cls: "Sorcerer", blurb: "Fire in the blood, no book to lose.",
    maxHp: 34, skills: { survival: 2, perception: 4, stealth: 4, heal: 2, athletics: 2, diplomacy: 9, disable: 3, knowledge: 9 },
    res: { spells1: 6, spells2: 4, spells3: 2, light: true }, kit: "Spontaneous spells to 3rd, cast more freely than any bookbound mage, and a light always at hand.",
    best: ["scout"], tag: "Raw talent that never runs to a page; a light in the dark and a fire for the road.",
    combat: { hp: 34, ac: 13, touch: 12, atk: 3, init: 4, saves: { fort: 3, ref: 4, will: 7 }, res: { spells1: 6, spells2: 4, spells3: 2 }, moves: ["bloodfireBolt", "scorchingRay", "fireball", "mirrorImage"], role: "Fire by the fistful, spent more freely than the wizard dares." } },
];
const BY_ID = Object.fromEntries(ROSTER.map((m) => [m.id, m]));

/* --- Daily roles. Anyone may take any role; class fit reaches better bands. */
const ROLES = {
  drive: { label: "Drive the team", desc: "Hold the reins and keep the wagons rolling. Without a driver the caravan crawls and morale frays \u2014 a hired teamster can take this off your hands so all four of your company are free for other work." },
  scout: { label: "Scout ahead", desc: "Range out front and read the country. A good scout can spot an ambush forming and steer the caravan wide, avoiding the fight entirely." },
  guard: { label: "Stand guard", desc: "Ride watch over the wagons. Blunts the next ambush and helps steady the team when a predator spooks them." },
  hunt: { label: "Hunt for meat", desc: "Spend arrows to bring down game \u2014 the party's food. Yields nothing for the animals or the water barrels, so pair it with foraging on long hauls." },
  forage: { label: "Forage & water", desc: "Work the land as you travel: graze fodder for the team and draw water from springs, streams, and snowmelt. Restocks BOTH animal feed and water \u2014 a little less of each than a dedicated hand would manage, since it's two jobs at once." },
  tend: { label: "Tend the animals", desc: "Rest, water, and doctor the draft team, restoring their condition so they don't founder on a hard road or in the cold." },
  repair: { label: "Mend the wagons", desc: "Shore up frames and axles from your repair stock, keeping the wagons from breaking down under the miles." },
  medic: { label: "Tend the wounded", desc: "Bind wounds on the march \u2014 heals the whole party a little each day without stopping to camp." },
  quarter: { label: "Ration the stores", desc: "Keep a tight account of the supplies so far less is wasted: stretches food, water, and feed consumption every day." },
};
const ROLE_ORDER = ["drive", "scout", "guard", "hunt", "forage", "tend", "repair", "medic", "quarter"];
const SKILL_LABEL = { survival: "Survival", perception: "Perception", stealth: "Stealth", heal: "Heal", athletics: "Athletics", diplomacy: "Diplomacy", disable: "Devices", knowledge: "Lore" };

/* --- Flavor pools: varied road log lines so days and outcomes do not repeat. */
const SKY = ["a leaden sky", "a low grey sky", "a hard bright sky", "a sky the colour of old pewter", "a sky heavy with unfallen rain", "a cold clear sky", "clouds like dirty wool", "a wind out of the east"];
const TRAVEL = [
  (m, s) => `${m} miles under ${s}.`,
  (m, s) => `The wheels turn ${m} miles through ${s}.`,
  (m, s) => `${m} hard-won miles, ${s} overhead.`,
  (m, s) => `You make ${m} miles before dusk under ${s}.`,
  (m, s) => `The caravan grinds out ${m} miles beneath ${s}.`,
];
const FEED_EMPTY = ["The feed sacks come up empty. The beasts labour hungry.", "No feed left; the team pulls on empty bellies.", "The animals go unfed tonight, and it shows in their eyes.", "Empty mangers. The team is running down."];
const FORAGE_GOOD = ["comes back laden", "finds a rich patch", "reads the land well", "turns up more than hoped"];
const FORAGE_POOR = ["finds thin pickings", "comes back near empty-handed", "wastes the effort", "turns up almost nothing"];

/* =============================== COMBAT DATA ======================= */
/* kind: attack (vs AC) · touch (vs touch AC) · auto (no roll) · save (target
   rolls a save, half on success) · heal · buff · debuff · rage.
   target: enemy · allEnemies · ally · allAllies · self.
   cost spends one of the actor's per-day pools (slots / channels / rage /
   performance / ki / smite / layOnHands). rider: a status applied on a hit. */
const MOVES = {
  // -- Ranger (bow & beast) --
  aimedShot: { name: "Aimed Shot", kind: "attack", target: "enemy", atkBonus: 2, dmg: [1, 8, 4], desc: "A careful bowshot. Reliable." },
  rapidShot: { name: "Rapid Shot", kind: "attack", target: "enemy", penalty: 2, extraHits: 1, dmg: [1, 8, 2], desc: "Two arrows, both at a penalty. Trade aim for volume." },
  cripplingShot: { name: "Crippling Shot", kind: "attack", target: "enemy", dmg: [1, 6, 2], rider: { k: "crippled", dur: 2, atk: -2 }, desc: "A shot to the arm. The foe fights worse for it." },
  wolfMaul: { name: "Wolf: Maul", kind: "attack", target: "enemy", dmg: [1, 8, 3], rider: { k: "offguard", dur: 2, ac: -2, offguard: true, chance: 0.6 }, desc: "The companion drags a foe down and off-balance." },
  // -- Cleric (divine support) --
  cureWounds: { name: "Cure Wounds", kind: "heal", target: "ally", heal: [2, 8, 5], cost: { spells2: 1 }, desc: "Close an ally's wounds." },
  channelEnergy: { name: "Channel Energy", kind: "heal", target: "allAllies", heal: [2, 6, 3], cost: { channels: 1 }, desc: "A wave of positive energy heals the whole party." },
  bless: { name: "Bless", kind: "buff", target: "allAllies", status: { k: "blessed", dur: 4, atk: 2 }, cost: { spells1: 1 }, desc: "The party strikes truer for a time." },
  searingLight: { name: "Searing Light", kind: "touch", target: "enemy", dmg: [3, 6, 0], cost: { spells2: 1 }, desc: "A lance of divine light." },
  // -- Rogue (finesse & guile) --
  rapierStrike: { name: "Rapier Strike", kind: "attack", target: "enemy", dmg: [1, 6, 4], desc: "A quick finesse thrust." },
  sneakAttack: { name: "Sneak Attack", kind: "attack", target: "enemy", dmg: [1, 6, 4], sneak: [3, 6, 0], desc: "Devastating if the target is off-guard; else just a poke." },
  feint: { name: "Feint", kind: "debuff", target: "enemy", auto: true, status: { k: "offguard", dur: 2, ac: -2, offguard: true }, desc: "A bluff that leaves the foe open to a sneak attack." },
  alchemistFire: { name: "Alchemist's Fire", kind: "touch", target: "enemy", dmg: [1, 6, 1], rider: { k: "burning", dur: 2, dot: 3 }, desc: "A thrown flask. It keeps burning." },
  // -- Wizard (evocation) --
  magicMissile: { name: "Magic Missile", kind: "auto", target: "enemy", dmg: [3, 4, 3], cost: { spells1: 1 }, desc: "Three bolts of force. Never misses." },
  scorchingRay: { name: "Scorching Ray", kind: "touch", target: "enemy", dmg: [4, 6, 0], cost: { spells2: 1 }, desc: "Twin rays of fire against touch defenses." },
  fireball: { name: "Fireball", kind: "save", target: "allEnemies", dmg: [6, 6, 0], save: "ref", dc: 16, half: true, cost: { spells3: 1 }, desc: "A blast that catches every foe. Reflex halves." },
  enfeeble: { name: "Ray of Enfeeblement", kind: "debuff", target: "enemy", touchHit: true, status: { k: "enfeebled", dur: 3, dmg: -3 }, cost: { spells1: 1 }, desc: "Saps a foe's strength; its blows land soft." },
  // -- Fighter (line-holder) --
  powerAttack: { name: "Power Attack", kind: "attack", target: "enemy", penalty: 2, dmg: [1, 10, 7], desc: "Swing wild and heavy. Less sure, much harder." },
  cleave: { name: "Cleave", kind: "attack", target: "enemy", dmg: [1, 10, 3], extraTargets: 1, desc: "One blow that carries into a second foe." },
  guardAlly: { name: "Shield the Line", kind: "buff", target: "allAllies", status: { k: "shielded", dur: 1, soak: 0.6 }, desc: "Raise shields; the party takes less until Dram's next turn." },
  sunder: { name: "Sunder Armour", kind: "attack", target: "enemy", dmg: [1, 8, 4], rider: { k: "sundered", dur: 2, ac: -2 }, desc: "Batter a foe's guard open for everyone." },
  // -- Barbarian (rage) --
  rage: { name: "Rage", kind: "rage", target: "self", status: { k: "raging", dur: 5, atk: 2, dmg: 4, ac: -2 }, tempHp: 12, cost: { rage: 1 }, desc: "Enter a fury: harder hits, tougher hide, looser guard." },
  recklessSwing: { name: "Reckless Swing", kind: "attack", target: "enemy", penalty: 3, dmg: [2, 6, 6], desc: "A huge, wild arc. Often misses; seldom forgiven when it lands." },
  charge: { name: "Cinderlands Charge", kind: "attack", target: "enemy", dmg: [1, 12, 4], selfRider: { k: "exposed", dur: 1, ac: -2 }, desc: "Barrel in for a heavy hit, and leave yourself open." },
  roar: { name: "Intimidating Roar", kind: "debuff", target: "allEnemies", save: "will", dc: 14, status: { k: "frightened", dur: 2, atk: -2 }, desc: "A Shoanti war-cry that shakes the whole enemy line." },
  // -- Bard (the hybrid) --
  crossbowShot: { name: "Crossbow Shot", kind: "attack", target: "enemy", dmg: [1, 8, 2], desc: "A bolt from the flank." },
  inspireCourage: { name: "Inspire Courage", kind: "buff", target: "allAllies", status: { k: "inspired", dur: 4, atk: 2, dmg: 2 }, cost: { performance: 1 }, desc: "A rousing song; the party hits harder and truer." },
  lemCure: { name: "Cure Wounds", kind: "heal", target: "ally", heal: [1, 8, 5], cost: { spells1: 1 }, desc: "A minor healing spell." },
  discordantNote: { name: "Discordant Note", kind: "touch", target: "enemy", dmg: [2, 6, 2], cost: { spells2: 1 }, desc: "A shriek of sound that rattles bone." },
  // -- Druid (green magic & storm) --
  thornLash: { name: "Thorn Lash", kind: "attack", target: "enemy", dmg: [1, 8, 3], rider: { k: "snared", dur: 2, atk: -1, ac: -1 }, desc: "A whip of bramble that rakes and holds." },
  entangle: { name: "Entangle", kind: "debuff", target: "allEnemies", save: "ref", dc: 15, status: { k: "entangled", dur: 2, atk: -2, ac: -2 }, cost: { spells1: 1 }, desc: "Grasping roots foul the whole enemy line. Reflex resists." },
  callLightning: { name: "Call Lightning", kind: "save", target: "enemy", dmg: [4, 6, 0], save: "ref", dc: 16, half: true, cost: { spells3: 1 }, desc: "A bolt out of a clear sky. Reflex halves." },
  naturesBalm: { name: "Nature's Balm", kind: "heal", target: "ally", heal: [2, 8, 4], cost: { spells2: 1 }, desc: "Living green knits an ally's wounds." },
  // -- Monk (fist & ki) --
  flurry: { name: "Flurry of Blows", kind: "attack", target: "enemy", penalty: 1, extraHits: 1, dmg: [1, 8, 3], desc: "A rain of unarmed strikes, each a shade less sure." },
  stunningFist: { name: "Stunning Fist", kind: "attack", target: "enemy", dmg: [1, 8, 3], rider: { k: "stunned", dur: 2, skip: true, chance: 0.55 }, cost: { ki: 1 }, desc: "A strike to the nerve that can drop a foe where it stands." },
  elementalFist: { name: "Elemental Fist", kind: "attack", target: "enemy", dmg: [2, 6, 3], cost: { ki: 1 }, desc: "Ki wreathes the fist in fire; a heavier blow." },
  craneStance: { name: "Crane Stance", kind: "buff", target: "self", status: { k: "poised", dur: 3, ac: 2, soak: 0.85 }, desc: "A defensive posture; harder to land a blow on." },
  // -- Paladin (steel & mercy) --
  smiteEvil: { name: "Smite", kind: "attack", target: "enemy", atkBonus: 2, dmg: [1, 10, 10], cost: { smite: 1 }, desc: "A vow made steel; a heavy, sure blow against the worst foe." },
  layOnHands: { name: "Lay on Hands", kind: "heal", target: "ally", heal: [2, 6, 5], cost: { layOnHands: 1 }, desc: "A touch that closes wounds." },
  auraOfCourage: { name: "Aura of Courage", kind: "buff", target: "allAllies", status: { k: "heartened", dur: 4, atk: 1 }, cost: { spells1: 1 }, desc: "Her presence steadies every hand in the line." },
  shieldFallen: { name: "Shield the Fallen", kind: "buff", target: "allAllies", status: { k: "shielded", dur: 1, soak: 0.6 }, desc: "She plants her shield; the party takes less until her next turn." },
  // -- Sorcerer (fire in the blood) --
  bloodfireBolt: { name: "Bloodfire Bolt", kind: "touch", target: "enemy", dmg: [1, 6, 2], desc: "A bloodline cantrip; a lash of flame, always ready." },
  mirrorImage: { name: "Mirror Image", kind: "buff", target: "self", status: { k: "blurred", dur: 3, soak: 0.5 }, desc: "Flickering duplicates; blows often strike an image, not you." },
  // -- Advanced moves, unlocked as the company grows seasoned (levels 6-7) --
  huntersMark: { name: "Hunter's Mark", kind: "attack", target: "enemy", atkBonus: 2, dmg: [2, 8, 4], rider: { k: "crippled", dur: 2, atk: -2 }, desc: "A marked, punishing shot; the foe fights worse for it." },
  deadeye: { name: "Deadeye Shot", kind: "attack", target: "enemy", atkBonus: 3, dmg: [2, 8, 6], desc: "A killing arrow, placed with terrible precision." },
  healingWord: { name: "Healing Word", kind: "heal", target: "ally", heal: [3, 8, 8], cost: { spells2: 1 }, desc: "A greater mending that closes even grave wounds." },
  flamestrike: { name: "Flame Strike", kind: "save", target: "allEnemies", dmg: [4, 6, 0], save: "ref", dc: 15, half: true, cost: { spells2: 1 }, desc: "A column of holy fire across the enemy line. Reflex halves." },
  viciousStrike: { name: "Vicious Strike", kind: "attack", target: "enemy", dmg: [1, 6, 4], sneak: [4, 6, 2], desc: "A murderous blow — ruinous against an off-guard foe." },
  bleedingStrike: { name: "Hamstring", kind: "attack", target: "enemy", dmg: [2, 6, 3], rider: { k: "bleeding", dur: 3, dot: 4 }, desc: "A deep cut that bleeds the foe through the whole fight." },
  forceLance: { name: "Force Lance", kind: "auto", target: "enemy", dmg: [4, 4, 4], cost: { spells2: 1 }, desc: "A honed spear of pure force. Never misses, and it hurts." },
  greaterFireball: { name: "Greater Fireball", kind: "save", target: "allEnemies", dmg: [7, 6, 0], save: "ref", dc: 17, half: true, cost: { spells3: 1 }, desc: "A roaring blast that engulfs every foe. Reflex halves." },
  mightyBlow: { name: "Mighty Blow", kind: "attack", target: "enemy", penalty: 2, dmg: [2, 10, 8], desc: "A tremendous overhand swing. Less sure, devastating when it lands." },
  whirlwind: { name: "Whirlwind", kind: "attack", target: "enemy", dmg: [1, 10, 4], extraTargets: 2, desc: "A spinning cut that carries into two more foes." },
  greaterRage: { name: "Greater Rage", kind: "rage", target: "self", status: { k: "raging", dur: 5, atk: 3, dmg: 6, ac: -2 }, tempHp: 18, cost: { rage: 1 }, desc: "A deeper fury: harder hits, tougher hide still." },
  brutalCharge: { name: "Brutal Charge", kind: "attack", target: "enemy", dmg: [2, 12, 6], selfRider: { k: "exposed", dur: 1, ac: -2 }, desc: "A thunderous running blow that leaves you wide open." },
  strikingChord: { name: "Striking Chord", kind: "touch", target: "enemy", dmg: [3, 6, 2], cost: { spells2: 1 }, desc: "A blast of sound that rattles bone and armour alike." },
  inspireHeroics: { name: "Inspire Heroics", kind: "buff", target: "allAllies", status: { k: "inspired", dur: 5, atk: 3, dmg: 3 }, cost: { performance: 1 }, desc: "A soaring anthem; the whole party fights like heroes." },
  flameBlade: { name: "Flame Blade", kind: "attack", target: "enemy", dmg: [2, 8, 4], cost: { spells2: 1 }, desc: "A scimitar of fire conjured to the hand." },
  stormburst: { name: "Storm Burst", kind: "save", target: "allEnemies", dmg: [5, 6, 0], save: "ref", dc: 16, half: true, cost: { spells3: 1 }, desc: "The sky splits over the whole enemy line. Reflex halves." },
  risingFlurry: { name: "Rising Flurry", kind: "attack", target: "enemy", penalty: 1, extraHits: 2, dmg: [1, 8, 3], desc: "A blinding rain of three strikes, each a shade less sure." },
  quiveringPalm: { name: "Quivering Palm", kind: "attack", target: "enemy", dmg: [3, 6, 4], rider: { k: "stunned", dur: 2, skip: true, chance: 0.5 }, cost: { ki: 1 }, desc: "A killing touch that can stop a foe cold." },
  greaterLay: { name: "Greater Lay on Hands", kind: "heal", target: "ally", heal: [3, 6, 7], cost: { layOnHands: 1 }, desc: "A greater healing touch; wounds knit under her palm." },
  radiantSmite: { name: "Radiant Smite", kind: "attack", target: "enemy", atkBonus: 3, dmg: [2, 10, 10], cost: { smite: 1 }, desc: "A vow blazing into steel; a devastating, sure blow." },
  empoweredBolt: { name: "Empowered Bolt", kind: "touch", target: "enemy", dmg: [3, 6, 3], desc: "The bloodline burns hotter now — a heavier lash of flame, always ready." },
  infernoBlast: { name: "Inferno Blast", kind: "save", target: "allEnemies", dmg: [7, 6, 0], save: "ref", dc: 17, half: true, cost: { spells3: 1 }, desc: "The blood ignites; fire consumes every foe. Reflex halves." },
  // -- foes --
  foeSlash: { name: "Slash", kind: "attack", target: "enemy", dmg: [1, 8, 4] },
  foeShoot: { name: "Shortbow", kind: "attack", target: "enemy", dmg: [1, 8, 3] },
  foeStab: { name: "Stab", kind: "attack", target: "enemy", dmg: [1, 6, 3] },
  foeClaw: { name: "Bone Claw", kind: "attack", target: "enemy", dmg: [1, 8, 4] },
  foeBite: { name: "Savage Bite", kind: "attack", target: "enemy", dmg: [1, 10, 5], rider: { k: "offguard", dur: 2, ac: -2, offguard: true, chance: 0.5 } },
  foeCleave: { name: "Cleaving Blow", kind: "attack", target: "enemy", dmg: [1, 12, 6], extraTargets: 1 },
  foeSmash: { name: "Crushing Smash", kind: "attack", target: "enemy", dmg: [2, 10, 6], rider: { k: "offguard", dur: 2, ac: -2, offguard: true } },
  foeRally: { name: "Rally the Crew", kind: "buff", target: "allAllies", status: { k: "rallied", dur: 3, atk: 2, dmg: 2 } },
  foeTongue: { name: "Tongue Lash", kind: "attack", target: "enemy", dmg: [1, 6, 3], rider: { k: "offguard", dur: 2, ac: -2, offguard: true, chance: 0.5 } },
  // -- northern & Ulfen --
  foeChop: { name: "Ulfen Axe", kind: "attack", target: "enemy", dmg: [1, 10, 4] },
  // -- ice & undead --
  foeRime: { name: "Rime Claw", kind: "attack", target: "enemy", dmg: [1, 8, 4], rider: { k: "chilled", dur: 2, atk: -1, ac: -1 } },
  foeMaul2: { name: "Frost Maul", kind: "attack", target: "enemy", dmg: [2, 8, 6], rider: { k: "offguard", dur: 2, ac: -2, offguard: true, chance: 0.4 } },
  foeFrostBreath: { name: "Frost Breath", kind: "save", target: "allEnemies", dmg: [3, 6, 0], save: "fort", dc: 15, half: true },
  foeHowl: { name: "Ghast Howl", kind: "debuff", target: "allEnemies", save: "will", dc: 15, status: { k: "frightened", dur: 2, atk: -2 } },
  // -- Tian Xia oni & spirits --
  foeOniClub: { name: "Kanabō Smash", kind: "attack", target: "enemy", dmg: [2, 10, 7], rider: { k: "offguard", dur: 2, ac: -2, offguard: true, chance: 0.5 } },
  foeCurse: { name: "Oni Curse", kind: "debuff", target: "enemy", touchHit: true, status: { k: "cursed", dur: 3, atk: -2, dmg: -2 } },
  foeDrain: { name: "Life Siphon", kind: "touch", target: "enemy", dmg: [2, 6, 3] },
  // -- boss signatures --
  foeBolt: { name: "Storm Bolt", kind: "auto", target: "enemy", dmg: [3, 6, 3] },
  foeStormcall: { name: "Chain Lightning", kind: "save", target: "allEnemies", dmg: [4, 6, 0], save: "ref", dc: 16, half: true },
  foeRimeShield: { name: "Rime Ward", kind: "buff", target: "self", status: { k: "warded", dur: 2, soak: 0.5, ac: 2 } },
  foeJadeStrike: { name: "Jade Edge", kind: "attack", target: "enemy", atkBonus: 2, dmg: [2, 8, 8] },
  foeInvoke: { name: "Invoke the Storm", kind: "buff", target: "allAllies", status: { k: "stormblessed", dur: 3, atk: 2, dmg: 3 } },
};

/* =============================== LEVELING ========================= *
 * The company shares experience from the fights it wins and grows more
 * seasoned over the long road: level 5 at the outset, up to level 7 by the
 * end of a hard journey. Each level unlocks one advanced move per class that
 * REPLACES that class's weakest one — options change, not just numbers — plus
 * a small bump in staying power. */
const MAX_LEVEL = 7;
const XP_THRESH = { 6: 800, 7: 2300 }; // cumulative party XP needed for each level
const MOVE_PROGRESSION = {
  Ranger: [{ lvl: 6, learn: "huntersMark", replace: "cripplingShot" }, { lvl: 7, learn: "deadeye", replace: "rapidShot" }],
  Cleric: [{ lvl: 6, learn: "healingWord", replace: "cureWounds" }, { lvl: 7, learn: "flamestrike", replace: "searingLight" }],
  Rogue: [{ lvl: 6, learn: "viciousStrike", replace: "sneakAttack" }, { lvl: 7, learn: "bleedingStrike", replace: "alchemistFire" }],
  Wizard: [{ lvl: 6, learn: "forceLance", replace: "magicMissile" }, { lvl: 7, learn: "greaterFireball", replace: "fireball" }],
  Fighter: [{ lvl: 6, learn: "mightyBlow", replace: "powerAttack" }, { lvl: 7, learn: "whirlwind", replace: "cleave" }],
  Barbarian: [{ lvl: 6, learn: "greaterRage", replace: "rage" }, { lvl: 7, learn: "brutalCharge", replace: "charge" }],
  Bard: [{ lvl: 6, learn: "strikingChord", replace: "discordantNote" }, { lvl: 7, learn: "inspireHeroics", replace: "inspireCourage" }],
  Druid: [{ lvl: 6, learn: "flameBlade", replace: "thornLash" }, { lvl: 7, learn: "stormburst", replace: "callLightning" }],
  Monk: [{ lvl: 6, learn: "risingFlurry", replace: "flurry" }, { lvl: 7, learn: "quiveringPalm", replace: "elementalFist" }],
  Paladin: [{ lvl: 6, learn: "greaterLay", replace: "layOnHands" }, { lvl: 7, learn: "radiantSmite", replace: "smiteEvil" }],
  Sorcerer: [{ lvl: 6, learn: "empoweredBolt", replace: "bloodfireBolt" }, { lvl: 7, learn: "infernoBlast", replace: "fireball" }],
};
/* A class's actual battle kit at a given party level (base moves with unlocks swapped in). */
function activeMovesFor(id, level) {
  const M = BY_ID[id];
  const moves = [...M.combat.moves];
  for (const step of MOVE_PROGRESSION[M.cls] || []) {
    if ((level || 5) >= step.lvl) { const i = moves.indexOf(step.replace); if (i >= 0) moves[i] = step.learn; else if (!moves.includes(step.learn)) moves.push(step.learn); }
  }
  return moves;
}
/* Award party XP and promote through level thresholds, announcing what's learned. */
function grantXP(st, amount) {
  if (!amount) return;
  st.xp = (st.xp || 0) + amount;
  let lvl = st.level || 5;
  while (lvl < MAX_LEVEL && st.xp >= (XP_THRESH[lvl + 1] || Infinity)) {
    lvl += 1;
    st.party = st.party.map((p) => ({ ...p, maxHpBase: (p.maxHpBase || p.maxHp) + 4, maxHp: p.maxHp + 4, hp: p.hp > 0 ? p.hp + 4 : p.hp }));
    const learned = st.party.map((p) => { const step = (MOVE_PROGRESSION[BY_ID[p.id].cls] || []).find((s) => s.lvl === lvl); return step ? `${BY_ID[p.id].name} learns ${MOVES[step.learn].name}` : null; }).filter(Boolean);
    pushLog(st, `The company grows more seasoned — you reach level ${lvl}. ${learned.join("; ")}.`, "arrive");
  }
  st.level = lvl;
}
/* Tuned for a level-5 party of four, escalating gently by zone. The three
   bosses are the fixed story pillars and hit far harder than the road rabble. */
const ENEMIES = {
  // -- Varisia --
  bandit: { name: "Sczarni Bandit", hp: 26, ac: 16, touch: 12, atk: 7, init: 3, saves: { fort: 4, ref: 5, will: 2 }, moves: ["foeSlash"] },
  archer: { name: "Bandit Archer", hp: 22, ac: 15, touch: 13, atk: 9, init: 5, saves: { fort: 3, ref: 6, will: 2 }, moves: ["foeShoot"] },
  toughboss: { name: "Toll-Boss", hp: 62, ac: 18, touch: 12, atk: 10, init: 4, saves: { fort: 7, ref: 5, will: 5 }, moves: ["foeCleave", "foeSmash", "foeRally"], boss: true },
  goblin: { name: "Goblin", hp: 12, ac: 16, touch: 13, atk: 6, init: 6, saves: { fort: 2, ref: 5, will: 0 }, moves: ["foeStab"] },
  direwolf: { name: "Direwolf", hp: 42, ac: 16, touch: 13, atk: 10, init: 7, saves: { fort: 7, ref: 7, will: 2 }, moves: ["foeBite"] },
  skeleton: { name: "Skeleton", hp: 22, ac: 16, touch: 12, atk: 7, init: 5, saves: { fort: 1, ref: 3, will: 4 }, moves: ["foeClaw"] },
  boggard: { name: "Boggard", hp: 34, ac: 16, touch: 11, atk: 8, init: 2, saves: { fort: 6, ref: 3, will: 2 }, moves: ["foeStab", "foeTongue"] },
  // -- Linnorm North --
  raider: { name: "Ulfen Raider", hp: 34, ac: 17, touch: 12, atk: 9, init: 4, saves: { fort: 6, ref: 4, will: 3 }, moves: ["foeChop"] },
  frostwolf: { name: "Frost Wolf", hp: 46, ac: 16, touch: 13, atk: 11, init: 8, saves: { fort: 8, ref: 7, will: 2 }, moves: ["foeBite"] },
  huskarl: { name: "Linnorm Huskarl", hp: 58, ac: 19, touch: 12, atk: 12, init: 4, saves: { fort: 8, ref: 5, will: 5 }, moves: ["foeCleave", "foeChop"] },
  // -- Crown of the World --
  icetroll: { name: "Ice Troll", hp: 56, ac: 17, touch: 11, atk: 11, init: 3, saves: { fort: 8, ref: 4, will: 4 }, moves: ["foeRime", "foeMaul2"] },
  wendigo: { name: "Frost-Gaunt", hp: 38, ac: 16, touch: 14, atk: 10, init: 9, saves: { fort: 5, ref: 8, will: 6 }, moves: ["foeRime", "foeHowl"] },
  icewight: { name: "Ice-Bound Dead", hp: 30, ac: 15, touch: 12, atk: 8, init: 5, saves: { fort: 3, ref: 4, will: 6 }, moves: ["foeClaw", "foeHowl"] },
  yeti: { name: "Abominable Yeti", hp: 52, ac: 16, touch: 12, atk: 11, init: 5, saves: { fort: 8, ref: 5, will: 4 }, moves: ["foeMaul2", "foeFrostBreath"] },
  // -- Tian Xia --
  ronin: { name: "Masterless Ronin", hp: 40, ac: 19, touch: 13, atk: 11, init: 6, saves: { fort: 5, ref: 7, will: 4 }, moves: ["foeSlash", "foeStab"] },
  onilesser: { name: "Lesser Oni", hp: 56, ac: 18, touch: 12, atk: 12, init: 5, saves: { fort: 7, ref: 5, will: 7 }, moves: ["foeOniClub", "foeCurse"] },
  spiritbeast: { name: "Angry Kami", hp: 48, ac: 18, touch: 15, atk: 11, init: 8, saves: { fort: 6, ref: 8, will: 8 }, moves: ["foeRime", "foeDrain"] },
  // -- Bosses (fixed story battles) --
  bossBrinewall: { name: "Kikonu, the Faceless", hp: 104, ac: 20, touch: 12, atk: 12, init: 5, saves: { fort: 9, ref: 6, will: 9 }, moves: ["foeOniClub", "foeCurse", "foeMaul2", "foeRally"], boss: true },
  bossStorm: { name: "Katiyana, the Storm-Caller", hp: 108, ac: 20, touch: 15, atk: 11, init: 9, saves: { fort: 7, ref: 9, will: 11 }, moves: ["foeBolt", "foeStormcall", "foeRimeShield", "foeRime"], boss: true },
  bossRegent: { name: "The Jade Regent", hp: 150, ac: 22, touch: 14, atk: 14, init: 7, saves: { fort: 11, ref: 8, will: 12 }, moves: ["foeJadeStrike", "foeInvoke", "foeStormcall", "foeCurse"], boss: true },
};

/* =============================== ENCOUNTERS ======================= */
const ENCOUNTERS = {
  // -- Varisia --
  banditToll: { name: "The Toll", desc: "Bandits and their toll-boss.", foes: [["bandit", 3], ["archer", 1], ["toughboss", 1]], gold: 90, loot: { medicine: 2 } },
  goblinAmbush: { name: "Goblin Ambush", desc: "A howling pack of goblins.", foes: [["goblin", 8]], gold: 40, loot: { ammo: 6 } },
  direwolves: { name: "Wolves in the Wood", desc: "Winter-gaunt direwolves.", foes: [["direwolf", 3]], gold: 55, loot: { medicine: 1 } },
  boneGuardians: { name: "Old Bone", desc: "The dead of a ruin, stirred to war.", foes: [["skeleton", 5]], gold: 65, loot: { medicine: 1 } },
  roadThieves: { name: "Road Thieves", desc: "A few chancers with knives.", foes: [["bandit", 2], ["archer", 1]], gold: 35, loot: {} },
  wolfPair: { name: "A Hunting Pair", desc: "Two direwolves circle the caravan.", foes: [["direwolf", 2]], gold: 40, loot: {} },
  bogAmbush: { name: "The Bog Rises", desc: "Boggards and goblins from the reeds.", foes: [["boggard", 2], ["goblin", 3]], gold: 50, loot: { medicine: 1 } },
  // -- Linnorm North --
  raiders: { name: "Ulfen Raiders", desc: "Axe-men off the tundra.", foes: [["raider", 3], ["archer", 1]], gold: 70, loot: { medicine: 1 } },
  frostPack: { name: "Frost Wolves", desc: "A pack out of the snow.", foes: [["frostwolf", 3]], gold: 65, loot: {} },
  huskarlBand: { name: "A Huskarl's Warband", desc: "A linnorm-lord's sworn men.", foes: [["huskarl", 1], ["raider", 3]], gold: 110, loot: { medicine: 2 } },
  // -- Crown of the World --
  trollAmbush: { name: "Ice Trolls", desc: "Regenerating horrors of the pass.", foes: [["icetroll", 2]], gold: 90, loot: { medicine: 1 } },
  frostGaunts: { name: "Frost-Gaunts", desc: "Starved things that hunt the ice.", foes: [["wendigo", 2], ["icewight", 1]], gold: 80, loot: {} },
  domeDead: { name: "The Dome's Dead", desc: "The walking dead of Dead Man's Dome.", foes: [["icewight", 4]], gold: 95, loot: { medicine: 1 } },
  yetiPair: { name: "Abominable Yetis", desc: "White death out of a whiteout.", foes: [["yeti", 2]], gold: 120, loot: { medicine: 2 } },
  // -- Tian Xia --
  roninBand: { name: "Masterless Blades", desc: "Ronin turned brigand.", foes: [["ronin", 3]], gold: 85, loot: {} },
  oniPatrol: { name: "Oni Patrol", desc: "The Five Storms' outriders.", foes: [["onilesser", 2], ["ronin", 1]], gold: 130, loot: { medicine: 2 } },
  spirits: { name: "Restless Kami", desc: "Angry spirits of the wood.", foes: [["spiritbeast", 2]], gold: 70, loot: {} },
  // -- Fixed bosses --
  bossBrinewall: { name: "Kikonu, the Faceless", desc: "The oni guardian coiled in Brinewall's vault.", foes: [["bossBrinewall", 1], ["icewight", 1]], gold: 240, loot: { medicine: 3 }, boss: true },
  bossStorm: { name: "Katiyana, the Storm-Caller", desc: "The Hungry Storm, given a face at last.", foes: [["bossStorm", 1], ["wendigo", 1]], gold: 300, loot: { medicine: 3 }, boss: true },
  bossRegent: { name: "The Jade Regent", desc: "The tyrant on the stolen throne, and his Five Storms.", foes: [["bossRegent", 1], ["onilesser", 1]], gold: 500, loot: { medicine: 4 }, boss: true },
};

/* --- Region-keyed ambush tables (weights are percentages, summing to 100). */
const REGION_COMBAT = {
  "Brinestump Marsh": [["goblinAmbush", 55], ["bogAmbush", 30], ["wolfPair", 15]],
  "Grungir Forest": [["direwolves", 40], ["banditToll", 30], ["roadThieves", 30]],
  "Stormspear Hills": [["raiders", 45], ["frostPack", 35], ["roadThieves", 20]],
  "Rimethirst Pass": [["frostPack", 40], ["trollAmbush", 40], ["frostGaunts", 20]],
  "Dead Man's Dome": [["domeDead", 60], ["frostGaunts", 25], ["trollAmbush", 15]],
  "Forest of Spirits": [["spirits", 45], ["roninBand", 30], ["oniPatrol", 25]],
};
const WILD_BY_ZONE = {
  varisia: [["roadThieves", 40], ["goblinAmbush", 30], ["wolfPair", 30]],
  linnorm: [["raiders", 40], ["frostPack", 35], ["huskarlBand", 25]],
  crown: [["trollAmbush", 40], ["frostGaunts", 35], ["yetiPair", 25]],
  tianxia: [["roninBand", 40], ["spirits", 35], ["oniPatrol", 25]],
};

/* --- Per-day chance a wild league turns violent. Towns are safe; the ice and
   the late season are meaner. */
function combatChanceFor(st) {
  const node = ROUTE[st.legIndex];
  if (!node || node.town || node.type === "city") return 0;
  const danger = st.legDanger[st.legIndex] || 1;
  const z = ZONES[node.zone] || ZONES.varisia;
  const zoneRisk = z.cold >= 1 ? 0.10 : z.cold > 0 ? 0.06 : 0.03;
  return clamp((0.18 + danger * 0.055 + zoneRisk + seasonStage(st.day).sev * 0.06) * repFx(st).combatMul, 0, 0.58);
}
function regionTable(st) { const node = ROUTE[st.legIndex]; return REGION_COMBAT[node.name] || WILD_BY_ZONE[node.zone] || WILD_BY_ZONE.varisia; }

/* --- Combat consumables, drawn straight from the caravan's stores. Using one
   in battle spends the road resource; it is gone from the wagon afterward. */
const COMBAT_ITEMS = {
  draught: { name: "Healing Draught", kind: "heal", target: "ally", heal: [2, 8, 5], supply: "medicine", cost: 1, desc: "A field remedy from the medicine stores." },
  fire: { name: "Alchemist's Fire", kind: "touch", target: "enemy", dmg: [1, 6, 1], rider: { k: "burning", dur: 2, dot: 3 }, supply: "ammo", cost: 2, desc: "A thrown flask, told against your arrows." },
};

/* =============================== LOOT ============================= */
/* Two kinds of thing come off the fallen:
   - VALUABLES: trophies worth only coin, sold as "finds" at any town.
   - RELICS:    rare gear that works the moment you carry it (found = active).
   - ITEMS:     rare one-use battle consumables, kept in a satchel (not the
                medicine/ammo stores), spent from the bag in combat. */

const VALUABLES = {
  // Varisia
  pelt: { name: "Wolf Pelt", value: 12 },
  purse: { name: "Bandit's Purse", value: 20 },
  fetish: { name: "Goblin Fetish", value: 8 },
  amber_raw: { name: "Raw Amber", value: 30 },
  // Linnorm north
  tusk: { name: "Ivory Tusk", value: 45 },
  axehead: { name: "Rune-Etched Axe-Head", value: 60 },
  // Crown of the World
  frostopal: { name: "Frost-Opal", value: 80 },
  yetihide: { name: "Yeti Hide", value: 70 },
  trollhide: { name: "Troll-Hide", value: 55 },
  // Tian Xia
  netsuke: { name: "Jade Netsuke", value: 90 },
  brocade: { name: "Silk Brocade", value: 65 },
  onihorn: { name: "Oni Horn", value: 120 },
  // Boss trophies
  kikonu_mask: { name: "Kikonu's Faceless Mask", value: 260 },
  stormglass: { name: "Storm-Glass Shard", value: 320 },
  regent_seal: { name: "The Jade Regent's Seal", value: 520 },
};

const RELICS = {
  erastil_token: { name: "Erastil's Token", desc: "+1 to all party saves.", fx: { saves: 1 } },
  ivory_charm: { name: "Ivory Luck-Charm", desc: "+1 to hit for the whole party.", fx: { atk: 1 } },
  bloodstone: { name: "Bloodstone Amulet", desc: "+2 AC for the whole party.", fx: { ac: 2 } },
  frostward: { name: "Frost-Ward Charm", desc: "The cold cuts half as deep.", fx: { coldMul: 0.5 } },
  compass: { name: "Wayfarer's Compass", desc: "+2 miles on a good day's travel.", fx: { miles: 2 } },
  merchant_seal: { name: "Merchant's Seal", desc: "Your finds and wares fetch better prices.", fx: { sellMul: 1.15 } },
};

const ITEMS = {
  wardraught: { name: "War Draught", kind: "heal", target: "ally", heal: [4, 8, 14], desc: "A potent elixir; closes even deep wounds in a heartbeat." },
  thunderstone: { name: "Thunderstone", kind: "save", target: "allEnemies", dmg: [3, 6, 0], save: "fort", dc: 16, rider: { k: "stunned", dur: 1, skip: true, chance: 0.4 }, desc: "Bursts with a deafening crack; foes reel and some are left senseless." },
  whetstone: { name: "Whetstone Oil", kind: "buff", target: "allAllies", status: { k: "honed", dur: 6, dmg: 3 }, desc: "Keened edges; the whole party bites harder for the rest of the fight." },
  smokebomb: { name: "Smoke Bomb", kind: "flee", desc: "A billow of smoke; the party breaks contact clean and unhurt." },
};

/* Which trophies a region yields, and which boss drops which signature piece. */
const ZONE_FINDS = {
  varisia: ["pelt", "purse", "fetish", "amber_raw"],
  linnorm: ["tusk", "axehead", "pelt"],
  crown: ["frostopal", "yetihide", "trollhide"],
  tianxia: ["netsuke", "brocade", "onihorn"],
};
const BOSS_TROPHY = { brinewall: "kikonu_mask", highice: "stormglass", kasai: "regent_seal" };

/* Sum every carried relic into one set of modifiers. Found = active, so this
   is just "everything in the satchel." */
function relicFx(st) {
  const fx = { atk: 0, ac: 0, saves: 0, coldMul: 1, miles: 0, sellMul: 1 };
  for (const id of st.relics || []) {
    const r = RELICS[id]; if (!r) continue;
    if (r.fx.atk) fx.atk += r.fx.atk;
    if (r.fx.ac) fx.ac += r.fx.ac;
    if (r.fx.saves) fx.saves += r.fx.saves;
    if (r.fx.coldMul) fx.coldMul *= r.fx.coldMul;
    if (r.fx.miles) fx.miles += r.fx.miles;
    if (r.fx.sellMul) fx.sellMul *= r.fx.sellMul;
  }
  return fx;
}
const listJoin = (a) => (a.length <= 1 ? a[0] || "" : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);

/* =========================== CONSEQUENCES ======================== */
/* Choices should leave marks that last, not one-line blips. Three systems:
   - INJURIES: a brutal outcome maims a traveler — their max HP drops and stays
     down until they can rest under a roof in a town. Named, visible, felt.
   - REPUTATION: kind or cruel choices shift how the road treats you — folk
     help a good name (better prices, steadier morale); a cruel one draws grudges.
   - RUMORS: what you learn at a town's market about the region ahead. */

const INJURIES = [
  { name: "cracked ribs", pct: 0.25 }, { name: "a wrenched knee", pct: 0.2 },
  { name: "a deep gash", pct: 0.25 }, { name: "frostbitten hands", pct: 0.2 },
  { name: "a concussion", pct: 0.3 }, { name: "a broken arm", pct: 0.28 },
];
/* Maim a random able traveler. Their max HP falls (and current HP with it) until
   a town rest sets the bone. Returns the log line, or null if no one to hurt. */
function injureOne(st, cause) {
  const able = st.party.filter((p) => p.hp > 0 && !p.injury);
  if (!able.length) return null;
  const p = able[(Math.random() * able.length) | 0];
  const inj = INJURIES[(Math.random() * INJURIES.length) | 0];
  p.injury = inj.name;
  p.maxHp = Math.max(1, Math.round((p.maxHpBase || p.maxHp) * (1 - inj.pct)));
  p.hp = Math.min(p.hp, p.maxHp);
  const line = `${BY_ID[p.id].name} takes ${inj.name}${cause ? " " + cause : ""} — a wound that will slow them until they can rest in a town.`;
  pushLog(st, line, "bad");
  return line;
}
/* Set a bone: clear one injury and restore that traveler's full frame. */
function mendInjuries(st) {
  let mended = 0;
  st.party = st.party.map((p) => { if (p.injury) { mended++; return { ...p, injury: null, maxHp: p.maxHpBase || p.maxHp }; } return p; });
  return mended;
}

/* Reputation runs from cruel (−) to kind (+). It bends town prices and the
   caravan's baseline morale, and colors how strangers meet you. */
function repShift(st, d) { st.reputation = clamp((st.reputation || 0) + d, -5, 5); }
function repFx(st) {
  const r = st.reputation || 0;
  return {
    sellMul: 1 + r * 0.04,                 // renown moves prices ±4%/pt, up to ±20%
    moraleFloor: r >= 3 ? 35 : r >= 2 ? 25 : 0,
    kind: r >= 2, cruel: r <= -2,
    combatMul: r <= -3 ? 1.25 : r <= -2 ? 1.12 : r >= 3 ? 0.9 : 1, // a feared name draws trouble; a loved one is shielded
  };
}
/* Has this choice's mark been earned? Used for later payoffs. */
function hasMark(st, m) { return !!(st.marks && st.marks[m]); }
function useMark(st, m) { if (st.marks && st.marks[m]) { const n = { ...st.marks }; delete n[m]; st.marks = n; return true; } return false; }

/* A market rumor: which goods the region AHEAD is hungry for, learned on a good
   Perception/Diplomacy check while in town. */
function nextRegionZone(st) {
  const here = ROUTE[st.legIndex].zone;
  for (let i = st.legIndex + 1; i < ROUTE.length; i++) if (ROUTE[i].zone !== here) return ROUTE[i].zone;
  return here;
}
function marketRumor(s) {
  const node = ROUTE[s.legIndex]; if (!node.town) return s;
  if (s.rumorDone) return s; // one ask per town visit
  const st = { ...s, log: [...s.log], party: s.party.map((p) => ({ ...p })) };
  st.rumorDone = true;
  const best = st.party.filter((p) => p.hp > 0).reduce((a, p) => { const v = Math.max(BY_ID[p.id].skills.diplomacy, BY_ID[p.id].skills.perception); return v > a.v ? { id: p.id, v } : a; }, { id: st.party[0].id, v: 0 });
  const c = check(best.v, 14);
  const good = c.tier === "success" || c.tier === "critsuccess";
  const zone = nextRegionZone(st);
  if (good) {
    const wanted = Object.keys(GOODS).map((g) => { let bestIdx = 0; for (const n of ROUTE) if (n.zone === zone && n.market && n.market[g]) bestIdx = Math.max(bestIdx, n.market[g]); return [g, bestIdx]; }).filter(([, i]) => i >= 1.2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    st.rumor = { zone, goods: wanted };
    pushLog(st, wanted.length ? `${BY_ID[best.id].name} works the market talk: in ${ZONES[zone].label}, they pay dear for ${listJoin(wanted.map((g) => GOODS[g].label))}. Worth loading up.` : `${BY_ID[best.id].name} asks around, but the traders are tight-lipped about the road ahead.`, wanted.length ? "good" : "info");
  } else {
    pushLog(st, `${BY_ID[best.id].name} asks after prices ahead, but gets only shrugs and tall tales. No telling what sells where.`, "warn");
  }
  return st;
}

/* Roll what the fight leaves behind. Mutates st (valuables/relics/items). */
function rollDrops(st, b, enc) {
  const zone = ROUTE[st.legIndex].zone;
  const finds = ZONE_FINDS[zone] || ZONE_FINDS.varisia;
  const out = { valuables: [], relic: null, item: null };
  const n = enc.gold >= 200 ? 2 : enc.gold >= 90 ? (Math.random() < 0.7 ? 1 : 2) : (Math.random() < 0.55 ? 1 : 0);
  for (let i = 0; i < n; i++) { const id = pick(finds); st.valuables[id] = (st.valuables[id] || 0) + 1; out.valuables.push(id); }
  if (b.story && BOSS_TROPHY[b.story]) { const id = BOSS_TROPHY[b.story]; st.valuables[id] = (st.valuables[id] || 0) + 1; out.valuables.push(id); }
  const relicChance = b.story ? 0.85 : clamp(enc.gold / 1400, 0, 0.16);
  const unowned = Object.keys(RELICS).filter((r) => !(st.relics || []).includes(r));
  if (unowned.length && Math.random() < relicChance) { const id = pick(unowned); st.relics.push(id); out.relic = id; }
  const itemChance = b.story ? 0.6 : clamp(enc.gold / 1000, 0, 0.2);
  if (Math.random() < itemChance) { const id = pick(Object.keys(ITEMS)); st.items[id] = (st.items[id] || 0) + 1; out.item = id; }
  return out;
}
function battleItem(id) { if (COMBAT_ITEMS[id]) return { it: COMBAT_ITEMS[id], bag: false }; if (ITEMS[id]) return { it: ITEMS[id], bag: true }; return null; }
/* A plain weapon strike every class always has. Modest, never runs out — the
   reliable fallback when spell slots, ki, or rage are spent. Class attack
   bonuses still apply, so a Fighter's strike lands harder than a Wizard's. */
const BASIC_STRIKE = { name: "Strike", kind: "attack", target: "enemy", dmg: [1, 8, 2], basic: true, desc: "A basic weapon attack. Always available, costs nothing." };

/* =============================== ENGINE ============================ */

/* Degrees of success, margin-based (bible §6). */
function check(mod, dc, danger = true) {
  const die = danger ? d20() : 10;
  const total = die + mod;
  const margin = total - dc;
  let tier;
  if (margin <= -10) tier = "critfail";
  else if (margin < 0) tier = "fail";
  else if (margin < 10) tier = "success";
  else tier = "critsuccess";
  return { die, mod, dc, total, margin, tier, took10: !danger };
}
const bandGain = (tier, crit, ok, poor) => (tier === "critsuccess" ? crit : tier === "success" ? ok : tier === "fail" ? poor : 0);

/* Per-character depletable pools. These are the SAME pools the battle engine
   spends, so a road skirmish and a road event draw on one shared reserve. */
const SPELL_KEYS = ["spells1", "spells2", "spells3", "channels", "rage", "performance", "ki", "smite", "layOnHands"];
const depletables = (res) => Object.fromEntries(SPELL_KEYS.filter((k) => res[k] != null).map((k) => [k, res[k]]));
const restorePools = (st) => { st.party = st.party.map((p) => ({ ...p, res: depletables(BY_ID[p.id].res) })); };
const memRes = (st, id, k) => { const p = st.party.find((x) => x.id === id); return p && p.res ? (p.res[k] || 0) : (BY_ID[id].res[k] || 0); };

/* Calendar severity (bible §14, rewritten for the long road). This is no longer
   a death clock; it is a gentle ramp that darkens the weather and, crucially,
   makes a LATE arrival on the Crown of the World colder and deadlier. The ice
   itself is now the winter. A caravan hopelessly behind is stranded at day 200. */
const STRAND_DAY = 240;
function seasonStage(day) {
  const sev = clamp((day - 20) / 120, 0, 1);
  let key = "open", label = "the season is young";
  if (day >= 95) { key = "deep"; label = "the dead of winter"; }
  else if (day >= 65) { key = "late"; label = "the year grows old"; }
  else if (day >= 38) { key = "turning"; label = "the days are shortening"; }
  return { key, label, sev, winter: sev };
}
/* Environmental cold at the current node: the zone's cold, intensified by how
   late in the year you reach it. Zero in Varisia and Tian Xia. */
function coldFor(st) {
  const z = ZONES[ROUTE[st.legIndex].zone] || ZONES.varisia;
  if (z.cold <= 0) return 0;
  return z.cold * (0.7 + 0.7 * seasonStage(st.day).sev);
}

const WEATHERS = [
  { k: "clear", t: "Clear", drag: 0 }, { k: "gray", t: "Overcast", drag: 0 },
  { k: "rain", t: "Cold rain", drag: 0.15 }, { k: "storm", t: "Storm", drag: 0.4 },
  { k: "frost", t: "Hard frost", drag: 0.25 }, { k: "blizzard", t: "Blizzard", drag: 0.55 },
];
function rollWeather(day, zoneKey = "varisia") {
  const s = seasonStage(day);
  const cold = (ZONES[zoneKey] || ZONES.varisia).cold;
  let pool;
  if (cold >= 1) pool = ["gray", "frost", "frost", "storm", "blizzard", "clear"];      // the ice
  else if (cold > 0) pool = ["clear", "gray", "gray", "rain", "frost", s.sev > 0.4 ? "storm" : "clear"]; // the north
  else {
    pool = ["clear", "clear", "gray", "rain"];
    if (s.key === "turning") pool = ["clear", "gray", "rain", "rain", "storm"];
    else if (s.key === "late" || s.key === "deep") pool = ["gray", "rain", "storm", "frost", "frost"];
  }
  const key = pick(pool);
  return WEATHERS.find((w) => w.k === key) || WEATHERS[0];
}

function pushLog(s, t, k = "info") { s.log = [{ t, k, day: s.day }, ...s.log].slice(0, 60); }

/* ---- Setup helpers ---- */
const SANDPOINT = ROUTE[0];
const startBuyPrice = (g) => { const off = SANDPOINT.offers && SANDPOINT.offers[g]; return off == null ? null : Math.max(1, Math.round(GOODS[g].base * off)); };
const DRIVER_FEE = 90;   // one-time hire for a teamster
const DRIVER_WAGE = 2;   // gp per day of travel
function loadoutCost(lo) {
  const team = teamSize(lo.wagons) * ANIMALS[lo.animal].cost;
  const wag = WAGONS[lo.wagons].cost;
  const sup = lo.food * 1 + lo.water * 1 + lo.feed * 1 + lo.medicine * 6 + lo.repair * 4 + lo.ammo * 1;
  const cargo = Object.entries(lo.cargo).reduce((t, [g, q]) => t + q * (startBuyPrice(g) || 0), 0);
  return team + wag + sup + cargo + (lo.hiredDriver ? DRIVER_FEE : 0);
}
const teamSize = (wagons) => wagons * 2;
const cargoUsed = (lo) => Object.entries(lo.cargo).reduce((t, [g, q]) => t + q * GOODS[g].bulk, 0);

const EMPTY_CARGO = Object.fromEntries(Object.keys(GOODS).map((g) => [g, 0]));

function initSetup() {
  return {
    phase: "title",
    introNode: INTRO_START,
    picked: [],
    START_GOLD: 1000,
    loadout: { animal: "mule", wagons: 2, food: 90, water: 90, feed: 110, medicine: 10, repair: 18, ammo: 20, hiredDriver: false, cargo: { ...EMPTY_CARGO } },
    log: [],
  };
}

function startJourney(s) {
  const lo = s.loadout;
  const spent = loadoutCost(lo);
  const party = s.picked.map((id) => ({ id, hp: BY_ID[id].maxHp, maxHp: BY_ID[id].maxHp, maxHpBase: BY_ID[id].maxHp, injury: null, res: depletables(BY_ID[id].res) }));
  const defaultRoles = {};
  const rr = lo.hiredDriver ? ["medic", "forage", "guard", "hunt"] : ["drive", "forage", "guard", "tend"];
  s.picked.forEach((id, i) => { defaultRoles[id] = rr[i] || (lo.hiredDriver ? "guard" : "drive"); });
  return {
    phase: "road",
    picked: s.picked,
    START_GOLD: s.START_GOLD,
    day: 1,
    legIndex: 0,
    progress: 0,
    legMiles: [...LEG_MILES],
    legDanger: ROUTE.map(() => 1),
    pace: "steady",
    weather: WEATHERS[0],
    res: { food: lo.food, water: lo.water, feed: lo.feed, gold: s.START_GOLD - spent, medicine: lo.medicine, repair: lo.repair, ammo: lo.ammo },
    cargo: { ...EMPTY_CARGO, ...lo.cargo },
    animal: lo.animal,
    animals: teamSize(lo.wagons),
    animalsNeeded: teamSize(lo.wagons),
    animalCond: 100,
    wagons: lo.wagons,
    wagon: 100,
    party,
    roles: defaultRoles,
    morale: 70,
    hungerDays: 0, thirstDays: 0, feedDays: 0,
    scouted: false, guards: 0, drivers: 1,
    hiredDriver: !!lo.hiredDriver, driverWage: 2, thrift: false,
    earned: 0,
    flags: { brinewall: null, highice: null, kasai: null, suishen: false }, stormSeen: false,
    valuables: {}, relics: [], items: {},
    reputation: 0, marks: {}, rumor: null, rumorDone: false,
    xp: 0, level: 5,
    drift: {},
    log: [{ t: `You roll out of Sandpoint with ${teamSize(lo.wagons)} ${ANIMALS[lo.animal].label.toLowerCase()}, ${lo.wagons} wagon${lo.wagons > 1 ? "s" : ""}, and Ameiko Kaijitsu's fate riding with you. Minkai lies fourteen hundred miles east, across the roof of the world. See her home.`, k: "start", day: 1 }],
    pending: null, ferry: null, event: null, beat: null, battle: null, lastCheck: null,
    recentEvent: null, eventCooldown: 0,
    over: null, overWhy: "", ledger: null,
  };
}

function totalRemaining(s) {
  if (s.legIndex >= LEG_MILES.length) return 0;
  let m = s.legMiles[s.legIndex] - s.progress;
  for (let i = s.legIndex + 1; i < LEG_MILES.length; i++) m += s.legMiles[i];
  return Math.max(0, Math.round(m));
}

/* Stores: party food/water with §8 grace + nightly natural healing. */
function eatStores(st, ration) {
  const need = Math.max(1, Math.round(st.party.length * ration * (st.thrift ? 0.65 : 1)));
  if (st.res.food >= need) { st.res.food -= need; st.hungerDays = 0; }
  else { st.res.food = 0; st.hungerDays++; if (st.hungerDays <= 3) { st.morale = clamp(st.morale - 3, 0, 100); pushLog(st, `Rations are gone; the party goes hungry (day ${st.hungerDays} of 3).`, "warn"); } else damageAll(st, roll(1, 4), "Starvation sets in"); }
  if (st.res.water >= need) { st.res.water -= need; st.thirstDays = 0; }
  else { st.res.water = 0; st.thirstDays++; if (st.thirstDays <= 1) { st.morale = clamp(st.morale - 4, 0, 100); pushLog(st, "The water runs dry; throats parch.", "warn"); } else damageAll(st, roll(1, 6), "Thirst turns dangerous"); }
  st.party = st.party.map((p) => (p.hp > 0 ? { ...p, hp: clamp(p.hp + 3, 0, p.maxHp) } : p));
}

/* Animals: feed with teeth. Starved beasts lose condition, then are lost. */
function upkeepAnimals(st, condWear, tended) {
  const need = Math.round(st.animals * ANIMALS[st.animal].feed * (st.thrift ? 0.7 : 1));
  if (st.res.feed >= need) { st.res.feed -= need; st.feedDays = 0; if (!tended) st.animalCond = clamp(st.animalCond + 2, 0, 100); }
  else {
    st.res.feed = 0; st.feedDays++;
    st.animalCond = clamp(st.animalCond - 9, 0, 100);
    st.morale = clamp(st.morale - 2, 0, 100);
    pushLog(st, pick(FEED_EMPTY), "warn");
  }
  st.animalCond = clamp(st.animalCond - condWear / ANIMALS[st.animal].hardy, 0, 100);
  if (st.animalCond <= 0 && st.animals > 0) {
    st.animals -= 1; st.animalCond = 50;
    pushLog(st, "A beast collapses in the traces and cannot rise again. The team is down one.", "bad");
  }
}

function damageAll(s, amt, why) {
  s.party = s.party.map((p) => (p.hp > 0 ? { ...p, hp: clamp(p.hp - amt, 0, p.maxHp) } : p));
  pushLog(s, `${why}; the whole party takes ${amt}.`, "bad");
}

/* Resolve today's role assignments into effects + set flags for the day. */
function applyRoles(st) {
  let drivers = 0, guards = 0, scouted = false, tended = false, thrift = false;
  for (const p of st.party) {
    if (p.hp <= 0) continue;
    const M = BY_ID[p.id];
    const role = st.roles[p.id] || "drive";
    const fit = M.best.includes(role);
    if (role === "drive") { drivers++; continue; }
    if (role === "guard") { guards++; continue; }
    if (role === "scout") { const c = check(M.skills.perception, 13); if (c.tier !== "critfail") scouted = true; continue; }
    if (role === "forage") { // FEED + WATER, a little less of each than a specialist would manage
      const fz = (ZONES[ROUTE[st.legIndex].zone] || ZONES.varisia).forage;
      const c = check(M.skills.survival, 13);
      const base = bandGain(c.tier, 18, 13, 5);
      const graze = Math.round(base * fz * (ANIMALS[st.animal].cold >= 1.4 ? 1.4 : 1) * 0.8);
      const wz = Math.max(0.55, fz); // snowmelt yields water even where fodder is barren
      const water = Math.round(base * wz * 0.8);
      st.res.feed = clamp(st.res.feed + graze, 0, 999);
      st.res.water = clamp(st.res.water + water, 0, 999);
      pushLog(st, (graze <= 1 && water <= 1) ? `${M.name} finds the frozen ground gives up almost nothing.` : `${M.name} works the land as you go: +${graze} feed, +${water} water.`, graze + water >= 16 ? "good" : graze + water > 0 ? "info" : "warn");
      continue;
    }
    if (role === "hunt") { // FOOD only — spend arrows for meat
      const fz = (ZONES[ROUTE[st.legIndex].zone] || ZONES.varisia).forage;
      if (st.res.ammo >= 2) { st.res.ammo -= 2; const c = check(Math.max(M.skills.survival, M.skills.perception), 14); const g = Math.round(bandGain(c.tier, 18, 12, 3) * Math.max(0.25, fz)); st.res.food = clamp(st.res.food + g, 0, 999); pushLog(st, g > 0 ? `${M.name} brings down game: +${g} food (-2 arrows).` : `${M.name} finds no game, and spends arrows chasing it.`, g >= 10 ? "good" : g > 0 ? "info" : "warn"); }
      else pushLog(st, `${M.name} has no arrows left to hunt.`, "warn");
      continue;
    }
    if (role === "tend") { tended = true; const c = check(Math.max(M.skills.survival, M.skills.heal), 13); const g = bandGain(c.tier, 22, 15, 6); st.animalCond = clamp(st.animalCond + g, 0, 100); pushLog(st, `${M.name} tends the team: the beasts settle${fit ? " under sure hands" : ""}.`, "info"); continue; }
    if (role === "repair") { if (st.res.repair >= 2) { st.res.repair -= 2; const c = check(Math.max(M.skills.athletics, M.skills.disable), 13); const g = bandGain(c.tier, 13, 9, 5); st.wagon = clamp(st.wagon + g, 0, 100); pushLog(st, `${M.name} shores up the frames: wagon +${g} (-2 repair).`, g >= 7 ? "good" : "info"); } else pushLog(st, `${M.name} has no repair stock to work with.`, "warn"); continue; }
    if (role === "medic") { const c = check(M.skills.heal, 13); const h = bandGain(c.tier, 13, 9, 4); if (h > 0) { st.party = st.party.map((x) => (x.hp > 0 ? { ...x, hp: clamp(x.hp + h, 0, x.maxHp) } : x)); pushLog(st, `${M.name} binds wounds on the march: +${h} to all.`, "good"); } continue; }
    if (role === "quarter") { thrift = true; pushLog(st, `${M.name} keeps a tight account of the stores; little is wasted today.`, "info"); continue; }
  }
  st.drivers = drivers + (st.hiredDriver ? 1 : 0); st.guards = guards; st.scouted = scouted; st.thrift = thrift;
  return { tended, thrift };
}

/* Animal speed factor from type, condition, and whether the team is short. */
function teamSpeed(st) {
  const cond = 0.55 + 0.45 * (st.animalCond / 100);
  const short = st.animals >= st.animalsNeeded ? 1 : 0.55 + 0.45 * (st.animals / st.animalsNeeded);
  return ANIMALS[st.animal].speed * cond * short;
}

function advanceDay(s, mode = "travel") {
  if (s.over || s.event || s.pending || s.ferry || s.beat || s.battle) return s;
  const st = { ...s, res: { ...s.res }, party: s.party.map((p) => ({ ...p })), cargo: { ...s.cargo }, roles: { ...s.roles }, drift: cloneDrift(s.drift), log: [...s.log] };
  st.day += 1;
  st.weather = rollWeather(st.day, ROUTE[st.legIndex].zone);
  if (mode === "travel" && st.hiredDriver) {
    const wage = st.driverWage || 2;
    if (st.res.gold >= wage) st.res.gold -= wage;
    else { st.hiredDriver = false; pushLog(st, "There is no coin for the teamster's wage. He unhitches his own mule and turns back down the road.", "warn"); }
  }
  const pace = mode === "camp" ? { miles: 0, wear: -3, morale: +4, ration: 1.0, condWear: 0 } : PACES[st.pace];

  const { tended } = applyRoles(st);
  eatStores(st, pace.ration);
  upkeepAnimals(st, pace.condWear, tended);
  coldTick(st, coldFor(st));
  relaxDrift(st);
  st.wagon = clamp(st.wagon - pace.wear * WAGONS[st.wagons].wearMul * (1 + st.weather.drag * 0.5), 0, 100);
  st.morale = clamp(st.morale + pace.morale - (st.weather.drag > 0.3 ? 2 : 0), 0, 100);
  if (st.eventCooldown > 0) st.eventCooldown -= 1;
  checkEnd(st); if (st.over) return st;

  let arrived = null;
  if (mode === "travel") {
    const driveFactor = st.drivers === 0 ? 0.5 : st.drivers === 1 ? 0.9 : 1.05;
    if (st.drivers === 0) { st.morale = clamp(st.morale - 3, 0, 100); pushLog(st, "No one on the reins; the caravan crawls and tempers fray.", "warn"); }
    const miles = Math.max(4, Math.round(pace.miles * (1 - st.weather.drag) * teamSpeed(st) * driveFactor * WAGONS[st.wagons].speedMul) + relicFx(st).miles);
    st.progress += miles;
    if (st.progress >= st.legMiles[st.legIndex]) {
      st.progress = 0; st.legIndex += 1;
      const node = ROUTE[st.legIndex]; arrived = node;
      pushLog(st, `Day ${st.day}: you reach ${node.name}. ${node.note}`, "arrive");
      if (node.zone !== ROUTE[st.legIndex - 1].zone) pushLog(st, `You cross into ${ZONES[node.zone].label}. ${ZONES[node.zone].blurb}`, "arrive");
      if (node.beat) { st.beat = { key: node.beat, step: 0 }; return st; }
      if (node.crossing) { st.ferry = { name: node.crossing, node: node.name, ice: (ZONES[node.zone].cold || 0) >= 1 }; return st; }
      if (node.branch) { st.pending = { kind: node.branch, node: node.name }; return st; }
    } else {
      pushLog(st, `Day ${st.day}: ${pick(TRAVEL)(miles, pick(SKY))}`, "day");
    }
  } else {
    restorePools(st);
    // a downed traveler is nursed back to consciousness overnight
    st.party = st.party.map((p) => (p.hp <= 0 ? { ...p, hp: Math.round(p.maxHp * 0.3) } : p));
    pushLog(st, `Day ${st.day}: you hold camp. Wounds close, the fallen are brought round, and spent prayers and spells return with the dawn.`, "info");
  }

  /* On the march, the road's skill challenges come first and combat fills the
     rest. In camp there are no road "events" — you're not covering ground — but
     in hostile wild country something can still come for you in the dark. */
  if (!arrived && !st.event && !st.battle && st.eventCooldown <= 0) {
    if (mode === "travel") {
      if (!maybeEvent(st)) maybeCombat(st);
    } else {
      const node = ROUTE[st.legIndex];
      if (node && !node.town && node.type !== "city") maybeCombat(st, 0.5, true);
    }
  }
  const mf = repFx(st).moraleFloor;
  if (mf && st.morale < mf) st.morale = mf;
  checkEnd(st);
  return st;
}

/* ---- Cold: the Crown of the World's true weapon. Burn whale-oil and wear
   furs to hold it off; go unprotected and the party and team pay in blood.
   This is why you must provision furs and oil in the north before the ice. */
function coldTick(st, cold) {
  if (cold <= 0) return;
  /* Furs are the mainstay against the cold (worn, not spent); whale-oil is a
     smaller nightly top-up that you CAN carry enough of. With both, a caravan
     is nearly safe; with neither, the ice kills by inches. */
  const fuelWant = cold >= 0.9 ? 2 : 1;
  let warmth = 0;
  if (st.cargo.furs > 0) warmth += 0.6;
  if (st.cargo.whaleoil > 0) { const burn = Math.min(st.cargo.whaleoil, fuelWant); st.cargo.whaleoil -= burn; warmth += 0.4 * (burn / fuelWant); }
  warmth = clamp(warmth, 0, 1);
  const exposure = cold * (1 - warmth) * relicFx(st).coldMul;
  if (exposure > 0.06) {
    const dmg = Math.round(exposure * roll(1, 3) + exposure * 1.5);
    if (dmg > 0) damageAll(st, dmg, "The cold cuts to the bone");
    st.morale = clamp(st.morale - Math.round(1 + exposure * 3), 0, 100);
    st.animalCond = clamp(st.animalCond - exposure * 3 / (ANIMALS[st.animal].cold || 1), 0, 100);
  } else if (Math.random() < 0.25) {
    pushLog(st, "Whale-oil fires and heavy furs hold the cold at bay tonight.", "info");
  }
}

/* Market pressure eases back toward fair value each day (mean reversion). */
const cloneDrift = (d) => { const o = {}; if (d) for (const t of Object.keys(d)) o[t] = { ...d[t] }; return o; };
function relaxDrift(st) {
  if (!st.drift) return;
  for (const t of Object.keys(st.drift)) for (const g of Object.keys(st.drift[t])) {
    const v = st.drift[t][g]; const nv = v + (v < 1 ? 0.02 : -0.02);
    st.drift[t][g] = (Math.abs(nv - 1) < 0.02) ? 1 : nv;
  }
}

/* Roll the day's ambush. Returns true if it resolved to a fight (or a dodged
   one via scouting), so the day's narrative event is skipped. */
function maybeCombat(st, mult = 1, atCamp = false) {
  const chance = combatChanceFor(st) * mult;
  if (chance <= 0 || Math.random() > chance) return false;
  if (st.scouted && Math.random() < 0.5) { pushLog(st, "Your scout catches the ambush forming from a rise and steers the caravan wide. No fight today.", "good"); st.eventCooldown = 1; return true; }
  const encKey = weightedPick(regionTable(st));
  st.battle = buildRoadBattle(st, encKey);
  st.eventCooldown = 2;
  pushLog(st, atCamp ? `Something finds your camp in the dark: ${ENCOUNTERS[encKey].name}. Steel comes out.` : `Ambush on the road: ${ENCOUNTERS[encKey].name}. Steel comes out.`, "bad");
  return true;
}

/* ---- Economy: a good's BASE price, bent by a town's demand (`market`) or its
   local supply (`offers`), then by a floating local pressure your own trades
   move and that eases back to fair value over days. ---- */
function driftGet(st, town, good) { return (st.drift && st.drift[town] && st.drift[town][good] != null) ? st.drift[town][good] : 1; }
function driftSet(st, town, good, v) { if (!st.drift) st.drift = {}; if (!st.drift[town]) st.drift[town] = {}; st.drift[town][good] = clamp(v, 0.6, 1.45); }
function sellPrice(st, node, good) {
  const idx = (node.market && node.market[good] != null) ? node.market[good] : 0.8;
  return Math.max(1, Math.round(GOODS[good].base * idx * driftGet(st, node.name, good)));
}
function buyPrice(st, node, good) {
  const off = node.offers && node.offers[good];
  if (off == null) return null;
  return Math.max(1, Math.round(GOODS[good].base * off * driftGet(st, node.name, good)));
}
const ZONE_COST = { varisia: 1.0, linnorm: 1.25, crown: 2.3, tianxia: 1.1 };

/* Journey's end: the throne is taken. The epilogue is colored by how the three
   pillars were met — the blessing carried, the blade recovered, the storm broken. */
function winGame(st) {
  st.over = "win";
  const f = st.flags || {};
  const boons = [];
  if (f.brinewall === "prepared") boons.push("the Amatatsu blessing carried unbroken to the throne");
  if (f.suishen) boons.push("Suishen, the ancestral blade, waking in Ameiko's hand");
  if (f.highice === "sheltered" || f.highice === "eye") boons.push("the Hungry Storm broken clean on the High Ice");
  const cargoVal = Object.entries(st.cargo).reduce((t, [g, q]) => t + (q > 0 ? q * sellPrice(st, ROUTE[st.legIndex], g) : 0), 0);
  st.overWhy = "The Jade Regent falls, and the Five Storms with him. On the day Ameiko Kaijitsu takes the throne of Minkai, the long road you carried her down finally, truly ends.";
  st.ledger = { day: st.day, gold: st.res.gold, cargoVal, earned: st.earned, boons, flags: f };
  return st;
}
const finishJourney = winGame;

function checkEnd(st) {
  if (st.over) return;
  if (st.party.every((p) => p.hp <= 0)) { st.over = "lose"; st.overWhy = "The last of the party falls on the road. The caravan is lost."; }
  else if (st.animals <= 0) { st.over = "lose"; st.overWhy = "The last beast is dead. A wagon with nothing to pull it goes nowhere."; }
  else if (st.wagon <= 0) { st.over = "lose"; st.overWhy = "The wagons finally break their backs. The cargo cannot go on."; }
  else if (st.day >= STRAND_DAY) { st.over = "lose"; st.overWhy = "The season runs out beneath you. Hopelessly behind, the caravan is swallowed by the dark and the snow, and Ameiko's road ends here."; }
}

/* =============================== EVENTS ============================ */
/* Class-keyed INFORMATION + gated OPTIONS with band-specific outcome bundles.
   An option with a `battle` key draws real steel: it hands off to the turn
   engine instead of resolving on a single die. */
const EVENTS = {
  brokenBridge: {
    title: "The Broken Span", where: (n) => n.type === "wild",
    body: "A timber bridge over a swollen creek has lost its middle. Black water shoulders past the pilings.",
    info: {
      Ranger: "Kass eyes the current: fordable at a gravel bar upstream, waist-deep, if you are quick.",
      Rogue: "Vex reads the pilings; sound enough to string a rope and haul the wagon across.",
      Wizard: "Ondrel measures the gap: barely fifteen feet. A spell would bridge it.",
      Cleric: "Hayden finds a shrine-post; pilgrims forded here before. It can be done.",
      Druid: "Yarrow listens to the creek and knows it: it crests within the hour, then falls just as fast.",
      Monk: "Rook could carry a line across the pilings hand over hand, if the wood will bear a body.",
    },
    options: [
      { id: "repair", label: "Rebuild the span (Athletics)", need: { repair: 6 }, skill: "athletics", dc: 15, outcomes: { good: { text: "New timber lashed across; the wagon rolls over dry.", days: 1, cost: { repair: 6 } }, fail: { text: "It holds, barely; the afternoon and extra lumber gone.", days: 1, cost: { repair: 6 } }, bad: { text: "A beam splits. You salvage what you can, a day and timber lost.", days: 2, cost: { repair: 6 }, hurtRepair: 3 } } },
      { id: "ford", label: "Ford at the gravel bar (Survival)", skill: "survival", dc: 14, outcomes: { good: { text: "A clean line; the wagon fords dry.", days: 0 }, fail: { text: "You cross soaked; a feed-sack washes off the tail.", days: 0, cost: { feed: 3 } }, bad: { text: "The current takes a wheel; wagon strained, a hard soaking.", days: 1, hurtWagon: 12, hurtParty: 3, breakFragile: true } } },
      { id: "rope", label: "Rig a rope crossing (Rogue/Monk: Disable/Athletics)", gate: ["vex", "rook"], skill: "disable", dc: 13, outcomes: { good: { text: "The line is spanned within the hour; the wagon glides over.", days: 0 }, fail: { text: "The rig sags but serves. Slow, careful going.", days: 1 }, bad: { text: "A knot slips mid-haul; nothing lost but the morning.", days: 1 } } },
      { id: "spell", label: "Bridge it with force (Wizard: 1st slot)", gate: "ondrel", cost: { spells1: 1 }, outcomes: { good: { text: "Ondrel shapes a plank of force. You cross as if it were paved.", days: 0 } } },
      { id: "around", label: "Go the long way round", outcomes: { good: { text: "Back to the old cart-track. Safe, and slow.", days: 2 } } },
    ],
  },
  banditToll: {
    title: "The Sanos Toll", where: (n) => n.name === "Grungir Forest",
    body: "Figures step from the pines. Their leader rests a hand on the lead beast. \"Road tax,\" he says, almost friendly. \"Fifty gold. Or we discuss it.\"",
    info: {
      Ranger: "Kass counts six in the trees, two more unseen. A fight is not free.",
      Rogue: "Vex reads the leader: greedy, not desperate. There is a deal in him.",
      Cleric: "Hayden sees hard-luck men, not killers by trade.",
      Wizard: "Ondrel notes their loose formation. One good spell would scatter them.",
      Fighter: "Dram has faced this crew's like a hundred times. They break if you hit first.",
      Barbarian: "Sura simply cracks her knuckles.",
      Bard: "Lem is already grinning; this one talks his language.",
      Paladin: "Ysolde will pay a fair toll, but not a robber's price, and they can see she means it.",
      Sorcerer: "Ember lets a curl of flame walk across her knuckles, and watches them notice.",
    },
    options: [
      { id: "pay", label: "Pay the toll (50 gold)", need: { gold: 50 }, outcomes: { good: { text: "Coin changes hands. They melt into the pines. No blood, lighter purse.", days: 0, cost: { gold: 50 } } } },
      { id: "parley", label: "Talk them down (Bard/Rogue/Cleric/Paladin: Diplomacy)", gate: ["lem", "vex", "halden", "ysolde"], skill: "diplomacy", dc: 16, outcomes: { good: { text: "It is halved, then halved again; through for ten gold and a story.", days: 0, cost: { gold: 10 } }, fail: { text: "You settle at thirty. Everyone lives, the purse lighter.", days: 0, cost: { gold: 30 } }, bad: { text: "\"Full price, and now you have annoyed me.\" Sixty gold.", days: 0, cost: { gold: 60 } } } },
      { id: "slip", label: "Slip the party past (Ranger/Rogue/Monk: Stealth)", gate: ["kass", "vex", "rook"], skill: "stealth", dc: 17, outcomes: { good: { text: "A deer-trail around the whole ambush. They never see the wagon.", days: 1 }, fail: { text: "Most of the way before a shout, but you are already gone.", days: 1 }, bad: { text: "A branch cracks; they chase. You outrun them, jarring the wagon.", days: 1, hurtWagon: 6 } } },
      { id: "fight", label: "Refuse them, and draw steel [battle]", battle: "banditToll" },
    ],
  },
  sickAnimal: {
    title: "A Fevered Beast", where: (n) => n.type === "wild",
    body: "A beast stumbles at dawn, flank hot, eyes filmed. Left alone it worsens, and a dead animal is a slow caravan.",
    info: {
      Ranger: "Kass has doctored beasts on the trail. Handled right, it can be nursed through.",
      Cleric: "Hayden knows the rite now: Remove Disease, a 5th-level prayer. He can burn the fever out.",
      Rogue: "Vex recalls a hedge-remedy from a misspent youth.",
      Wizard: "Ondrel names it from a bestiary plate: filth fever. Rest and clean water, or it spreads.",
      Druid: "Yarrow lays a hand on the beast's neck; she has walked animals through worse than this.",
      Paladin: "Ysolde cannot cure a sickness yet, but her lay-on-hands will keep the beast on its feet a while.",
    },
    options: [
      { id: "pray", label: "Cure it outright (Cleric: Remove Disease)", gate: "halden", cost: { spells3: 1 }, outcomes: { good: { text: "Hayden lays on hands and speaks the rite. The fever simply leaves. No day lost.", days: 0, morale: 2 } } },
      { id: "handle", label: "Nurse it through (Ranger/Druid: Survival)", gate: ["kass", "yarrow"], skill: "survival", dc: 14, outcomes: { good: { text: "Poulticed and walked slow; by dusk the fever breaks.", days: 1 }, fail: { text: "It rallies, but the day is spent at a crawl.", days: 1 }, bad: { text: "Nothing takes. The beast worsens and drops from the team.", days: 2, hurtAnimals: 1 } } },
      { id: "medicine", label: "Spend alchemical supplies (Medicine)", need: { medicine: 2 }, outcomes: { good: { text: "A tincture and a day's rest. The beast recovers.", days: 1, cost: { medicine: 2 } } } },
      { id: "push", label: "Push on and hope", outcomes: { good: { text: "It holds, for now. Speed bought against a gamble.", days: 0, riskAnimal: true } } },
    ],
  },
  wisp: {
    title: "Lights in the Fen", where: (n) => n.name === "Brinestump Marsh",
    body: "After dark a pale lantern bobs beyond the reeds, swaying like it wants to be followed. A drover has already risen to go toward it.",
    info: {
      Ranger: "Kass grabs his arm. \"That is no lantern. Will-o'-wisp. It feeds on the drowning.\"",
      Wizard: "Ondrel names it at once: a wisp, luring the frightened into the bog.",
      Rogue: "Vex cannot say what it is, but a light with no lantern-bearer smells like a trap.",
      Cleric: "Hayden feels the wrongness and calls the camp to prayer.",
      Sorcerer: "Ember knows a false flame when she sees one; hers is warmer, and true.",
      Druid: "Yarrow has read of these lights in the fen. She warns the camp to stay close to the fire.",
    },
    options: [
      { id: "hold", label: "Hold the camp, ignore it (Will)", outcomes: { good: { text: "You bank the fire, keep everyone close, and let it drift away hungry.", days: 0 } } },
      { id: "ward", label: "Ward the camp (Cleric: channel)", gate: "halden", cost: { channels: 1 }, outcomes: { good: { text: "Hayden's light steadies every nerve. The wisp finds nothing to feed on.", days: 0, morale: 2 } } },
      { id: "light", label: "Out-shine it (Wizard/Sorcerer: Light)", gate: ["ondrel", "ember"], outcomes: { good: { text: "A cold clear glow. Beside real light the lure looks cheap; the drover sits back down.", days: 0 } } },
      { id: "follow", label: "Investigate the light (Rogue: Perception)", gate: "vex", skill: "perception", dc: 18, outcomes: { good: { text: "Vex marks the sinkhole, and comes back richer for a purse dropped in the mud.", days: 0, cost: { gold: -25 } }, fail: { text: "A cold hour and wet boots, nothing more.", days: 0 }, bad: { text: "The bog nearly takes Vex. You haul him out spitting silt.", days: 1, hurtParty: 5 } } },
    ],
  },
  mire: {
    title: "Bogged Down", where: (n) => n.name === "Brinestump Marsh" || (n.type === "wild" && ZONES[n.zone].cold < 1),
    body: "A wheel drops to the axle in black mud and will not come free. The whole caravan halts around it.",
    info: {
      Fighter: "Dram spits on his hands. \"Everybody push.\"",
      Barbarian: "Sura is already setting her shoulder to the wheel.",
      Ranger: "Kass reads the ground: firmer footing lies just left of the ruts.",
      Rogue: "Vex figures a lever and a plank could do what muscle cannot.",
      Monk: "Rook plants his feet and finds the wheel's true point of purchase.",
      Paladin: "Ysolde sets her back to it without a word and waits for the others.",
    },
    options: [
      { id: "haul", label: "Muscle it free (Athletics)", skill: "athletics", dc: 15, outcomes: { good: { text: "Backs bent, the wheel sucks free with a crack. A muddy hour, no more.", days: 0 }, fail: { text: "It comes free at last, but the effort costs the afternoon.", days: 1 }, bad: { text: "The axle groans under the strain. Free, but the wagon is the worse for it.", days: 1, hurtWagon: 10 } } },
      { id: "lever", label: "Lever it with planks (Rogue: Disable)", gate: "vex", need: { repair: 3 }, skill: "disable", dc: 13, outcomes: { good: { text: "Vex sets a fulcrum; the wagon lifts clean out. Neat work.", days: 0, cost: { repair: 3 } }, fail: { text: "It works, slowly, and eats some lumber.", days: 1, cost: { repair: 3 } } } },
      { id: "lighten", label: "Dump cargo to lighten the load", outcomes: { good: { text: "You pitch the heaviest crates into the mire and roll free, but that was goods you meant to sell.", days: 0, dumpCargo: true } } },
      { id: "wait", label: "Wait for the ground to firm", outcomes: { good: { text: "A day of cold sun bakes the ruts hard enough to pull free.", days: 1 } } },
    ],
  },
  peddler: {
    title: "A Peddler on the Road", where: (n) => n.type === "wild", boon: true,
    body: "A lone cart rattles up the other way, its owner a weathered trader with a shrewd eye and a road-worn ledger. \"Buying or selling, friends?\"",
    info: {
      Bard: "Lem knows this face: a fair dealer, if you push a little.",
      Rogue: "Vex can tell the ledger is honest, mostly.",
      Cleric: "Hayden trusts the man's manner.",
      Paladin: "Ysolde judges him straight enough to deal with.",
    },
    options: [
      { id: "sell", label: "Sell him a wagonload of goods", outcomes: { good: { text: "You clear some cargo at a decent roadside price. Coin in hand beats coin in the east.", days: 0, roadSell: 1.15 } } },
      { id: "haggle", label: "Haggle hard (Bard/Rogue: Diplomacy)", gate: ["lem", "vex"], skill: "diplomacy", dc: 15, outcomes: { good: { text: "You talk him up to a town-and-a-half price. He shakes his head, grinning, and pays.", days: 0, roadSell: 1.45 }, fail: { text: "He will not be moved far. Still, a fair price for the road.", days: 0, roadSell: 1.15 }, bad: { text: "You push too hard; he shrugs and rolls on. Nothing sold.", days: 0 } } },
      { id: "buysupply", label: "Buy provisions off him (40 gold)", need: { gold: 40 }, outcomes: { good: { text: "Food, water, feed, and a little medicine, all off the back of his cart.", days: 0, cost: { gold: 40 }, gain: { food: 16, water: 16, feed: 14, medicine: 2 } } } },
      { id: "rob", label: "Take his cart and leave him the road", gate: ["Barbarian", "Fighter", "Rogue"], skill: "athletics", dc: 12, outcomes: { good: { text: "He backs off his own cart, hands raised, and you help yourselves. He'll live — and he'll talk. Word of a caravan that robs honest traders will run ahead of you now.", days: 0, gain: { food: 20, water: 12, feed: 12, medicine: 3, gold: 25 }, rep: -2 } } },
      { id: "wave", label: "Wave him on", outcomes: { good: { text: "You nod and pass. The road is long and you have miles to make.", days: 0 } } },
    ],
  },
  stormwall: {
    title: "The Storm-Wall", where: (n) => (ZONES[n.zone].cold || 0) >= 1, major: true,
    body: "The eastern sky has gone the colour of a bruise, and it is coming for you: a wall of early-winter storm, wind full of ice, taller than the hills. There is time to decide, and no more.",
    info: {
      Ranger: "Kass shouts over the wind: there is a cut in the ridge, hard to find, but it would shelter the caravan and cost no days.",
      Wizard: "Ondrel: the front is vast. Outrunning it is folly; going through it, worse.",
      Cleric: "Hayden begins a prayer against the cold and means it.",
      Barbarian: "Sura laughs into the wind. \"We push. We always push.\"",
      Fighter: "Dram: \"Lash everything down and pick your poison.\"",
      Druid: "Yarrow reads the wall and knows its heart will pass to the north, if you can wait it a day.",
      Paladin: "Ysolde moves down the line, steadying beasts and drovers alike.",
    },
    options: [
      { id: "shelter", label: "Shelter and wait it out (safe, costs days)", outcomes: { good: { text: "You lash down and hunker. The storm screams for two days and moves on. You have lost time you may not have.", days: 3, morale: -2 } } },
      { id: "pass", label: "Find the ridge-cut (Ranger/Rogue/Druid: Survival)", gate: ["kass", "vex", "yarrow"], skill: "survival", dc: 18, outcomes: { good: { text: "The caravan threads into a stone cut just as the wall hits. You wait it out sheltered, and lose no ground at all.", days: 0, morale: 3 }, fail: { text: "You find shelter late; the leading edge catches you. Cold, battered, but through, and only a day behind.", days: 1, hurtParty: 6, hurtCond: 15 }, bad: { text: "The cut is a dead end. You ride out the storm exposed. It is a very bad night.", days: 2, hurtParty: 12, hurtWagon: 15, hurtCond: 25 } } },
      { id: "push", label: "Drive straight through it (brutal, no days lost)", outcomes: { good: { text: "You go into the white and do not stop. It nearly kills the team and cracks a wagon, but you come out the far side having lost nothing but hide and nerve.", days: 0, hurtParty: 10, hurtWagon: 20, hurtCond: 35, riskAnimal: true } } },
    ],
  },
  goblinFireworks: {
    title: "Fireworks in the Reeds", where: (n) => n.name === "Brinestump Marsh",
    body: "The Brinestump goblins have found a cache of Tian fireworks, and they are drunk on the noise. Rockets scream over the reeds; a stray one lands hissing under a wagon.",
    info: {
      Ranger: "Kass counts a full warren's worth, but goblins scatter if you break their nerve.",
      Bard: "Lem could out-sing the little maniacs; they love a show more than a fight.",
      Rogue: "Vex can snuff the cache before it takes a wagon with it.",
      Wizard: "Ondrel notes the fireworks are Tian-made — worth good coin intact.",
      Barbarian: "Sura just wants to charge into the reeds roaring.",
    },
    options: [
      { id: "scatter", label: "Break their nerve (Bard/Barbarian: Intimidate)", gate: ["Bard", "Barbarian"], skill: "diplomacy", dc: 14, outcomes: { good: { text: "One great roar (or a filthier song) and the warren bolts, dropping a satchel of unspent fireworks worth good coin.", days: 0, gain: {}, morale: 2, cost: { gold: -30 } }, fail: { text: "They scatter, but take their toys with them.", days: 0 }, bad: { text: "They rush the wagons first; you drive them off bruised.", days: 0, hurtParty: 4 } } },
      { id: "snuff", label: "Snuff the cache (Rogue/Ranger: Disable)", gate: ["Rogue", "Ranger"], skill: "disable", dc: 13, outcomes: { good: { text: "The fuses are cut and stamped out before the worst goes up. Quiet, and no harm done.", days: 0 }, fail: { text: "Most of it fizzles harmlessly; one wagon's canvas is scorched.", days: 0, hurtWagon: 4 } } },
      { id: "fight", label: "Drive them off with steel [battle]", battle: "goblinAmbush" },
      { id: "run", label: "Whip the team and run the gauntlet", outcomes: { good: { text: "You gun through the reeds under a rain of sparks. Singed, rattled, but clear.", days: 0, hurtParty: 3, morale: -1 } } },
    ],
  },
  crevasse: {
    title: "A Crack in the World", where: (n) => (ZONES[n.zone].cold || 0) >= 1,
    body: "A snow-bridge over a crevasse groans under the lead wagon. Below is blue ice and a drop with no bottom you can see.",
    info: {
      Ranger: "Kass reads the snow-bridge: sound to the left, rotten to the right.",
      Druid: "Yarrow feels the ice breathing. There is a safe span, if you trust her.",
      Rogue: "Vex can probe and flag a path, slow but sure.",
      Monk: "Rook could walk the load across light-footed, one beast at a time.",
    },
    options: [
      { id: "read", label: "Find the sound span (Ranger/Druid: Survival)", gate: ["Ranger", "Druid"], skill: "survival", dc: 16, outcomes: { good: { text: "Flagged and crossed, wheel by careful wheel. Not a strap lost.", days: 0 }, fail: { text: "A wagon's rear wheel breaks through; you haul it back from the lip.", days: 1, hurtWagon: 10 }, bad: { text: "The bridge gives as the last wagon crosses. You save the team, but someone goes down with the load.", days: 1, hurtWagon: 18, breakFragile: true, injure: 0.7, injureCause: "in the fall" } } },
      { id: "probe", label: "Probe every foot (slow, safe)", outcomes: { good: { text: "You spend half a day sounding the ice and lead the caravan over cold but whole.", days: 1, morale: -1 } } },
      { id: "rush", label: "Gun it across before it can give", outcomes: { good: { text: "You whip the team and thunder over. The bridge collapses behind the last wheel. Nerves, but no losses.", days: 0, riskAnimal: true, hurtCond: 12 } } },
    ],
  },
  aurora: {
    title: "The Lights Overhead", where: (n) => (ZONES[n.zone].cold || 0) >= 1, boon: true,
    body: "The whole northern sky catches fire — green and violet curtains rippling from horizon to horizon. Even the beasts go still to watch. For one night the ice does not feel like it wants you dead.",
    info: {
      Druid: "Yarrow says the old Erutaki call this the dance of the dead, and it is a blessing to see it.",
      Cleric: "Hayden calls it grace, and the camp bows its head.",
      Bard: "Lem is already fitting words to it; a song the party will carry the rest of the road.",
    },
    options: [
      { id: "rest", label: "Let the company watch and rest", outcomes: { good: { text: "For once no one grumbles, no one shivers. The caravan sleeps warm in spirit if not in body, and rolls out lighter of heart.", days: 0, morale: 8 } } },
      { id: "song", label: "Give it a song (Bard: Performance)", gate: "Bard", skill: "diplomacy", dc: 12, outcomes: { good: { text: "Lem's voice under the lights is something none of them forget. Morale soars.", days: 0, morale: 12 }, fail: { text: "The song cracks in the cold, but the sentiment lands anyway.", days: 0, morale: 6 } } },
    ],
  },
  kami: {
    title: "The Watcher in the Wood", where: (n) => n.name === "Forest of Spirits",
    body: "A fox with too many tails sits in the road and does not move. The air hums. This is a kami's wood, and it has questions about the strangers passing through it.",
    info: {
      Druid: "Yarrow bows low; she knows how to speak to a spirit of place.",
      Cleric: "Hayden offers respect, god to god's servant.",
      Bard: "Lem has a riddle-tongue the fox might enjoy.",
      Monk: "Rook has trained beside Tian shrines; he knows the courtesies.",
    },
    options: [
      { id: "honor", label: "Show the proper courtesy (Druid/Monk/Cleric)", gate: ["Druid", "Monk", "Cleric"], skill: "diplomacy", dc: 15, outcomes: { good: { text: "The kami inclines its head, and the wood opens a hidden, easy path. It even leaves a gift of jade at the trailhead.", days: 0, morale: 4, cost: { gold: -60 } }, fail: { text: "It judges you neither friend nor foe, and simply lets you pass.", days: 0 }, bad: { text: "You give offense; the wood tangles around you and steals a day before it relents.", days: 1, morale: -2 } } },
      { id: "riddle", label: "Match its riddle (Bard: Lore)", gate: "Bard", skill: "knowledge", dc: 16, outcomes: { good: { text: "Lem answers cleverly; the fox laughs like wind-chimes and speeds you on your way.", days: 0, morale: 5 }, fail: { text: "The answer is wrong, but the fox forgives a good try.", days: 0 } } },
      { id: "ignore", label: "Walk around it and move on", outcomes: { good: { text: "You give the fox a wide berth. It watches you the whole way, unblinking, but does nothing.", days: 0, morale: -1 } } },
    ],
  },

  /* ---- Predators & the spooked team ---- */
  spooked: {
    title: "Something in the Dark",
    where: (n) => n.type === "wild",
    body: "The animals catch a scent and go rigid — ears back, eyes rolling. Somewhere out past the firelight, a big predator is pacing the caravan, and the team is a heartbeat from bolting.",
    info: {
      Ranger: "Kass reads it: a hunting cat, circling. Hold the beasts and it may lose its nerve first.",
      Druid: "Yarrow can speak the fear out of them, if the party stays still.",
      Barbarian: "Sura wants to stand up and roar the thing back into the dark.",
      Fighter: "Dram forms the guards up between the predator and the team.",
    },
    options: [
      { id: "settle", label: "Settle the team (Ranger/Druid: Survival)", gate: ["Ranger", "Druid"], skill: "survival", dc: 14, outcomes: { good: { text: "A steady hand and a low voice; the animals blow and stamp, then quiet. The shadow slinks off, and nothing is lost.", days: 0, morale: 2 }, fail: { text: "You hold most of them, but one mule tears loose and bolts before you catch it. Cost you condition wrestling it back.", days: 0, hurtCond: 12 }, bad: { text: "The team panics as one. A tangle of harness, a cracked shaft, and someone dragged under the hooves before you calm it.", days: 0, hurtCond: 20, hurtWagon: 8, riskAnimal: true, injure: 0.6, injureCause: "under the panicked team" } } },
      { id: "front", label: "Guards to the front, drive it off", gate: ["Fighter", "Barbarian", "Paladin"], skill: "athletics", dc: 13, outcomes: { good: { text: "Torches up, steel bared, a wall of shouting between the team and the dark. The predator decides you are more trouble than a meal.", days: 0, morale: 1 }, fail: { text: "It circles a while longer, keeping everyone on edge and sleepless. Morale sags.", days: 0, morale: -3 } } },
      { id: "ride", label: "Break camp and move — now", outcomes: { good: { text: "You hitch up in the dark and roll out fast, hearts pounding. Whatever it was, it doesn't follow. Nobody sleeps much.", days: 0, morale: -2 } } },
    ],
  },
  bear: {
    title: "The Road's Owner",
    where: (n) => n.type === "wild" && (ZONES[n.zone].cold || 0) < 1,
    body: "A great shaggy bear stands square in the trail, unbothered, chewing. It has decided this is its road today, and it is bigger than any argument you'd care to make.",
    info: {
      Ranger: "Kass says back off slow. It's not hunting — it just wants the berries.",
      Barbarian: "Sura reckons a big enough roar settles who owns what.",
      Druid: "Yarrow can ask it, in a manner of speaking, to move along.",
    },
    options: [
      { id: "wait", label: "Give it room and wait it out", outcomes: { good: { text: "You hold back and let the bear finish its business. In its own time it ambles off into the trees, and you roll on, an hour poorer and none the worse.", days: 0 } } },
      { id: "shoo", label: "Drive it off (Druid/Barbarian)", gate: ["Druid", "Barbarian"], skill: "diplomacy", dc: 14, outcomes: { good: { text: "A word from Yarrow, or a bellow from Sura, and the great beast decides elsewhere is better. The road is yours.", days: 0, morale: 2 }, fail: { text: "It huffs, swats a wagon-cover to ribbons, and leaves on its own terms. Could have been worse.", days: 0, hurtWagon: 6 } } },
    ],
  },

  /* ---- Hard terrain ---- */
  rockslide: {
    title: "The Way Is Shut",
    where: (n) => n.type === "wild",
    body: "A slope has let go across the trail — a tumble of broken rock and torn earth, too high to simply drive over. The road is closed until you open it.",
    info: {
      Fighter: "Dram can move stone. Slow, brutal work, but it clears.",
      Barbarian: "Sura will shift the whole hillside if you give him room.",
      Ranger: "Kass can find a game trail around it, if you'll spend the daylight.",
    },
    options: [
      { id: "clear", label: "Clear the road (Fighter/Barbarian: Athletics)", gate: ["Fighter", "Barbarian"], skill: "athletics", dc: 15, outcomes: { good: { text: "Backs bent and levers set, you haul the slide apart stone by stone and drive through by dusk.", days: 1, morale: -1 }, fail: { text: "It fights you the whole day; you get through, but everyone is spent.", days: 1, morale: -3 } } },
      { id: "around", label: "Find a way around (Ranger/Druid: Survival)", gate: ["Ranger", "Druid"], skill: "survival", dc: 14, outcomes: { good: { text: "A narrow track through the trees skirts the slide and rejoins the road beyond. Costs the day, but spares your backs.", days: 1 }, fail: { text: "The detour dead-ends twice before it goes through. A long, grumbling day.", days: 2, morale: -2 } } },
      { id: "force", label: "Force the wagons over the rubble", outcomes: { good: { text: "You pick and heave a path just wide enough and grind the wagons over it. Hard on the frames and the team, but no day lost.", days: 0, hurtWagon: 7, hurtCond: 8 } } },
    ],
  },
  washout: {
    title: "The Road Turned to Mire",
    where: (n) => n.type === "wild" && (ZONES[n.zone].cold || 0) < 1,
    body: "Rain has taken the road out — a long stretch churned to axle-deep mud and running water. Drive it wrong and a wagon goes in to the bed.",
    info: {
      Rogue: "Vex can lay a corduroy of cut poles across the worst of it — costs repair stock, but it holds.",
      Ranger: "Kass knows the high ground; there's a firmer line if you look.",
    },
    options: [
      { id: "corduroy", label: "Corduroy the road (spends repair stock)", need: { repair: 4 }, cost: { repair: 4 }, outcomes: { good: { text: "You fell poles and lay a rough log road across the mire. The wagons cross dry-shod. Repair stock well spent.", days: 0, morale: 1 } } },
      { id: "highline", label: "Find the firm line (Ranger/Druid: Survival)", gate: ["Ranger", "Druid"], skill: "survival", dc: 14, outcomes: { good: { text: "You pick a winding line along the high ground and thread the whole caravan through clean.", days: 0 }, fail: { text: "The 'firm' line gives halfway across; you dig a wagon out and lose half a day to it.", days: 1, hurtCond: 10 } } },
      { id: "wade", label: "Just drive through it", outcomes: { good: { text: "You whip the team into the mud and pray. A wagon nearly beds down and the beasts strain half to lame, but you come out the far side.", days: 0, hurtCond: 9, riskAnimal: true } } },
    ],
  },
  snowdrift: {
    title: "The Pass Is Drifted Shut",
    where: (n) => (ZONES[n.zone].cold || 0) >= 1,
    body: "The wind has packed the pass with snow, chest-deep and hard-crusted. There is no way through but to make one, and the cold has all the time in the world.",
    info: {
      Barbarian: "Sura will break trail with his own shoulders if he must.",
      Fighter: "Dram sets the whole company digging in shifts.",
      Ranger: "Kass can read where the drift is thinnest and shortest to breach.",
    },
    options: [
      { id: "dig", label: "Break trail through (Athletics)", gate: ["Barbarian", "Fighter", "Monk"], skill: "athletics", dc: 15, outcomes: { good: { text: "Shift by frozen shift, you cut a channel wide enough and lead the team through. Bitter, exhausting, done.", days: 1, hurtParty: 4, morale: -2 }, fail: { text: "The digging goes long and the cold gets its teeth in before you break through.", days: 1, hurtParty: 9, morale: -3, injure: 0.4, injureCause: "to the cold" } } },
      { id: "thin", label: "Find the thinnest breach (Ranger: Survival)", gate: ["Ranger", "Druid"], skill: "survival", dc: 15, outcomes: { good: { text: "Kass reads the drift and picks the one place it's barely waist-deep. You're through by midday with breath to spare.", days: 0, morale: 1 }, fail: { text: "The 'thin' place isn't. You dig anyway, and lose the day to it.", days: 1, hurtParty: 5 } } },
      { id: "waitdrift", label: "Wait for the wind to scour it", outcomes: { good: { text: "You hunker down two days while the wind strips the pass back to rock. Safe, but the cold and the delay cost you dearly.", days: 2, morale: -3 } } },
    ],
  },
  scree: {
    title: "The Loose Slope",
    where: (n) => n.type === "wild" && (ZONES[n.zone].cold >= 1 || n.name === "Stormspear Hills" || n.name === "Rimethirst Pass"),
    body: "The trail crosses a long shoulder of loose scree that shifts and slides underfoot. One bad step and a wagon — or a beast — goes down the slope.",
    info: {
      Monk: "Rook can walk the loads across light-footed, a beast at a time.",
      Ranger: "Kass can pick the settled line where the stone holds.",
    },
    options: [
      { id: "lead", label: "Lead the team across on foot (Survival/Athletics)", gate: ["Ranger", "Monk", "Druid"], skill: "survival", dc: 14, outcomes: { good: { text: "One beast at a time, coaxed across the settled line while everyone holds their breath. Slow, but nothing lost.", days: 0, morale: 1 }, fail: { text: "A wagon slews and slides a dozen feet before it catches. You save it, barely, cracked and scraped.", days: 0, hurtWagon: 10 } } },
      { id: "rushscree", label: "Push across quick before it shifts", outcomes: { good: { text: "You hurry the caravan over the loose ground. It slides under you the whole way — a shaft snaps, a beast goes to its knees — but you make it.", days: 0, hurtWagon: 7, riskAnimal: true } } },
    ],
  },

  /* ---- Encounters that are just people on a long road ---- */
  pilgrims: {
    title: "Fellow Travelers",
    where: (n) => n.type === "wild" && (ZONES[n.zone].cold || 0) < 1,
    body: "A ragged band of pilgrims shares the road a while, bound for some shrine over the next range. They are footsore and glad of company, and full of small talk about weather and saints and the price of bread.",
    options: [
      { id: "share", label: "Share the road and swap stories", outcomes: { good: { text: "You walk together an afternoon, trading road tales and bad jokes. The company rolls on lighter of heart, and the pilgrims speak well of you down the road.", days: 0, morale: 3, rep: 1 } } },
      { id: "news", label: "Ask what lies on the road ahead", outcomes: { good: { text: "They tell you what they've seen — a ferry running high, a village with good grain, a stretch best passed by daylight. Useful, and kindly meant.", days: 0, morale: 1 } } },
      { id: "wavepilg", label: "Nod and keep your own pace", outcomes: { good: { text: "You tip your hat and press on. They wave you off with a blessing you don't ask for and don't refuse.", days: 0 } } },
    ],
  },
  skald: {
    title: "A Skald on the Road",
    where: (n) => n.zone === "linnorm",
    body: "A wandering Ulfen skald falls in beside the wagons, harp on his back and a hundred sagas behind his teeth. He'll trade a song for a seat by your fire and news of the south.",
    options: [
      { id: "song", label: "Ask for a saga", outcomes: { good: { text: "He gives you the whole tale of a linnorm's slaying, roared out over the tundra wind. The company is still humming it two days on.", days: 0, morale: 3 } } },
      { id: "trade", label: "Trade him news of the south", outcomes: { good: { text: "You tell him of Sandpoint and the Varisian road; he files it away for a verse. A fair exchange between travelers.", days: 0, morale: 1 } } },
      { id: "passkald", label: "Let him find another fire", outcomes: { good: { text: "You've a hard road and little time for songs. He shrugs, unoffended, and turns off toward the next steading.", days: 0 } } },
    ],
  },
  caravan: {
    title: "A Caravan the Other Way",
    where: (n) => n.type === "wild",
    body: "Wagons appear on the road ahead, bound the way you came. The two trains slow and pass close, and for a few minutes the drivers lean across to trade the only currency that matters out here: word of what's behind them.",
    options: [
      { id: "swap", label: "Trade road-news across the wagons", outcomes: { good: { text: "You swap the state of the road, wagon to wagon — where the going's good, where it isn't, who to trust and who not. Both trains roll on the wiser.", days: 0, morale: 2 } } },
      { id: "askmkt", label: "Ask after prices where they've been", outcomes: { good: { text: "They tell you what sold well and what didn't in the towns ahead. Worth knowing, when your living rides in crates.", days: 0, morale: 1 } } },
      { id: "nodcar", label: "A nod, and both roll on", outcomes: { good: { text: "A raised hand, a tip of the hat, and the two caravans slide past each other into their separate distances.", days: 0 } } },
    ],
  },
  hermit: {
    title: "The Hermit's Fire",
    where: (n) => n.type === "wild",
    body: "A thread of woodsmoke leads to a hermit tending a small fire by a lean-to, miles from anywhere. He watches you approach without surprise, as though he's been expecting exactly this caravan on exactly this day.",
    options: [
      { id: "hear", label: "Sit a while and hear him out", outcomes: { good: { text: "He speaks in riddles about roads and returns and the weight of what you carry. Little of it makes sense, but there's a strange comfort in it, and the company leaves oddly steadied.", days: 0, morale: 2 } } },
      { id: "gift", label: "Share some food with him", cost: { food: 3 }, outcomes: { good: { text: "You leave him a little food. He presses a smooth river-stone into your hand 'for luck at the water,' and says nothing more. It feels right.", days: 0, morale: 3, rep: 1, mark: "lucky_stone" } } },
      { id: "leaveherm", label: "Leave him to his solitude", outcomes: { good: { text: "You raise a hand and pass on. He returns to his fire without a word, and is gone behind the trees before the last wagon clears the bend.", days: 0 } } },
    ],
  },
  monkroad: {
    title: "The Traveling Monk",
    where: (n) => n.zone === "tianxia",
    body: "A monk in road-worn robes walks the same way you do, alms bowl at his belt, pace unhurried and endless. He greets you in the Tian manner and seems entirely content to share the miles in companionable quiet.",
    options: [
      { id: "tea", label: "Halt and share tea with him", outcomes: { good: { text: "You brew a pot at the roadside. He speaks a little of the country ahead and the way of walking long roads, and the whole company rises from the tea calmer than it sat.", days: 0, morale: 3 } } },
      { id: "bow", label: "Exchange bows and walk together", outcomes: { good: { text: "No words needed. You walk a few miles in shared silence, and part with a bow. It costs nothing and leaves everyone lighter.", days: 0, morale: 1 } } },
      { id: "hurrymonk", label: "Press on ahead of him", outcomes: { good: { text: "You have miles to make and a season at your heels. He simply nods and keeps his own unbroken pace as you pull away.", days: 0 } } },
    ],
  },
  children: {
    title: "Children on the Verge",
    where: (n) => n.type === "wild" && (ZONES[n.zone].cold || 0) < 1,
    body: "You pass close to a hamlet's edge, and a knot of village children spills out to run alongside the wagons, shrieking with delight, begging to see the strange goods and stranger faces from far away.",
    options: [
      { id: "ride", label: "Let a few ride the tailboard a mile", outcomes: { good: { text: "You swing a couple up onto the tailboard for a mile of giddy adventure, then set them down to run home breathless with the tale. Word of the kind caravan runs ahead of you.", days: 0, morale: 3, rep: 1 } } },
      { id: "coin", label: "Toss them a coin and a wave", cost: { gold: 2 }, outcomes: { good: { text: "A scatter of copper and a scramble of laughter, and the caravan rolls on trailing cheers. Cheap, at the price.", days: 0, morale: 2 } } },
      { id: "shoo", label: "Shoo them off — no time", outcomes: { good: { text: "You wave them back from the wheels and press on. Their cheering curdles to jeers, and word of the cold-hearted caravan runs ahead of you.", days: 0, morale: -1, rep: -1 } } },
    ],
  },
  cairns: {
    title: "The Cairns on the Ice",
    where: (n) => (ZONES[n.zone].cold || 0) >= 1,
    body: "You pass a line of snow-humped cairns beside the trail — stones piled over those who came this way before you and got no farther. Someone has kept them tended. Someone always does.",
    options: [
      { id: "pay", label: "Stop and pay them respect", outcomes: { good: { text: "You halt a moment and add a stone to the nearest pile, as is the custom. No one speaks. When you roll on, the company holds a little closer together against the cold.", days: 0, morale: 2 } } },
      { id: "onward", label: "Press on past in silence", outcomes: { good: { text: "You do not stop. You have every intention of not joining them. The wagons roll by, and the white closes over the cairns behind you.", days: 0 } } },
    ],
  },

  /* ---- Reputation callbacks: the road remembers how you've treated it ---- */
  reckoning_kind: {
    title: "A Kindness Returned",
    where: (n) => n.type === "wild",
    onlyIf: (st) => repFx(st).kind,
    body: "A rider overtakes the caravan at a gallop, then reins in with open hands. You've been named to him — the caravan that shares its fire and helps folk on the road. He has news, and he means you well.",
    options: [
      { id: "hear_warn", label: "Hear his warning", outcomes: { good: { text: "Reavers are working the country just ahead, he says, and he tells you exactly where. Forewarned, you slip past the trap they'd laid. Your good name just saved lives.", days: 0, morale: 3, gain: { ammo: 4 } } } },
      { id: "trade_kind", label: "Share a meal and trade news", cost: { food: 2 }, outcomes: { good: { text: "You break bread with him. He leaves you better provisioned than he found you and carries your name further still — the kind caravan, worth helping.", days: 0, morale: 3, rep: 1, gain: { medicine: 2 } } } },
    ],
  },
  reckoning_cruel: {
    title: "A Debt Come Due",
    where: (n) => n.type === "wild",
    onlyIf: (st) => repFx(st).cruel,
    body: "Armed men step out of the rocks ahead and behind, unhurried. Word of your caravan has run before you too — but not the kind word. These are folk you've wronged, or friends of them, and they've been waiting.",
    options: [
      { id: "pay_off", label: "Buy your way clear", cost: { gold: 120 }, outcomes: { good: { text: "You empty a heavy purse into a waiting hand. They melt back into the rocks, grinning. Coin spent to answer for the name you've made.", days: 0, morale: -2 } } },
      { id: "face_them", label: "Draw steel and answer for it", battle: "banditToll" },
      { id: "make_amends", label: "Own it, and try to make it right", gate: ["Bard", "Cleric", "Paladin"], skill: "diplomacy", dc: 16, outcomes: { good: { text: "You step down unarmed and speak plainly — no excuses. It's a near thing, but something in it lands. They let you pass, and a little of the poison drains from your name.", days: 0, morale: 2, rep: 2 }, fail: { text: "Fine words, but they've heard fine words from you before. They take a wagon's worth of goods as payment and go.", days: 0, roadSell: 0, dumpCargo: true, morale: -4 } } },
    ],
  },
};

function eligibleEvents(st) {
  const node = ROUTE[st.legIndex];
  return Object.entries(EVENTS).filter(([k, e]) => e.where(node) && k !== st.recentEvent && (!e.onlyIf || e.onlyIf(st)));
}
function maybeEvent(st) {
  const stg = seasonStage(st.day);
  let chance = 0.32 + st.legDanger[st.legIndex] * 0.045 + stg.winter * 0.08;
  if (Math.random() > chance) return false;
  const pool = eligibleEvents(st);
  if (!pool.length) return false;
  let key;
  const canStorm = stg.key !== "open" && !st.stormSeen && Math.random() < 0.35;
  if (canStorm && pool.find(([k]) => k === "stormwall")) key = "stormwall";
  else { const nonStorm = pool.filter(([k]) => k !== "stormwall"); key = (nonStorm.length ? pick(nonStorm) : pool[0])[0]; }
  if (key === "stormwall") st.stormSeen = true;
  st.event = { key }; st.recentEvent = key; st.eventCooldown = 2;
  return true;
}

/* ---- Option gating & the actor who attempts a check ---- */
/* A gate token is a roster id (e.g. "vex") or a class name (e.g. "Rogue").
   The roster carries one traveler per class, so a class resolves to one id. */
const CLASS_TO_ID = Object.fromEntries(ROSTER.map((m) => [m.cls, m.id]));
const idsForGate = (g) => (BY_ID[g] ? [g] : CLASS_TO_ID[g] ? [CLASS_TO_ID[g]] : []);
function gateIds(o) { const gates = Array.isArray(o.gate) ? o.gate : [o.gate]; return gates.flatMap(idsForGate); }
function optionAvailable(st, o) {
  if (o.gate) { if (!gateIds(o).some((id) => st.picked.includes(id) && partyAlive(st, id))) return false; }
  if (o.need) for (const [k, v] of Object.entries(o.need)) if ((st.res[k] || 0) < v) return false;
  if (o.cost) for (const [k, v] of Object.entries(o.cost)) if (SPELL_KEYS.includes(k)) { const holder = actorFor(st, o); if (!holder || memRes(st, holder, k) < v) return false; }
  return true;
}
const partyAlive = (st, id) => { const p = st.party.find((x) => x.id === id); return p && p.hp > 0; };
function actorFor(st, o) {
  if (o.gate) { const alive = gateIds(o).filter((id) => st.picked.includes(id) && partyAlive(st, id)); if (alive.length) { if (o.skill) return alive.sort((a, b) => (BY_ID[b].skills[o.skill] || 0) - (BY_ID[a].skills[o.skill] || 0))[0]; return alive[0]; } }
  if (o.skill) { const alive = st.party.filter((p) => p.hp > 0).map((p) => p.id); return alive.sort((a, b) => (BY_ID[b].skills[o.skill] || 0) - (BY_ID[a].skills[o.skill] || 0))[0]; }
  return null;
}

function resolveEvent(s, optId) {
  const st = { ...s, res: { ...s.res }, party: s.party.map((p) => ({ ...p })), cargo: { ...s.cargo }, log: [...s.log] };
  const ev = EVENTS[st.event.key];
  const o = ev.options.find((x) => x.id === optId);
  if (!o || !optionAvailable(st, o)) return s;
  /* An option that draws steel hands straight off to the turn engine. */
  if (o.battle) {
    st.event = null;
    st.battle = buildRoadBattle(st, o.battle);
    pushLog(st, `${ev.title}: you refuse, and the road turns to blades.`, "bad");
    return st;
  }
  const actor = actorFor(st, o);
  if (o.cost) for (const [k, v] of Object.entries(o.cost)) {
    if (SPELL_KEYS.includes(k)) { st.party = st.party.map((p) => (p.id === actor ? { ...p, res: { ...p.res, [k]: Math.max(0, (p.res[k] || 0) - v) } } : p)); }
    else if (st.res[k] !== undefined) st.res[k] = clamp(st.res[k] - v, 0, 99999);
  }
  let chk = null;
  if (o.skill) { const mod = actor ? (BY_ID[actor].skills[o.skill] || 0) : 0; chk = check(mod, o.dc); chk.who = actor ? BY_ID[actor].name : "The party"; chk.skill = o.skill; }
  const band = !chk ? "good" : chk.tier === "critsuccess" || chk.tier === "success" ? "good" : chk.tier === "fail" ? "fail" : "bad";
  const result = o.outcomes[band] || o.outcomes.fail || o.outcomes.good;
  applyOutcome(st, result, ev);
  st.lastCheck = chk;
  pushLog(st, (ev.major ? "⚜ " : "") + result.text, chk ? tierKind(chk.tier) : "good");
  st.event = null;
  checkEnd(st);
  return st;
}
const tierKind = (t) => (t === "critsuccess" ? "good" : t === "success" ? "good" : t === "fail" ? "warn" : "bad");

function applyOutcome(st, r, ev) {
  if (r.days > 0) { st.day += r.days; for (let i = 0; i < r.days; i++) { eatStores(st, 1); upkeepAnimals(st, 0, false); } }
  if (r.cost) for (const [k, v] of Object.entries(r.cost)) { if (st.res[k] !== undefined) st.res[k] = clamp(st.res[k] - v, 0, 99999); }
  if (r.gain) for (const [k, v] of Object.entries(r.gain)) if (st.res[k] !== undefined) st.res[k] = clamp(st.res[k] + v, 0, 9999);
  let dmg = r.hurtParty || 0;
  if (dmg && st.guards > 0) { const soak = Math.min(dmg, st.guards * 3 + roll(1, 4)); dmg = Math.max(0, dmg - soak); if (soak > 0) pushLog(st, `Your guards take the brunt; ${soak} damage turned aside.`, "info"); }
  if (dmg) damageAll(st, dmg, "The party takes a beating");
  if (r.hurtWagon) st.wagon = clamp(st.wagon - r.hurtWagon, 0, 100);
  if (r.hurtRepair) st.res.repair = clamp(st.res.repair - r.hurtRepair, 0, 999);
  if (r.hurtCond) st.animalCond = clamp(st.animalCond - r.hurtCond, 0, 100);
  if (r.hurtAnimals) st.animals = Math.max(0, st.animals - r.hurtAnimals);
  if (r.morale) st.morale = clamp(st.morale + r.morale, 0, 100);
  if (r.riskAnimal && Math.random() < 0.5) { st.animals = Math.max(0, st.animals - 1); pushLog(st, "The gamble goes bad; a beast drops in harness.", "bad"); }
  if (r.breakFragile && st.cargo.glass > 0) { const broke = Math.ceil(st.cargo.glass * 0.5); st.cargo.glass -= broke; pushLog(st, `${broke} crates of glassware shatter in the crossing.`, "bad"); }
  if (r.dumpCargo) { const total = Object.values(st.cargo).reduce((a, b) => a + b, 0); if (total > 0) { for (const g of Object.keys(st.cargo)) st.cargo[g] = Math.floor(st.cargo[g] * 0.4); pushLog(st, "Crates go into the mire. Painful, but you are moving.", "warn"); } }
  if (r.roadSell) { let got = 0; for (const [g, q] of Object.entries(st.cargo)) if (q > 0) { got += Math.round(q * GOODS[g].base * r.roadSell); st.cargo[g] = 0; } if (got > 0) { st.res.gold += got; st.earned += got; pushLog(st, `You sell your load on the road for ${got} gp.`, "good"); } else pushLog(st, "You have nothing to sell.", "info"); }
  if (r.injure && Math.random() < (typeof r.injure === "number" ? r.injure : 1)) injureOne(st, r.injureCause);
  if (r.rep) repShift(st, r.rep);
  if (r.mark) { st.marks = { ...(st.marks || {}), [r.mark]: true }; }
}

/* =============================== STORY BEATS ====================== */
/* The three fixed pillars of Ameiko's road. Each is a class-flavored decision
   that sets a persistent flag, then hands straight to that pillar's boss. HOW
   you meet the beat — prepared or rushed, sheltered or exposed, with the blade
   or without — rides forward as a real edge or handicap in the fight and colors
   the ending. These are do-or-die: a story boss lost or fled ends the run. */
const BEATS = {
  brinewall: {
    title: "The Vault of Brinewall",
    body: "Brinewall's ruin claws at a grey sky. Beneath the broken keep lies the Amatatsu Seal — the heart of Ameiko's birthright — and something old and patient has guarded it these long years. How you go in will decide how you come out.",
    info: {
      Rogue: "The vault wards are old Minkaian work. Give me the time and I'll unpick them clean.",
      Wizard: "Those sigils are Tian. I can read the safe path down, if you trust the reading.",
      Cleric: "The dead here are unquiet. A rite would let us pass without waking every one of them.",
      Paladin: "Consecrate the ground first. We walk down unafraid, or we don't walk down at all.",
      Fighter: "The seaward doors are rotten. One hard shoulder and we're inside, fast.",
      Barbarian: "Or we simply go through the wall. The quickest way down is straight down.",
    },
    options: [
      { id: "wards", label: "Unpick the vault wards", gate: "Rogue", skill: "disable", dc: 18 },
      { id: "divine", label: "Read the Minkaian sigils for the safe path", gate: "Wizard", skill: "knowledge", dc: 17 },
      { id: "rite", label: "Lay the restless dead to rest first", gate: ["Cleric", "Paladin"], skill: "heal", dc: 16 },
      { id: "force", label: "Force the seaward doors and press in", skill: "athletics", dc: 15 },
      { id: "rush", label: "No time — go straight in", rushed: true },
    ],
    boss: "brinewall",
    apply(st, opt, good) {
      if (good) { st.flags.brinewall = "prepared"; st.flags.suishen = true; pushLog(st, "You reach the vault in good order. The Amatatsu Seal is recovered — and beside it, wrapped in oilcloth, the ancestral blade Suishen. Ameiko's hands shake as she lifts it, and the steel answers with a low, waking hum.", "good"); }
      else { st.flags.brinewall = "rushed"; pushLog(st, "You snatch the Seal, but the guardian is upon you before you can search the vault, and there is no time to look for more.", "warn"); }
    },
  },
  highice: {
    title: "The Hungry Storm",
    body: "Ovorikheer Pass is the roof of the world, and the storm that lives here is no accident of weather — it hunts. Wind like knives, and something vast and cold turning at its heart. You must go into it; the only question is how.",
    info: {
      Druid: "This storm has a mind. I can find the still eye at its center — but read it wrong and it closes on us.",
      Ranger: "There's shelter in the lee of the ice-cliffs. We dig in, wait for the worst to pass, and go in rested.",
      Cleric: "Whatever wears this storm hates the living. Steel your hearts; we go through together.",
    },
    options: [
      { id: "shelter", label: "Dig in and wait out the worst (costs 2 days)", days: 2 },
      { id: "eye", label: "Find the eye of the storm", gate: ["Druid", "Ranger"], skill: "survival", dc: 17 },
      { id: "push", label: "Push straight through, exposed", },
    ],
    boss: "highice",
    apply(st, opt, good) {
      if (opt.id === "shelter") { st.flags.highice = "sheltered"; st.morale = clamp(st.morale + 2, 0, 100); pushLog(st, "You dig into the lee of the ice and let the worst of it scream past overhead. Costly in days and stores, but you come to its heart rested and whole.", "info"); }
      else if (opt.id === "eye") { if (good) { st.flags.highice = "eye"; pushLog(st, `${(st.lastCheck && st.lastCheck.who) || "Your guide"} finds the eye — a still, blue-white silence at the storm's core — and leads you straight to its heart.`, "good"); } else { st.flags.highice = "exposed"; damageAll(st, roll(1, 6), "The storm flays the caravan"); pushLog(st, "The reading goes wrong. The storm folds shut around you and you fight your way to its heart half-frozen.", "bad"); } }
      else { st.flags.highice = "exposed"; damageAll(st, roll(1, 6), "The storm flays the caravan as you force through"); pushLog(st, "You claw into the storm's heart with no shelter and no breath to spare.", "bad"); }
    },
  },
  kasai: {
    title: "The Throne of Minkai",
    body: "Kasai at last. Beyond these walls sits the Jade Regent on a throne that is Ameiko's by blood, and the Five Storms coiled around him. The whole long road narrows to this. How do you come at the usurper?",
    info: {
      Rogue: "Forget the front. I can get us past the guard and into the throne room before he knows we've come.",
      Bard: "The city hates him. Give me a day and I'll put a mob at your back and a song in their throats.",
      Paladin: "Raise the people openly. Let Ameiko's face be the banner they rally to.",
      Fighter: "Or we break the gate and are on the throne before the alarm is even up.",
    },
    options: [
      { id: "infiltrate", label: "Slip past the guard and strike the throne", gate: ["Rogue", "Ranger"], skill: "stealth", dc: 17 },
      { id: "rally", label: "Rally the people of Kasai behind Ameiko", gate: ["Bard", "Paladin"], skill: "diplomacy", dc: 17 },
      { id: "storm", label: "Break the palace gate in one rush", skill: "athletics", dc: 16 },
    ],
    boss: "kasai",
    apply(st, opt, good) {
      if (good) { st.flags.kasai = opt.id; pushLog(st, opt.id === "rally" ? "The city rises behind Ameiko's banner. You march on the palace with Kasai at your back." : opt.id === "infiltrate" ? "You slip the palace guard entirely and stand before the throne before the Regent knows you have come." : "You shatter the palace gate in a single furious charge and are upon the throne before the alarm is fully raised.", "good"); }
      else { st.flags.kasai = "botched"; pushLog(st, "The approach goes wrong. The palace rouses, and every oni within is waiting for you.", "warn"); }
    },
  },
};

function resolveBeat(s, optId) {
  const beat = BEATS[s.beat.key];
  const opt = beat.options.find((o) => o.id === optId);
  if (!opt || !optionAvailable(s, opt)) return s;
  const st = { ...s, res: { ...s.res }, party: s.party.map((p) => ({ ...p })), cargo: { ...s.cargo }, flags: { ...s.flags }, drift: cloneDrift(s.drift), log: [...s.log] };
  st.beat = null;
  let good;
  if (opt.skill) {
    const actor = actorFor(st, opt);
    const chk = check(actor ? (BY_ID[actor].skills[opt.skill] || 0) : 0, opt.dc);
    chk.who = actor ? BY_ID[actor].name : "The party"; chk.skill = opt.skill;
    st.lastCheck = chk;
    good = chk.tier === "success" || chk.tier === "critsuccess";
  } else { good = !opt.rushed; }
  if (opt.days) for (let i = 0; i < opt.days; i++) { st.day += 1; eatStores(st, 1); upkeepAnimals(st, 0, false); coldTick(st, coldFor(st)); }
  beat.apply(st, opt, good);
  checkEnd(st); if (st.over) return st;
  /* You make camp and steel yourselves before the guardian: daily abilities
     return, and the worst wounds are bound. A boss should test the party, not
     merely finish off whatever the road left. */
  restorePools(st);
  st.party = st.party.map((p) => p.hp > 0
    ? { ...p, hp: clamp(p.hp + Math.ceil((p.maxHp - p.hp) * 0.6) + 3, 0, p.maxHp) }
    : { ...p, hp: Math.round(p.maxHp * 0.4) });
  st.battle = buildBossBattle(st, beat.boss);
  return st;
}

/* Branch & ferry & trade (towns). */
function chooseBranch(s, optId) {
  const b = BRANCHES[s.pending.kind];
  const opt = b.options.find((o) => o.id === optId);
  if (!opt) return s;
  const st = { ...s, legMiles: [...s.legMiles], legDanger: [...s.legDanger], log: [...s.log] };
  st.legMiles[st.legIndex] = opt.miles; st.legDanger[st.legIndex] = opt.danger; st.pending = null;
  pushLog(st, `You choose the ${opt.label.toLowerCase()}. ${opt.note}`, "info");
  const stg = seasonStage(st.day).key;
  if (opt.id === "forest" && stg !== "open") { st.legDanger[st.legIndex] += 1; pushLog(st, "The forest track is already deep in cold shadow, worse than it looks.", "warn"); }
  if (opt.id === "ridge" && (stg === "late" || stg === "deep")) { st.legDanger[st.legIndex] += 1; pushLog(st, "The wind on the ridge has teeth this late in the year. A risky line.", "warn"); }
  return st;
}
function crossFerry(s, mode) {
  const st = { ...s, res: { ...s.res }, party: s.party.map((p) => ({ ...p })), cargo: { ...s.cargo }, drift: cloneDrift(s.drift), log: [...s.log] };
  const ice = !!st.ferry.ice;
  const fee = ice ? 55 : 25;
  if (mode === "ferry") { // hire a guide / take the sure way over
    if (st.res.gold < fee) { pushLog(st, `You cannot cover the ${ice ? "Aganhei guide's" : "ferryman's"} fee. You will have to make the crossing yourselves.`, "bad"); return st; }
    st.res.gold -= fee; st.day += 1; eatStores(st, 1); upkeepAnimals(st, 0, false); coldTick(st, coldFor(st)); relaxDrift(st);
    pushLog(st, ice ? `An Aganhei guide leads the caravan safe through ${st.ferry.name} for ${fee} gp. A day gone, no blood spilt.` : `The ferry carries the caravan over the ${st.ferry.name} for ${fee} gp. Safe, a day gone.`, "arrive");
    st.ferry = null; st.weather = rollWeather(st.day, ROUTE[st.legIndex].zone); checkEnd(st); return st;
  }
  const dc = 13 + (ice ? 5 : 0) + (st.weather.drag > 0.3 ? 3 : 0);
  const actor = actorFor(st, { skill: "survival" });
  const chk = check(actor ? BY_ID[actor].skills.survival : 0, dc); chk.who = actor ? BY_ID[actor].name : "The party"; chk.skill = "survival";
  const what = ice ? `the ice of ${st.ferry.name}` : `the ${st.ferry.name}`;
  if (chk.tier === "critsuccess" || chk.tier === "success") pushLog(st, `${chk.who} reads ${what} and brings the caravan across clean. No coin, no loss.`, "good");
  else if (chk.tier === "fail") { st.wagon = clamp(st.wagon - 10, 0, 100); damageAll(st, roll(1, 4), ice ? "The crossing batters and freezes the party" : "The ford soaks and batters the party"); if (st.cargo.glass > 0) st.cargo.glass = Math.ceil(st.cargo.glass * 0.7); pushLog(st, "A hard crossing; the wagon strains and everyone suffers for it.", "warn"); }
  else { // a critical failure at the water
    if (useMark(st, "lucky_stone")) {
      pushLog(st, `${st.ferry.name} nearly ends the journey — but the hermit's river-stone seems to turn cold in your hand, and at the last moment the caravan finds its footing. 'Luck at the water,' he said. Spent now.`, "good");
      st.wagon = clamp(st.wagon - 6, 0, 100); st.lastCheck = chk; st.ferry = null; checkEnd(st); return st;
    }
    st.wagon = clamp(st.wagon - 20, 0, 100); if (Math.random() < 0.4) st.animals = Math.max(0, st.animals - 1); damageAll(st, roll(1, 6), ice ? "A crevasse nearly swallows a wagon" : "The current nearly takes a wagon"); pushLog(st, `${st.ferry.name} very nearly ends the journey.`, "bad");
  }
  st.lastCheck = chk; st.ferry = null; checkEnd(st); return st;
}
function resupply(s) {
  const node = ROUTE[s.legIndex]; if (!node.town) return s;
  const st = { ...s, res: { ...s.res }, log: [...s.log] };
  const mul = ZONE_COST[node.zone] || 1;
  const reserve = 40;
  const goods = [["water", 100, 1], ["food", 100, 1], ["feed", 140, 1], ["medicine", 10, 6], ["ammo", 20, 1], ["repair", 20, 4]];
  const got = {}; let spent = 0;
  for (const [k, target, base] of goods) { const price = Math.max(1, Math.round(base * mul)); const want = Math.max(0, target - st.res[k]); const spendable = Math.max(0, st.res.gold - reserve); const can = Math.floor(spendable / price); const n = Math.min(want, can); if (n > 0) { st.res[k] += n; st.res.gold -= n * price; spent += n * price; got[k] = n; } }
  st.morale = clamp(st.morale + 3, 0, 100);
  // A stay in town is real rest: the fallen are nursed back onto their feet,
  // wounds mend, injuries are properly set, and every daily ability refreshes.
  const mended = mendInjuries(st);
  st.party = st.party.map((p) => p.hp > 0
    ? { ...p, hp: clamp(p.hp + Math.ceil((p.maxHp - p.hp) * 0.7) + 4, 0, p.maxHp) }
    : { ...p, hp: Math.round(p.maxHp * 0.6) });
  restorePools(st);
  st.rumorDone = false; // you can ask around again on a fresh visit
  const parts = ["food", "water", "feed", "medicine", "ammo", "repair"].filter((k) => got[k]).map((k) => `+${got[k]} ${k}`).join(", ") || "found little worth buying";
  pushLog(st, `You rest and resupply at ${node.name}${mul >= 2 ? " (northern prices, and steep)" : ""}: ${parts} for ${spent} gp. The company sleeps under a roof and wakes mended${mended ? "; broken bones are set and bound" : ""}. Purse: ${st.res.gold} gp.`, "arrive");
  return st;
}
function sellCargo(s, good, qty) {
  const node = ROUTE[s.legIndex]; if (!node.town) return s;
  const have = s.cargo[good] || 0; const n = Math.min(have, qty); if (n <= 0) return s;
  const st = { ...s, res: { ...s.res }, cargo: { ...s.cargo }, drift: cloneDrift(s.drift), log: [...s.log] };
  let take = 0;
  for (let i = 0; i < n; i++) { take += sellPrice(st, node, good); driftSet(st, node.name, good, driftGet(st, node.name, good) - 0.04); }
  take = Math.round(take * relicFx(st).sellMul * repFx(st).sellMul);
  st.res.gold += take; st.earned += take; st.cargo[good] -= n;
  pushLog(st, `Sold ${n} ${GOODS[good].label} at ${node.name} for ${take} gp${n > 1 ? ` (${Math.round(take / n)} gp each; the price sags as you flood the stalls)` : ""}.`, "good");
  return st;
}
/* Sell every trophy in the satchel for coin (finds have no market drift). */
function sellValuables(s) {
  const node = ROUTE[s.legIndex]; if (!node.town) return s;
  const ids = Object.keys(s.valuables || {}).filter((id) => s.valuables[id] > 0);
  if (!ids.length) return s;
  const st = { ...s, res: { ...s.res }, valuables: {}, log: [...s.log] };
  const mul = relicFx(st).sellMul;
  let got = 0, count = 0;
  for (const id of ids) { const q = s.valuables[id]; got += Math.round((VALUABLES[id]?.value || 0) * q * mul); count += q; }
  st.res.gold += got; st.earned = (st.earned || 0) + got;
  pushLog(st, `You sell your finds at ${node.name}: ${count} ${count === 1 ? "trophy" : "trophies"} for ${got} gp.`, "good");
  return st;
}
function buyGoods(s, good, qty) {
  const node = ROUTE[s.legIndex]; if (!node.town) return s;
  if (buyPrice(s, node, good) == null) return s;
  const st = { ...s, res: { ...s.res }, cargo: { ...s.cargo }, drift: cloneDrift(s.drift), log: [...s.log] };
  const cap = WAGONS[st.wagons].cap; const bulk = GOODS[good].bulk;
  let bought = 0, spent = 0;
  for (let i = 0; i < qty; i++) {
    const price = buyPrice(st, node, good);
    if (st.res.gold - price < 0) break;
    if (cargoUsed(st) + bulk > cap) break;
    st.res.gold -= price; st.cargo[good] += 1; spent += price; bought += 1;
    driftSet(st, node.name, good, driftGet(st, node.name, good) + 0.04);
  }
  if (bought <= 0) { pushLog(st, `No room or no coin for ${GOODS[good].label} here.`, "warn"); return st; }
  pushLog(st, `Bought ${bought} ${GOODS[good].label} at ${node.name} for ${spent} gp${bought > 1 ? ` (${Math.round(spent / bought)} gp each; the price climbs as you buy up the stock)` : ""}.`, "info");
  return st;
}

/* =============================== COMBAT ENGINE ===================== */
/* The turn engine runs on a `battle` object carried inside the road state.
   It seeds from the caravan (wounds and spent slots ride in) and, when it
   ends, hands hp, remaining pools, gold, and spent consumables back out. */
function statusMods(c) {
  let atk = 0, dmg = 0, ac = 0, soak = 1, dot = 0, skip = false, offguard = false;
  for (const s of c.statuses) { atk += s.atk || 0; dmg += s.dmg || 0; ac += s.ac || 0; if (s.soak) soak *= s.soak; dot += s.dot || 0; if (s.skip) skip = true; if (s.offguard) offguard = true; }
  return { atk, dmg, ac, soak, dot, skip, offguard };
}
const living = (b, side) => b.combatants.filter((c) => c.side === side && c.hp > 0);
const getC = (b, uid) => b.combatants.find((c) => c.uid === uid);
const curUid = (b) => b.order[b.turnPtr];
function logPush(b, t, k = "info") { b.log = [{ t, k }, ...b.log].slice(0, 80); }

function applyDamage(b, target, amount, kind) {
  const tm = statusMods(target);
  let dmg = Math.max(0, Math.round(amount * tm.soak));
  if (target.tempHp > 0) { const absorbed = Math.min(target.tempHp, dmg); target.tempHp -= absorbed; dmg -= absorbed; }
  target.hp = clamp(target.hp - dmg, 0, target.maxHp);
  b.lastFx = { uid: target.uid, amount: dmg, kind: kind || "dmg" };
  return dmg;
}
function applyHeal(b, target, amount) {
  const before = target.hp; target.hp = clamp(target.hp + amount, 0, target.maxHp);
  b.lastFx = { uid: target.uid, amount: target.hp - before, kind: "heal" };
  return target.hp - before;
}

function resolveHit(b, actor, move, target, sneakOn) {
  const am = statusMods(actor), tm = statusMods(target);
  let hit = true, crit = false, d = 0;
  if (move.kind === "attack" || move.kind === "touch" || move.touchHit) {
    d = d20();
    const total = d + actor.atk + (move.atkBonus || 0) + am.atk - (move.penalty || 0);
    const effAC = ((move.kind === "touch" || move.touchHit) ? target.touch : target.ac) + tm.ac;
    hit = d === 20 || (d !== 1 && total >= effAC);
    crit = d === 20;
    if (!hit) return `${actor.name}'s ${move.name} misses ${target.name} (${d}+${actor.atk + (move.atkBonus || 0) + am.atk - (move.penalty || 0)} vs ${effAC}).`;
  }
  let dmg = dice(move.dmg) + am.dmg;
  if (sneakOn && move.sneak) dmg += dice(move.sneak);
  if (crit) dmg *= 2;
  const dealt = applyDamage(b, target, dmg, crit ? "crit" : "dmg");
  let extra = "";
  if (move.rider && (move.rider.chance == null || Math.random() < move.rider.chance)) { const { chance, ...st } = move.rider; target.statuses = [...target.statuses.filter((x) => x.k !== st.k), { ...st }]; extra = ` ${target.name} is ${st.k}.`; }
  if (move.status && move.touchHit) { target.statuses = [...target.statuses.filter((x) => x.k !== move.status.k), { ...move.status }]; extra = ` ${target.name} is ${move.status.k}.`; }
  return `${actor.name}'s ${move.name}${crit ? " CRITS" : " hits"} ${target.name} for ${dealt}.${sneakOn && move.sneak ? " (sneak!)" : ""}${extra}`;
}

function targetsFor(b, actor, move, chosen) {
  const foeSide = actor.side === "party" ? "foe" : "party";
  if (move.target === "allEnemies") return living(b, foeSide);
  if (move.target === "allAllies") return living(b, actor.side);
  if (move.target === "self") return [actor];
  if (move.target === "ally") return chosen ? [getC(b, chosen)] : [actor];
  return chosen ? [getC(b, chosen)] : [pick(living(b, foeSide))];
}

function performMove(b, actor, move, chosen) {
  if (move.cost) for (const [k, v] of Object.entries(move.cost)) actor.res[k] = Math.max(0, (actor.res[k] || 0) - v);
  const tgts = targetsFor(b, actor, move, chosen);
  if (move.kind === "rage") { actor.statuses = [...actor.statuses.filter((x) => x.k !== "raging"), { ...move.status }]; actor.tempHp = Math.max(actor.tempHp, move.tempHp || 0); logPush(b, `${actor.name} flies into a rage: +${move.status.dmg} damage, ${move.tempHp} temporary vigour, guard dropped.`, "buff"); return; }
  if (move.kind === "heal") { for (const t of tgts) { const got = applyHeal(b, t, dice(move.heal)); logPush(b, `${actor.name}'s ${move.name} restores ${got} to ${t.name}.`, "heal"); } return; }
  if (move.kind === "buff") { for (const t of tgts) t.statuses = [...t.statuses.filter((x) => x.k !== move.status.k), { ...move.status }]; logPush(b, `${actor.name} uses ${move.name}. ${move.target === "allAllies" ? "The party" : tgts[0].name} is ${move.status.k}.`, "buff"); return; }
  if (move.kind === "debuff") {
    for (const t of tgts) {
      if (move.touchHit) { logPush(b, resolveHit(b, actor, move, t, false), "hit"); continue; }
      if (move.save) { const sv = d20() + (t.saves[move.save] || 0); if (sv >= move.dc) { logPush(b, `${t.name} resists ${move.name} (save ${sv} vs ${move.dc}).`, "info"); continue; } }
      t.statuses = [...t.statuses.filter((x) => x.k !== move.status.k), { ...move.status }];
      logPush(b, `${actor.name}'s ${move.name} leaves ${t.name} ${move.status.k}.`, "debuff");
    }
    return;
  }
  if (move.kind === "save") {
    for (const t of tgts) { const sv = d20() + (t.saves[move.save] || 0); const ok = sv >= move.dc; let dmg = dice(move.dmg); if (ok && move.half) dmg = Math.floor(dmg / 2); else if (ok) dmg = 0; const dealt = applyDamage(b, t, dmg, "dmg"); logPush(b, `${move.name} ${ok ? "sears" : "engulfs"} ${t.name} for ${dealt}${ok ? " (saved)" : ""}.`, "hit"); }
    return;
  }
  if (move.kind === "auto") { for (const t of tgts) { const dealt = applyDamage(b, t, dice(move.dmg) + statusMods(actor).dmg, "dmg"); logPush(b, `${actor.name}'s ${move.name} strikes ${t.name} for ${dealt}. It never misses.`, "hit"); } return; }
  const sneakOn = move.sneak ? statusMods(tgts[0]).offguard : false;
  const primary = tgts[0];
  logPush(b, resolveHit(b, actor, move, primary, sneakOn), "hit");
  if (move.extraHits) for (let i = 0; i < move.extraHits; i++) if (primary.hp > 0 || move.target === "enemy") logPush(b, resolveHit(b, actor, move, primary, false), "hit");
  if (move.extraTargets) { const others = living(b, actor.side === "party" ? "foe" : "party").filter((f) => f.uid !== primary.uid); for (let i = 0; i < move.extraTargets && others[i]; i++) logPush(b, resolveHit(b, actor, { ...move, extraTargets: 0 }, others[i], false), "hit"); }
  if (move.selfRider) { actor.statuses = [...actor.statuses.filter((x) => x.k !== move.selfRider.k), { ...move.selfRider }]; }
}

function foeChoose(b, foe) {
  const foes = living(b, "party");
  if (!foes.length) return null;
  if (foe.boss && Math.random() < 0.28 && !b.combatants.some((c) => c.side === "foe" && c.statuses.some((x) => x.k === "rallied"))) return { move: MOVES.foeRally, target: null };
  const move = MOVES[pick(foe.moves.filter((m) => m !== "foeRally"))] || MOVES.foeSlash;
  const sorted = [...foes].sort((a, b2) => a.hp - b2.hp);
  const target = Math.random() < 0.6 ? sorted[0] : pick(foes);
  return { move, target: target.uid };
}

function checkResult(b) {
  if (!living(b, "foe").length) return "win";
  if (!living(b, "party").length) return "lose";
  return null;
}

function startTurn(b, uid) {
  const c = getC(b, uid);
  const kept = [];
  for (const st of c.statuses) { const nd = st.dur - 1; if (nd > 0) kept.push({ ...st, dur: nd }); }
  c.statuses = kept;
  const dot = c.statuses.reduce((t, x) => t + (x.dot || 0), 0);
  if (dot > 0 && c.hp > 0) { applyDamage(b, c, dot, "dmg"); logPush(b, `${c.name} takes ${dot} from burning.`, "hit"); }
}
function advancePtr(b) { b.turnPtr += 1; if (b.turnPtr >= b.order.length) { b.turnPtr = 0; b.round += 1; } }

function stepToPlayer(b) {
  let guard = 0;
  while (!b.result && guard++ < 400) {
    const res = checkResult(b);
    if (res) { b.result = res; logPush(b, res === "win" ? "The last foe falls. The road is clear." : "The party is overwhelmed.", res === "win" ? "start" : "bad"); return b; }
    const c = getC(b, curUid(b));
    if (!c || c.hp <= 0) { advancePtr(b); continue; }
    startTurn(b, c.uid);
    if (checkResult(b)) continue;
    if (c.hp <= 0) { advancePtr(b); continue; }
    const sm = statusMods(c);
    if (sm.skip) { logPush(b, `${c.name} is ${c.statuses.find((x) => x.skip)?.k || "held"} and loses the turn.`, "info"); advancePtr(b); continue; }
    if (c.side === "party" && c.isPlayer) { b.awaiting = c.uid; b.ui = { mode: "menu" }; return b; }
    const choice = foeChoose(b, c);
    if (choice) performMove(b, c, choice.move, choice.target);
    advancePtr(b);
  }
  return b;
}

const cloneBattle = (b) => ({ ...b, combatants: b.combatants.map((c) => ({ ...c, res: { ...c.res }, statuses: c.statuses.map((x) => ({ ...x })) })), supply: { ...b.supply }, log: [...b.log], ui: { ...b.ui } });
function moveUsable(actor, mv) { if (!mv) return false; if (mv.cost) for (const [k, v] of Object.entries(mv.cost)) if ((actor.res[k] || 0) < v) return false; return true; }

function buildRoadBattle(st, encKey, mod = null, story = null) {
  const enc = ENCOUNTERS[encKey];
  const party = st.party.map((p) => { const M = BY_ID[p.id]; const C = M.combat; return { uid: "p_" + p.id, id: p.id, name: M.name, cls: M.cls, side: "party", isPlayer: true, hp: p.hp, maxHp: p.maxHp, tempHp: 0, ac: C.ac, touch: C.touch, atk: C.atk, init: C.init, saves: { ...C.saves }, res: { ...p.res }, moves: activeMovesFor(p.id, st.level), statuses: [] }; });
  let n = 0; const foes = [];
  for (const [type, count] of enc.foes) for (let i = 0; i < count; i++) { const E = ENEMIES[type]; n++; foes.push({ uid: "f_" + n, id: type, name: E.name + (count > 1 ? " " + (i + 1) : ""), side: "foe", isPlayer: false, hp: E.hp, maxHp: E.hp, tempHp: 0, ac: E.ac, touch: E.touch, atk: E.atk + (mod && !E.boss ? 0 : 0), init: E.init, saves: { ...E.saves }, res: {}, moves: E.moves, boss: E.boss, statuses: [] }); }
  /* Story modifiers from how the party met the beat: a blessing, a head start,
     or a foe emboldened by a rushed or botched approach. Applied before the
     first initiative so they colour the whole fight. */
  if (mod) {
    for (const c of party) {
      if (mod.partyTempHp) c.tempHp = (c.tempHp || 0) + mod.partyTempHp;
      if (mod.partyBless) c.statuses = [...c.statuses, { k: "blessed", dur: 6, atk: 2 }];
    }
    if (mod.foeAtk) for (const c of foes) c.atk += mod.foeAtk;
  }
  /* Carried relics work in every fight, no equipping needed. */
  const rfx = relicFx(st);
  if (rfx.atk || rfx.ac || rfx.saves) for (const c of party) {
    c.atk += rfx.atk; c.ac += rfx.ac;
    if (rfx.saves) { c.saves.fort += rfx.saves; c.saves.ref += rfx.saves; c.saves.will += rfx.saves; }
  }
  const all = [...party, ...foes].map((c) => ({ ...c, initRoll: d20() + c.init }));
  all.sort((a, b) => b.initRoll - a.initRoll || b.init - a.init);
  const b = { encId: encKey, story, combatants: all, order: all.map((c) => c.uid), turnPtr: 0, round: 1, supply: { medicine: st.res.medicine, ammo: st.res.ammo }, bag: { ...st.items }, ui: { mode: "menu" }, awaiting: null, log: [{ t: `${enc.name}. Roll for initiative; ${all[0].name} moves first.`, k: "start" }], result: null, lastFx: null };
  return stepToPlayer(b);
}

/* How the three story pillars were met turns into a concrete edge or handicap
   carried into each boss fight. */
function bossModsFromFlags(st, bossKey) {
  const f = st.flags || {};
  const mod = { partyTempHp: 0, partyBless: false, foeAtk: 0 };
  if (bossKey === "brinewall") {
    if (f.brinewall === "prepared") { mod.partyBless = true; mod.partyTempHp = 8; }
    else if (f.brinewall === "rushed") mod.foeAtk = 1;
  } else if (bossKey === "highice") {
    if (f.brinewall === "prepared") mod.partyBless = true;
    if (f.highice === "sheltered" || f.highice === "eye") mod.partyTempHp = 8; else mod.foeAtk = 1;
  } else if (bossKey === "kasai") {
    let boons = 0;
    if (f.brinewall === "prepared") boons++;
    if (f.highice === "sheltered" || f.highice === "eye") boons++;
    if (f.suishen) boons++;
    mod.partyTempHp = boons * 7;
    if (boons >= 2) mod.partyBless = true;
    if (boons === 0) mod.foeAtk = 2;
  }
  return mod;
}
const BOSS_ENC = { brinewall: "bossBrinewall", highice: "bossStorm", kasai: "bossRegent" };
function buildBossBattle(st, bossKey) {
  return buildRoadBattle(st, BOSS_ENC[bossKey], bossModsFromFlags(st, bossKey), bossKey);
}

function playerAction(b, action) {
  const actor = getC(b, b.awaiting);
  if (!actor || actor.hp <= 0) return b;
  if (action.kind === "strike") { performMove(b, actor, BASIC_STRIKE, action.target); }
  else if (action.kind === "defend") { actor.statuses = [...actor.statuses, { k: "defending", dur: 1, soak: 0.5 }]; logPush(b, `${actor.name} takes a defensive stance.`, "info"); }
  else if (action.kind === "flee") {
    const best = Math.max(...living(b, "party").map((p) => p.init));
    const dc = 11 + living(b, "foe").length;
    const r = d20() + best;
    if (r >= dc) { logPush(b, `The party breaks contact and slips away (${r} vs ${dc}).`, "start"); b.result = "fled"; b.awaiting = null; return b; }
    logPush(b, `The party cannot disengage (${r} vs ${dc}); the turn is spent trying.`, "warn");
  }
  else if (action.kind === "item") {
    const li = battleItem(action.id); if (!li) return b; const it = li.it;
    if (li.bag) { if ((b.bag[action.id] || 0) < 1) return b; b.bag[action.id] -= 1; }
    else { if ((b.supply[it.supply] || 0) < it.cost) return b; b.supply[it.supply] -= it.cost; }
    if (it.kind === "flee") { logPush(b, `${actor.name} hurls a smoke bomb — the caravan vanishes into the murk and is gone.`, "start"); b.result = "fled"; b.awaiting = null; return b; }
    performMove(b, actor, it, action.target);
  }
  else { const mv = MOVES[action.id]; if (!moveUsable(actor, mv)) return b; performMove(b, actor, mv, action.target); }
  b.awaiting = null;
  advancePtr(b);
  return stepToPlayer(b);
}

function battleReducer(b, action) {
  switch (action.type) {
    case "BT_MENU": return { ...b, ui: { mode: "menu" } };
    case "BT_OPEN_BAG": return { ...b, ui: { mode: "item" } };
    case "BT_CANCEL": return { ...b, ui: { mode: "menu" } };
    case "BT_CHOOSE_MOVE": { const mv = MOVES[action.id]; if (!moveUsable(getC(b, b.awaiting), mv)) return b; if (["allEnemies", "allAllies", "self"].includes(mv.target)) return playerAction(b, { kind: "move", id: action.id }); return { ...b, ui: { mode: "target", pending: { kind: "move", id: action.id, target: mv.target } } }; }
    case "BT_CHOOSE_ITEM": { const li = battleItem(action.id); if (!li) return b; const it = li.it; if (li.bag ? (b.bag[action.id] || 0) < 1 : (b.supply[it.supply] || 0) < it.cost) return b; if (it.kind === "flee" || ["allEnemies", "allAllies"].includes(it.target)) return playerAction(b, { kind: "item", id: action.id }); return { ...b, ui: { mode: "target", pending: { kind: "item", id: action.id, target: it.target } } }; }
    case "BT_TARGET": return playerAction(b, { kind: b.ui.pending.kind, id: b.ui.pending.id, target: action.uid });
    case "BT_DEFEND": return playerAction(b, { kind: "defend" });
    case "BT_STRIKE": { const foes = living(b, "foe"); if (foes.length === 1) return playerAction(b, { kind: "strike", target: foes[0].uid }); return { ...b, ui: { mode: "target", pending: { kind: "strike", target: "enemy" } } }; }
    case "BT_FLEE": return playerAction(b, { kind: "flee" });
    default: return b;
  }
}

function finishBattle(state) {
  const b = state.battle;
  const road = { ...state, res: { ...state.res }, party: state.party.map((p) => ({ ...p })), log: [...state.log], valuables: { ...(state.valuables || {}) }, relics: [...(state.relics || [])], items: { ...(state.items || {}) } };
  road.party = road.party.map((p) => { const c = b.combatants.find((x) => x.uid === "p_" + p.id); return c ? { ...p, hp: c.hp, res: { ...c.res } } : p; });
  road.res.medicine = b.supply.medicine;
  road.res.ammo = b.supply.ammo;
  if (b.bag) road.items = { ...b.bag }; // spent battle consumables carry back
  if (b.result === "win") {
    const enc = ENCOUNTERS[b.encId];
    road.res.gold += enc.gold; road.earned = (road.earned || 0) + enc.gold;
    let lootTxt = "";
    if (enc.loot) for (const [k, v] of Object.entries(enc.loot)) { if (road.res[k] !== undefined && v > 0) { road.res[k] += v; lootTxt += `, +${v} ${k}`; } }
    pushLog(road, `${b.story ? "The guardian falls" : "The foe is broken"}. You take ${enc.gold} gp from the field${lootTxt}.`, "good");
    const dr = rollDrops(road, b, enc);
    grantXP(road, enc.gold);
    if (dr.valuables.length || dr.item || dr.relic) {
      const parts = [];
      if (dr.valuables.length) parts.push("you gather " + listJoin(dr.valuables.map((id) => VALUABLES[id].name)));
      if (dr.item) parts.push(`a ${ITEMS[dr.item].name} for the satchel`);
      pushLog(road, "Picking over the fallen, " + (parts.length ? parts.join(", ") : "little of worth") + ".", "good");
      if (dr.relic) pushLog(road, `And something rare among it all — the ${RELICS[dr.relic].name}. ${RELICS[dr.relic].desc}`, "arrive");
    }
    if (b.story) {
      road.battle = null;
      if (b.story === "kasai") return winGame(road);
      pushLog(road, b.story === "brinewall" ? "Brinewall is yours. Ameiko's birthright is recovered, and the road north lies open." : "The Hungry Storm is broken. The High Ice lets you pass at last.", "arrive");
      checkEnd(road); return road;
    }
  } else if (b.result === "fled") {
    if (b.story) { road.battle = null; road.over = "lose"; road.overWhy = b.story === "kasai" ? "The company breaks before the Jade Regent and flees the throne room. Minkai stays in the tyrant's grip, and the long road was for nothing." : "You turn from the fight you came all this way to win. The quest falters here, and the caravan turns for home it will never reach in time."; return road; }
    road.morale = clamp(road.morale - 4, 0, 100);
    pushLog(road, "You break contact and roll on, hearts pounding and nothing gained.", "warn");
  } else {
    pushLog(road, b.story ? "The company is cut down before the guardian. Ameiko's road ends in blood." : "The company is overrun on the road.", "bad");
  }
  road.battle = null;
  checkEnd(road);
  return road;
}

function battleDispatch(state, action) {
  const b = battleReducer(cloneBattle(state.battle), action);
  const next = { ...state, battle: b };
  if (b.result) return finishBattle(next);
  return next;
}

/* =============================== REDUCER =========================== */
function reducer(state, action) {
  if (state.phase === "road" && state.battle && action.type.startsWith("BT_")) return battleDispatch(state, action);
  switch (action.type) {
    // front matter: title -> dialogue -> party
    case "BEGIN": return { ...state, phase: "intro", introNode: INTRO_START };
    case "INTRO_GO": return action.to === "party" ? { ...state, phase: "party" } : { ...state, introNode: action.to };
    case "TO_TITLE": return initSetup();
    case "REPLAY": return { ...initSetup(), phase: "party" };
    // setup
    case "PICK": { const has = state.picked.includes(action.id); let picked = has ? state.picked.filter((x) => x !== action.id) : state.picked.length < 4 ? [...state.picked, action.id] : state.picked; return { ...state, picked }; }
    case "CONFIRM_PARTY": return state.picked.length === 4 ? { ...state, phase: "outfit" } : state;
    case "BACK_PARTY": return { ...state, phase: "party" };
    case "SET_ANIMAL": return { ...state, loadout: { ...state.loadout, animal: action.animal } };
    case "HIRE_DRIVER_OUTFIT": return { ...state, loadout: { ...state.loadout, hiredDriver: !state.loadout.hiredDriver } };
    case "DRIVER": {
      if (state.phase !== "road") return state;
      if (action.hire) { if (state.hiredDriver || state.res.gold < DRIVER_FEE) return state; return { ...state, res: { ...state.res, gold: state.res.gold - DRIVER_FEE }, hiredDriver: true, log: [...state.log, { t: `You take on a teamster at ${ROUTE[state.legIndex].name} for ${DRIVER_FEE} gp and ${DRIVER_WAGE} gp a day. That's a pair of hands freed from the reins.`, k: "arrive" }] }; }
      return { ...state, hiredDriver: false, log: [...state.log, { t: "You pay off the teamster and take the reins yourselves again.", k: "info" }] };
    }
    case "SET_WAGONS": { const cargo = { ...state.loadout.cargo }; const lo2 = { ...state.loadout, wagons: action.n, cargo }; while (cargoUsed(lo2) > WAGONS[action.n].cap) { const g = Object.keys(cargo).find((k) => cargo[k] > 0); if (!g) break; cargo[g] -= 1; } return { ...state, loadout: lo2 }; }
    case "SET_SUPPLY": { const v = clamp((state.loadout[action.k] || 0) + action.d, 0, 200); return { ...state, loadout: { ...state.loadout, [action.k]: v } }; }
    case "SET_CARGO": { const cur = state.loadout.cargo[action.g] || 0; const next = clamp(cur + action.d, 0, 99); const lo2 = { ...state.loadout, cargo: { ...state.loadout.cargo, [action.g]: next } }; if (cargoUsed(lo2) > WAGONS[state.loadout.wagons].cap) return state; return { ...state, loadout: lo2 }; }
    case "START": return startJourney(state);
    // road
    case "SET_ROLE": return { ...state, roles: { ...state.roles, [action.id]: action.role } };
    case "PACE": return { ...state, pace: action.pace };
    case "DAY": return advanceDay(state, "travel");
    case "CAMP": return advanceDay(state, "camp");
    case "EVENT": return resolveEvent(state, action.opt);
    case "BRANCH": return chooseBranch(state, action.opt);
    case "FERRY": return crossFerry(state, action.mode);
    case "RESUPPLY": return resupply(state);
    case "SELL": return sellCargo(state, action.good, action.qty);
    case "SELL_FINDS": return sellValuables(state);
    case "RUMOR": return marketRumor(state);
    case "BUY": return buyGoods(state, action.good, action.qty);
    case "BEAT": return resolveBeat(state, action.opt);
    case "RESTART": return initSetup();
    default: return state;
  }
}


/* =============================== INTRO ============================ */
const INTRO_START = "arrival";
const INTRO = {
  arrival: {
    stage: "The Rusty Dragon, Sandpoint. Rain on the shutters, and a fire kept low. Ameiko Kaijitsu sets down a lacquered box that has come a very long way.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "You've hauled goods the length of Varisia and back, they tell me, and never lost a wagon you meant to keep. Good. Because I need someone who can get a caravan somewhere no sane merchant would take one — and keep us alive doing it.",
    choices: [{ label: "Where are we going?", to: "job" }],
  },
  job: {
    stage: "She opens the box. Inside: an old seal, a folded map that runs off the edge of the world, and a name written in Tian script.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "Minkai. On the far side of Tian Xia. A throne that's mine by blood sits under a usurper who calls himself the Jade Regent, and the only road home runs east — up to the Linnorm Kings, across the Crown of the World, and down into the Dragon Empires. Fourteen hundred miles, near enough.",
    choices: [
      { label: "That's a trade route as much as a quest.", to: "trade" },
      { label: "What's out there?", to: "catch" },
    ],
  },
  trade: {
    stage: "A wry almost-smile. She was a merchant's daughter before she was anyone's heir.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "It is. Fill the wagons in Sandpoint, buy furs and amber in Kalsgard, and every crate is worth more the farther east it rides — silk and jade sell for a fortune back the way we came. What we make on the road is ours; it's what buys guides and grain when the Crown tries to kill us. And it will try.",
    choices: [{ label: "What's out there?", to: "catch" }],
  },
  catch: {
    stage: "Her voice drops. The rain fills the quiet.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "Goblins in the Brinestump, first. A guardian in my own family's ruin at Brinewall. Then the north, and past it the Crown of the World — polar ice that eats caravans, and a living storm that guards the high pass. If we reach Minkai, the Five Storms and their Regent are waiting. Three trials, three monsters. You should know that going in.",
    choices: [{ label: "Then you'll want a company you can trust.", to: "company" }],
  },
  company: {
    stage: "She slides a purse across the table. It thuds, honest and heavy.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "Four hands you'd want on a very bad night — someone to read wild country, someone to keep breath in the wounded, someone to end the arguments steel makes. Sandpoint's full of such folk tonight. Choose well. The road out here remembers a poor choice far longer than you will.",
    choices: [
      { label: "I've run worse roads than this.", to: "muster_bold" },
      { label: "I'll take it careful, and take us all home.", to: "muster_wary" },
      { label: "For a cut of the silk, I'll haul anything.", to: "muster_greed" },
    ],
  },
  muster_bold: {
    stage: "She almost laughs.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "The Crown will put a price on that confidence soon enough. But I'll take it over fear. Muster your four, caravan-master — we roll out at first light.",
    choices: [{ label: "Assemble the company →", to: "party" }],
  },
  muster_wary: {
    stage: "She nods, slow and satisfied.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "Caution keeps caravans whole. I like it better than bravado. Muster your four, and mind the cold closer than the wolves.",
    choices: [{ label: "Assemble the company →", to: "party" }],
  },
  muster_greed: {
    stage: "A short, dry laugh — a merchant's laugh.",
    speaker: "Ameiko Kaijitsu", role: "Innkeeper, and heir of Minkai", art: "A",
    body: "Haul hard and sell high, then, and we'll both come out of this rich — if we come out of it. Muster your four; the season won't wait on us.",
    choices: [{ label: "Assemble the company →", to: "party" }],
  },
};

/* ---- Public API: everything a front-end needs ---- */
export {
  initSetup, reducer, startJourney, advanceDay, maybeCombat, maybeEvent, resolveEvent,
  chooseBranch, crossFerry, resupply, sellCargo, buyGoods, seasonStage, coldFor, totalRemaining,
  loadoutCost, teamSize, cargoUsed, optionAvailable, actorFor,
  buildRoadBattle, buildBossBattle, bossModsFromFlags, battleDispatch, finishBattle, stepToPlayer, playerAction, moveUsable, checkResult, statusMods, living, getC, curUid,
  combatChanceFor, regionTable, resolveBeat, winGame, sellPrice, buyPrice,
  ZONES, ROUTE, ROSTER, BY_ID, EVENTS, BEATS, BRANCHES, GOODS, ANIMALS, WAGONS, ROLES, ROLE_ORDER,
  MOVES, ENEMIES, ENCOUNTERS, REGION_COMBAT, WILD_BY_ZONE, COMBAT_ITEMS, STRAND_DAY,
  clamp, roll, startBuyPrice, SANDPOINT, ZONE_COST, DRIVER_FEE, DRIVER_WAGE,
  INTRO, INTRO_START, PACES, SKILL_LABEL, dfmt,
  VALUABLES, RELICS, ITEMS, relicFx, sellValuables,
  marketRumor, repFx, INJURIES,
  activeMovesFor, grantXP, MOVE_PROGRESSION, XP_THRESH, MAX_LEVEL,
};
