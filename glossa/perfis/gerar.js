// Gera avatar, banner do YouTube e capas de destaque do Instagram na identidade do Glossa
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'estudio', 'node_modules', 'playwright'));
const F = 'file://' + path.join(__dirname, '..', 'estudio', 'node_modules', '@fontsource');
const css = `
@font-face{font-family:DM;src:url('${F}/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2')}
@font-face{font-family:DM;font-style:italic;src:url('${F}/dm-serif-display/files/dm-serif-display-latin-400-italic.woff2')}
@font-face{font-family:Mono;src:url('${F}/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')}
@font-face{font-family:Mono;src:url('${F}/ibm-plex-mono/files/ibm-plex-mono-latin-ext-500-normal.woff2');unicode-range:U+0100-024F}
@font-face{font-family:Arch;font-weight:900;src:url('${F}/archivo/files/archivo-latin-900-normal.woff2')}
*{margin:0;box-sizing:border-box}body{background:#111114;color:#F2EAD8;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(242,234,216,.07),transparent 60%),radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.4px) 0 0/10px 10px}
.a{color:#E8A33D}`;
const pecas = {
  avatar: [800, 800, `<div class="bg"></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:DM;font-size:560px;line-height:1;padding-bottom:40px">G<span class="a">.</span></div>`],
  'banner-youtube': [2560, 1440, `<div class="bg"></div>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:1546px;height:423px;display:flex;align-items:center;justify-content:space-between">
      <div><div style="font-family:Mono;font-size:26px;letter-spacing:.2em;color:rgba(242,234,216,.5)">/ˈɡlɔs.sa/ · γλῶσσα</div>
      <div style="font-family:DM;font-size:200px;line-height:.95">Glossa<span class="a">.</span></div>
      <div style="font-family:DM;font-style:italic;font-size:54px;color:rgba(242,234,216,.8)">A língua por dentro.</div></div>
      <div style="text-align:right;font-family:Arch;font-weight:900;font-size:40px;line-height:1.35;text-transform:uppercase">
        <div>7 vídeos por dia</div><div style="font-family:Mono;font-weight:400;font-size:26px;letter-spacing:.14em;color:rgba(242,234,216,.6);margin-top:14px">etimologia · linguística · Letras</div>
        <div style="margin-top:26px;display:flex;gap:12px;justify-content:flex-end">${['#E8A33D','#D9D0BC','#E05A4F','#F2C94C','#4CAF7A','#5B9BE0','#A57FDB'].map(c=>`<i style="width:22px;height:22px;border-radius:50%;background:${c};display:block"></i>`).join('')}</div></div>
    </div>`],
};
const quadros = [['De Onde Vem?','#E8A33D','étimo'],['Aula de Letras','#D9D0BC','aula'],['Mito ou Verdade','#E05A4F','mito'],['Línguas Extremas','#F2C94C','mundo'],['Brasil Falado','#4CAF7A','Brasil'],['Línguas Primas','#5B9BE0','primas'],['Gênios','#A57FDB','gênios'],['Glossário','#E8A33D','nº 1']];
quadros.forEach(([n,c,w],i) => { pecas[`destaque-${i+1}-${n.normalize('NFD').replace(/[^\w]/g,'').toLowerCase()}`] = [1080,1920,`<div class="bg"></div>
  <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center">
  <div style="width:520px;height:520px;margin:0 auto;border-radius:50%;border:10px solid ${c};display:flex;align-items:center;justify-content:center;font-family:DM;font-size:${w.length>5?120:150}px">${w}</div>
  <div style="font-family:Arch;font-weight:900;font-size:56px;text-transform:uppercase;margin-top:50px">${n}</div></div>`]; });
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [nome, [w, h, html]] of Object.entries(pecas)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const tmp = path.join(__dirname, '_tmp.html'); require('fs').writeFileSync(tmp, `<!doctype html><meta charset=utf-8><style>${css}</style>${html}`);
    await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, `${nome}.png`) }); await p.close();
  }
  await b.close(); require('fs').rmSync(path.join(__dirname, '_tmp.html'), { force: true }); console.log('ok');
})();
