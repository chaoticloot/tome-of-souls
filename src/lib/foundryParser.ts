// Types and parser for Foundry VTT 5e Actor JSON

export interface ParsedCharacter {
  name: string;
  classes: string;
  level: number;
  background: string;
  race: string;
  alignment: string;
  player: string;
  xp: number;
  
  abilities: Record<string, { value: number; mod: number; saveProf: boolean }>;
  skills: Record<string, { mod: number; prof: number }>;
  
  hp: { value: number; max: number; temp: number };
  ac: number;
  speed: number;
  initiative: number;
  proficiencyBonus: number;
  
  traits: {
    languages: string;
    senses: string;
    resistances: string;
    immunities: string;
  };

  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  hitDice: string;
  deathSaves: { successes: number; failures: number };

  weapons: Array<{ name: string; attackBonus: string; damage: string; type: string }>;
  features: Array<{ name: string; description: string; type: string }>;
  spells: Array<{ 
    name: string; 
    level: number; 
    school: string; 
    description: string; 
    prepared?: boolean;
    preparationMode?: string;
    action?: string;
    duration?: string;
    concentration?: boolean;
    materials?: string;
    targets?: string;
    range?: string;
  }>;
  resources: Array<{ name: string; max: number; value: number }>;
  inventory: Array<{ name: string; quantity: number; weight: number; equipped?: boolean; description?: string; armorValue?: number; armorDexCap?: number; isShield?: boolean; price?: { value: number; denomination: string } }>;
  spellcasting?: {
    ability: string;
    dc: number;
    attackBonus: number;
    slots: Record<string, { value: number; max: number; level?: number }>;
  };
  currency: {
    pp: number;
    gp: number;
    ep: number;
    sp: number;
    cp: number;
  };
  proficiencies: {
    armor: string;
    weapons: string;
    tools: string;
  };
}

const ABILITY_MAP: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
};

const SPELL_SLOTS_TABLE = [
  [], // 0
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // 20
];

const SKILL_MAP: Record<string, string> = {
  acr: 'Acrobatics', ani: 'Animal Handling', arc: 'Arcana', ath: 'Athletics',
  dec: 'Deception', his: 'History', ins: 'Insight', itm: 'Intimidation',
  inv: 'Investigation', med: 'Medicine', nat: 'Nature', prc: 'Perception',
  prf: 'Performance', per: 'Persuasion', rel: 'Religion', slt: 'Sleight of Hand',
  ste: 'Stealth', sur: 'Survival'
};

function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function parseEnrichers(text: string): string {
  if (!text) return '';
  let parsed = text.replace(/\[\[\/(.*?)\]\]/g, (match, p1) => {
    let cleaned = p1.trim();
    cleaned = cleaned.replace(/^(damage|heal|attack|check|save|skill|r)\s+/i, '');
    cleaned = cleaned.replace(/formula="?([^"]*)"?/g, '$1');
    cleaned = cleaned.replace(/type="?([^"]*)"?/g, '$1');
    cleaned = cleaned.replace(/ability="?([^"]*)"?/g, '$1');
    cleaned = cleaned.replace(/skill="?([^"]*)"?/g, '$1');
    cleaned = cleaned.replace(/dc="?([^"]*)"?/ig, 'DC $1');
    cleaned = cleaned.replace(/average=true|average/gi, '');
    cleaned = cleaned.replace(/format=long/gi, '');
    cleaned = cleaned.replace(/activity=[\w]+/g, '');
    cleaned = cleaned.replace(/extended/gi, '');
    cleaned = cleaned.trim();
    return `<strong class="text-dnd-red border border-dnd-red/30 bg-red-900/10 rounded px-1 cursor-pointer font-sans hover:bg-red-900/20 transition-colors" data-roll="${cleaned}" title="Roll ${cleaned}">🎲 ${cleaned}</strong>`;
  });
  
  parsed = parsed.replace(/\[\[lookup (.*?)\]\](\{.*?\})?/g, (match, path, fallback) => {
     let f = fallback ? fallback.replace(/[{}]/g, '') : path.split('.').pop();
     return `<strong>${f}</strong>`;
  });
  
  parsed = parsed.replace(/&Reference\[(.*?)\]/gi, (match, p1) => {
     let c = p1.split('=').pop();
     if(c) c = c.replace(/]/g, '');
     return `<strong class="text-emerald-700 capitalize font-sans">[${c}]</strong>`;
  });
  
  parsed = parsed.replace(/&amp;Reference\[(.*?)\]/gi, (match, p1) => {
     let c = p1.split('=').pop();
     if(c) c = c.replace(/]/g, '');
     return `<strong class="text-emerald-700 capitalize font-sans">[${c}]</strong>`;
  });
  
  return parsed;
}

export function stripHtml(html: string) {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

export function parseFoundryJSON(json: any): ParsedCharacter {
  const sys = json.system || {};
  let classesArray: string[] = [];
  let totalLevel = 0;
  const hitDiceMap: Record<string, {count: number, denom: string}> = {};
  let baseHpFromAdvancement = 0;
  const classLevels: Record<string, number> = {};
  let fullCasterLevel = 0;
  let halfCasterLevel = 0;
  let thirdCasterLevel = 0;
  let artificerLevel = 0;
  let pactLevel = 0;

  // 1. First pass to calculate level and HP from advancement
  if (Array.isArray(json.items)) {
    json.items.forEach((item: any) => {
      if (item.type === 'class') {
        const level = item.system?.levels || 1;
        classesArray.push(`${item.name} ${level}`);
        classLevels[item.name.toLowerCase()] = level;
        totalLevel += level;
        
        const prog = item.system?.spellcasting?.progression;
        if (prog === 'full') fullCasterLevel += level;
        else if (prog === 'half') halfCasterLevel += level;
        else if (prog === 'third') thirdCasterLevel += level;
        else if (prog === 'artificer') artificerLevel += level;
        else if (prog === 'pact') pactLevel += level;

        let hdDenom = item.system?.hd?.denomination || item.system?.hitDice || 'd8';
        if (hdDenom.startsWith('d')) hdDenom = hdDenom.substring(1);
        
        if (!hitDiceMap[hdDenom]) {
           hitDiceMap[hdDenom] = { count: 0, denom: `d${hdDenom}`};
        }
        hitDiceMap[hdDenom].count += level;

        const advancements = Array.isArray(item.system?.advancement) ? item.system.advancement : Object.values(item.system?.advancement || {});
        const hpAdv = advancements.find((a: any) => a.type === 'HitPoints');
        if (hpAdv?.value) {
            Object.keys(hpAdv.value).forEach((lvlStr) => {
               const val = hpAdv.value[lvlStr];
               if (val === 'max') {
                  baseHpFromAdvancement += parseInt(hdDenom, 10);
               } else {
                  baseHpFromAdvancement += parseInt(val || 0, 10);
               }
            });
        }
      }
    });
  }

  const profBonus = sys.attributes?.prof || Math.ceil(1 + (totalLevel / 4));

  // 2. Gather Abilities
  const abilities: Record<string, any> = {};
  Object.keys(ABILITY_MAP).forEach(key => {
    const rawVal = sys.abilities?.[key]?.value || 10;
    const mod = sys.abilities?.[key]?.mod !== undefined ? sys.abilities[key].mod : calculateModifier(rawVal);
    const saveProf = sys.abilities?.[key]?.proficient ? true : false;
    abilities[key] = { value: rawVal, mod, saveProf };
  });

  const conMod = abilities['con']?.mod || 0;

  // 3. Compute Max HP
  let hpBonusOverallNum = parseInt(sys.attributes?.hp?.bonuses?.overall as string, 10);
  if (isNaN(hpBonusOverallNum)) hpBonusOverallNum = 0;
  
  let hpBonusLevelNum = parseInt(sys.attributes?.hp?.bonuses?.level as string, 10);
  if (isNaN(hpBonusLevelNum)) hpBonusLevelNum = 0;

  let hasDwarvenToughness = false;
  let hasDefenseStyle = false;
  let initialAC = 10 + (abilities['dex']?.mod || 0); // Unarmored base
  let hasArmor = false;
  let armorBonus = 0;
  let shieldBonus = 0;

  if (Array.isArray(json.items)) {
    json.items.forEach((item: any) => {
      if ((item.type === 'feat' || item.type === 'feature')) {
         if (item.name.toLowerCase() === 'dwarven toughness') hasDwarvenToughness = true;
         if (item.name.toLowerCase() === 'fighting style: defense') hasDefenseStyle = true;
      }
      if (item.type === 'equipment' && item.system?.equipped) {
        const typeStr = (item.system?.type?.value || '').toLowerCase();
        const aVal = item.system.armor?.value || 0;
        const magBonus = item.system.armor?.magicalBonus || 0;
        
        if (typeStr === 'shield' || (item.name.toLowerCase() === 'shield' && !typeStr)) {
          shieldBonus += (aVal || 2) + magBonus;
        } else if (aVal > 0 && (typeStr === 'light' || typeStr === 'medium' || typeStr === 'heavy')) {
          hasArmor = true;
          const baseArmorAc = aVal + magBonus;
          if (typeStr === 'heavy') {
            armorBonus = baseArmorAc;
          } else if (typeStr === 'medium') {
            armorBonus = baseArmorAc + Math.min(2, abilities['dex']?.mod || 0);
          } else {
            armorBonus = baseArmorAc + (abilities['dex']?.mod || 0);
          }
        }
      }
    });
  }

  if (hasDwarvenToughness) {
    hpBonusLevelNum += 1;
  }

  const totalHpBonus = hpBonusOverallNum + (hpBonusLevelNum * totalLevel);

  let computedHpMax = sys.attributes?.hp?.max || 0;
  if (!computedHpMax || (baseHpFromAdvancement > 0 && computedHpMax < baseHpFromAdvancement)) {
      computedHpMax = baseHpFromAdvancement + (totalLevel * conMod) + totalHpBonus;
  } else {
      computedHpMax += totalHpBonus;
  }
  if (computedHpMax === 0) computedHpMax = sys.attributes?.hp?.value || 10;

  let calculatedAC = hasArmor ? armorBonus + shieldBonus : initialAC + shieldBonus;
  if (hasDefenseStyle && hasArmor) calculatedAC += 1;
  else if (hasDefenseStyle) calculatedAC += 1; // Sometimes it's best to apply it unconditionally if the app isn't perfectly parsing armor status
  
  let finalAC = sys.attributes?.ac?.value || 10;
  if (finalAC === 10 && calculatedAC > 10) {
      finalAC = calculatedAC;
  } else if (!sys.attributes?.ac?.value || finalAC < calculatedAC) {
      finalAC = calculatedAC;
  }

  // 4. Second pass to parse items
  let raceFallback = '';
  let bgFallback = '';
  const weapons: any[] = [];
  const features: any[] = [];
  const spells: any[] = [];
  const inventory: any[] = [];
  const resources: any[] = [];

  // Helper to evaluate max expressions like "@classes.paladin.levels * 5"
  const evaluateMax = (maxExpr: string | number): number => {
    if (typeof maxExpr === 'number') return maxExpr;
    if (!maxExpr) return 0;
    
    let expr = String(maxExpr);
    // replace ability mods
    expr = expr.replace(/@abilities\.([a-zA-Z]+)\.mod/g, (_, ab) => {
      return String(abilities[ab]?.mod || 0);
    });
    // replace class levels
    expr = expr.replace(/@classes\.([a-zA-Z0-9_\-]+)\.levels/g, (_, cls) => {
      return String(classLevels[cls.toLowerCase()] || 0);
    });
    
    expr = expr.replace(/[^0-9+\-*/().]/g, '');
    try {
      return Math.floor(new Function('return ' + expr)());
    } catch {
      return parseInt(expr) || 0;
    }
  };

  if (Array.isArray(json.items)) {
    json.items.forEach((item: any) => {
      const isConsumable = item.type === 'consumable' || item.type === 'loot';
      
      // Parse Uses for resources (non-consumable items that have recovery)
      if (!isConsumable && item.system?.uses && item.system.uses.max && item.system.uses.recovery?.length > 0) {
        const max = evaluateMax(item.system.uses.max);
        if (max > 0) {
           const spent = item.system.uses.spent || 0;
           resources.push({
              name: item.name,
              max: max,
              value: Math.max(0, max - spent)
           });
        }
      }

      // Inventory
      if (['equipment', 'consumable', 'loot', 'tool', 'backpack'].includes(item.type)) {
        const parsedWeight = typeof item.system?.weight === 'object' ? item.system?.weight?.value : item.system?.weight;
        const typeStr = (item.system?.type?.value || '').toLowerCase();
        
        let priceData;
        if (item.system?.price?.value !== undefined && item.system?.price?.denomination) {
            priceData = { value: item.system.price.value, denomination: item.system.price.denomination };
        }

        inventory.push({
          name: item.name,
          quantity: item.system?.quantity || 1,
          weight: parsedWeight || 0,
          equipped: item.system?.equipped || false,
          description: item.system?.description?.value || '',
          armorValue: item.system?.armor?.value,
          armorDexCap: item.system?.armor?.dex,
          isShield: typeStr === 'shield' || (item.name.toLowerCase() === 'shield' && !typeStr),
          price: priceData
        });
      }

      // Race & Background
      if (item.type === 'race') raceFallback = item.name;
      if (item.type === 'background') bgFallback = item.name;

      if (item.type === 'feat' || item.type === 'feature') {
        const featType = item.system?.type?.value;
        if (featType === 'race' && item.system?.requirements) {
           raceFallback = item.system.requirements;
        }
        if (featType === 'background' && item.system?.requirements) {
           bgFallback = item.system.requirements;
        }
        if (item.name.toLowerCase() === 'age' && item.system?.requirements && !raceFallback) {
           raceFallback = item.system.requirements;
        }

        features.push({
          name: item.name,
          description: '<p>' + stripHtml(parseEnrichers(item.system?.description?.value || '')).substring(0, 500) + '...</p>',
          type: featType || 'Feature'
        });
      } 
      
      // Spells
      else if (item.type === 'spell') {
        let action = '';
        if (item.system?.activation?.type) {
           action = `${item.system.activation.cost || ''} ${item.system.activation.type}`.trim();
        }
        
        let duration = '';
        if (item.system?.duration?.units) {
           duration = item.system.duration.units === 'inst' ? 'Instantaneous' : `${item.system.duration.value || ''} ${item.system.duration.units}`.trim();
        }
        
        let targets = '';
        if (item.system?.target?.affects?.type) {
           targets = `${item.system.target.affects.count || ''} ${item.system.target.affects.type}`.trim();
        } else if (item.system?.target?.type) {
           targets = `${item.system.target.value || ''} ${item.system.target.units || ''} ${item.system.target.type}`.trim();
        }

        let range = '';
        if (item.system?.range?.units) {
           range = `${item.system.range.value || ''} ${item.system.range.units}`.trim();
        }

        const isConcProp = Array.isArray(item.system?.properties) ? item.system.properties.includes('concentration') : !!item.system?.properties?.concentration;
        const concentration = !!item.system?.components?.concentration || !!item.system?.duration?.concentration || isConcProp;
        const materials = item.system?.materials?.value || '';

        const isPrepared = !!item.system?.preparation?.prepared || !!item.system?.prepared || (typeof item.system?.prepared === 'number' && item.system.prepared > 0);
        const prepMode = item.system?.preparation?.mode || '';
        
        spells.push({
          name: item.name,
          level: item.system?.level || 0,
          school: item.system?.school || '',
          description: parseEnrichers(item.system?.description?.value || ''),
          prepared: isPrepared,
          preparationMode: prepMode,
          action,
          duration,
          targets,
          range,
          concentration,
          materials
        });
      } 
      
      // Weapons
      else if (item.type === 'weapon') {
         let atkBonusNum = 0;
         let damageFormula = '';
         
         const wpnType = item.system?.type?.value || '';
         const props = item.system?.properties || [];
         const isFinesse = Array.isArray(props) ? props.includes('fin') : props.fin;
         const isRanged = wpnType.includes('R') || (Array.isArray(props) ? props.includes('ran') : props.amm);
         
         // Assuming proficiency for weapons inside the sheet as standard
         const isProf = item.system?.proficient === false ? false : true;
         const profAtk = isProf ? profBonus : 0;
         const magBonus = parseInt(item.system?.magicalBonus || 0, 10) || 0;

         let usedAbility = isFinesse ? (abilities.dex.mod > abilities.str.mod ? 'dex' : 'str') : (isRanged ? 'dex' : 'str');

         // Look for v3 activities
         const actList = Object.values(item.system?.activities || {});
         const mainAct: any = actList.find((a: any) => a.type === 'attack') || actList.find((a: any) => a.type === 'damage') || actList[0];

         let overrideAbility = item.system?.ability || '';
         if (mainAct?.attack?.ability) overrideAbility = mainAct.attack.ability;
         if (overrideAbility && overrideAbility !== 'none' && abilities[overrideAbility]) {
             usedAbility = overrideAbility;
         }
         
         const statMod = abilities[usedAbility]?.mod || 0;

         if (mainAct) {
            const actAtkBonus = parseInt(mainAct.attack?.bonus || 0, 10) || 0;
            atkBonusNum = statMod + profAtk + actAtkBonus + magBonus;

            const parts = mainAct.damage?.parts || [];
            if (parts.length > 0) {
               const p = parts[0];
               if (p.number && p.denomination) {
                   const bonusStr = p.bonus || '';
                   const bonus = parseInt(bonusStr.replace('@mod', statMod.toString()) || 0, 10) || 0;
                   const totDmgBonus = Math.max(0, statMod) + magBonus + bonus;
                   const typeStr = (p.types || []).join(', ');
                   damageFormula = `${p.number}d${p.denomination}${totDmgBonus > 0 ? '+' : (totDmgBonus < 0 ? '-' : '')}${totDmgBonus !== 0 ? Math.abs(totDmgBonus) : ''} ${typeStr}`;
               }
            }
         } else {
            // v2 fallback
            const v2AtkBonus = parseInt(item.system?.attackBonus || 0, 10) || 0;
            atkBonusNum = statMod + profAtk + v2AtkBonus + magBonus;
            
            const v2parts = item.system?.damage?.parts || [];
            if (v2parts.length > 0 && Array.isArray(v2parts[0])) {
               let f = v2parts[0][0];
               if (typeof f === 'string') {
                   f = f.replace(/@mod/gi, statMod.toString());
               }
               damageFormula = `${f} ${v2parts[0][1] || ''}`;
            }
         }

         let baseDmgStr = '';
         const dmgSys = item.system?.damage || {};
         const baseDmg = dmgSys.base || {};
         const verDmg = dmgSys.versatile || {};

         let totDmgBonus = statMod + magBonus;
         
         if (baseDmg.number && baseDmg.denomination) {
             const dmgTypeStr = (baseDmg.types || []).join(', ');
             const sign = totDmgBonus > 0 ? '+' : (totDmgBonus < 0 ? '-' : '');
             const bonusFmt = totDmgBonus !== 0 ? `${sign}${Math.abs(totDmgBonus)}` : '';
             baseDmgStr = `${baseDmg.number}d${baseDmg.denomination}${bonusFmt} ${dmgTypeStr}`.trim();
             
             if (verDmg.number && verDmg.denomination) {
                 baseDmgStr += ` (Versatile: ${verDmg.number}d${verDmg.denomination}${bonusFmt})`;
             }
         }

         if (baseDmgStr) {
             damageFormula = baseDmgStr;
         }

         if (item.name.toLowerCase().includes('unarmed strike') || item.name.toLowerCase().includes('unarmed attack')) {
             const dmgVal = Math.max(0, statMod);
             damageFormula = `${dmgVal} Bludgeoning`;
         }

         weapons.push({
            name: item.name,
            attackBonus: String(atkBonusNum),
            damage: damageFormula,
            type: usedAbility === 'dex' && isRanged ? 'Ranged' : 'Melee'
         });

      }
    });
  }

  // Final parsing logic
  const isId = (str: string) => typeof str === 'string' && /^[a-zA-Z0-9]{16}$/.test(str);
  const sysRace = sys.details?.race?.name || sys.details?.race || '';
  const sysBg = sys.details?.background?.name || sys.details?.background || '';
  
  const finalRace = raceFallback || (isId(sysRace) ? '' : sysRace);
  const finalBg = bgFallback || (isId(sysBg) ? '' : sysBg);

  // Skills
  const skills: Record<string, any> = {};
  Object.keys(SKILL_MAP).forEach(key => {
    const skillData = sys.skills?.[key] || {};
    const profLevel = skillData.value || 0; // 0=none, 1=prof, 2=expertise
    const ability = skillData.ability || 'int';
    const abilityMod = abilities[ability]?.mod || 0;
    const mod = abilityMod + (profLevel * profBonus) + (skillData.bonuses?.check || 0);
    skills[key] = { mod, prof: profLevel };
  });

  const parseProfs = (profObj: any, listObj: any = {}) => {
    if (!profObj) return 'None';
    const customs = profObj.custom || '';
    const vals = (profObj.value || []).map((v: string) => listObj[v] || v).join(', ');
    return [vals, customs].filter(Boolean).join(', ') || 'None';
  };

  const hitDiceStr = Object.values(hitDiceMap).map(hd => `${hd.count}${hd.denom}`).join(' + ') || `${totalLevel}d8`;

  const spellcastingStat = sys.attributes?.spellcasting as string | undefined;
  let spellcastingObj;
  
  // Calculate slot maximums from caster levels
  const totalCasterLevel = Math.min(20, fullCasterLevel + Math.floor(halfCasterLevel / 2) + Math.floor(thirdCasterLevel / 3) + Math.ceil(artificerLevel / 2));
  const tableSlots = SPELL_SLOTS_TABLE[totalCasterLevel] || [0,0,0,0,0,0,0,0,0];
  
  let pactMax = 0;
  let pactLevelSlot = 1;
  if (pactLevel > 0) {
    if (pactLevel >= 1 && pactLevel <= 2) pactLevelSlot = 1;
    else if (pactLevel >= 3 && pactLevel <= 4) pactLevelSlot = 2;
    else if (pactLevel >= 5 && pactLevel <= 6) pactLevelSlot = 3;
    else if (pactLevel >= 7 && pactLevel <= 8) pactLevelSlot = 4;
    else if (pactLevel >= 9) pactLevelSlot = 5;
    
    if (pactLevel == 1) pactMax = 1;
    else if (pactLevel >= 2 && pactLevel <= 10) pactMax = 2;
    else if (pactLevel >= 11 && pactLevel <= 16) pactMax = 3;
    else if (pactLevel >= 17) pactMax = 4;
  }

  if (spellcastingStat && abilities[spellcastingStat] || totalCasterLevel > 0 || pactLevel > 0) {
      const stat = spellcastingStat || 'int';
      const scMod = abilities[stat]?.mod || 0;
      
      const slots: Record<string, {value: number, max: number, level?: number}> = {};
      if (sys.spells) {
         for (let i = 1; i <= 9; i++) {
             const pd = sys.spells[`spell${i}`];
             const calcMax = tableSlots[i-1] || 0;
             const finalMax = (pd && pd.max !== undefined && pd.max !== null) ? Math.max(pd.max, calcMax) : calcMax;
             if (finalMax > 0 || (pd && pd.value > 0)) {
                 slots[i] = { value: pd?.value || 0, max: finalMax };
             }
         }
         const pactData = sys.spells['pact'];
         const finalPactMax = (pactData && pactData.max !== undefined && pactData.max !== null) ? Math.max(pactData.max, pactMax) : pactMax;
         if (finalPactMax > 0 || (pactData && pactData.value > 0)) {
             slots['pact'] = { value: pactData?.value || 0, max: finalPactMax, level: pactData?.level || pactLevelSlot };
         }
      }

      spellcastingObj = {
          ability: stat,
          dc: 8 + scMod + profBonus,
          attackBonus: scMod + profBonus,
          slots
      };
  }

  return {
    name: json.name || json.prototypeToken?.name || 'Unknown Adventurer',
    classes: classesArray.join(' / ') || 'Unknown Class',
    level: totalLevel || 1,
    background: finalBg || 'Unknown',
    race: finalRace || 'Unknown',
    alignment: sys.details?.alignment || 'Unaligned',
    player: '',
    xp: sys.details?.xp?.value || 0,
    
    abilities,
    skills,
    spellcasting: spellcastingObj,
    resources,
    
    hp: {
      value: sys.attributes?.hp?.value || 0,
      max: computedHpMax,
      temp: sys.attributes?.hp?.temp || 0,
    },
    ac: finalAC,
    speed: typeof sys.attributes?.movement?.walk === 'object' ? sys.attributes?.movement?.walk?.value || 30 : sys.attributes?.movement?.walk || 30,
    initiative: sys.attributes?.init?.total || abilities['dex']?.mod || 0,
    proficiencyBonus: profBonus,
    
    currency: {
      pp: sys.currency?.pp || 0,
      gp: sys.currency?.gp || 0,
      ep: sys.currency?.ep || 0,
      sp: sys.currency?.sp || 0,
      cp: sys.currency?.cp || 0,
    },

    traits: {
      languages: sys.traits?.languages?.custom || sys.traits?.languages?.value?.join(', ') || 'Common',
      senses: sys.attributes?.senses?.special || '',
      resistances: sys.traits?.dr?.custom || sys.traits?.dr?.value?.join(', ') || 'None',
      immunities: sys.traits?.di?.custom || sys.traits?.di?.value?.join(', ') || 'None',
    },

    proficiencies: {
      armor: parseProfs(sys.traits?.armorProf),
      weapons: parseProfs(sys.traits?.weaponProf),
      tools: parseProfs(sys.traits?.toolProf),
    },

    passivePerception: 10 + (skills.prc?.mod || 0),
    passiveInvestigation: 10 + (skills.inv?.mod || 0),
    passiveInsight: 10 + (skills.ins?.mod || 0),

    hitDice: hitDiceStr,
    deathSaves: { 
      successes: sys.attributes?.death?.success || 0, 
      failures: sys.attributes?.death?.failure || 0 
    },

    weapons,
    features,
    spells,
    inventory,
  };
}
