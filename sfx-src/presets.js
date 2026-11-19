"use strict";
/* ======================================================================
   Biblioteca de presets (camadas + master)
   ====================================================================== */
function Ly(type, p = {}, o = {}){
  const l = newLayer(type, 0);
  Object.assign(l.p, p);
  for (const k in o){
    if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) Object.assign(l[k], o[k]); else l[k] = o[k];
  }
  return l;
}
const NOTE = n => 440*Math.pow(2, (n-69)/12); // MIDI -> Hz
const env = (a, d, s, len, r, curve = 0) => ({a, d, s, len, r, curve});
const ONE = (d, len = d) => env(0.001, d, 0, len, 0.05);      // one-shot
const PHY = len => env(0.0005, 30, 1, len, 0.05);             // motores físicos
const HOLD = (a, len, r, curve = 0.3) => env(a, 1, 1, len, r, curve); // sustentado

const PRESET_DEFS = [
/* ---------------------------- CINEMA ---------------------------- */
['Cinema','Impacto de trailer', [
  Ly('analog',{wave:'sine',freq:42,drift:0},{name:'Sub boom',env:ONE(2.8,3),pitchEnv:{amt:24,time:0.09},drive:0.25}),
  Ly('noise',{color:'marrom',stereo:0.6},{name:'Corpo',vol:-4,env:ONE(1.0,1.5),filter:{type:'lp',freq:250,q:0.9,env:3.5,envTime:0.25}}),
  Ly('modal',{material:'metal',freq:110,decay:0.9,hardness:0.85,modes:40,noise:0.4,stereo:0.8},{name:'Metal',vol:-9,env:PHY(2.5)}),
  Ly('noise',{color:'branco',stereo:0.3},{name:'Transiente',vol:-8,env:ONE(0.03,0.1),filter:{type:'hp',freq:2500}}),
 ], {drive:0.25, ratio:4, thr:-20, revType:'Hall', revMix:0.28, revDecay:3.2, revSize:0.9, low:2}],
['Cinema','Braam', [
  Ly('analog',{wave:'saw',freq:55,voices:7,detune:22,spread:0.9},{name:'Metais',env:env(0.04,3,0.7,2.6,1.4),filter:{type:'lp',freq:180,q:1.4,env:3.2,envAtk:0.25,envTime:1.6},drive:0.45}),
  Ly('analog',{wave:'sine',freq:27.5,sub:0.5,drift:0},{name:'Sub',vol:-6,env:env(0.04,3,0.7,2.6,1.4),filter:{type:'lp',freq:120}}),
  Ly('formant',{freq:55,vowelA:0,vowelB:3,morph:2,size:1.4,growl:0.4,breath:0.1},{name:'Rugido',vol:-8,env:env(0.05,3,0.8,2.6,1.2)}),
 ], {drive:0.35, ratio:3, revType:'Hall', revMix:0.3, revDecay:4, low:3}],
['Cinema','Riser de tensão', [
  Ly('noise',{color:'rosa',stereo:1},{name:'Ar',env:HOLD(4,4,0.08,0.6),filter:{type:'bp',freq:6000,q:1.2,key:1},pitchEnv:{amt:-36,time:4,mode:'lin'}}),
  Ly('analog',{wave:'saw',freq:220,voices:5,detune:30,spread:1},{name:'Sintetizador',vol:-6,env:HOLD(4,4,0.08,0.5),pitchEnv:{amt:-24,time:4,mode:'lin'},filter:{type:'lp',freq:3000},mod:{tremDepth:0.35,tremRate:9}}),
  Ly('fm',{freq:440,r2:1.41,i2:3,idxSus:1},{name:'Brilho FM',vol:-12,env:HOLD(4,4,0.08,0.6),pitchEnv:{amt:-12,time:4,mode:'lin'},mod:{vibDepth:0.2,vibRate:6}}),
 ], {revType:'Hall', revMix:0.3, revDecay:3, dlyMix:0.15, dlyTime:0.375, dlyFb:0.4}],
['Cinema','Sub drop', [
  Ly('analog',{wave:'sine',freq:220,drift:0},{name:'Queda',pitch:-24,pitchEnv:{amt:24,time:2.5,mode:'lin'},env:ONE(3.5,3),drive:0.3}),
  Ly('noise',{color:'marrom',stereo:0.5},{name:'Varredura',vol:-6,env:ONE(2,2.5),filter:{type:'lp',freq:200,env:4.3,envTime:2}}),
 ], {revType:'Hall', revMix:0.2, low:2}],
['Cinema','Whoosh', [
  Ly('noise',{color:'rosa',stereo:0.8},{name:'Corpo',env:env(0.35,0.55,0,1,0.1,0.5),filter:{type:'bp',freq:250,q:1.6,env:4,envAtk:0.35,envTime:0.45},mod:{panSweep:0.7}}),
  Ly('noise',{color:'branco',stereo:0.6},{name:'Ar',vol:-10,env:env(0.33,0.3,0,1,0.1,0.6),filter:{type:'hp',freq:3000,env:1.5,envAtk:0.35,envTime:0.3},mod:{panSweep:0.7}}),
 ], {revType:'Sala', revMix:0.15}],
['Cinema','Swell reverso', [
  Ly('noise',{color:'rosa',stereo:1},{name:'Ar',env:HOLD(2.2,2.2,0.02,1),filter:{type:'hp',freq:1500}}),
  Ly('fm',{freq:330,r2:3.5,i2:4,idxDecay:10,idxSus:1,stereo:8},{name:'Metal FM',vol:-8,env:HOLD(2.2,2.2,0.02,1)}),
 ], {revType:'Catedral', revMix:0.3}],
['Cinema','Boom grave', [
  Ly('analog',{wave:'sine',freq:48,drift:0},{name:'Boom',env:ONE(3.5,4),pitchEnv:{amt:12,time:0.06},drive:0.4}),
  Ly('noise',{color:'marrom'},{name:'Peso',vol:-6,env:ONE(0.6),filter:{type:'lp',freq:120,env:2,envTime:0.1}}),
 ], {low:3, ratio:3, revType:'Hall', revMix:0.15}],
['Cinema','Impacto metálico', [
  Ly('modal',{material:'metal',freq:260,decay:1.4,hardness:0.9,modes:48,noise:0.3,stereo:0.8},{name:'Chapa',env:PHY(3)}),
  Ly('modal',{material:'sino',freq:520,decay:0.6,hardness:0.8},{name:'Sino',vol:-8,env:PHY(2.5)}),
  Ly('analog',{wave:'sine',freq:60,drift:0},{name:'Sub',vol:-6,env:ONE(0.8),pitchEnv:{amt:12,time:0.05}}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-10,env:ONE(0.02,0.1),filter:{type:'hp',freq:4000}}),
 ], {revType:'Hall', revMix:0.22, revDecay:2.5, ratio:3}],
['Cinema','Drone de tensão', [
  Ly('fm',{freq:65.4,r2:1.414,i2:2.5,r3:3.01,i3:1.5,idxSus:1,stereo:12},{name:'Drone FM',env:HOLD(1.5,6,2),mod:{vibDepth:0.08,vibRate:4.5}}),
  Ly('noise',{color:'rosa',modRate:0.25,modDepth:0.7},{name:'Vento',vol:-14,env:HOLD(2,6,2),filter:{type:'bp',freq:900,q:4}}),
  Ly('analog',{wave:'saw',freq:32.7,voices:3,detune:15},{name:'Grave',vol:-6,env:HOLD(1.5,6,2),filter:{type:'lp',freq:220}}),
 ], {revType:'Catedral', revMix:0.35, low:2}],
['Cinema','Batida de suspense', [
  Ly('analog',{wave:'sine',freq:55,drift:0},{name:'Batida 1',env:ONE(0.35,0.5),pitchEnv:{amt:10,time:0.04},drive:0.3,filter:{type:'lp',freq:300}}),
  Ly('analog',{wave:'sine',freq:55,drift:0},{name:'Batida 2',start:0.28,vol:-3,env:ONE(0.35,0.5),pitchEnv:{amt:10,time:0.04},drive:0.3,filter:{type:'lp',freq:300}}),
 ], {revType:'Sala', revMix:0.15}],
/* ---------------------------- FOLEY ---------------------------- */
['Foley','Passo – madeira', [
  Ly('modal',{material:'madeira',freq:160,decay:1,hardness:0.45,modes:24,noise:0.5,position:0.3},{name:'Calcanhar',env:PHY(0.5)}),
  Ly('noise',{color:'marrom'},{name:'Impacto',vol:-8,env:ONE(0.04,0.2),filter:{type:'lp',freq:700}}),
  Ly('modal',{material:'madeira',freq:240,hardness:0.6,noise:0.6},{name:'Ponta',start:0.045,vol:-8,env:PHY(0.4)}),
 ], {revType:'Estúdio', revMix:0.08}],
['Foley','Passo – concreto', [
  Ly('noise',{color:'rosa'},{name:'Raspar',env:ONE(0.07,0.2),filter:{type:'bp',freq:1800,q:0.8}}),
  Ly('modal',{material:'pedra',freq:300,hardness:0.7,noise:0.8},{name:'Pedra',vol:-4,env:PHY(0.3)}),
  Ly('particles',{density:900,fmin:1500,fmax:7000,pdecay:0.003,tone:0.1},{name:'Areia',start:0.01,vol:-10,env:env(0.002,0.08,0,0.2,0.05)}),
  Ly('noise',{color:'marrom'},{name:'Peso',vol:-6,env:ONE(0.05,0.2),filter:{type:'lp',freq:300}}),
 ], {revType:'Estúdio', revMix:0.1}],
['Foley','Passo – cascalho', [
  Ly('particles',{density:1600,fmin:900,fmax:6500,pdecay:0.004,tone:0.25,ampVar:0.8,stereo:0.5},{name:'Pedrinhas',env:env(0.01,0.22,0,0.4,0.05)}),
  Ly('noise',{color:'marrom'},{name:'Peso',vol:-6,env:env(0.005,0.12,0,0.3,0.05),filter:{type:'lp',freq:450}}),
  Ly('particles',{density:500,fmin:400,fmax:2000,pdecay:0.008,tone:0.5},{name:'Pedras',start:0.02,vol:-6,env:env(0.03,0.2,0,0.4,0.05)}),
 ], {revType:'Exterior', revMix:0.06}],
['Foley','Passo – grama e folhas', [
  Ly('particles',{density:900,fmin:2500,fmax:10000,pdecay:0.0025,tone:0,stereo:0.6},{name:'Folhas',env:env(0.02,0.3,0,0.5,0.05)}),
  Ly('noise',{color:'rosa',modRate:25,modDepth:0.7},{name:'Farfalhar',vol:-10,env:env(0.03,0.25,0,0.5,0.05),filter:{type:'hp',freq:2500}}),
  Ly('noise',{color:'marrom'},{name:'Peso',vol:-10,env:ONE(0.06,0.2),filter:{type:'lp',freq:250}}),
 ], {revType:'Exterior', revMix:0.05}],
['Foley','Batida na porta', [
  Ly('modal',{material:'madeira',freq:120,decay:1.6,hardness:0.55,modes:32,noise:0.35,position:0.2},{name:'Toc 1',env:PHY(0.5)}),
  Ly('modal',{material:'madeira',freq:120,decay:1.6,hardness:0.55,modes:32,noise:0.35,position:0.22},{name:'Toc 2',start:0.2,pitch:0.3,vol:-1,env:PHY(0.5)}),
 ], {revType:'Sala', revMix:0.18, revSize:0.4, revDecay:0.6}],
['Foley','Vidro – tilintar', [
  Ly('modal',{material:'vidro',freq:1850,decay:1,hardness:0.92,modes:24,noise:0.1,stereo:0.5},{name:'Taça 1',env:PHY(2)}),
  Ly('modal',{material:'vidro',freq:2400,decay:0.8,hardness:0.9,modes:24,noise:0.1,stereo:0.5},{name:'Taça 2',vol:-6,env:PHY(1.6)}),
 ], {revType:'Sala', revMix:0.15}],
['Foley','Vidro quebrando', [
  Ly('modal',{material:'vidro',freq:1200,decay:0.5,hardness:1,noise:0.6,modes:32},{name:'Impacto',vol:-2,env:PHY(1)}),
  Ly('particles',{density:350,fmin:2500,fmax:12000,pdecay:0.06,tone:0.85,ampVar:0.9,stereo:1},{name:'Cacos',env:ONE(0.9,1.5)}),
  Ly('particles',{density:120,fmin:3000,fmax:9000,pdecay:0.03,tone:0.9,stereo:1},{name:'Cacos caindo',start:0.15,vol:-6,env:ONE(1.2,1.5)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-6,env:ONE(0.08,0.2),filter:{type:'hp',freq:3000}}),
  Ly('analog',{wave:'sine',freq:70,drift:0},{name:'Peso',vol:-10,env:ONE(0.25),pitchEnv:{amt:12,time:0.04}}),
 ], {revType:'Sala', revMix:0.2}],
['Foley','Metal – pancada', [
  Ly('modal',{material:'metal',freq:230,decay:1.2,hardness:0.75,modes:48,noise:0.2,stereo:0.7},{name:'Clang',env:PHY(3)}),
  Ly('modal',{material:'metal',freq:367,decay:0.8,hardness:0.7,modes:32},{name:'Harmônico',vol:-6,env:PHY(2.5)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-10,env:ONE(0.015,0.1),filter:{type:'hp',freq:2500}}),
 ], {revType:'Sala', revMix:0.15}],
['Foley','Gota d\'água', [
  Ly('analog',{wave:'sine',freq:1100,drift:0},{name:'Gota',env:ONE(0.09,0.2),pitchEnv:{amt:-9,time:0.045}}),
  Ly('analog',{wave:'sine',freq:1500,drift:0},{name:'Brilho',vol:-12,env:ONE(0.05,0.15),pitchEnv:{amt:-10,time:0.03}}),
 ], {revType:'Caverna', revMix:0.25}],
['Foley','Chuva', [
  Ly('particles',{density:1600,fmin:1800,fmax:9000,pdecay:0.005,tone:0.35,ampVar:1,stereo:1},{name:'Gotas finas',env:HOLD(0.8,6,1.2)}),
  Ly('noise',{color:'rosa',stereo:1,modRate:0.3,modDepth:0.3},{name:'Chiado',vol:-10,env:HOLD(0.8,6,1.2),filter:{type:'bp',freq:2500,q:0.5}}),
  Ly('particles',{density:30,fmin:600,fmax:2500,pdecay:0.02,tone:0.8,ampVar:0.6,stereo:1},{name:'Gotas grossas',vol:-6,env:HOLD(0.8,6,1.2)}),
 ], {revType:'Exterior', revMix:0.15}],
['Foley','Fogo crepitando', [
  Ly('noise',{color:'marrom',stereo:0.7,modRate:2.5,modDepth:0.6},{name:'Chama',vol:-4,env:HOLD(0.6,6,1),filter:{type:'lp',freq:500}}),
  Ly('particles',{density:18,fmin:800,fmax:4500,pdecay:0.008,tone:0.05,ampVar:1,stereo:0.8},{name:'Estalos',env:HOLD(0.3,6,1)}),
  Ly('particles',{density:120,fmin:2500,fmax:9000,pdecay:0.002,tone:0,ampVar:1,stereo:0.8},{name:'Faíscas',vol:-12,env:HOLD(0.3,6,1)}),
  Ly('noise',{color:'rosa',modRate:6,modDepth:0.8},{name:'Sopro',vol:-18,env:HOLD(0.6,6,1),filter:{type:'bp',freq:1200,q:0.8}}),
 ], {revType:'Sala', revMix:0.06}],
['Foley','Vento', [
  Ly('noise',{color:'rosa',stereo:1,modRate:0.35,modDepth:0.8},{name:'Corpo',env:HOLD(1.5,7,2),filter:{type:'bp',freq:500,q:2.5}}),
  Ly('noise',{color:'branco',stereo:1,modRate:0.6,modDepth:0.9},{name:'Assobio',vol:-12,env:HOLD(1.5,7,2),filter:{type:'bp',freq:1300,q:8,key:1},mod:{vibDepth:2,vibRate:0.2}}),
  Ly('noise',{color:'marrom',modRate:0.2,modDepth:0.6},{name:'Grave',vol:-6,env:HOLD(1.5,7,2),filter:{type:'lp',freq:200}}),
 ], {revType:'Exterior', revMix:0.1}],
['Foley','Ondas do mar', [
  Ly('noise',{color:'rosa',stereo:1,modRate:0.12,modDepth:0.85},{name:'Onda',env:HOLD(1,8,2),filter:{type:'lp',freq:900}}),
  Ly('noise',{color:'branco',stereo:1,modRate:0.12,modDepth:0.9},{name:'Espuma',vol:-14,env:HOLD(1,8,2),filter:{type:'hp',freq:2500}}),
  Ly('particles',{density:400,fmin:3000,fmax:10000,pdecay:0.002,tone:0,stereo:1},{name:'Bolhas',vol:-16,env:HOLD(1,8,2),mod:{tremDepth:0.85,tremRate:0.12}}),
 ], {revType:'Exterior', revMix:0.1}],
['Foley','Tecido / roupa', [
  Ly('noise',{color:'rosa',stereo:0.4,modRate:14,modDepth:0.75},{name:'Pano',env:env(0.06,0.35,0,0.6,0.05),filter:{type:'bp',freq:2200,q:0.7}}),
  Ly('particles',{density:400,fmin:1500,fmax:6000,pdecay:0.002,tone:0},{name:'Fibras',vol:-12,env:env(0.05,0.3,0,0.6,0.05)}),
 ], {revType:'Estúdio', revMix:0.05}],
['Foley','Papel amassado', [
  Ly('particles',{density:250,fmin:700,fmax:6000,pdecay:0.012,tone:0.05,ampVar:1,stereo:0.4},{name:'Dobras',env:HOLD(0.02,0.9,0.2)}),
  Ly('particles',{density:900,fmin:3000,fmax:11000,pdecay:0.002,tone:0,ampVar:1},{name:'Chiado',vol:-8,env:HOLD(0.02,0.9,0.2)}),
  Ly('noise',{color:'rosa',modRate:18,modDepth:0.9},{name:'Ar',vol:-14,env:HOLD(0.02,0.9,0.2),filter:{type:'bp',freq:3000,q:0.6}}),
 ], {revType:'Estúdio', revMix:0.05}],
['Foley','Soco', [
  Ly('analog',{wave:'sine',freq:65,drift:0},{name:'Grave',env:ONE(0.25,0.4),pitchEnv:{amt:18,time:0.035},drive:0.35}),
  Ly('noise',{color:'marrom'},{name:'Carne',vol:-3,env:ONE(0.09,0.3),filter:{type:'lp',freq:1500,env:1,envTime:0.05}}),
  Ly('modal',{material:'pele',freq:120,decay:0.5,hardness:0.35,noise:0.5},{name:'Pele',vol:-6,env:PHY(0.4)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-12,env:ONE(0.012,0.1),filter:{type:'hp',freq:2000}}),
 ], {ratio:4, thr:-18, drive:0.2, revType:'Sala', revMix:0.08}],
['Foley','Espada – golpe', [
  Ly('noise',{color:'rosa',stereo:0.6},{name:'Corte',env:env(0.12,0.22,0,0.4,0.05,0.5),filter:{type:'bp',freq:900,q:2.5,env:3,envAtk:0.12,envTime:0.18},mod:{panSweep:0.5}}),
  Ly('modal',{material:'metal',freq:1400,decay:1.4,hardness:0.95,modes:32,stereo:0.6},{name:'Lâmina',start:0.13,vol:-6,env:PHY(1.6)}),
  Ly('modal',{material:'metal',freq:2210,decay:1,hardness:0.95,modes:24},{name:'Brilho',start:0.13,vol:-12,env:PHY(1.4)}),
 ], {revType:'Sala', revMix:0.15}],
['Foley','Porta rangendo', [
  Ly('particles',{density:55,fmin:500,fmax:720,pdecay:0.018,tone:0.95,ampVar:0.4,stereo:0.1},{name:'Rangido',env:HOLD(0.2,1.6,0.3),pitchEnv:{amt:-3,time:1.6,mode:'lin'},mod:{vibDepth:0.5,vibRate:1.3}}),
  Ly('formant',{freq:45,vowelA:2,vowelB:3,morph:1.6,size:0.8,growl:0.6,jitter:0.8,breath:0.2},{name:'Atrito',vol:-12,env:HOLD(0.2,1.6,0.3),filter:{type:'bp',freq:900,q:2}}),
 ], {revType:'Sala', revMix:0.12}],
['Foley','Engrenagem', [
  Ly('particles',{density:14,fmin:2500,fmax:3200,pdecay:0.01,tone:0.7,ampVar:0.2,stereo:0.1},{name:'Dentes',env:HOLD(0.01,1.2,0.05,0)}),
  Ly('particles',{density:14,fmin:700,fmax:900,pdecay:0.02,tone:0.8,ampVar:0.3},{name:'Corpo',vol:-6,env:HOLD(0.01,1.2,0.05,0)}),
 ], {revType:'Estúdio', revMix:0.08}],
/* ---------------------------- JOGOS ---------------------------- */
['Jogos','Moeda', [
  Ly('fm',{freq:NOTE(83),r2:2,i2:1.2,idxDecay:0.15,idxSus:0.2},{name:'Nota 1',env:ONE(0.25,0.3)}),
  Ly('fm',{freq:NOTE(88),r2:2,i2:1.2,idxDecay:0.3,idxSus:0.2},{name:'Nota 2',start:0.075,env:ONE(0.7,0.8)}),
  Ly('particles',{density:60,fmin:4000,fmax:9000,pdecay:0.05,tone:1,stereo:1},{name:'Brilho',start:0.07,vol:-14,env:ONE(0.5)}),
 ], {revType:'Sala', revMix:0.12, dlyMix:0.1, dlyTime:0.12, dlyFb:0.25}],
['Jogos','Power-up', [
  Ly('analog',{wave:'saw',freq:523,voices:3,detune:10,spread:0.6},{name:'Subida',vol:-2,pitchEnv:{amt:-12,time:0.45,mode:'lin'},filter:{type:'lp',freq:2500,env:1,envTime:0.4},env:env(0.01,0.6,0.4,0.5,0.3)}),
  Ly('fm',{freq:1046,r2:3,i2:1.5},{name:'Cintilar',vol:-8,pitchEnv:{amt:-12,time:0.45,mode:'lin'},env:env(0.01,0.6,0.4,0.5,0.3)}),
  Ly('particles',{density:50,fmin:3000,fmax:10000,pdecay:0.08,tone:1,stereo:1},{name:'Estrelas',start:0.2,vol:-10,env:ONE(0.7)}),
 ], {revType:'Sala', revMix:0.2, dlyMix:0.15, dlyTime:0.1}],
['Jogos','Laser / blaster', [
  Ly('analog',{wave:'saw',freq:280,voices:2,detune:12},{name:'Disparo',pitchEnv:{amt:26,time:0.12},filter:{type:'lp',freq:1500,env:2.5,envTime:0.1},env:ONE(0.22,0.3),drive:0.2}),
  Ly('fm',{freq:560,r2:1.5,i2:4,idxDecay:0.08},{name:'Zumbido FM',vol:-6,pitchEnv:{amt:26,time:0.12},env:ONE(0.2,0.3)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-12,env:ONE(0.03,0.1),filter:{type:'hp',freq:2000}}),
 ], {dlyMix:0.18, dlyTime:0.09, dlyFb:0.3, revType:'Sala', revMix:0.1}],
['Jogos','Explosão', [
  Ly('noise',{color:'marrom',stereo:0.8},{name:'Estrondo',env:ONE(2.2,3),filter:{type:'lp',freq:600,env:2.5,envTime:0.35}}),
  Ly('analog',{wave:'sine',freq:38,drift:0},{name:'Sub',vol:-2,env:ONE(2.5,3),pitchEnv:{amt:14,time:0.12},drive:0.3}),
  Ly('particles',{density:160,fmin:300,fmax:3500,pdecay:0.04,tone:0.3,ampVar:1,stereo:1},{name:'Detritos',start:0.05,vol:-8,env:ONE(1.6,2)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-8,env:ONE(0.08,0.2),filter:{type:'hp',freq:1500}}),
 ], {drive:0.3, ratio:4, thr:-22, revType:'Hall', revMix:0.25, revDecay:2.5, low:3}],
['Jogos','Magia', [
  Ly('fm',{freq:1046,r2:3.5,i2:2,idxDecay:1,idxSus:0.3,stereo:8},{name:'Sino 1',env:env(0.02,1.5,0,1.6,0.1),mod:{vibDepth:0.15,vibRate:6}}),
  Ly('fm',{freq:1568,r2:3.5,i2:2,idxDecay:1,idxSus:0.3,stereo:8},{name:'Sino 2',start:0.08,vol:-6,env:env(0.02,1.5,0,1.6,0.1)}),
  Ly('particles',{density:80,fmin:3000,fmax:12000,pdecay:0.12,tone:1,stereo:1},{name:'Pó mágico',vol:-8,env:env(0.05,1.2,0,1.5,0.1)}),
  Ly('noise',{color:'branco',stereo:1},{name:'Sopro',vol:-14,env:env(0.2,0.6,0,1,0.1,0.4),filter:{type:'bp',freq:5000,q:1,env:1,envAtk:0.2,envTime:0.5},mod:{panSweep:0.6}}),
 ], {revType:'Hall', revMix:0.4, revDecay:2.8, dlyMix:0.25, dlyTime:0.18, dlyFb:0.35}],
['Jogos','Cura', [
  Ly('analog',{wave:'tri',freq:NOTE(72),voices:3,detune:8,spread:0.7},{name:'Dó',vol:-2,env:env(0.05,1.6,0,1.6,0.2)}),
  Ly('analog',{wave:'tri',freq:NOTE(76),voices:3,detune:8,spread:0.7},{name:'Mi',start:0.09,vol:-2,env:env(0.05,1.6,0,1.6,0.2)}),
  Ly('analog',{wave:'tri',freq:NOTE(79),voices:3,detune:8,spread:0.7},{name:'Sol',start:0.18,vol:-2,env:env(0.05,1.6,0,1.6,0.2)}),
  Ly('analog',{wave:'sine',freq:NOTE(84)},{name:'Dó agudo',start:0.27,vol:-6,env:env(0.05,1.6,0,1.6,0.2)}),
  Ly('particles',{density:60,fmin:4000,fmax:11000,pdecay:0.1,tone:1,stereo:1},{name:'Brilho',start:0.1,vol:-12,env:ONE(1.2)}),
 ], {revType:'Hall', revMix:0.35, dlyMix:0.12, dlyTime:0.2}],
['Jogos','Dano', [
  Ly('noise',{color:'marrom'},{name:'Impacto',env:ONE(0.18,0.3),filter:{type:'lp',freq:2000,env:1,envTime:0.06},drive:0.4}),
  Ly('analog',{wave:'saw',freq:160,voices:2,detune:10},{name:'Tom',vol:-6,pitchEnv:{amt:12,time:0.06},filter:{type:'lp',freq:1500},env:ONE(0.15,0.3)}),
  Ly('modal',{material:'pele',freq:200,hardness:0.6,noise:0.6},{name:'Corpo',vol:-6,env:PHY(0.3)}),
 ], {drive:0.3, ratio:4, revType:'Sala', revMix:0.08}],
['Jogos','Pulo', [
  Ly('analog',{wave:'tri',freq:330,drift:0},{name:'Pulo',pitchEnv:{amt:-10,time:0.12},env:ONE(0.22,0.3)}),
  Ly('noise',{color:'rosa'},{name:'Ar',vol:-16,pitchEnv:{amt:-10,time:0.12},filter:{type:'bp',freq:1800,q:1.5,key:1},env:ONE(0.18,0.3)}),
 ], {revType:'Sala', revMix:0.06}],
['Jogos','Teleporte', [
  Ly('fm',{freq:220,r2:2.01,i2:5,idxSus:1},{name:'Energia',pitchEnv:{amt:-24,time:1.2,mode:'lin'},mod:{vibDepth:0.3,vibRate:18},env:env(0.1,1.4,0.3,1.2,0.4)}),
  Ly('noise',{color:'rosa'},{name:'Ar',vol:-8,filter:{type:'bp',freq:3000,q:3,key:1},pitchEnv:{amt:-24,time:1.2,mode:'lin'},env:HOLD(0.1,1.2,0.4),mod:{tremDepth:0.5,tremRate:14}}),
  Ly('analog',{wave:'saw',freq:110,voices:5,detune:25,spread:1},{name:'Corpo',vol:-10,pitchEnv:{amt:-24,time:1.2,mode:'lin'},filter:{type:'lp',freq:2000},env:HOLD(0.1,1.2,0.4)}),
 ], {revType:'Hall', revMix:0.3, dlyMix:0.2, dlyTime:0.15, dlyFb:0.4}],
['Jogos','Rugido de monstro', [
  Ly('formant',{freq:75,vowelA:3,vowelB:0,morph:0.8,size:1.8,growl:0.85,jitter:0.7,breath:0.35},{name:'Voz',env:env(0.08,1.6,0.5,1.2,0.5),pitchEnv:{amt:-4,time:0.5},drive:0.5,mod:{vibDepth:0.4,vibRate:7}}),
  Ly('noise',{color:'marrom',modRate:12,modDepth:0.5},{name:'Garganta',vol:-8,filter:{type:'lp',freq:700},env:env(0.08,1.4,0.4,1.2,0.5)}),
  Ly('analog',{wave:'saw',freq:37.5,voices:3},{name:'Peito',vol:-6,filter:{type:'lp',freq:200},env:env(0.08,1.6,0.5,1.2,0.5)}),
 ], {drive:0.3, revType:'Sala', revMix:0.18, low:2}],
['Jogos','Criatura fofa', [
  Ly('formant',{freq:680,vowelA:2,vowelB:4,morph:0.18,size:0.55,growl:0,jitter:0.15,breath:0.1},{name:'Piado',env:ONE(0.35,0.35),pitchEnv:{amt:-6,time:0.12},mod:{vibDepth:0.5,vibRate:9}}),
  Ly('formant',{freq:900,vowelA:1,vowelB:2,size:0.55,jitter:0.15},{name:'Resposta',start:0.16,vol:-3,env:ONE(0.22,0.25),pitchEnv:{amt:4,time:0.08}}),
 ], {revType:'Sala', revMix:0.12}],
['Jogos','Item / pop', [
  Ly('analog',{wave:'sine',freq:420,drift:0},{name:'Pop',pitchEnv:{amt:-14,time:0.035},env:ONE(0.1,0.15)}),
  Ly('modal',{material:'plastico',freq:900,hardness:0.8},{name:'Clique',vol:-8,env:PHY(0.2)}),
 ], {revType:'Sala', revMix:0.08}],
/* ---------------------------- INTERFACE ---------------------------- */
['Interface','Clique', [
  Ly('modal',{material:'plastico',freq:2600,hardness:0.95,decay:0.6,modes:12,noise:0.3},{name:'Clique',env:PHY(0.08)}),
  Ly('noise',{color:'branco'},{name:'Estalo',vol:-10,env:ONE(0.006,0.05),filter:{type:'hp',freq:5000}}),
 ], {}],
['Interface','Interruptor', [
  Ly('modal',{material:'plastico',freq:1900,hardness:0.9,modes:12,noise:0.3},{name:'Liga',env:PHY(0.1)}),
  Ly('modal',{material:'plastico',freq:2600,hardness:0.9,modes:12,noise:0.3},{name:'Trava',start:0.045,vol:-3,env:PHY(0.1)}),
 ], {revType:'Estúdio', revMix:0.05}],
['Interface','Notificação', [
  Ly('fm',{freq:NOTE(91),r2:3,i2:0.9,idxDecay:0.4},{name:'Nota 1',env:ONE(0.9,1)}),
  Ly('fm',{freq:NOTE(98),r2:3,i2:0.9,idxDecay:0.4},{name:'Nota 2',start:0.12,env:ONE(1.1,1.2)}),
 ], {revType:'Sala', revMix:0.2, dlyMix:0.12, dlyTime:0.15}],
['Interface','Erro', [
  Ly('fm',{freq:220,r2:2,i2:1.8,idxDecay:0.12,idxSus:0.3},{name:'Nota 1',filter:{type:'lp',freq:2400},env:env(0.002,0.16,0.5,0.12,0.05)}),
  Ly('fm',{freq:165,r2:2,i2:1.8,idxDecay:0.12,idxSus:0.3},{name:'Nota 2',start:0.16,filter:{type:'lp',freq:2400},env:env(0.002,0.16,0.5,0.18,0.06)}),
 ], {revType:'Sala', revMix:0.08}],
['Interface','Sucesso', [
  Ly('analog',{wave:'tri',freq:NOTE(84),voices:2,detune:5},{name:'Dó',env:ONE(0.5)}),
  Ly('analog',{wave:'tri',freq:NOTE(88),voices:2,detune:5},{name:'Mi',start:0.07,env:ONE(0.5)}),
  Ly('analog',{wave:'tri',freq:NOTE(91),voices:2,detune:5},{name:'Sol',start:0.14,env:ONE(0.7)}),
 ], {revType:'Sala', revMix:0.15, dlyMix:0.1, dlyTime:0.12}],
['Interface','Deslizar', [
  Ly('noise',{color:'rosa',stereo:0.5},{name:'Swipe',env:env(0.08,0.12,0,0.25,0.05,0.4),filter:{type:'bp',freq:1800,q:1.5,env:1.5,envAtk:0.08,envTime:0.1},mod:{panSweep:0.4}}),
 ], {revType:'Sala', revMix:0.05}],
['Interface','Bolha', [
  Ly('analog',{wave:'sine',freq:260,drift:0},{name:'Bolha',pitchEnv:{amt:-18,time:0.025},env:ONE(0.06,0.1)}),
 ], {revType:'Sala', revMix:0.1}],
['Interface','Tecla de digitação', [
  Ly('modal',{material:'plastico',freq:1500,hardness:0.8,noise:0.4},{name:'Tecla',env:PHY(0.1)}),
  Ly('noise',{color:'branco'},{name:'Clique',vol:-8,env:ONE(0.015,0.05),filter:{type:'bp',freq:3000}}),
  Ly('modal',{material:'madeira',freq:220,decay:0.4,hardness:0.5},{name:'Fundo',vol:-6,env:PHY(0.12)}),
 ], {revType:'Estúdio', revMix:0.05}],
/* ---------------------------- SCI-FI ---------------------------- */
['Sci-fi','Scanner', [
  Ly('fm',{freq:880,r2:0.5,i2:3,idxSus:1},{name:'Varredura',pitchEnv:{amt:-12,time:1.5,mode:'lin'},mod:{tremDepth:0.9,tremRate:14},env:HOLD(0.05,1.5,0.2)}),
  Ly('analog',{wave:'sine',freq:1760},{name:'Agudo',vol:-12,mod:{tremDepth:0.9,tremRate:14},env:HOLD(0.05,1.5,0.2)}),
 ], {dlyMix:0.25, dlyTime:0.12, dlyFb:0.4, revType:'Sala', revMix:0.2}],
['Sci-fi','Feixe de energia', [
  Ly('analog',{wave:'saw',freq:110,voices:6,detune:18,spread:1},{name:'Zumbido',filter:{type:'lp',freq:1400,q:2},env:HOLD(0.15,3,0.5),mod:{tremDepth:0.25,tremRate:28}}),
  Ly('fm',{freq:220,r2:1.003,i2:2,idxSus:1},{name:'Batimento',vol:-6,env:HOLD(0.15,3,0.5),mod:{vibDepth:0.1,vibRate:6}}),
  Ly('noise',{color:'rosa',modRate:20,modDepth:0.6},{name:'Faísca',vol:-16,filter:{type:'bp',freq:3000,q:2},env:HOLD(0.15,3,0.5)}),
 ], {revType:'Sala', revMix:0.2, drive:0.2}],
['Sci-fi','Nave passando', [
  Ly('noise',{color:'rosa',stereo:0.5},{name:'Turbina',filter:{type:'bp',freq:600,q:1,key:1},pitchEnv:{amt:6,time:3,mode:'lin'},env:env(1.4,2.4,0,3.2,0.3,0.6),mod:{panSweep:1}}),
  Ly('analog',{wave:'saw',freq:90,voices:5,detune:20,spread:1},{name:'Motor',vol:-4,filter:{type:'lp',freq:900,key:0.5},pitchEnv:{amt:6,time:3,mode:'lin'},env:env(1.4,2.4,0,3.2,0.3,0.6),mod:{panSweep:1}}),
 ], {revType:'Exterior', revMix:0.15}],
['Sci-fi','Interface holográfica', [
  Ly('fm',{freq:NOTE(96),r2:1.5,i2:1},{name:'Bip 1',env:ONE(0.12,0.15)}),
  Ly('fm',{freq:NOTE(100),r2:1.5,i2:1},{name:'Bip 2',start:0.08,env:ONE(0.12,0.15)}),
  Ly('fm',{freq:NOTE(103),r2:1.5,i2:1},{name:'Bip 3',start:0.16,env:ONE(0.2,0.25)}),
 ], {dlyMix:0.2, dlyTime:0.09, dlyFb:0.45, revType:'Sala', revMix:0.2}],
['Sci-fi','Desligando', [
  Ly('analog',{wave:'saw',freq:440,voices:3,detune:10},{name:'Queda',pitch:-24,pitchEnv:{amt:24,time:1,mode:'lin'},filter:{type:'lp',freq:3000},env:env(0.005,1.2,0.3,1,0.3)}),
  Ly('fm',{freq:880,r2:2,i2:2,idxSus:0.5},{name:'Brilho',vol:-8,pitch:-24,pitchEnv:{amt:24,time:1,mode:'lin'},env:env(0.005,1.2,0.3,1,0.3)}),
 ], {revType:'Sala', revMix:0.2}],
/* ---------------------------- MUSICAL ---------------------------- */
['Musical','Sino tubular', [
  Ly('modal',{material:'sino',freq:NOTE(60),decay:1,hardness:0.7,modes:32,stereo:0.5,inharm:0.05},{name:'Sino',env:PHY(5)}),
 ], {revType:'Hall', revMix:0.25}],
['Musical','Corda dedilhada', [
  Ly('string',{freq:NOTE(60),decay:3,bright:0.6,pick:0.18,stereo:6},{name:'Corda',env:PHY(3)}),
 ], {revType:'Sala', revMix:0.15}],
['Musical','Xilofone de madeira', [
  Ly('modal',{material:'madeira',freq:NOTE(60),decay:3,hardness:0.45,modes:8,inharm:0.02,noise:0.1},{name:'Tecla',env:PHY(1.2)}),
 ], {revType:'Sala', revMix:0.15}],
['Musical','Pad atmosférico', [
  Ly('analog',{wave:'saw',freq:NOTE(60),voices:7,detune:14,spread:1},{name:'Camada',filter:{type:'lp',freq:1500},env:env(1,1,1,3,2)}),
  Ly('analog',{wave:'tri',freq:NOTE(72),voices:3,detune:8},{name:'Oitava',vol:-8,env:env(1,1,1,3,2)}),
 ], {revType:'Hall', revMix:0.45, revDecay:4, dlyMix:0.2, dlyTime:0.375}],
['Musical','Bumbo', [
  Ly('analog',{wave:'sine',freq:52,drift:0},{name:'Corpo',pitchEnv:{amt:26,time:0.045},env:ONE(0.45,0.6),drive:0.2}),
  Ly('noise',{color:'branco'},{name:'Clique',vol:-14,env:ONE(0.006,0.05),filter:{type:'hp',freq:3000}}),
 ], {ratio:3}],
['Musical','Caixa', [
  Ly('modal',{material:'pele',freq:185,decay:0.6,hardness:0.7,noise:0.4},{name:'Pele',env:PHY(0.3)}),
  Ly('noise',{color:'branco'},{name:'Esteira',vol:-2,env:ONE(0.2,0.3),filter:{type:'bp',freq:3500,q:0.6}}),
  Ly('analog',{wave:'sine',freq:185,drift:0},{name:'Tom',vol:-6,pitchEnv:{amt:7,time:0.02},env:ONE(0.08,0.15)}),
 ], {revType:'Sala', revMix:0.12}],
['Musical','Chimbal', [
  Ly('noise',{color:'branco'},{name:'Ar',env:ONE(0.06,0.1),filter:{type:'hp',freq:7000}}),
  Ly('fm',{freq:800,r2:1.4471,i2:6,r3:2.3,i3:3},{name:'Metal',vol:-6,env:ONE(0.05,0.1),filter:{type:'hp',freq:6000}}),
 ], {}],
['Musical','Baixo sintetizado', [
  Ly('analog',{wave:'saw',freq:NOTE(36),voices:2,detune:6,sub:0.5},{name:'Baixo',filter:{type:'lp',freq:400,q:3,env:2,envTime:0.2},env:env(0.003,0.4,0.6,0.6,0.15)}),
 ], {}],
];

const CATEGORIES = [...new Set(PRESET_DEFS.map(d => d[0]))];
function buildPreset(def){
  const [cat, name, layers, master] = def;
  const m = defaultMaster();
  if (master.revType && REV_TYPES[master.revType]) Object.assign(m, REV_TYPES[master.revType]);
  Object.assign(m, master);
  const ls = JSON.parse(JSON.stringify(layers));
  ls.forEach((l, i) => l.seed = hashStr(name + '#' + i));
  return {name, cat, layers: ls, master: m};
}
