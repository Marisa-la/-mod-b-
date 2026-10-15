// Custom gameplay from Marisa-la's v0.2.4 replacement package. Official operator
// bodies, skills, talents and potential are built by build-data, never copied.
import { readFileSync } from 'node:fs';
export const MOD_CONTENT = JSON.parse(readFileSync(new URL('../mods/marisa/content.json', import.meta.url), 'utf8'));

export function installModTables(ctx, patchChars) {
  Object.assign(ctx.charTable, patchChars);
  const act = ctx.act;
  let identifier = Math.max(...Object.values(act.charChessDataDict).map((c) => c.identifier)) + 1;
  for (const o of MOD_CONTENT.operators) {
    if (!ctx.charTable[o.charId]) throw new Error(`MOD operator missing from official tables: ${o.charId}`);
    if (o.charId === 'char_1015_aglna2') {
      // Her S3 marker must also be materialised when S2 is the default skill.
      ctx.charTable[o.charId].displayTokenDict = { ...ctx.charTable[o.charId].displayTokenDict, token_10071_aglna2_agairp: 1 };
    }
    act.charShopChessDatas[o.chessId] = {
      chessId: o.chessId, goldenChessId: o.goldenId, chessLevel: o.tier,
      shopLevelSortId: o.shopSortId, chessType: 'PRESET', charId: o.charId,
      tmplId: null, defaultSkillIndex: o.skillIndex, defaultUniEquipId: null,
      backupCharId: o.charId, backupTmplId: null, backupCharSkillIndex: o.skillIndex,
      backupCharUniEquipId: null, backupCharPotRank: 0, isHidden: false,
    };
    for (const [id, st, golden] of [[o.chessId, o.normalStatus, false], [o.goldenId, o.eliteStatus, true]]) {
      act.charChessDataDict[id] = {
        chessId: id, identifier: identifier++, isGolden: golden,
        status: { evolvePhase: `PHASE_${st.phase}`, charLevel: st.level, skillLevel: st.skillLevel, favorPoint: 0, equipLevel: st.equipLevel },
        upgradeChessId: golden ? null : o.goldenId, upgradeNum: golden ? 0 : 3,
        bondIds: o.bonds, garrisonIds: o.garrisonIds,
      };
      act.chessNormalIdLookupDict[id] = o.chessId;
    }
  }
  for (const [id, bonds] of Object.entries(MOD_CONTENT.additionalBonds)) {
    const row = act.charChessDataDict[id];
    if (!row) throw new Error(`MOD bond target missing: ${id}`);
    row.bondIds = [...new Set([...row.bondIds, ...bonds])];
  }
}

export function applyModRecords(files) {
  for (const [name, records] of Object.entries(MOD_CONTENT.records)) Object.assign(files[name], structuredClone(records));
  for (const o of MOD_CONTENT.operators) {
    for (const id of [o.chessId, o.goldenId]) {
      const c = files.chess[id];
      c.price = o.price; c.sellPrice = o.sellPrice;
      // [ASSUMED] Retain the old mod's deliberate availability of Kal'tsit S3.
      if (o.charId === 'char_1052_kalts2') for (const s of c.skills) delete s.unreleased;
    }
  }
  for (const b of Object.values(files.bonds)) {
    b.members = Object.values(files.chess).filter((c) => !c.isGolden && c.bonds.includes(b.bondId)).map((c) => c.chessId);
    b.visibleMembers = b.members.filter((id) => files.chess[id].visible && !files.chess[id].isGolden);
  }
  for (const [id, extra] of Object.entries(MOD_CONTENT.diyBonds)) {
    const c = files.backups.diy.operators[id];
    if (!c) throw new Error(`MOD DIY bond target missing: ${id}`);
    c.bonds = [...new Set([...c.bonds, ...extra])];
  }
  files.skins = structuredClone(MOD_CONTENT.skins);
}

export function addDisplayTokens(files) {
  Object.assign(files.tokens, structuredClone(MOD_CONTENT.displayTokens));
  for (const [id, token] of Object.entries(MOD_CONTENT.displayTokens)) {
    for (const owner of Object.keys(token.variants)) {
      const c = files.chess[owner];
      if (c && !c.tokens.includes(id)) c.tokens.push(id);
    }
  }
}
