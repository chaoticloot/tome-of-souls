import React, { useState, useEffect } from "react";
import { ParsedCharacter } from "../lib/foundryParser";
import { Shield, X, Dice5, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RollRecord {
  id: string;
  source: string;
  result: number;
  formula: string;
  timestamp: Date;
}

interface Props {
  char: ParsedCharacter;
}

const ABILITY_LABELS: Record<string, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const SKILLS_LIST = [
  { key: "acr", label: "Acrobatics", ability: "dex" },
  { key: "ani", label: "Animal Handling", ability: "wis" },
  { key: "arc", label: "Arcana", ability: "int" },
  { key: "ath", label: "Athletics", ability: "str" },
  { key: "dec", label: "Deception", ability: "cha" },
  { key: "his", label: "History", ability: "int" },
  { key: "ins", label: "Insight", ability: "wis" },
  { key: "itm", label: "Intimidation", ability: "cha" },
  { key: "inv", label: "Investigation", ability: "int" },
  { key: "med", label: "Medicine", ability: "wis" },
  { key: "nat", label: "Nature", ability: "int" },
  { key: "prc", label: "Perception", ability: "wis" },
  { key: "prf", label: "Performance", ability: "cha" },
  { key: "per", label: "Persuasion", ability: "cha" },
  { key: "rel", label: "Religion", ability: "int" },
  { key: "slt", label: "Sleight of Hand", ability: "dex" },
  { key: "ste", label: "Stealth", ability: "dex" },
  { key: "sur", label: "Survival", ability: "wis" },
];

function formatMod(val: number) {
  return val >= 0 ? `+${val}` : `${val}`;
}

function Section({ title, children, className = "" }: any) {
  return (
    <div
      className={`flex flex-col mt-2 print:break-inside-avoid break-inside-avoid ${className}`}
    >
      <div className="bg-gray-100 print:bg-[#e2e2e2] text-black uppercase text-[10px] font-bold py-1 px-2 border-b border-gray-300 print:border-dnd-border flex justify-between items-center shrink-0 rounded-t">
        <span>{title}</span>
      </div>
      <div className="flex flex-col min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function CharacterSheet({ char }: Props) {
  const [selectedSpell, setSelectedSpell] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rollLog, setRollLog] = useState<RollRecord[]>([]);
  const [showRollLog, setShowRollLog] = useState(false);
  const [lastRoll, setLastRoll] = useState<RollRecord | null>(null);

  const [currentHp, setCurrentHp] = useState(char.hp.value);
  const [tempHp, setTempHp] = useState(char.hp.temp);
  const [mobileTab, setMobileTab] = useState<
    "main" | "skills" | "actions" | "inventory" | "spells" | "features"
  >("main");
  const [desktopTab, setDesktopTab] = useState<
    "actions" | "inventory" | "spells" | "features"
  >("actions");

  // Local state for interactive elements
  const [localResources, setLocalResources] = useState<typeof char.resources>(
    char.resources || [],
  );
  const [localSlots, setLocalSlots] = useState<
    Record<string, { value: number; max: number; level?: number }>
  >(char.spellcasting?.slots || {});

  // When char changes, sync state
  React.useEffect(() => {
    setCurrentHp(char.hp.value);
    setTempHp(char.hp.temp);
    setLocalResources(char.resources || []);
    setLocalSlots(char.spellcasting?.slots || {});
  }, [char]);

  const updateResourceValue = (index: number, delta: number) => {
    setLocalResources((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        value: Math.max(
          0,
          Math.min(copy[index].max, copy[index].value + delta),
        ),
      };
      return copy;
    });
  };

  const updateSlotValue = (slotKey: string, delta: number) => {
    setLocalSlots((prev) => {
      const copy = { ...prev };
      if (copy[slotKey]) {
        copy[slotKey] = {
          ...copy[slotKey],
          value: Math.max(
            0,
            Math.min(copy[slotKey].max, copy[slotKey].value + delta),
          ),
        };
      }
      return copy;
    });
  };

  const handleRoll = (
    source: string,
    mod: number | string,
    isFormula: boolean = false,
  ) => {
    // Basic roll logic
    const base = Math.floor(Math.random() * 20) + 1;
    const isNum = typeof mod === "number" && !isFormula;
    let res = base;
    let formula = "";

    if (isNum) {
      res = base + Number(mod);
      formula = `1d20 ${Number(mod) >= 0 ? "+" : "-"} ${Math.abs(Number(mod))}`;
    } else {
      const formulaStr = String(mod).replace(/\s+/g, "");
      formula = formulaStr;
      res = 0;

      // simple regex to find all NdX or constants
      const parts = formulaStr.match(/([+-]?\d+d\d+)|([+-]?\d+)/g);
      if (parts) {
        res = parts.reduce((acc, part) => {
          if (part.includes("d")) {
            const [count, sidestr] = part.split("d");
            let numDice = parseInt(count);
            const isNegative = count.startsWith("-");
            if (isNegative) numDice = Math.abs(numDice);
            else if (count === "" || count === "+") numDice = 1;

            const sides = parseInt(sidestr);
            let subTotal = 0;
            for (let i = 0; i < numDice; i++)
              subTotal += Math.floor(Math.random() * sides) + 1;
            return acc + (isNegative ? -subTotal : subTotal);
          } else {
            return acc + parseInt(part);
          }
        }, 0);
      }
    }

    const newRoll = {
      id: Math.random().toString(36).substr(2, 9),
      source,
      result: res,
      formula,
      timestamp: new Date(),
    };

    setRollLog((prev) => [newRoll, ...prev]);

    if (window.innerWidth >= 1024) {
      setShowRollLog(true);
    } else {
      setLastRoll(newRoll);
      setTimeout(() => {
        setLastRoll((current) => (current?.id === newRoll.id ? null : current));
      }, 3000);
    }
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto bg-[#1b1c22] text-gray-300 shadow-xl print:shadow-none print:bg-white print:text-black my-0 lg:my-8 pb-0 lg:pb-8 print:p-0 print:m-0 border-0 lg:border-4 border-black print:border-dnd-border relative">
      {/* Header Section (Dark themed) */}
      <div
        className={`bg-[#1b1c22] border-b-0 lg:border-b-2 border-red-800 p-4 md:p-6 flex-col md:flex-row gap-4 md:gap-6 items-end print:bg-white print:text-black print:border-b print:border-dnd-border print:flex ${mobileTab === "main" ? "flex" : "hidden lg:flex"}`}
      >
        {/* Name Area */}
        <div className="flex-1 flex justify-between items-start">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-wider leading-none print:text-dnd-red">
              {char.name}
            </h1>
            <p className="text-sm font-bold text-gray-400 uppercase mt-1 print:text-gray-500">
              {char.race.replace(/(.+?) \((.+?)\)/, "$2 $1")} {char.classes}
            </p>
            <div className="flex gap-4 text-[11px] text-gray-500 mt-1 uppercase font-bold tracking-wide">
              <span>Level {char.level}</span>
              <span>{char.background}</span>
              <span>{char.alignment}</span>
            </div>
          </div>
          <button
            onClick={() => setShowRollLog(true)}
            className="flex items-center gap-2 bg-[#23242a] text-gray-400 hover:text-white hover:bg-gray-800 px-3 py-1.5 rounded border border-gray-700 text-xs font-bold uppercase transition print:hidden shadow-lg"
          >
            <History className="w-4 h-4" />
            Rolls
          </button>
        </div>
      </div>

      {/* Tab Navigation (Mobile Only) */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-[#1b1c22] border-b-2 border-red-800 lg:hidden sticky top-0 z-40 print:hidden shadow-lg">
        {[
          { id: "main", label: "Main" },
          { id: "skills", label: "Skills" },
          { id: "actions", label: "Actions" },
          { id: "inventory", label: "Inventory" },
          { id: "spells", label: "Spells" },
          { id: "features", label: "Features" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setMobileTab(t.id as any)}
            className={`px-2 py-2 rounded text-[10px] font-bold uppercase tracking-wider text-center transition-colors ${mobileTab === t.id ? "bg-red-800 text-white" : "bg-[#23242a] text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 lg:bg-transparent bg-[#1b1c22] pb-0 lg:pb-6 print:p-0">
        {/* Top Stats Array */}
        <div
          className={`flex-col lg:flex-row gap-4 mb-4 lg:mb-6 items-center lg:items-stretch lg:flex lg:flex-nowrap print:flex print:flex-row print:gap-3 print:mb-3 ${mobileTab === "main" ? "flex" : "hidden"}`}
        >
          {/* Abilities Grid */}
          <div
            className={`order-2 lg:order-1 w-full lg:w-[50%] lg:max-w-[50%] grid grid-cols-3 lg:grid-cols-6 print:flex print:flex-row print:w-auto print:max-w-none justify-center place-items-stretch gap-2 lg:gap-1.5 bg-[#23242a] p-2 md:p-3 lg:p-2 rounded-lg border border-gray-700 shadow-md print:bg-transparent print:border-0 print:p-0 shrink-0`}
          >
            {Object.entries(char.abilities).map(([key, ability]) => (
              <div
                key={key}
                className="relative border-2 border-gray-600 bg-white print:border-dnd-border rounded flex-1 h-16 md:h-[5rem] lg:h-[4.5rem] flex flex-col items-center justify-start shadow-inner group transition-colors pt-0.5"
              >
                <span className="uppercase text-[8px] md:text-[10px] p-[3px] font-bold text-slate-700 tracking-wider leading-none">
                  {ABILITY_LABELS[key].substring(0, 3)}
                </span>
                <button
                  className="text-3xl lg:text-[28px] font-bold text-black leading-none mt-0 cursor-pointer hover:text-red-700 transition flex-1 flex items-center justify-center mb-1 font-serif"
                  onClick={() =>
                    handleRoll(`${ABILITY_LABELS[key]} Check`, ability.mod)
                  }
                  title={`Roll ${ABILITY_LABELS[key]} Check`}
                >
                  {formatMod(ability.mod)}
                </button>
                <div className="absolute -bottom-2.5 lg:-bottom-2.5 inset-x-0 mx-auto w-6 md:w-7 h-5 bg-white text-black print:text-dnd-ink rounded-full font-bold text-[10px] border-2 border-gray-600 print:border-dnd-border flex items-center justify-center pointer-events-none shadow-sm leading-none pt-px">
                  {ability.value}
                </div>
              </div>
            ))}
          </div>

          <div className="order-1 lg:order-2 flex gap-4 w-full lg:flex-1 flex-col lg:flex-row overflow-hidden lg:overflow-visible print:flex-row print:overflow-visible">
            {/* Core Stats Bar */}
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2 w-full lg:w-auto lg:flex-1 order-2 lg:order-1 print:flex print:flex-row print:gap-2">
              <div className="border border-red-800 bg-[#23242a] print:bg-white print:border-dnd-border rounded-lg p-1.5 md:p-2 lg:p-1.5 text-center flex-1 flex flex-col justify-center items-center h-16 md:h-[4.5rem] lg:h-auto min-w-16 md:min-w-20 lg:min-w-16">
                <span className="uppercase text-[8px] md:text-[9px] lg:text-[8px] font-bold text-gray-400 print:text-dnd-red tracking-wider leading-tight">
                  Prof Bonus
                </span>
                <div className="font-serif text-xl md:text-2xl lg:text-xl font-bold text-white print:text-dnd-ink leading-none mt-1">
                  {formatMod(char.proficiencyBonus)}
                </div>
              </div>

              <div className="border border-red-800 bg-[#23242a] print:bg-white print:border-dnd-border rounded-lg p-1.5 md:p-2 lg:p-1.5 text-center flex-1 flex flex-col justify-center items-center h-16 md:h-[4.5rem] lg:h-auto min-w-16 md:min-w-20 lg:min-w-16">
                <span className="uppercase text-[8px] md:text-[9px] lg:text-[8px] font-bold text-gray-400 print:text-dnd-red tracking-wider leading-tight">
                  Speed
                </span>
                <div className="font-serif text-xl md:text-2xl lg:text-xl font-bold text-white print:text-dnd-ink leading-none mt-1 flex items-baseline justify-center">
                  {typeof char.speed === "object"
                    ? (char.speed as any).value || 30
                    : char.speed}{" "}
                  <span className="text-[10px] md:text-xs lg:text-[10px] ml-0.5">
                    ft.
                  </span>
                </div>
              </div>

              <div className="border border-red-800 bg-[#23242a] print:bg-white print:border-dnd-border rounded-lg p-1.5 md:p-2 lg:p-1.5 text-center flex-1 flex flex-col justify-center items-center h-16 md:h-[4.5rem] lg:h-auto min-w-16 md:min-w-20 lg:min-w-16">
                <span className="uppercase text-[8px] md:text-[9px] lg:text-[8px] font-bold text-gray-400 print:text-dnd-red tracking-wider mb-0 md:mb-1 lg:mb-0">
                  Init
                </span>
                <button
                  className="font-serif text-xl md:text-2xl lg:text-xl font-bold text-white print:text-dnd-ink leading-none bg-white/10 w-full rounded hover:bg-white/20 transition-colors py-0.5 md:py-1 lg:py-0.5"
                  onClick={() => handleRoll("Initiative", char.initiative)}
                >
                  {formatMod(char.initiative)}
                </button>
              </div>

              <div className="border border-red-800 bg-[#23242a] print:bg-white print:border-dnd-border rounded-lg p-1.5 md:p-2 lg:p-1.5 text-center flex-1 flex flex-col justify-center items-center h-16 md:h-[4.5rem] lg:h-auto min-w-16 md:min-w-20 lg:min-w-16 relative overflow-hidden">
                <Shield className="absolute inset-0 m-auto w-10 md:w-12 lg:w-10 h-10 md:h-12 lg:h-10 text-gray-700 print:text-gray-200 opacity-30" />
                <span className="uppercase text-[8px] md:text-[9px] lg:text-[8px] font-bold text-gray-400 print:text-dnd-red tracking-wider mb-0 md:mb-1 lg:mb-0 relative z-10 leading-tight">
                  AC
                </span>
                <div className="font-serif text-xl md:text-2xl lg:text-xl font-bold text-white print:text-dnd-ink leading-none mt-1 lg:mt-0 relative z-10">
                  {char.ac}
                </div>
              </div>
            </div>

            {/* Hit Points Box */}
            <div className="flex-1 lg:flex-none lg:w-[240px] order-1 md:order-2 border border-red-800 bg-[#23242a] print:bg-white print:border-dnd-border rounded-lg p-2 md:p-3 lg:p-2 flex flex-col relative justify-center min-h-[4.5rem] lg:min-h-0 bg-gradient-to-br from-[#23242a] to-[#1a1b20] print:bg-none">
              <table className="w-full text-center mt-0 mb-1 lg:mb-2 lg:mt-1">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase font-bold tracking-wider print:text-gray-500">
                    <th className="font-normal text-emerald-500 print:text-emerald-700 text-left pl-2">
                      Current
                    </th>
                    <th className="font-normal text-gray-500 w-2"></th>
                    <th className="font-normal text-gray-500">Max</th>
                    <th className="font-normal text-gray-500">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="align-bottom text-left pl-2">
                      <input
                        type="number"
                        className="w-16 lg:w-14 bg-transparent text-4xl lg:text-3xl font-bold focus:outline-none text-left text-white p-0 m-0 print:text-black font-sans"
                        value={currentHp}
                        onChange={(e) => setCurrentHp(Number(e.target.value))}
                      />
                    </td>
                    <td className="text-2xl lg:text-xl text-gray-600 align-bottom pb-1 lg:pb-0.5 px-1">
                      /
                    </td>
                    <td className="text-3xl lg:text-2xl font-bold text-gray-400 print:text-black align-bottom pb-1 lg:pb-0.5">
                      {char.hp.max}
                    </td>
                    <td className="align-bottom pb-1 lg:pb-0.5">
                      <input
                        type="number"
                        className="w-12 lg:w-10 bg-transparent text-2xl lg:text-xl font-bold text-center text-blue-400 print:text-black focus:outline-none p-0 m-0"
                        value={tempHp || ""}
                        placeholder="--"
                        onChange={(e) => setTempHp(Number(e.target.value))}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="absolute -bottom-2 md:-bottom-2.5 right-4 bg-[#23242a] px-2 text-[10px] md:text-xs text-gray-400 uppercase font-bold border border-red-800 rounded print:bg-white print:text-dnd-ink print:border-dnd-border">
                Hit Points
              </div>
            </div>
          </div>
        </div>

        {/* 3 Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 print:flex-row print:flex-wrap print:gap-4 items-stretch print:items-start">
          {/* COLUMN 1: Saves & Details */}
          <div
            className={`w-full lg:w-60 flex-shrink-0 flex-col gap-4 order-2 lg:order-1 lg:flex print:flex print:w-[210px] print:order-1 ${mobileTab === "main" ? "flex" : "hidden"}`}
          >
            <Section
              title="Saving Throws"
              className="rounded-lg border-gray-700 bg-[#23242a] print:bg-white"
            >
              <div className="flex flex-col gap-1 text-sm bg-white text-black p-2 rounded">
                <div className="flex border-b border-gray-300 pb-1 px-1 text-[9px] uppercase font-bold text-gray-500">
                  <span className="w-8 text-center">Prof</span>
                  <span className="w-8 text-center">Mod</span>
                  <span className="ml-1">Save</span>
                </div>
                {Object.entries(char.abilities).map(([key, ability]) => {
                  const saveMod =
                    ability.mod +
                    (ability.saveProf ? char.proficiencyBonus : 0);
                  return (
                    <div
                      key={key}
                      className="py-0.5 flex items-center hover:bg-gray-100 cursor-pointer rounded transition-colors group"
                      onClick={() =>
                        handleRoll(`${ABILITY_LABELS[key]} Save`, saveMod)
                      }
                    >
                      <div className="w-8 flex justify-center">
                        <div
                          className={`w-2.5 h-2.5 rounded-full border border-gray-400 flex-shrink-0 ${ability.saveProf ? "bg-black" : "bg-transparent"}`}
                        />
                      </div>
                      <div
                        className={`w-8 font-bold text-center group-hover:text-red-700 ${ability.saveProf ? "text-black" : "text-gray-500 font-normal"}`}
                      >
                        {formatMod(saveMod)}
                      </div>
                      <div className="uppercase tracking-tight text-xs font-bold ml-2">
                        {key}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section
              title="Defenses & Conditions"
              className="rounded-lg border-gray-700 bg-[#23242a] print:bg-white"
            >
              <div className="bg-white text-black p-3 rounded flex flex-col gap-2 text-[11px]">
                {char.traits.immunities &&
                  char.traits.immunities !== "None" && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 font-bold w-16 text-right">
                        Immune
                      </span>{" "}
                      <span className="text-gray-900">
                        {char.traits.immunities}
                      </span>
                    </div>
                  )}
                {char.traits.resistances &&
                  char.traits.resistances !== "None" && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 font-bold w-16 text-right">
                        Resist
                      </span>{" "}
                      <span className="text-gray-900">
                        {char.traits.resistances}
                      </span>
                    </div>
                  )}
                <div className="flex gap-2">
                  <span className="text-gray-500 font-bold w-16 text-right">
                    Hit Dice
                  </span>{" "}
                  <span className="text-gray-900">{char.hitDice}</span>
                </div>
              </div>
            </Section>

            <Section
              title="Senses"
              className="rounded-lg border-gray-700 bg-[#23242a] print:bg-white"
            >
              <div className="flex flex-col gap-2 p-2 bg-white text-black rounded">
                <div className="flex items-center gap-2 border border-blue-200 rounded p-1.5 px-3">
                  <div className="font-bold text-lg">
                    {char.passivePerception}
                  </div>
                  <div className="uppercase text-[10px] font-bold text-gray-600">
                    Passive Perception
                  </div>
                </div>
                <div className="flex items-center gap-2 border border-blue-200 rounded p-1.5 px-3">
                  <div className="font-bold text-lg">
                    {char.passiveInvestigation}
                  </div>
                  <div className="uppercase text-[10px] font-bold text-gray-600">
                    Passive Investigation
                  </div>
                </div>
                {char.traits.senses && char.traits.senses.trim() && (
                  <div className="text-[10px] uppercase font-bold text-gray-500 text-center mt-1 border-t border-gray-100 pt-2">
                    {char.traits.senses}
                  </div>
                )}
              </div>
            </Section>

            <Section
              title="Proficiencies & Training"
              className="rounded-lg border-gray-700 bg-[#23242a] print:bg-white"
            >
              <div className="bg-white text-black p-3 rounded flex flex-col gap-3 text-[11px]">
                <div>
                  <h4 className="font-bold uppercase text-[9px] text-gray-500 border-b border-gray-200 mb-1">
                    Armor
                  </h4>
                  <p>{char.proficiencies.armor}</p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-[9px] text-gray-500 border-b border-gray-200 mb-1">
                    Weapons
                  </h4>
                  <p>{char.proficiencies.weapons}</p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-[9px] text-gray-500 border-b border-gray-200 mb-1">
                    Tools
                  </h4>
                  <p>{char.proficiencies.tools}</p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-[9px] text-gray-500 border-b border-gray-200 mb-1">
                    Languages
                  </h4>
                  <p>{char.traits.languages}</p>
                </div>
              </div>
            </Section>
          </div>

          {/* COLUMN 2: Skills */}
          <div
            className={`w-full lg:w-72 flex-shrink-0 flex-col gap-4 order-3 lg:order-2 lg:flex print:flex print:w-[240px] print:order-2 ${mobileTab === "skills" ? "flex" : "hidden"}`}
          >
            <Section
              title="Skills"
              className="rounded-lg border-gray-700 bg-[#23242a] print:bg-white h-auto flex-1 flex flex-col"
            >
              <div className="flex flex-col gap-0 text-xs bg-white text-black p-2 rounded h-auto flex-1 print:grid print:grid-cols-2 lg:print:grid-cols-1 gap-x-4">
                <div className="flex border-b border-gray-300 pb-1 px-1 text-[10px] uppercase font-bold text-gray-500">
                  <span className="w-8 text-center">Prof</span>
                  <span className="w-8 text-center">Attr</span>
                  <span className="flex-1 ml-2 text-left">Skill</span>
                  <span className="w-8 text-center">Bonus</span>
                </div>
                {SKILLS_LIST.map((skill) => {
                  const sk = char.skills[skill.key];
                  if (!sk) return null;
                  const isProf = sk.prof > 0;
                  const isExp = sk.prof > 1;
                  return (
                    <div
                      key={skill.key}
                      className="border-b border-gray-100 py-1.5 flex items-center last:border-0 hover:bg-gray-100 cursor-pointer transition-colors group print:break-inside-avoid"
                      onClick={() => handleRoll(`${skill.label} Check`, sk.mod)}
                    >
                      <div className="w-8 flex justify-center">
                        <div
                          className={`w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0 ${isProf ? "bg-black" : "bg-transparent"}`}
                        >
                          {isExp && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <span className="uppercase text-[9px] w-8 text-center text-gray-500 font-bold">
                        {skill.ability.substring(0, 3)}
                      </span>
                      <span
                        className={`font-medium flex-1 ml-2 truncate ${isProf ? "text-black" : "text-gray-700"}`}
                      >
                        {skill.label}
                      </span>
                      <div
                        className={`w-8 font-bold text-center border-l border-gray-200 group-hover:text-red-700 ${isProf ? "text-black" : "text-gray-500 font-normal"}`}
                      >
                        {formatMod(sk.mod)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>

          {/* COLUMN 3: Actions & Details */}
          <div
            className={`flex-1 min-w-0 order-1 lg:order-3 print:flex print:flex-col print:w-full print:static print:order-3 print:mt-4 ${["actions", "inventory", "spells", "features"].includes(mobileTab) ? "flex flex-col" : "hidden md:flex lg:flex"}`}
          >
            <div className="flex flex-col w-full h-full lg:absolute lg:inset-x-0 lg:top-0 lg:bottom-0 print:static print:h-auto">
              {/* Desktop Tab Navigation for Right Column */}
              <div className="hidden lg:grid grid-cols-4 gap-2 print:hidden mb-4 mt-0 shrink-0">
                {[
                  { id: "actions", label: "Actions" },
                  { id: "spells", label: "Spells" },
                  { id: "inventory", label: "Inventory" },
                  { id: "features", label: "Traits" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDesktopTab(t.id as any)}
                    className={`px-2 py-2 rounded cursor-pointer text-[10px] xl:text-xs font-bold uppercase tracking-wider text-center transition-colors ${desktopTab === t.id ? "bg-red-800 text-white" : "bg-[#23242a] border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"} `}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content scrolling container */}
              <div className="flex-1 overflow-visible lg:overflow-hidden p-0 relative flex flex-col min-h-0 lg:min-h-0 h-auto print:static print:h-auto print:overflow-visible print:block print:space-y-4">
                <Section
                  title="Actions & Attacks"
                  className={`rounded border-gray-700 bg-white text-black h-fit lg:h-full flex-1 print:!flex print:h-auto print:w-full print:break-inside-avoid ${mobileTab === "actions" ? "flex" : "hidden md:hidden"} ${desktopTab === "actions" ? "lg:flex" : "lg:hidden"}`}
                >
                  <div className="overflow-visible lg:overflow-y-auto flex-1 min-h-0 w-full relative print:overflow-visible print:h-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-800 font-bold uppercase text-[9px] text-gray-500">
                          <th className="p-2 w-1/3">Attack</th>
                          <th className="p-2 w-24 text-center">Hit/DC</th>
                          <th className="p-2 w-32 text-center">Damage</th>
                          <th className="p-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {char.weapons.map((w, idx) => {
                          const damageParts = w.damage.split(" (Versatile: ");
                          const baseDmg = damageParts[0];
                          const verDmg =
                            damageParts.length > 1
                              ? damageParts[1].replace(")", "")
                              : null;

                          return (
                            <tr
                              key={idx}
                              className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors print:break-inside-avoid"
                            >
                              <td className="p-2">
                                <div className="font-bold text-black">
                                  {w.name}
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase">
                                  {w.type}
                                </div>
                              </td>
                              <td
                                className="p-2 text-center cursor-pointer group"
                                onClick={() =>
                                  handleRoll(
                                    `${w.name} Attack`,
                                    Number(w.attackBonus),
                                  )
                                }
                              >
                                <span className="border border-gray-300 rounded px-2 py-1 font-bold bg-white shadow-sm inline-block min-w-[32px] group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                                  {w.attackBonus
                                    ? formatMod(Number(w.attackBonus))
                                    : "-"}
                                </span>
                              </td>
                              <td className="p-2 text-center flex flex-col items-center gap-1">
                                <span
                                  className="border border-gray-300 rounded px-2 py-1 font-bold bg-white shadow-sm inline-block cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors text-xs"
                                  onClick={() =>
                                    handleRoll(
                                      `${w.name} Damage`,
                                      baseDmg,
                                      true,
                                    )
                                  }
                                >
                                  {baseDmg || "-"}
                                </span>
                                {verDmg && (
                                  <span
                                    className="border border-gray-200 rounded px-2 py-0.5 font-bold bg-gray-50 text-[10px] text-gray-500 shadow-sm inline-block cursor-pointer hover:bg-red-50 hover:text-red-700 transition-colors"
                                    onClick={() =>
                                      handleRoll(
                                        `${w.name} Versatile`,
                                        verDmg,
                                        true,
                                      )
                                    }
                                  >
                                    Versatile: {verDmg}
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-gray-500 italic text-[10px]"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {char.weapons.length === 0 && (
                      <div className="p-4 text-center text-gray-500 italic text-sm">
                        No actions configured.
                      </div>
                    )}
                  </div>
                </Section>

                <Section
                  title="Inventory"
                  className={`rounded border-gray-700 bg-white text-black h-[60vh] lg:h-full flex-1 print:!flex print:h-auto print:w-full print:break-inside-avoid ${mobileTab === "inventory" ? "flex" : "hidden md:hidden"} ${desktopTab === "inventory" ? "lg:flex" : "lg:hidden"}`}
                >
                  {char.currency && (
                    <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 shrink-0 sticky top-0 z-10 shadow-sm p-1.5 md:p-2 print:static print:bg-white print:border-b">
                      <div className="flex gap-2 text-[10px] md:text-xs font-bold font-fantasy tabular-nums tracking-tighter shrink-0 w-full justify-around md:justify-start md:gap-4 lg:gap-8">
                        <span
                          className="bg-slate-200 text-slate-800 px-2 py-1 rounded border border-slate-300"
                          title="Platinum"
                        >
                          PP {char.currency.pp}
                        </span>
                        <span
                          className="bg-amber-100 text-amber-700 px-2 py-1 rounded border border-amber-200"
                          title="Gold"
                        >
                          GP {char.currency.gp}
                        </span>
                        <span
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200"
                          title="Electrum"
                        >
                          EP {char.currency.ep}
                        </span>
                        <span
                          className="bg-gray-200 text-gray-600 px-2 py-1 rounded border border-gray-300"
                          title="Silver"
                        >
                          SP {char.currency.sp}
                        </span>
                        <span
                          className="bg-orange-100 text-orange-800 px-2 py-1 rounded border border-orange-200"
                          title="Copper"
                        >
                          CP {char.currency.cp}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-2 flex flex-col gap-1 text-[11px] overflow-y-auto flex-1 h-0 w-full relative print:overflow-visible print:h-auto print:min-h-0">
                    {char.inventory.length > 0 ? (
                      char.inventory.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-100 cursor-pointer transition-colors px-2 rounded group print:break-inside-avoid"
                          onClick={() => setSelectedItem(item)}
                        >
                          <div className="flex items-center gap-2">
                            {item.equipped && (
                              <Shield
                                className="w-4 h-4 text-emerald-600"
                                title="Equipped"
                              />
                            )}
                            {!item.equipped && <div className="w-4 h-4" />}
                            <span className="font-bold font-serif text-sm group-hover:text-red-700 transition-colors">
                              {item.name}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-gray-500 font-bold uppercase py-0.5 px-1.5 bg-gray-200 rounded">
                                x{item.quantity}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 font-mono text-xs">
                            {item.weight > 0 ? item.weight + " lb" : ""}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 italic py-4">
                        Inventory empty
                      </div>
                    )}
                  </div>
                </Section>

                <Section
                  title="Spells"
                  className={`rounded border-gray-700 bg-white text-black h-[60vh] lg:h-full flex-1 print:!flex print:h-auto print:w-full print:break-inside-avoid ${mobileTab === "spells" ? "flex" : "hidden md:hidden"} ${desktopTab === "spells" ? "lg:flex" : "lg:hidden"}`}
                >
                  {char.spellcasting && (
                    <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 shrink-0 text-sm font-bold font-fantasy tabular-nums tracking-tighter shadow-sm z-10 sticky top-0 p-1.5 md:p-2 print:static print:bg-white print:border-b">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded shadow-sm border border-blue-200">
                        Spell DC: {char.spellcasting.dc}
                      </span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded shadow-sm border border-red-200">
                        Spell Attack: {formatMod(char.spellcasting.attackBonus)}
                      </span>
                    </div>
                  )}
                  <div className="p-2 md:p-4 flex flex-col gap-4 text-[11px] overflow-y-auto w-full h-0 relative flex-1 print:overflow-visible print:h-auto">
                    {(() => {
                      const groupedSpells = Array.from(
                        { length: 10 },
                        () => [] as typeof char.spells,
                      );
                      const hasAnySpells = char.spells.length > 0;

                      char.spells.forEach((s) => {
                        if (s.prepared || s.level === 0) {
                          groupedSpells[s.level].push(s);
                        }
                      });

                      return (
                        <>
                          {/* Pact Magic */}
                          {localSlots["pact"] && localSlots["pact"].max > 0 && (
                            <div className="flex flex-col break-inside-avoid print:break-inside-avoid">
                              <div className="flex justify-between items-end border-b-2 border-purple-400 pb-1 mb-1 mt-2">
                                <span className="font-bold text-[#4B0082] uppercase tracking-widest text-xs">
                                  Pact Magic (Level{" "}
                                  {localSlots["pact"].level || "?"})
                                </span>
                                <div
                                  className="flex gap-1"
                                  title={`${localSlots["pact"].value} available out of ${localSlots["pact"].max}`}
                                >
                                  {Array.from({
                                    length: localSlots["pact"].max,
                                  }).map((_, i) => {
                                    const slData = localSlots["pact"];
                                    const spent = slData.max - slData.value;
                                    const isSpent = i < spent;
                                    return (
                                      <div
                                        key={i}
                                        onClick={() =>
                                          updateSlotValue(
                                            "pact",
                                            isSpent ? 1 : -1,
                                          )
                                        }
                                        className="w-3 h-3 cursor-pointer border border-purple-500 hover:border-purple-700 rounded-sm flex items-center justify-center bg-white shadow-inner transition-colors"
                                      >
                                        {isSpent && (
                                          <div className="w-1.5 h-1.5 rounded-sm bg-purple-800" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {groupedSpells.map((spellsArr, level) => {
                            const slotData = localSlots[level];
                            if (
                              spellsArr.length === 0 &&
                              (!slotData || slotData.max === 0)
                            )
                              return null;

                            spellsArr.sort((a, b) =>
                              a.name.localeCompare(b.name),
                            );

                            return (
                              <div
                                key={level}
                                className="flex flex-col break-inside-avoid print:break-inside-avoid"
                              >
                                <div className="flex justify-between items-end border-b-2 border-gray-300 pb-1 mb-1 mt-2">
                                  <span className="font-bold text-[#802B27] uppercase tracking-widest text-xs">
                                    {level === 0
                                      ? "Cantrips"
                                      : `Level ${level}`}
                                  </span>
                                  {slotData && slotData.max > 0 && (
                                    <div
                                      className="flex gap-1"
                                      title={`${slotData.value} available out of ${slotData.max}`}
                                    >
                                      {slotData.max > 10 ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              updateSlotValue(
                                                level.toString(),
                                                1,
                                              )
                                            }
                                            className="px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100 font-bold print:hidden"
                                          >
                                            +
                                          </button>
                                          <span className="font-mono text-[10px]">
                                            {slotData.value} / {slotData.max}
                                          </span>
                                          <button
                                            onClick={() =>
                                              updateSlotValue(
                                                level.toString(),
                                                -1,
                                              )
                                            }
                                            className="px-1.5 py-0.5 border border-gray-300 rounded hover:bg-gray-100 font-bold print:hidden"
                                          >
                                            -
                                          </button>
                                        </div>
                                      ) : (
                                        Array.from({
                                          length: slotData.max,
                                        }).map((_, i) => {
                                          const spent =
                                            slotData.max - slotData.value;
                                          const isSpent = i < spent;
                                          return (
                                            <div
                                              key={i}
                                              onClick={() =>
                                                updateSlotValue(
                                                  level.toString(),
                                                  isSpent ? 1 : -1,
                                                )
                                              }
                                              className="w-3 h-3 cursor-pointer border border-gray-400 hover:border-gray-600 rounded-sm flex items-center justify-center bg-white shadow-inner transition-colors"
                                            >
                                              {isSpent && (
                                                <div
                                                  className="w-1.5 h-1.5 rounded-sm"
                                                  style={{
                                                    backgroundColor:
                                                      "var(--active-color)",
                                                  }}
                                                />
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  )}
                                </div>
                                {spellsArr.map((s, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-100 cursor-pointer transition-colors px-2 rounded group print:break-inside-avoid"
                                    onClick={() => setSelectedSpell(s)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold font-serif text-sm text-black group-hover:text-red-700 transition-colors">
                                        {s.name}
                                      </span>
                                    </div>
                                    <div className="flex text-[10px] text-gray-500 font-bold uppercase tracking-wider gap-2 items-center">
                                      {s.action && <span>{s.action}</span>}
                                      {s.concentration && (
                                        <span
                                          className="text-yellow-600 bg-yellow-100 px-1.5 rounded border border-yellow-200"
                                          title="Concentration"
                                        >
                                          C
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                          {!hasAnySpells && (
                            <div className="text-center text-gray-500 italic py-4">
                              No spells
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </Section>

                <Section
                  title="Features & Traits"
                  className={`rounded border-gray-700 bg-white text-black h-auto lg:h-full flex-1 print:!flex print:h-auto print:w-full print:break-inside-avoid ${mobileTab === "features" ? "flex" : "hidden md:hidden"} ${desktopTab === "features" ? "lg:flex" : "lg:hidden"}`}
                >
                  <div className="p-4 gap-6 space-y-6 text-sm w-full overflow-visible lg:overflow-y-auto h-full relative print:overflow-visible print:h-auto">
                    {localResources && localResources.length > 0 && (
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 p-3 rounded-lg shadow-sm print:bg-white print:border-gray-300 print:break-inside-avoid">
                        {localResources.map((res, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-700 tracking-wider">
                              <span className="uppercase">{res.name}</span>
                              <span className="text-gray-400 font-mono">
                                {res.value} / {res.max}
                              </span>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                              {res.max > 10 ? (
                                <div className="flex items-center gap-3 w-full justify-end">
                                  <button
                                    onClick={() => updateResourceValue(i, 1)}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 font-bold bg-white shadow-sm transition-colors print:hidden"
                                  >
                                    +
                                  </button>
                                  <span className="font-mono text-base font-bold w-12 text-center text-black">
                                    {res.value}
                                  </span>
                                  <button
                                    onClick={() => updateResourceValue(i, -1)}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-100 font-bold bg-white shadow-sm transition-colors print:hidden"
                                  >
                                    -
                                  </button>
                                </div>
                              ) : (
                                Array.from({ length: res.max }).map(
                                  (_, slotIdx) => {
                                    const spent = res.max - res.value;
                                    const isSpent = slotIdx < spent;
                                    return (
                                      <div
                                        key={slotIdx}
                                        onClick={() =>
                                          updateResourceValue(
                                            i,
                                            isSpent ? 1 : -1,
                                          )
                                        }
                                        className="w-4 h-4 cursor-pointer border border-gray-400 hover:border-gray-600 rounded-sm flex items-center justify-center bg-white shadow-sm transition-colors"
                                        style={{ flexShrink: 0 }}
                                      >
                                        {isSpent && (
                                          <div
                                            className="w-2.5 h-2.5 rounded-sm"
                                            style={{
                                              backgroundColor:
                                                "var(--active-color)",
                                            }}
                                          />
                                        )}
                                      </div>
                                    );
                                  },
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {char.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="break-inside-avoid print:break-inside-avoid"
                      >
                        <div className="font-bold text-black border-b border-gray-200 pb-1 mb-2 text-base">
                          {feat.name}
                        </div>
                        <div
                          className="text-gray-700 feature-desc break-words"
                          dangerouslySetInnerHTML={{ __html: feat.description }}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            const rollFormula =
                              target.getAttribute("data-roll") ||
                              target
                                .closest("[data-roll]")
                                ?.getAttribute("data-roll");
                            if (rollFormula)
                              handleRoll(
                                `${feat.name} Roll`,
                                rollFormula,
                                true,
                              );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-1 right-2 opacity-30 text-[10px] font-bold uppercase print:text-black hidden lg:block">
        Foundry VTT Exporter v1.1
      </div>

      <AnimatePresence>
        {lastRoll && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 left-4 z-[60] bg-[#23242a] border-l-4 border-red-800 rounded shadow-2xl p-3 flex flex-col pointer-events-none lg:hidden"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs uppercase font-bold text-gray-400">
                {lastRoll.source}
              </span>
            </div>
            <div className="flex items-end gap-3 border-t border-gray-700 pt-1">
              <div className="text-3xl font-serif font-bold text-red-500 leading-none">
                {lastRoll.result}
              </div>
              <div className="text-[10px] text-gray-500 font-mono mb-1">
                {lastRoll.formula}
              </div>
            </div>
          </motion.div>
        )}

        {selectedSpell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:hidden backdrop-blur-sm"
            onClick={() => setSelectedSpell(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white text-black w-full max-w-2xl max-h-[85vh] rounded shadow-2xl flex flex-col border border-gray-400 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#1b1c22] border-b-2 border-red-800 p-4 flex justify-between items-start text-white">
                <div>
                  <h2 className="text-2xl font-serif font-bold tracking-wide">
                    {selectedSpell.name}
                  </h2>
                  <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">
                    {selectedSpell.level === 0
                      ? "Cantrip"
                      : `Level ${selectedSpell.level}`}{" "}
                    • {selectedSpell.school}
                    {selectedSpell.prepared && (
                      <span className="ml-2 text-emerald-400">• Prepared</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 mt-2 bg-black/30 p-2 rounded tracking-wide leading-none">
                    {selectedSpell.action ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">CAST:</span>{" "}
                        {selectedSpell.action}
                      </div>
                    ) : null}
                    {selectedSpell.range ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">RNG:</span>{" "}
                        {selectedSpell.range}
                      </div>
                    ) : null}
                    {selectedSpell.targets ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">TGT:</span>{" "}
                        {selectedSpell.targets}
                      </div>
                    ) : null}
                    {selectedSpell.duration ? (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">DUR:</span>{" "}
                        {selectedSpell.duration}{" "}
                        {selectedSpell.concentration && (
                          <span className="text-yellow-500 ml-1 font-bold">
                            (C)
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {selectedSpell.materials && (
                    <div className="text-[10px] font-bold text-gray-400 mt-2 bg-black/30 p-2 rounded tracking-wide">
                      <span className="text-gray-500 pr-1">MAT:</span>{" "}
                      {selectedSpell.materials}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedSpell(null)}
                  className="text-gray-400 hover:text-white transition-colors bg-black/20 p-2 rounded-full hover:bg-black/50 ml-4"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-800 leading-relaxed font-serif feature-desc">
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      selectedSpell.description || "No description provided.",
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const rollFormula =
                      target.getAttribute("data-roll") ||
                      target.closest("[data-roll]")?.getAttribute("data-roll");
                    if (rollFormula)
                      handleRoll(
                        `${selectedSpell.name} Roll`,
                        rollFormula,
                        true,
                      );
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:hidden backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white text-black w-full max-w-md max-h-[85vh] rounded shadow-2xl flex flex-col border border-gray-400 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#23242a] border-b-2 border-gray-600 p-4 flex justify-between items-center text-white">
                <div>
                  <h2 className="text-xl font-serif font-bold tracking-wide flex items-center gap-2">
                    {selectedItem.name}
                    {selectedItem.equipped && (
                      <Shield className="w-4 h-4 text-emerald-500" />
                    )}
                  </h2>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-1 space-x-2">
                    <span>Weight: {selectedItem.weight} lb</span>
                    <span>Quantity: {selectedItem.quantity}</span>
                    {selectedItem.price ? (
                      <span>
                        Price: {selectedItem.price.value}{" "}
                        {selectedItem.price.denomination}
                      </span>
                    ) : null}
                  </div>
                  {selectedItem.armorValue !== undefined &&
                    selectedItem.armorValue > 0 && (
                      <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider mt-2 bg-black/30 p-2 rounded w-fit text-gray-300">
                        <span>AC: {selectedItem.armorValue}</span>
                        {!selectedItem.isShield &&
                          selectedItem.armorDexCap !== undefined && (
                            <span>
                              • Max Dex:{" "}
                              {selectedItem.armorDexCap === null
                                ? "None"
                                : selectedItem.armorDexCap}
                            </span>
                          )}
                      </div>
                    )}
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-white transition-colors bg-black/20 p-2 rounded-full hover:bg-black/50"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-800 leading-relaxed font-serif feature-desc">
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      selectedItem.description || "No description provided.",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showRollLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 print:hidden backdrop-blur-sm"
            onClick={() => setShowRollLog(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm h-full bg-[#1b1c22] border-l-2 border-red-800 shadow-2xl flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#23242a]">
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase">
                  <Dice5 className="text-red-500" />
                  Roll Log
                </div>
                <button
                  onClick={() => setShowRollLog(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {rollLog.length === 0 ? (
                  <div className="text-center text-gray-600 text-sm mt-10 uppercase tracking-widest font-bold">
                    No rolls yet
                  </div>
                ) : (
                  rollLog.map((roll) => (
                    <div
                      key={roll.id}
                      className="bg-[#23242a] border border-gray-700 rounded p-3 text-white shadow-xl flex flex-col"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs uppercase font-bold text-gray-400">
                          {roll.source}
                        </span>
                        <span className="text-[9px] text-gray-600">
                          {roll.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-end gap-3 border-t border-gray-700 pt-2">
                        <div className="text-4xl font-serif font-bold text-red-500 leading-none">
                          {roll.result}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mb-1">
                          {roll.formula}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
