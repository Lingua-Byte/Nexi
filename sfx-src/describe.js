"use strict";
/* ======================================================================
   Descrição → som (local, por regras) e projeto de camadas pela IA
   ====================================================================== */
const DESC_RECIPES = {
  'Trovão': () => [
    Ly('noise',{color:'marrom',stereo:0.9,modRate:6,modDepth:0.7},{name:'Estrondo',env:env(0.04,3.5,0,4,0.5,0.3),filter:{type:'lp',freq:350,env:2,envTime:0.6}}),
    Ly('noise',{color:'rosa',stereo:1},{name:'Estalo',vol:-6,env:ONE(0.35,0.6),filter:{type:'hp',freq:1500}}),
    Ly('analog',{wave:'sine',freq:40,drift:0},{name:'Sub',vol:-4,env:ONE(3,3.5),pitchEnv:{amt:8,time:0.3}})],
  'Sirene': () => [Ly('analog',{wave:'saw',freq:700,voices:2,detune:8},{name:'Sirene',env:HOLD(0.05,3,0.3),filter:{type:'lp',freq:2500},mod:{vibDepth:5,vibRate:0.5}})],
  'Alarme': () => [Ly('fm',{freq:1400,r2:1,i2:1.2,idxSus:1},{name:'Alarme',env:HOLD(0.01,2,0.05,0),mod:{tremDepth:1,tremRate:6}})],
  'Motor': () => [Ly('analog',{wave:'saw',freq:45,voices:3,detune:20},{name:'Motor',env:HOLD(0.4,4,0.6),filter:{type:'lp',freq:500,q:2},mod:{tremDepth:0.5,tremRate:28},drive:0.4}),
    Ly('noise',{color:'marrom',modRate:20,modDepth:0.4},{name:'Ronco',vol:-8,env:HOLD(0.4,4,0.6),filter:{type:'lp',freq:900}})],
  'Coração': () => [0, 0.22, 0.85, 1.07, 1.7, 1.92].map((s, i) => Ly('analog',{wave:'sine',freq:52,drift:0},{name:'Batida',start:s,vol:i % 2 ? -4 : 0,env:ONE(0.22,0.3),pitchEnv:{amt:8,time:0.04},filter:{type:'lp',freq:250}})),
  'Relógio': () => [Ly('particles',{density:2,fmin:2600,fmax:2700,pdecay:0.012,tone:0.8,ampVar:0,stereo:0},{name:'Tique',env:HOLD(0.001,4,0.05,0)}),
    Ly('modal',{material:'madeira',freq:900,decay:0.3,hardness:0.9},{name:'Taque',start:0.5,vol:-4,env:PHY(0.15)})],
  'Telefone tocando': () => [0, 0.4, 2, 2.4].map(s => Ly('fm',{freq:950,r2:1.5,i2:1.2,idxSus:1},{name:'Toque',start:s,env:env(0.005,1,1,0.35,0.03),mod:{tremDepth:0.6,tremRate:20}})),
  'Cachorro latindo': () => [0, 0.35].map(s => Ly('formant',{freq:330,vowelA:0,vowelB:3,morph:0.08,size:0.9,growl:0.5,jitter:0.6,breath:0.4},{name:'Au',start:s,env:ONE(0.14,0.2),pitchEnv:{amt:5,time:0.05},drive:0.3})),
  'Pássaros': () => [0, 0.3, 0.55, 1.4, 1.65].map((s, i) => Ly('analog',{wave:'sine',freq:3200 + i*250,drift:0},{name:'Piado',start:s,env:ONE(0.09,0.12),pitchEnv:{amt:i % 2 ? -7 : 6,time:0.07},mod:{vibDepth:1.5,vibRate:30}})),
};
const SOUND_LEXICON = [
  [/porta.*(rang|range|abr)|rangid|range/, 'Porta rangendo'], [/(bat\w*|toc|bate).*(porta)|porta.*(bat|bate|fech)|toc.?toc|\bporta\b/, 'Batida na porta'],
  [/vidro.*(quebr|estilha)|estilha|quebr\w* (o )?vidro/, 'Vidro quebrando'], [/vidro|taça|copo|tilint|brinde/, 'Vidro – tilintar'],
  [/trov/, 'R:Trovão'], [/explos|bomba|detona/, 'Explosão'], [/sirene|ambulância|polícia/, 'R:Sirene'], [/alarme|despertador/, 'R:Alarme'],
  [/motor|carro|moto|caminhão|veículo/, 'R:Motor'], [/coração|batiment|pulsação/, 'R:Coração'], [/relógio|tic.?tac/, 'R:Relógio'],
  [/telefone.*toc|celular.*toc|toque de telefone|campainha/, 'R:Telefone tocando'], [/cachorro|latid|cão/, 'R:Cachorro latindo'], [/pássar|passarinho|canto de ave|piar/, 'R:Pássaros'],
  [/tiro|laser|blaster|disparo/, 'Laser / blaster'],
  [/pass\w*.*(madeira|assoalho)|madeira.*pass/, 'Passo – madeira'], [/pass\w*.*(cascalho|pedra|terra|brita)/, 'Passo – cascalho'], [/pass\w*.*(grama|folha|mato)/, 'Passo – grama e folhas'], [/passo|pisad|caminhad|andando/, 'Passo – concreto'],
  [/chuva|garoa|tempestade/, 'Chuva'], [/vento|ventania|brisa/, 'Vento'], [/fogo|fogueira|lareira|chama/, 'Fogo crepitando'], [/\bmar\b|onda|praia|oceano/, 'Ondas do mar'],
  [/gota|pingo|goteira/, "Gota d'água"], [/moeda|dinheiro/, 'Moeda'], [/magia|feitiço|mágic|encant|fada/, 'Magia'], [/cura|curar|recupera/, 'Cura'],
  [/power|poder|upgrade|subir de nível/, 'Power-up'], [/soco|murro|porrada/, 'Soco'], [/espada|lâmina|faca|katana/, 'Espada – golpe'],
  [/metal|ferro|bigorna|clang|panela/, 'Metal – pancada'], [/sino|badal/, 'Sino tubular'], [/whoosh|swoosh|vulto|passag|zunid|voando/, 'Whoosh'],
  [/impacto|baque|queda|desab/, 'Impacto de trailer'], [/riser|crescente|subindo/, 'Riser de tensão'], [/drone|suspense|tensão|medo/, 'Drone de tensão'],
  [/monstro|rugid|fera|dragão|zumbi/, 'Rugido de monstro'], [/fofo|fofa|filhote|bichinho|criaturinha/, 'Criatura fofa'],
  [/clique|click|botão/, 'Clique'], [/notifica|mensagem chegando/, 'Notificação'], [/erro|negado|falha/, 'Erro'], [/sucesso|acerto|vitória|conquista/, 'Sucesso'],
  [/bolha|borbulh/, 'Bolha'], [/papel/, 'Papel amassado'], [/tecido|roupa|pano/, 'Tecido / roupa'], [/tecla|teclado|digita/, 'Tecla de digitação'],
  [/engrenagem|mecanismo|catraca/, 'Engrenagem'], [/teleport/, 'Teleporte'], [/scanner|escane/, 'Scanner'], [/nave|avião|jato|disco voador/, 'Nave passando'],
  [/sub ?drop|queda grave/, 'Sub drop'], [/pulo|pular|salto/, 'Pulo'], [/dano|machuc|ferid/, 'Dano'], [/pop|item|coletar/, 'Item / pop'],
];
const MATERIAL_WORDS = [[/metálic|metal/, 'metal'], [/madeira/, 'madeira'], [/de vidro|vítre/, 'vidro'], [/pedra|rocha/, 'pedra'], [/plástic/, 'plastico'], [/cerâmic|porcelana/, 'ceramica']];
function describeToSound(desc){
  const d = ' ' + desc.toLowerCase().normalize('NFC') + ' ', matched = [], mods = [];
  const parts = d.split(/,| e depois | depois | seguido de | e | com | enquanto /);
  const layers = [];
  parts.forEach(part => {
    for (const [re, name] of SOUND_LEXICON){
      if (!re.test(part) || matched.includes(name)) continue;
      matched.push(name);
      const ls = name.startsWith('R:') ? DESC_RECIPES[name.slice(2)]() : JSON.parse(JSON.stringify(buildPreset(presetByName(name)).layers));
      const off = /depois|seguido/.test(d) && layers.length ? Math.max(...layers.map(l => l.start + Math.min(envLength(l.env), 1.5))) : 0;
      ls.forEach(l => { l.start += off; if (matched.length > 1) l.vol -= 3; layers.push(l); });
      break;
    }
  });
  if (!layers.length) return null;
  const base = matched[0].startsWith('R:') ? null : buildPreset(presetByName(matched[0]));
  const snd = {name: desc.slice(0, 50), cat: 'Descrição', layers, master: base ? base.master : Object.assign(defaultMaster(), REV_TYPES['Sala'], {revMix: 0.12})};
  const m = snd.master, all = f => snd.layers.forEach(f), has = re => re.test(d);
  if (has(/pesad|grande|enorme|gigante|grave|profund/)){ all(l => { l.pitch -= 4; l.env.d *= 1.3; }); m.low += 3; mods.push('pesado'); }
  if (has(/leve|pequen|agud|fino|delicad/)){ all(l => { l.pitch += 4; l.env.d *= 0.75; }); mods.push('leve'); }
  if (has(/long|demorad|lent/)){ all(l => { l.env.len *= 1.6; l.env.d *= 1.6; if (l.pitchEnv.mode === 'lin') l.pitchEnv.time *= 1.6; }); mods.push('longo'); }
  if (has(/curt|rápid|seco|breve/)){ all(l => { l.env.len *= 0.6; l.env.d *= 0.6; }); m.revMix *= 0.4; mods.push('curto'); }
  if (has(/distante|longe|ao fundo/)){ Object.assign(m, REV_TYPES['Hall'], {revMix: 0.5, lp: 6000}); all(l => l.vol -= 4); mods.push('distante'); }
  if (has(/perto|próximo|íntimo/)){ m.revMix = Math.min(m.revMix, 0.05); m.low += 1; mods.push('perto'); }
  if (has(/\beco\b|ecoando/)){ Object.assign(m, {dlyMix: 0.3, dlyTime: 0.35, dlyFb: 0.42}); mods.push('eco'); }
  for (const [re, t] of [[/caverna|gruta|túnel/, 'Caverna'], [/catedral|igreja/, 'Catedral'], [/salão|hall|teatro/, 'Hall'], [/banheiro|quarto|sala/, 'Sala'], [/ar livre|campo|floresta|rua/, 'Exterior']])
    if (has(re)){ Object.assign(m, REV_TYPES[t], {revType: t, revMix: Math.max(m.revMix, 0.3)}); mods.push(t.toLowerCase()); break; }
  for (const [re, mat] of MATERIAL_WORDS) if (has(re) && !matched.some(n => n.toLowerCase().includes(mat === 'metal' ? 'metal' : mat))){
    snd.layers.push(Ly('modal',{material: mat, freq: mat === 'metal' ? 320 : mat === 'vidro' ? 1600 : 250, decay: 1, hardness: 0.75, modes: 32, noise: 0.3},{name:'Material: ' + mat, vol:-5, env:PHY(1.5)})); mods.push(mat); }
  if (has(/abafad|debaixo d.água|submers|através da parede|atrás da porta/)){ m.lp = 900; if (has(/água|submers/)) all(l => { l.mod.vibDepth = Math.max(l.mod.vibDepth, 0.25); l.mod.vibRate = 3; }); mods.push('abafado'); }
  if (has(/brilhant|claro|cristalin/)){ m.high += 4; mods.push('brilhante'); }
  if (has(/escur|sombri|dark/)){ m.lp = Math.min(m.lp, 3500); m.low += 2; mods.push('sombrio'); }
  if (has(/distorc|agressiv|intens|forte|violent/)){ m.drive = Math.max(m.drive, 0.5); m.ratio = Math.max(m.ratio, 4); mods.push('intenso'); }
  if (has(/suave|macio|gentil/)){ all(l => { l.env.a = Math.max(l.env.a, 0.02); l.drive = 0; }); m.drive = 0; mods.push('suave'); }
  if (has(/rádio|telefone|walkie|interfone/) && !matched.includes('R:Telefone tocando')){ Object.assign(m, {hp: 400, lp: 3500, drive: Math.max(m.drive, 0.3)}); mods.push('rádio'); }
  if (has(/esquerda para (a )?direita|passando|atravessa/)){ all(l => l.mod.panSweep = 0.8); mods.push('passando'); }
  if (has(/direita para (a )?esquerda/)){ all(l => l.mod.panSweep = -0.8); mods.push('passando ←'); }
  const rep = d.match(/(duas|dois|três|tres|quatro|cinco|2|3|4|5) vezes|repetid/);
  if (rep){ const n = {duas:2, dois:2, 'três':3, tres:3, quatro:4, cinco:5}[rep[1]] || +rep[1] || 3, base0 = snd.layers.slice(), len = Math.max(0.15, ...base0.map(l => l.start + Math.min(envLength(l.env), 0.6)));
    for (let k=1; k<n; k++) base0.forEach(l => { const c = JSON.parse(JSON.stringify(l)); c.start += k*len*1.05; c.seed = (c.seed + k*7919) >>> 0; c.pitch += (k % 2 ? 0.3 : -0.2); snd.layers.push(c); }); mods.push(n + ' vezes'); }
  snd.layers.forEach((l, i) => { if (!l.seed) l.seed = hashStr(desc + i); });
  return {snd: sanitizeSound(snd), matched: matched.map(n => n.replace(/^R:/, '')), mods};
}
function sanitizeSound(s){
  const out = normalizeSound(s);
  out.layers.forEach(l => {
    ENGINES[l.type].params.forEach(d => { const v = l.p[d.k]; if (d.s === 'choice'){ if (!d.c.includes(v)) l.p[d.k] = d.def; } else if (d.s === 'bool') l.p[d.k] = !!v; else if (d.s !== 'sample'){ l.p[d.k] = isFinite(+v) ? clamp(+v, d.min, d.max) : d.def; } });
    [[MIX_DEFS, l], [ENV_DEFS, l.env], [PENV_DEFS, l.pitchEnv], [FILT_DEFS, l.filter], [MOD_DEFS, l.mod]].forEach(([defs, o]) => defs.forEach(d => { if (d.s === 'choice'){ if (!d.c.includes(o[d.k])) o[d.k] = d.def; } else o[d.k] = isFinite(+o[d.k]) ? clamp(+o[d.k], d.min, d.max) : d.def; }));
  });
  MASTER_GROUPS.forEach(g => g.defs.forEach(d => { const m = out.master; if (d.s === 'choice'){ if (!d.c.includes(m[d.k])) m[d.k] = d.def; } else m[d.k] = isFinite(+m[d.k]) ? clamp(+m[d.k], d.min, d.max) : d.def; }));
  return out;
}
function engineDocs(){
  const fmt = d => d.s === 'choice' ? `${d.k} ∈ {${d.c.join(', ')}}` : d.s === 'bool' ? `${d.k} (true/false)` : `${d.k} [${d.min}..${d.max}${d.u ? ' ' + d.u : ''}]`;
  return Object.entries(ENGINES).filter(([k]) => k !== 'sampler' && k !== 'resynth').map(([k, e]) => `- ${k} (${e.name}): ${e.params.map(fmt).join('; ')}`).join('\n') +
    `\nCamada: vol [-48..12 dB], pan [-1..1], start [s], pitch [st], drive [0..1]. env: ${ENV_DEFS.map(fmt).join('; ')}. pitchEnv: ${PENV_DEFS.map(fmt).join('; ')}. filter: ${FILT_DEFS.map(fmt).join('; ')}. mod: ${MOD_DEFS.map(fmt).join('; ')}.\nMaster: ${MASTER_GROUPS.flatMap(g => g.defs).map(fmt).join('; ')}.`;
}
async function designSoundAI(desc){
  const schema = {type:'object', additionalProperties:false, required:['name','master_json','layers'], properties:{
    name:{type:'string'}, master_json:{type:'string', description:'objeto JSON com os campos do master que mudam'},
    layers:{type:'array', items:{type:'object', additionalProperties:false, required:['engine','name','layer_json'], properties:{
      engine:{type:'string', enum: Object.keys(ENGINES).filter(k => k !== 'sampler' && k !== 'resynth')}, name:{type:'string'},
      layer_json:{type:'string', description:'objeto JSON com p (parâmetros do motor), env, pitchEnv, filter, mod, vol, pan, start, pitch, drive'}}}}}};
  const examples = ['Impacto de trailer', 'Porta rangendo', 'Magia'].map(n => { const s = buildPreset(presetByName(n)); return `${n}: ` + JSON.stringify(s.layers.map(l => ({engine: l.type, p: l.p, env: l.env, pitchEnv: l.pitchEnv, filter: l.filter, vol: l.vol, start: l.start}))); }).join('\n');
  const j = await claudeJSON(`Projete o som: "${desc}".\n\nMotores e parâmetros disponíveis:\n${engineDocs()}\n\nExemplos de presets prontos:\n${examples}`, schema,
    'Você é um sound designer de cinema e jogos que projeta sons em camadas para um sintetizador. Combine transiente, corpo e cauda; use frequências e envelopes realistas. Retorne só o JSON pedido.');
  const parse = s => { try { return JSON.parse(s); } catch(e){ return {}; } };
  const layers = j.layers.map((L, i) => { const l = newLayer(L.engine, hashStr(desc + i)), o = parse(L.layer_json);
    ['p','env','pitchEnv','filter','mod'].forEach(k => { if (o[k] && typeof o[k] === 'object') Object.assign(l[k], o[k]); });
    ['vol','pan','start','pitch','drive'].forEach(k => { if (o[k] != null) l[k] = o[k]; }); l.name = L.name || l.name; return l; });
  return sanitizeSound({name: j.name || desc.slice(0, 50), cat: 'IA', layers, master: Object.assign(defaultMaster(), parse(j.master_json))});
}
