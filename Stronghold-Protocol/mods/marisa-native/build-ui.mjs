import fs from 'node:fs';
import path from 'node:path';
import {legacy,game,rename} from './build-profile.mjs';
const read=p=>fs.readFileSync(path.join(legacy,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(game,p),s);
const old=read('public/js/screens/lobby.js');
const start=old.indexOf('            <details class="mod-manager__group">');
const body=old.slice(start,old.indexOf('\n            `}',start));
const names=old.slice(old.indexOf('  const diyOperators ='),old.indexOf('\n  const run =',old.indexOf('  const diyOperators =')));
write('public/js/ui/marisaSettings.js',rename(`import {useEffect,useState} from '../../vendor/hooks.module.js';
import {html,Button} from './components.js';
import {data,useData} from '../data.js';
import {t} from '../../../shared/i18n.js';
import {MOD_EXISTING_OPERATOR_IDS,MOD_ADDED_OPERATORS,MOD_BOND_IDS,MOD_NEW_BOND_MEMBERS,MOD_STRATEGY_IDS,enabledModBondMembers,normalizeModOptions,optionsFromSettings,settingsFromOptions} from '../../../shared/plugins/marisaProfile.js';
const labels={char_x_marisa_makoto:'结城理',char_x_marisa_amiya3:'阿米娅（医疗）'}; // i18n-ignore: fallback game names; loaded records provide localized names.
export function MarisaSettings({values={},disabled=false,onSave}){
  useData('chess','backups','bonds');
  const initial=optionsFromSettings(values),signature=JSON.stringify(initial);
  const [modOptions,setOptions]=useState(initial),[managerSearch,setManagerSearch]=useState('');
  useEffect(()=>setOptions(initial),[signature]);
  const modEnabled=!disabled,managerDataReady=true;
  const updateModOptions=fn=>setOptions(p=>normalizeModOptions(fn(p)));
  const baseOperators=MOD_EXISTING_OPERATOR_IDS.map(charId=>({charId,name:data.get('backups')?.units?.[charId]?.name||data.list('chess').find(c=>c.charId===charId)?.name||charId}));
${names}
  return html\x60<form class="plugin-settings mod-manager" data-testid="marisa-settings" onSubmit=\x24{e=>{e.preventDefault();if(!disabled)onSave(settingsFromOptions(modOptions));}}>
  <strong>\x24{t('魔理沙 MOD 管理器')}</strong><p>\x24{t('房主应用后，加入者、观战者与重连者自动跟随房间配置。')}</p>
${body}
  \x24{!disabled?html\x60<\x24{Button} type="submit" size="sm" disabled=\x24{JSON.stringify(modOptions)===signature}>\x24{t('应用设置')}<//>\x60:null}
  </form>\x60;
}
`).replace('|| charId;', '|| labels[charId] || charId;'));
for(const p of ['public/js/render/units.js','public/js/render/textures.js','public/js/render/fx/kinds.js','public/js/render/fx/simfx.js','public/js/ui/diyModel.js','public/js/ui/skinModel.js','public/js/ui/fieldHost.js','public/js/ui/gameComponents.js','public/js/screens/loadout.js','public/js/ui/detailPanel.js','public/css/screens/loadout.css','public/css/screens/game-panels.css','server/sim/snapshot.js'])write(p,read(p));
let units=fs.readFileSync(path.join(game,'public/js/render/units.js'),'utf8');
write('public/js/render/units.js',units.replace('  char_4217_makoto: Object.freeze({','  char_x_marisa_makoto: Object.freeze({'));
const css=read('public/css/screens/lobby.css'),marker='/* Room-bound Marisa MOD options.';
const cssPath=path.join(game,'public/css/screens/lobby.css');
const current=fs.readFileSync(cssPath,'utf8').split(marker)[0];
fs.writeFileSync(cssPath,current+'\n'+css.slice(css.indexOf(marker))+'\n.mod-manager { max-width:100%; }\n');
for(const lang of ['en','ja','ko','zh-TW']){
 const p='public/i18n/'+lang+'.json';
 const target=JSON.parse(fs.readFileSync(path.join(game,p),'utf8')),source=JSON.parse(read(p));
 for(const [k,v]of Object.entries(source))if(!Object.hasOwn(target,k))target[k]=v;
 write(p,JSON.stringify(target,null,2)+'\n');
}
console.log('Native manager and presentation migrated');
const skinFile=path.join(game,'public/js/ui/skinModel.js');
let skin=fs.readFileSync(skinFile,'utf8');
skin=skin.replace("  const value = { ...m, chars };", "  if(chars.char_4217_makoto&&chars.char_x_marisa_makoto)chars.char_x_marisa_makoto=chars.char_4217_makoto;\n  const value = { ...m, chars };");
skin=skin.replace('  if (g) return g;', "  if (g) return g === 'char_x_marisa_makoto' ? 'char_4217_makoto' : g;").replace("return typeof chess?.charId === 'string' && chess.charId ? chess.charId : null;", "return chess?.charId === 'char_x_marisa_makoto' ? 'char_4217_makoto' : typeof chess?.charId === 'string' && chess.charId ? chess.charId : null;");
fs.writeFileSync(skinFile,skin);
