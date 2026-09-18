/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { FileUploader } from "./components/FileUploader";
import { CharacterSheet } from "./components/CharacterSheet";
import { parseFoundryJSON, ParsedCharacter } from "./lib/foundryParser";
import { Printer, AlertTriangle, Users } from "lucide-react";
import { characters } from "virtual:characters";

const characterCache: Record<string, ParsedCharacter> = {};

interface CharacterMeta {
  id: string;
  name?: string;
  folder: string;
  updatedAt: string;
}

interface CharacterGroup {
  folder: string;
  items: CharacterMeta[];
}

const RU_MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

function groupCharacters(list: CharacterMeta[]): CharacterGroup[] {
  const groups = new Map<string, CharacterMeta[]>();
  for (const c of list) {
    const arr = groups.get(c.folder);
    if (arr) arr.push(c);
    else groups.set(c.folder, [c]);
  }

  const grouped = Array.from(groups.entries()).map(([folder, items]) => ({
    folder,
    items,
  }));

  grouped.sort((a, b) => {
    if (a.folder === "Misc" && b.folder !== "Misc") return 1;
    if (b.folder === "Misc" && a.folder !== "Misc") return -1;
    return a.folder.localeCompare(b.folder, "en");
  });

  return grouped;
}

function preloadCharacter(id: string) {
  if (characterCache[id]) return;
  fetch(`${import.meta.env.BASE_URL}characters/${id}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not find character: ${id}`);
      return res.json();
    })
    .then((json) => {
      characterCache[id] = parseFoundryJSON(json);
    })
    .catch((err) => console.error("Failed to preload:", err));
}

function MainUI() {
  const [character, setCharacter] = useState<ParsedCharacter | null>(null);
  const [appMode, setAppMode] = useState<"local" | "remote">("local");
  const [remoteName, setRemoteName] = useState<string | undefined>();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Preload characters in background
    characters.forEach((c) => preloadCharacter(c.id));
  }, []);

  const loadCharacterById = (id: string) => {
    setCurrentId(id);
    setAppMode("remote");
    setError(null);

    if (characterCache[id]) {
      setCharacter(characterCache[id]);
      setRemoteName(characterCache[id].name);
      return;
    }

    // Fetch the JSON from the public/characters folder
    fetch(`${import.meta.env.BASE_URL}characters/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not find character: ${id}`);
        return res.json();
      })
      .then((json) => {
        const parsed = parseFoundryJSON(json);
        characterCache[id] = parsed;
        setCharacter(parsed);
        setRemoteName(parsed.name);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setCharacter(null);
      });
  };

  const handleFileUpload = (json: any) => {
    const parsed = parseFoundryJSON(json);
    setCharacter(parsed);
    setAppMode("local");
    setCurrentId(null);
    setError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setCharacter(null);
    setCurrentId(null);
    setAppMode("local");
    setError(null);
  };

  const handleSelectCharacter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    e.target.value = "";
    if (val === "upload") {
      handleReset();
    } else if (val) {
      loadCharacterById(val);
    }
  };

  return (
    <div className="min-h-screen bg-[#1b1c22] lg:bg-[#d1d1d1]">
      {/* Top Banner (hidden during print) */}
      <header className="bg-dnd-ink text-dnd-parchment p-4 shadow-md no-print sticky top-0 z-[100]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={handleReset}
          >
            <div className="w-10 h-10 rounded bg-dnd-red flex items-center justify-center font-serif font-bold text-xl">
              📖
            </div>
            <h1 className="text-xl font-serif font-bold tracking-wider uppercase text-white/90 hidden sm:block">
              Tome of Souls
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {(character || error) && (
              <button
                onClick={handlePrint}
                className="hidden lg:flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer size={16} />{" "}
                <span className="hidden w-0 lg:w-auto lg:inline">Print / Save PDF</span>
              </button>
            )}

            {(character || error) && (
              <select
                onChange={handleSelectCharacter}
                className="bg-[#2a2c35] hover:bg-[#343642] border border-gray-600 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-dnd-red pr-8 max-w-[50vw] md:max-w-[300px] text-ellipsis"
                defaultValue=""
              >
                <option value="" disabled className="text-gray-400 bg-gray-900">
                  Switch Character...
                </option>
                {groupCharacters(
                  characters.filter((c) => c.id !== currentId),
                ).map((group) => (
                  <optgroup
                    key={group.folder}
                    label={group.folder}
                    className="bg-gray-900 text-gray-200"
                  >
                    {group.items.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="text-gray-200 bg-gray-900"
                      >
                        {c.name || c.id}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="upload" className="text-gray-200 bg-gray-900">
                  Upload Local JSON...
                </option>
              </select>
            )}
          </div>
        </div>
      </header>

      <main className="pb-0 lg:pb-12 print:pb-0 min-h-screen lg:min-h-0 bg-[#1b1c22] lg:bg-transparent">
        {!character && !error ? (
          <div className="pt-8 px-4 max-w-5xl mx-auto">
            {characters.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold mb-6 text-center text-dnd-darkred flex items-center justify-center gap-2">
                  <Users className="w-6 h-6" /> Available Characters
                </h2>
                <div className="flex flex-col gap-8">
                  {groupCharacters(characters).map((group) => (
                    <div key={group.folder}>
                      <h3 className="text-sm font-serif font-bold uppercase tracking-widest text-dnd-darkred/80 mb-4 flex items-center justify-center gap-2">
                        <span className="border-t border-gray-400/60 flex-1 max-w-[120px]"></span>
                        <span>{group.folder}</span>
                        <span className="border-t border-gray-400/60 flex-1 max-w-[120px]"></span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {group.items.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => loadCharacterById(c.id)}
                            className="flex flex-col items-center justify-center p-8 bg-white border-2 border-transparent hover:border-dnd-red rounded-xl shadow-md hover:shadow-xl transition-all group cursor-pointer"
                          >
                            <span className="text-2xl font-serif font-bold text-dnd-ink group-hover:text-dnd-darkred mb-2 text-center h-16 flex items-center">
                              {c.name || c.id}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatUpdatedAt(c.updatedAt)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div className="w-full border-t border-gray-400/50"></div>
              </div>
              <div className="relative flex justify-center mb-8">
                <span className="px-4 bg-[#d1d1d1] text-sm font-serif font-bold text-gray-500 uppercase tracking-widest">
                  Or Upload Local
                </span>
              </div>
            </div>

            <FileUploader onFileUpload={handleFileUpload} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 flex flex-col items-center justify-center gap-4 h-64">
            <AlertTriangle className="w-12 h-12" />
            {error}
          </div>
        ) : (
          <CharacterSheet char={character!} />
        )}
      </main>

      <footer className="hidden lg:block text-center pb-8 pt-12 text-gray-600 text-sm no-print">
        <p>
          This tool is not affiliated with, endorsed, sponsored, or specifically
          approved by Wizards of the Coast LLC.
        </p>
        <p>Built for Foundry VTT dnd5e system exported JSON data.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return <MainUI />;
}
