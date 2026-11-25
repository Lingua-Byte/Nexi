/* RAIZ — conhecimento linguístico próprio (sem IA externa).
   1) Português falado do Brasil → forma que o tradutor entende (tô → estou).
   2) Conceitos brasileiros quase intraduzíveis: o que significam e como dizer de forma
      traduzível. O motor neural traduz o SENTIDO, não a palavra.
   3) Conjugação do português (para montar as 8 pessoas de qualquer verbo).
   Tudo em português: vale para as 8 línguas ao mesmo tempo. */

/* \b do JavaScript não entende letras acentuadas (ô, é, ã): troca por uma fronteira Unicode. */
const UB = '(?:(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}])|(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}]))';
function U(re) { return new RegExp(re.source.replace(/\\b/g, UB), re.flags.includes('u') ? re.flags : re.flags + 'u'); }

/* ——— 1. Português falado ——— */
const PT_FALADO = [
  [/\btô\b/gi, 'estou'], [/\btá\b/gi, 'está'], [/\btava\b/gi, 'estava'], [/\btavam\b/gi, 'estavam'],
  [/\btamo\b/gi, 'estamos'], [/\bcê\b/gi, 'você'], [/\bvc\b/gi, 'você'], [/\bvcs\b/gi, 'vocês'],
  [/\bpra\b/gi, 'para'], [/\bpras\b/gi, 'para as'], [/\bpro\b/gi, 'para o'], [/\bpros\b/gi, 'para os'],
  [/\btb\b|\btbm\b/gi, 'também'], [/\bq\b/gi, 'que'], [/\bblz\b/gi, 'beleza'], [/\bobg\b/gi, 'obrigado'],
  [/,?\s*\bné\b\??/gi, ''], [/\bnum\b(?= (sei|quero|posso|vou|tenho|gosto|vem|vai|dá|tem|faz|sabe|consigo|foi|é|era))/gi, 'não'], [/\bmó\b/gi, 'muito'],
  [/\b(para|pra|com|de) tu\b/gi, (m, p) => `${p} você`], [/\btu\b(?= (vai|vem|quer|tem|sabe|é|foi|pode|gosta|acha|está|tá))/gi, 'você'],
  [/\bdaí\b/gi, 'então'], [/\bnão (\p{L}+) não\?/giu, (m, v) => `não ${v}?`]
];
function falado(text) {
  let t = String(text);
  for (const [re, to] of PT_FALADO) t = t.replace(U(re), (...args) => {
    const m = args[0], out = typeof to === 'function' ? to(...args) : to; return m[0] && m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? out.charAt(0).toUpperCase() + out.slice(1) : out;
  });
  return t.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
}

/* ——— 2. Conceitos ———
   tipo 'nome': troca a palavra por uma descrição (cafuné → carinho no cabelo).
   tipo 'verbo': verbo + complemento → outro verbo conjugado na mesma pessoa e tempo.
   tipo 'fixa': expressão fixa → equivalente.
   'diz': o que significa, para mostrar ao aluno. */
const CONCEITOS = [
  // ——— fala real: gíria, regionalismos, expressões, fórmulas (medidos na bateria de 230 testes) ———
  { id: 'mefazfalta', tipo: 'fixa', pt: 'você me faz falta', re: /\b(você|ele|ela|vocês|eles|elas|isso|tu) me faz(ia)? (muita )?falta\b/gi, por: (m, q, ia, mt) => `sinto${ia ? 'ia' : ''} ${mt || ''}falta de ${q.toLowerCase() === 'tu' ? 'você' : q.toLowerCase()}`, diz: '“Você me faz falta” = eu sinto falta de você. Em outras línguas a frase costuma virar ao contrário: quem sente falta é o sujeito (I miss you).' },
  { id: 'quesaudade', tipo: 'fixa', pt: 'que saudade de…', re: /\bque saudades? (d[aeo]s?)\b/gi, por: (m, d) => `como sinto falta ${d}`, diz: '“Que saudade de você!” — sentir muita falta, com carinho.' },
  { id: 'cafune-v', tipo: 'fixa', pt: 'fazer cafuné', re: /\b(me|te|lhe|nos) (fez|faz|fazia|fazem|fizeram) (um )?cafun[eé]\b/gi, por: (m, p, v) => `${({ fez: 'acariciou', faz: 'acaricia', fazia: 'acariciava', fazem: 'acariciam', fizeram: 'acariciaram' })[v.toLowerCase()]} ${({ me: 'meu', te: 'seu', lhe: 'seu', nos: 'nosso' })[p.toLowerCase()]} cabelo`, diz: 'Passar os dedos devagar no cabelo de alguém, com carinho. Quase nenhuma língua tem uma palavra só: descreve-se o gesto.' },
  { id: 'bolo2', tipo: 'fixa', pt: 'dar um bolo', re: /\b(me|te|nos|lhe) (deu|deram|dá|dão|dava) um bolo\b/gi, por: (m, p, v) => `${p} ${({ deu: 'deixou', deram: 'deixaram', dá: 'deixa', dão: 'deixam', dava: 'deixava' })[v.toLowerCase()]} esperando`, diz: '“Dar um bolo”: não aparecer num encontro combinado.' },
  { id: 'ficha2', tipo: 'fixa', pt: 'cair a ficha', re: /\b(me )?caiu a ficha\b/gi, por: 'eu percebi', diz: 'Entender algo de repente.' },
  { id: 'cara', tipo: 'fixa', pt: 'ser a cara de alguém', re: /\b(é|era|sou|são) a cara d(o|a|os|as) /gi, por: (m, v, a) => `${({ é: 'se parece', era: 'se parecia', sou: 'me pareço', são: 'se parecem' })[v.toLowerCase()]} muito com ${a} `, diz: '“É a cara do pai”: é muito parecido(a) com o pai.' },
  { id: 'olhosdacara', tipo: 'fixa', pt: 'custar os olhos da cara', re: /\bos olhos da cara\b/gi, por: 'muito caro', diz: 'Custar muito caro.' },
  { id: 'pulga', tipo: 'fixa', pt: 'pulga atrás da orelha', re: /\b(está|estou|estava|fiquei|ficou|fico) com a pulga atrás da orelha\b/gi, por: (m, v) => `${v} desconfiado`, diz: 'Desconfiado, com uma suspeita.' },
  { id: 'lua', tipo: 'fixa', pt: 'viver no mundo da lua', re: /\bno mundo da lua\b/gi, por: 'distraído', diz: 'Distraído, sonhando acordado.' },
  { id: 'peesq', tipo: 'fixa', pt: 'acordar com o pé esquerdo', re: /\bcom o pé esquerdo\b/gi, por: 'de mau humor', diz: 'Começar o dia de mau humor, com tudo dando errado.' },
  { id: 'braco', tipo: 'fixa', pt: 'dar o braço a torcer', re: /\bdar o braço a torcer\b/gi, por: 'admitir que errou', diz: 'Admitir que estava errado, ceder.' },
  { id: 'jaca', tipo: 'fixa', pt: 'enfiar o pé na jaca', re: /\b(enfiou|enfiei|enfiaram|enfia|vou enfiar) o pé na jaca\b/gi, por: (m, v) => ({ enfiou: 'exagerou', enfiei: 'exagerei', enfiaram: 'exageraram', enfia: 'exagera', 'vou enfiar': 'vou exagerar' })[v.toLowerCase()] + ' muito', diz: 'Exagerar (na bebida, na comida, na festa).' },
  { id: 'faca', tipo: 'fixa', pt: 'a faca e o queijo na mão', re: /\b(tem|tenho|têm|temos) a faca e o queijo na mão\b/gi, por: (m, v) => `${v} tudo o que precisa para conseguir`, diz: 'Ter todas as condições para fazer algo.' },
  { id: 'cao', tipo: 'fixa', pt: 'quem não tem cão caça com gato', re: /\bquem não tem cão caça com gato\b/gi, por: 'quem não tem o ideal se vira com o que tem', diz: 'Quando falta o ideal, a gente se vira com o que tem.' },
  { id: 'prejuizo', tipo: 'fixa', pt: 'correr atrás do prejuízo', re: /\bcorrer atrás do prejuízo\b/gi, por: 'tentar recuperar as perdas', diz: 'Tentar recuperar o que foi perdido.' },
  { id: 'miojo', tipo: 'nome', pt: 'miojo', re: /\bmiojos?\b/gi, por: 'macarrão instantâneo', diz: 'Macarrão instantâneo (Miojo é uma marca que virou nome).' },
  { id: 'ressaca', tipo: 'fixa', pt: 'olhos de ressaca', re: /\bolhos de ressaca\b/gi, por: 'olhos como as ondas fortes do mar', diz: 'De Machado de Assis (Capitu): olhos que puxam como a ressaca do mar — aqui “ressaca” é a onda forte, não o mal-estar.' },
  { id: 'vaquinha', tipo: 'nome', pt: 'vaquinha', re: /\b(uma |a )?vaquinha\b/gi, por: m => /^a /i.test(m) ? 'a coleta de dinheiro' : 'uma coleta de dinheiro', diz: 'Juntar dinheiro entre várias pessoas para algo.' },
  { id: 'puxasaco', tipo: 'nome', pt: 'puxa-saco', re: /\bpuxa[- ]sacos?\b/gi, por: 'bajulador', diz: 'Quem bajula o chefe ou os poderosos.' },
  { id: 'sextou', tipo: 'fixa', pt: 'sextou', re: /\bsextou\b!?/gi, por: 'finalmente chegou a sexta-feira!', diz: 'Comemoração de que chegou a sexta-feira.' },
  { id: 'alheia', tipo: 'fixa', pt: 'vergonha alheia', re: /\bvergonha alheia\b/gi, por: 'vergonha pelos outros', diz: 'Sentir vergonha pelo que outra pessoa fez.' },
  { id: 'cafona', tipo: 'nome', pt: 'cafona / brega', re: /\b(cafona|brega)s?\b/gi, por: 'de mau gosto', diz: 'De mau gosto, exagerado, fora de moda.' },
  { id: 'desbunde', tipo: 'nome', pt: 'desbunde', re: /\b(que )?desbunde\b/gi, por: m => /^que /i.test(m) ? 'que incrível' : 'espetáculo incrível', diz: 'Algo deslumbrante, incrível.' },
  { id: 'cintura', tipo: 'fixa', pt: 'jogo de cintura', re: /\b(um )?jogo de cintura( incrível| enorme| grande)?\b/gi, por: (m, um, adj) => `${um ? 'uma ' : ''}habilidade${adj || ''} para lidar com situações difíceis`, diz: 'Habilidade e flexibilidade para lidar com situações difíceis.' },
  { id: 'bad', tipo: 'fixa', pt: 'bater uma bad', re: /\bbateu uma bad\b/gi, por: 'fiquei triste', diz: 'Ficar triste, deprê, de repente.' },
  { id: 'danada', tipo: 'fixa', pt: 'uma … danada', re: /\buma (\p{L}+) danada\b/giu, por: (m, x) => `muita ${x}`, diz: '“Danado/danada” aqui é intensidade: muito.' },
  { id: 'sangue', tipo: 'fixa', pt: 'sangue bom', re: /\b(muito )?sangue bom\b/gi, por: 'uma pessoa muito legal', diz: 'Pessoa boa, legal, de confiança.' },
  { id: 'gentebo', tipo: 'fixa', pt: 'gente boa', re: /\b(é|era|são) (muito )?gente boa( demais)?\b/gi, por: (m, v) => `${v} uma pessoa muito legal`, diz: 'Pessoa boa, legal.' },
  { id: 'joao', tipo: 'fixa', pt: 'dar uma de João sem braço', re: /\b(deu|dá|deram|dou|dei) uma de joão sem braço\b/gi, por: (m, v) => ({ deu: 'fingiu', dá: 'finge', deram: 'fingiram', dou: 'finjo', dei: 'fingi' })[v.toLowerCase()] + ' que não era com ela', diz: 'Fingir que não percebeu, para fugir de uma obrigação.' },
  { id: 'cabecaquente', tipo: 'fixa', pt: 'ficar de cabeça quente', re: /\b(ficou|fiquei|fica|fico|está|estou|estava) de cabeça quente\b/gi, por: (m, v) => `${({ ficou: 'ficou', fiquei: 'fiquei', fica: 'fica', fico: 'fico', está: 'está', estou: 'estou', estava: 'estava' })[v.toLowerCase()]} muito irritado`, diz: '“Ficar de cabeça quente”: ficar irritado, nervoso.' },
  { id: 'quesaco', tipo: 'fixa', pt: 'que saco', re: /\bque saco\b/gi, por: 'que chato', diz: '“Que saco!”: que chato, que irritante.' },
  { id: 'prova', tipo: 'fixa', pt: 'ter prova', re: /\btem prova\b/gi, por: 'tem exame', diz: '“Prova” na escola é exame (test, examen), não “proof”.' },
  { id: 'curtidemais', tipo: 'fixa', pt: 'curti demais', re: /\b(curti|curtiu|curtimos|curtiram|gostei|gostou) demais\b/gi, por: (m, v) => `${v} muito`, diz: '“Demais”, depois de verbo, na fala: muito.' },
  { id: 'massa', tipo: 'fixa', pt: 'que massa', re: /\bque massa\b/gi, por: 'que legal', diz: '“Massa” = legal, ótimo.' },
  { id: 'role', tipo: 'nome', pt: 'rolê', re: /\brol[eê]s?\b/gi, por: 'passeio', diz: 'Passeio, saída com amigos.' },
  { id: 'trampo', tipo: 'nome', pt: 'trampo', re: /\btrampo\b/gi, por: 'trabalho', diz: 'Trabalho (gíria).' },
  { id: 'duro', tipo: 'fixa', pt: 'estar duro', re: /\b(estou|está|estava|tô|fiquei|ficou) duros?\b/gi, por: (m, v) => `${v} sem dinheiro`, diz: '“Estar duro”: estar sem dinheiro.' },
  { id: 'grana', tipo: 'nome', pt: 'grana', re: /\bgrana\b/gi, por: 'dinheiro', diz: 'Dinheiro (gíria).' },
  { id: 'busao', tipo: 'nome', pt: 'busão', re: /\bbusão\b/gi, por: 'ônibus', diz: 'Ônibus (gíria).' },
  { id: 'top', tipo: 'fixa', pt: 'top', re: /\b(muito )?top\b/gi, por: 'ótima', diz: '“Top”: ótimo, excelente.' },
  { id: 'seachando', tipo: 'fixa', pt: 'se achando', re: /\bse achando\b/gi, por: 'se sentindo superior', diz: '“Se achando”: se sentindo superior, convencido.' },
  { id: 'deuruim', tipo: 'fixa', pt: 'deu ruim', re: /\bdeu ruim\b/gi, por: 'deu errado', diz: 'Deu errado.' },
  { id: 'vacilo', tipo: 'fixa', pt: 'vacilar', re: /\bvacil(ou|ei|aram|a|o)( feio)?\b/gi, por: (m, e) => 'err' + e.toLowerCase() + ' muito', diz: '“Vacilar”: errar, decepcionar alguém.' },
  { id: 'zoeira', tipo: 'fixa', pt: 'zoeira', re: /\b(muito )?zoeira\b/gi, por: 'muito brincalhona', diz: '“Zoeira”: brincadeira, gozação; pessoa brincalhona.' },
  { id: 'namao', tipo: 'fixa', pt: 'sair na mão', re: /\b(saiu|saíram|saí|vou sair) na mão\b/gi, por: (m, v) => ({ saiu: 'brigou', saíram: 'brigaram', saí: 'briguei', 'vou sair': 'vou brigar' })[v.toLowerCase()], diz: 'Brigar no tapa.' },
  { id: 'zerado', tipo: 'fixa', pt: 'zerado de bateria', re: /\bzerado de bateria\b/gi, por: 'sem bateria', diz: 'Sem bateria nenhuma.' },
  { id: 'partiu', tipo: 'fixa', pt: 'partiu…!', re: /^partiu (\p{L}+)!?/giu, por: (m, x) => `vamos para a ${x}!`, diz: '“Partiu praia!”: vamos para a praia!' },
  { id: 'treta', tipo: 'nome', pt: 'treta', re: /\btretas?\b/gi, por: 'briga', diz: 'Briga, confusão.' },
  { id: 'nemai', tipo: 'fixa', pt: 'não estar nem aí', re: /\bnão (estou|tô|está|tá|estava) nem aí (para|pra|com) o que\b/gi, por: 'não me importo com o que', diz: '“Não estou nem aí”: não me importo.' },
  { id: 'nemai2', tipo: 'fixa', pt: 'não estar nem aí', re: /\bnão (estou|tô|está|tá|estava) nem aí\b/gi, por: 'não me importo', diz: '“Não estou nem aí”: não me importo.' },
  { id: 'showbola', tipo: 'fixa', pt: 'show de bola', re: /\bshow de bola\b/gi, por: 'ótimo', diz: 'Ótimo, excelente.' },
  { id: 'perdido', tipo: 'fixa', pt: 'dar o perdido', re: /\b(deu|dei|deram|dá) o perdido (n[ao]s? |em )?/gi, por: (m, v, n) => ({ deu: 'fugiu', dei: 'fugi', deram: 'fugiram', dá: 'foge' })[v.toLowerCase()] + (n ? (n.trim() === 'em' ? ' de ' : ' d' + n.trim().slice(1) + ' ') : ' '), diz: 'Sumir, fugir de alguém sem avisar.' },
  { id: 'bolado', tipo: 'fixa', pt: 'bolado', re: /\bbolad[oa]s?\b/gi, por: 'chateado', diz: 'Chateado, irritado ou preocupado.' },
  { id: 'mandoubem', tipo: 'fixa', pt: 'mandar bem', re: /\b(mandou|mandei|mandaram|manda) (muito )?bem\b/gi, por: (m, v) => ({ mandou: 'foi', mandei: 'fui', mandaram: 'foram', manda: 'vai' })[v.toLowerCase()] + ' muito bem', diz: '“Mandar bem”: fazer algo muito bem.' },
  { id: 'foimal', tipo: 'fixa', pt: 'foi mal', re: /^foi mal\b/gi, por: 'desculpe', diz: '“Foi mal”: desculpe.' },
  { id: 'ligado', tipo: 'fixa', pt: 'estar ligado', re: /\b(você|cê) (está|tá) ligado( que)?\b/gi, por: (m, v, e, q) => `você sabe${q ? ' que' : ''}`, diz: '“Tá ligado?”: você sabe? você entende?' },
  { id: 'morto', tipo: 'fixa', pt: 'morto de cansado', re: /\bmort[oa] de cansad[oa]\b|\bmort[oa] de cansaço\b/gi, por: 'muito cansado', diz: 'Muito cansado (exagero).' },
  { id: 'decara', tipo: 'fixa', pt: 'ficar de cara', re: /\b(fiquei|ficou|fico|fica) de cara\b/gi, por: (m, v) => `${v} chocado`, diz: '“Ficar de cara”: ficar chocado, surpreso.' },
  { id: 'vocativo', tipo: 'fixa', pt: 'mano / véi / mermão', re: /,?\s*\b(mano|véi|vei|mermão|parça|brother|bro|sô|tchê|meu rei|pô)\b(?=\s*[.!?]*\s*$)/gi, por: '', diz: 'Vocativos de fala (“mano”, “véi”, “sô”, “tchê”): chamam a pessoa, não mudam o sentido.' },
  { id: 'vocativo2', tipo: 'fixa', pt: 'oxente / uai / bah…', re: /^(mermão|meu rei|mano|véi|ô xente|oxente|oxe|vixe|égua|eita|uai|bah|nossa)[,!]?\s*(sô,?|tchê,?)?\s*/gi, por: m => /oxente|xente|oxe|vixe|égua|eita|nossa|bah/i.test(m) ? 'Nossa, ' : '', diz: 'Interjeições regionais (oxente, uai, bah, égua, vixe): surpresa ou ênfase.' },
  { id: 'trem', tipo: 'fixa', pt: 'trem (mineiro)', re: /\b(esse|este|que|um|o) trem (tá|está|é|bão|bom|doido)\b/gi, por: (m, d, v) => `${({ esse: 'essa', este: 'esta', que: 'que', um: 'uma', o: 'a' })[d.toLowerCase()]} coisa ${v === 'bão' ? 'boa' : v}`, diz: 'Em Minas, “trem” é “coisa”: “esse trem tá caro” = essa coisa está cara.' },
  { id: 'guri', tipo: 'nome', pt: 'guri / guria / piá', re: /\b(guri|guria|piá)s?\b/gi, por: m => /guria/i.test(m) ? 'menina' : 'menino', diz: 'No Sul: guri = menino, guria = menina.' },
  { id: 'cacetinho', tipo: 'nome', pt: 'cacetinho', re: /\bcacetinhos?\b/gi, por: 'pão francês', diz: 'No Rio Grande do Sul: pão francês (pãozinho).' },
  { id: 'arretado', tipo: 'fixa', pt: 'arretado', re: /\barretad[oa]( demais)?\b/gi, por: 'muito incrível', diz: 'No Nordeste: incrível, ótimo (ou bravo, conforme o contexto).' },
  { id: 'arriado', tipo: 'fixa', pt: 'arriado', re: /\barriad[oa]( de cansaço)?\b/gi, por: 'exausto', diz: 'Exausto, sem forças.' },
  { id: 'faceira', tipo: 'nome', pt: 'faceiro / faceira', re: /\bfaceir[oa]s?\b/gi, por: 'alegre', diz: 'Alegre, contente (no Sul) ou vaidoso.' },
  { id: 'bora', tipo: 'fixa', pt: 'bora', re: /\bbora\b,?/gi, por: 'vamos,', diz: '“Bora”: vamos!' },
  { id: 'visse', tipo: 'fixa', pt: 'visse', re: /\bvisse\b/gi, por: 'viu', diz: 'No Nordeste (Pernambuco): “viu?”.' },
  { id: 'parada', tipo: 'fixa', pt: 'que parada', re: /\bque parada( sinistra)?\b/gi, por: m => /sinistra/i.test(m) ? 'que coisa impressionante' : 'que coisa', diz: '“Parada”: coisa. “Sinistro”: impressionante (para o bem ou para o mal).' },
  { id: 'mimimi', tipo: 'nome', pt: 'mi-mi-mi', re: /\bmi-?mi-?mi\b/gi, por: 'reclamação', diz: 'Reclamação exagerada, choradeira.' },
  { id: 'leao', tipo: 'fixa', pt: 'fome de leão', re: /\buma fome de leão\b/gi, por: 'muita fome', diz: 'Muita fome.' },
  { id: 'desdeja', tipo: 'fixa', pt: 'desde já', re: /\bdesde já,?\s*/gi, por: 'antecipadamente, ', diz: 'Em cartas formais: “desde já” = antecipadamente.' },
  { id: 'reve', tipo: 'fixa', pt: 'revê-lo', re: /\brevê-(lo|la|los|las)\b/gi, por: (m, p) => `vê-${p} novamente`, diz: '“Revê-lo” = vê-lo de novo (não “revisar”).' },
  { id: 'anexo', tipo: 'fixa', pt: 'segue em anexo', re: /\bsegue(m)? (o|a|os|as) (\p{L}+) em anexo\b/giu, por: (m, s, a, x) => `envio em anexo ${a} ${x}`, diz: 'Em e-mails formais: “segue em anexo” = envio anexado.' },
  { id: 'munidos', tipo: 'fixa', pt: 'munido de', re: /\bmunid[oa]s? de\b/gi, por: 'com', diz: '“Munido de” = levando, com.' },
  { id: 'encaminho', tipo: 'fixa', pt: 'encaminho', re: /^encaminho,?/gi, por: 'envio', diz: '“Encaminho” = envio.' },
  { id: 'aniv', tipo: 'fixa', pt: 'fazer aniversário', re: /\b(faz|faço|fez|fazem) aniversário\b/gi, por: (m, v) => ({ faz: 'comemora o aniversário', faço: 'comemoro meu aniversário', fez: 'comemorou o aniversário', fazem: 'comemoram o aniversário' })[v.toLowerCase()], diz: '“Fazer aniversário”: ser o dia do aniversário.' },
  { id: 'passoumal', tipo: 'fixa', pt: 'passar mal', re: /\b(passou|passei|passaram|passo|passa) mal\b/gi, por: (m, v) => ({ passou: 'se sentiu mal', passei: 'me senti mal', passaram: 'se sentiram mal', passo: 'me sinto mal', passa: 'se sente mal' })[v.toLowerCase()], diz: '“Passar mal”: sentir-se mal, ficar doente.' },
  { id: 'dapara', tipo: 'fixa', pt: 'dá para…?', re: /\bdá (para|pra) (\p{L}+)/giu, por: (m, p, v) => `é possível ${v}`, diz: '“Dá para…” = é possível…' },
  { id: 'jaq', tipo: 'fixa', pt: 'você já…?', re: /^(você|vocês) já (\p{L}+)\?$/giu, por: (m, s, v) => `${s} ${v}?`, diz: 'Em pergunta, “já” é “yet / ya / déjà”, não “ever”.' },
  // nomes e palavras "intraduzíveis"
  { id: 'cafune', tipo: 'nome', pt: 'cafuné', re: /\bcafun[eé]s?\b/gi, por: 'carinho no cabelo', diz: 'Passar os dedos devagar no cabelo de alguém, com carinho. Quase nenhuma língua tem uma palavra só: descreve-se o gesto.' },
  { id: 'saudade', tipo: 'fixa', pt: 'saudade', re: /\b(estou|estava|fiquei|fico|tenho|tinha|sinto|senti|morro de|morrendo de) (com )?saudades? (d[aeo]s?)\b/gi,
    por: (m, v, com, art) => `${({ estou: 'sinto', estava: 'sentia', fiquei: 'senti', fico: 'sinto', tenho: 'sinto', tinha: 'sentia', sinto: 'sinto', senti: 'senti', 'morro de': 'sinto muita', 'morrendo de': 'sentindo muita' })[v.toLowerCase()] || 'sinto'} falta ${art}`,
    diz: 'Sentir falta de alguém ou de algo, com carinho e um pouco de tristeza. Em várias línguas vira “sentir falta” (miss, extrañar, manquer…).' },
  { id: 'saudade-n', tipo: 'nome', pt: 'saudade', re: /\bsaudades?\b/gi, por: m => /s$/i.test(m) ? 'nostalgias' : 'nostalgia', diz: 'Sentir falta de alguém ou de algo, com carinho e um pouco de tristeza.' },
  { id: 'gambiarra', tipo: 'nome', pt: 'gambiarra', re: /\bgambiarras?\b/gi, por: 'conserto improvisado', diz: 'Solução improvisada, criativa e provisória para consertar algo.' },
  { id: 'xodo', tipo: 'nome', pt: 'xodó', re: /\bxod[oó]s?\b/gi, por: 'preferido', diz: 'Pessoa, bicho ou coisa de que se gosta muito, o queridinho.' },
  { id: 'jeitinho', tipo: 'nome', pt: 'jeitinho', re: /\bjeitinho\b/gi, por: 'modo criativo de resolver', diz: 'O “jeitinho brasileiro”: um modo criativo (às vezes duvidoso) de contornar regras ou problemas.' },
  { id: 'paodur', tipo: 'nome', pt: 'pão-duro / mão de vaca', re: /\b(p[aã]o[- ]dur[oa]|m[aã]o[- ]de[- ]vaca)\b/gi, por: 'avarento', diz: 'Pessoa que não gosta de gastar dinheiro.' },
  { id: 'dorcot', tipo: 'nome', pt: 'dor de cotovelo', re: /\bdor de cotovelo\b/gi, por: 'ciúme', diz: 'Ciúme ou tristeza por amor não correspondido.' },
  { id: 'malandro', tipo: 'nome', pt: 'malandragem', re: /\bmalandragem\b/gi, por: 'esperteza', diz: 'Esperteza para se dar bem, às vezes passando por cima das regras.' },
  { id: 'chato', tipo: 'nome', pt: 'um saco', re: /\bum saco\b/gi, por: 'muito chato', diz: '“Que saco!”: algo muito chato ou irritante.' },
  // verbos com complemento (o verbo troca, a pessoa e o tempo ficam)
  { id: 'jeito', tipo: 'verbo', pt: 'dar um jeito', verbo: 'dar', resto: 'um jeito( em| no| na| nisso| nisto| naquilo)?', por: 'resolver', diz: 'Encontrar uma solução, mesmo que improvisada.' },
  { id: 'volta', tipo: 'verbo', pt: 'dar uma volta', verbo: 'dar', resto: 'uma volta', por: 'passear', diz: 'Sair para passear um pouco, sem destino certo.' },
  { id: 'certo', tipo: 'verbo', pt: 'dar certo', verbo: 'dar', resto: 'certo', por: 'funcionar', diz: 'Funcionar, ter sucesso.' },
  { id: 'errado', tipo: 'verbo', pt: 'dar errado', verbo: 'dar', resto: 'errado', por: 'fracassar', diz: 'Não funcionar, falhar.' },
  { id: 'bolo', tipo: 'verbo', pt: 'dar um bolo', verbo: 'dar', resto: 'um bolo( em| no| na)?', por: 'faltar ao encontro com', diz: 'Não aparecer num encontro combinado.' },
  { id: 'mao', tipo: 'verbo', pt: 'dar uma mão', verbo: 'dar', resto: 'uma m[aã]o', por: 'ajudar', diz: 'Ajudar.' },
  { id: 'papo', tipo: 'verbo', pt: 'bater papo', verbo: 'bater', resto: '(um )?papo', por: 'conversar', diz: 'Conversar de forma descontraída.' },
  { id: 'assunto', tipo: 'verbo', pt: 'puxar assunto', verbo: 'puxar', resto: 'assunto', por: 'começar uma conversa', diz: 'Começar uma conversa com alguém.' },
  { id: 'ficha', tipo: 'verbo', pt: 'cair a ficha', verbo: 'cair', resto: 'a ficha', por: 'perceber', diz: 'Entender algo de repente.' },
  { id: 'saco', tipo: 'verbo', pt: 'encher o saco', verbo: 'encher', resto: 'o saco( de| do| da)?', por: 'incomodar', diz: 'Irritar, incomodar.' },
  { id: 'bola', tipo: 'verbo', pt: 'pisar na bola', verbo: 'pisar', resto: 'na bola', por: 'errar', diz: 'Cometer um erro, decepcionar alguém.' },
  { id: 'quemico2', tipo: 'fixa', pt: 'que mico eu paguei', re: /\bque mico (eu )?(paguei|pagou|pagamos|pagaram)\b/gi, por: (m, e, v) => `que vergonha ${e || ''}${({ paguei: 'passei', pagou: 'passou', pagamos: 'passamos', pagaram: 'passaram' })[v.toLowerCase()]}`, diz: '“Pagar mico”: passar vergonha.' },
  { id: 'quemico', tipo: 'fixa', pt: 'que mico', re: /\bque mico\b/gi, por: 'que vergonha', diz: '“Pagar mico”: passar vergonha.' },
  { id: 'mico', tipo: 'verbo', pt: 'pagar mico', verbo: 'pagar', resto: '(um )?mico', por: 'passar vergonha', diz: 'Passar vergonha em público.' },
  { id: 'balde', tipo: 'verbo', pt: 'chutar o balde', verbo: 'chutar', resto: 'o balde', por: 'desistir de tudo', diz: 'Desistir de tudo, perder a paciência.' },
  { id: 'galho', tipo: 'verbo', pt: 'quebrar o galho', verbo: 'quebrar', resto: '(um |o )galho', por: 'resolver o problema', diz: 'Ajudar a resolver, mesmo que de forma provisória.' },
  { id: 'jogo', tipo: 'verbo', pt: 'abrir o jogo', verbo: 'abrir', resto: 'o jogo', por: 'falar a verdade', diz: 'Contar a verdade, ser sincero.' },
  { id: 'questao', tipo: 'verbo', pt: 'fazer questão', verbo: 'fazer', resto: 'quest[aã]o( de)?', por: 'insistir em', diz: 'Considerar muito importante; insistir.' },
  { id: 'hora', tipo: 'verbo', pt: 'fazer hora', verbo: 'fazer', resto: 'hora', por: 'passar o tempo', diz: 'Passar o tempo enquanto espera algo.' },
  { id: 'falta', tipo: 'verbo', pt: 'fazer falta', verbo: 'fazer', resto: 'falta', por: 'ser necessário', diz: '“Você me faz falta”: sentir falta de alguém ou algo.' },
  { id: 'sono', tipo: 'verbo', pt: 'pegar no sono', verbo: 'pegar', resto: 'no sono', por: 'adormecer', diz: 'Adormecer, cair no sono.' },
  { id: 'rir', tipo: 'verbo', pt: 'morrer de rir', verbo: 'morrer', resto: 'de rir', por: 'rir muito', diz: 'Rir muito.' },
  { id: 'fome', tipo: 'verbo', pt: 'morrer de fome', verbo: 'morrer', resto: 'de fome', por: 'ter muita fome', diz: 'Estar com muita fome (exagero).' },
  { id: 'graca', tipo: 'verbo', pt: 'ficar sem graça', verbo: 'ficar', resto: 'sem gra[cç]a', por: 'ficar envergonhado', diz: 'Ficar envergonhado, constrangido.' },
  { id: 'ficarcom', tipo: 'verbo', pt: 'ficar com alguém', verbo: 'ficar', resto: 'com (ele|ela|alguém|um cara|uma menina|uma garota|um garoto)', por: 'beijar', diz: '“Ficar com alguém”: beijar ou namorar sem compromisso.' },
  { id: 'cotovelos', tipo: 'verbo', pt: 'falar pelos cotovelos', verbo: 'falar', resto: 'pelos cotovelos', por: 'falar demais', diz: 'Falar demais.' },
  { id: 'pauzinhos', tipo: 'verbo', pt: 'mexer os pauzinhos', verbo: 'mexer', resto: 'os pauzinhos', por: 'usar a influência', diz: 'Usar contatos e influência para conseguir algo.' },
  { id: 'preguica', tipo: 'verbo', pt: 'estar com preguiça', verbo: 'estar', resto: 'com pregui[cç]a( de)?', por: 'não ter vontade de', diz: 'Não ter vontade de fazer nada.' },
  // expressões fixas
  { id: 'tantofaz', tipo: 'fixa', pt: 'tanto faz', re: /\btanto faz\b/gi, por: 'não faz diferença', diz: 'Não faz diferença, qualquer opção serve.' },
  { id: 'deixa', tipo: 'fixa', pt: 'deixa pra lá', re: /\bdeixa (para|pra) l[aá]\b/gi, por: 'esquece isso', diz: 'Esqueça, não tem importância.' },
  { id: 'deboa', tipo: 'fixa', pt: 'de boa', re: /\bde boa\b/gi, por: 'tranquilo', diz: 'Tranquilo, sem problemas.' },
  { id: 'atoa', tipo: 'fixa', pt: 'à toa / de bobeira', re: /\b(à toa|a toa|de bobeira)\b/gi, por: 'sem fazer nada', diz: 'Sem fazer nada, relaxando.' },
  { id: 'nuvens', tipo: 'fixa', pt: 'estar nas nuvens', re: /\bnas nuvens\b/gi, por: 'distraído', diz: 'Distraído, sonhando acordado.' },
  { id: 'corda', tipo: 'fixa', pt: 'com a corda toda', re: /\bcom a corda toda\b/gi, por: 'com muita energia', diz: 'Com muita energia.' },
  { id: 'valeu', tipo: 'fixa', pt: 'valeu', re: /\bvaleu\b(?! a pena)/gi, por: 'obrigado', diz: 'Obrigado (informal).' },
  { id: 'eai', tipo: 'fixa', pt: 'e aí', re: /^e a[ií]\b[,!?]?/gi, por: 'oi, tudo bem?', diz: 'Cumprimento informal: “oi, como vai?”.' },
  { id: 'beleza', tipo: 'fixa', pt: 'beleza?', re: /\bbeleza\?/gi, por: 'tudo bem?', diz: '“Beleza?” = “tudo bem?”.' },
  { id: 'nossa', tipo: 'fixa', pt: 'nossa!', re: /^nossa[,!]/gi, por: 'uau!', diz: 'Expressão de surpresa.' },
  { id: 'proximo', tipo: 'fixa', pt: 'o próximo', re: /\b(ao|no|o|do|pelo) próximo(?=\s*(?:[,.;!?…]|$|\se\s|\scomo\s))/gi,
    por: (m, art) => `${art.toLowerCase()}s outros`, diz: '“O próximo” como em “amar o próximo”: as outras pessoas, o semelhante. Não é “o seguinte”.' },
  { id: 'sabe', tipo: 'fixa', pt: 'sabe? / entende?', re: /,?\s*(sabe|entende)\?$/gi, por: '', diz: 'Muleta de fala, quase não muda o sentido.' }
];

/* ——— 3. Conjugação do português ———
   Lugares (slot): 0 eu (pres.), 1 ele/você (pres.), 2 nós (pres.), 3 eles/vocês (pres.),
   4 eu (pret.), 5 ele (pret.), 6 eles (pret.), 7 ele (imperf.), 8 eles (imperf.), 9 gerúndio, 10 particípio, 11 infinitivo */
const SUF = {
  ar: ['o', 'a', 'amos', 'am', 'ei', 'ou', 'aram', 'ava', 'avam', 'ando', 'ado', 'ar'],
  er: ['o', 'e', 'emos', 'em', 'i', 'eu', 'eram', 'ia', 'iam', 'endo', 'ido', 'er'],
  ir: ['o', 'e', 'imos', 'em', 'i', 'iu', 'iram', 'ia', 'iam', 'indo', 'ido', 'ir']
};
/* irregulares mais comuns, na ordem dos lugares acima */
const PT_IRREG = {
  ser: 'sou é somos são fui foi foram era eram sendo sido ser', estar: 'estou está estamos estão estive esteve estiveram estava estavam estando estado estar',
  ter: 'tenho tem temos têm tive teve tiveram tinha tinham tendo tido ter', ir: 'vou vai vamos vão fui foi foram ia iam indo ido ir',
  fazer: 'faço faz fazemos fazem fiz fez fizeram fazia faziam fazendo feito fazer', poder: 'posso pode podemos podem pude pôde puderam podia podiam podendo podido poder',
  querer: 'quero quer queremos querem quis quis quiseram queria queriam querendo querido querer', saber: 'sei sabe sabemos sabem soube soube souberam sabia sabiam sabendo sabido saber',
  ver: 'vejo vê vemos veem vi viu viram via viam vendo visto ver', vir: 'venho vem vimos vêm vim veio vieram vinha vinham vindo vindo vir',
  dizer: 'digo diz dizemos dizem disse disse disseram dizia diziam dizendo dito dizer', dar: 'dou dá damos dão dei deu deram dava davam dando dado dar',
  sair: 'saio sai saímos saem saí saiu saíram saía saíam saindo saído sair', trazer: 'trago traz trazemos trazem trouxe trouxe trouxeram trazia traziam trazendo trazido trazer',
  ouvir: 'ouço ouve ouvimos ouvem ouvi ouviu ouviram ouvia ouviam ouvindo ouvido ouvir', ler: 'leio lê lemos leem li leu leram lia liam lendo lido ler',
  pedir: 'peço pede pedimos pedem pedi pediu pediram pedia pediam pedindo pedido pedir', sentir: 'sinto sente sentimos sentem senti sentiu sentiram sentia sentiam sentindo sentido sentir',
  conseguir: 'consigo consegue conseguimos conseguem consegui conseguiu conseguiram conseguia conseguiam conseguindo conseguido conseguir',
  preferir: 'prefiro prefere preferimos preferem preferi preferiu preferiram preferia preferiam preferindo preferido preferir',
  perder: 'perco perde perdemos perdem perdi perdeu perderam perdia perdiam perdendo perdido perder', dormir: 'durmo dorme dormimos dormem dormi dormiu dormiram dormia dormiam dormindo dormido dormir',
  pôr: 'ponho põe pomos põem pus pôs puseram punha punham pondo posto pôr', cair: 'caio cai caímos caem caí caiu caíram caía caíam caindo caído cair',
  rir: 'rio ri rimos riem ri riu riram ria riam rindo rido rir', vestir: 'visto veste vestimos vestem vesti vestiu vestiram vestia vestiam vestindo vestido vestir',
  seguir: 'sigo segue seguimos seguem segui seguiu seguiram seguia seguiam seguindo seguido seguir', valer: 'valho vale valemos valem vali valeu valeram valia valiam valendo valido valer',
  morrer: 'morro morre morremos morrem morri morreu morreram morria morriam morrendo morrido morrer', fugir: 'fujo foge fugimos fogem fugi fugiu fugiram fugia fugiam fugindo fugido fugir'
};
function ptConj(inf, slot) {
  if (PT_IRREG[inf]) return PT_IRREG[inf].split(' ')[slot];
  const end = inf.slice(-2), root = inf.slice(0, -2), suf = SUF[end];
  if (!suf) return inf;
  let f = root + suf[slot];
  // ortografia: ficar → fiquei, pagar → paguei, começar → comecei, conhecer → conheço
  if (slot === 4 && end === 'ar') {
    if (root.endsWith('c')) f = root.slice(0, -1) + 'quei';
    else if (root.endsWith('g')) f = root + 'uei';
    else if (root.endsWith('ç')) f = root.slice(0, -1) + 'cei';
  }
  if (slot === 0 && end === 'er' && root.endsWith('c')) f = root.slice(0, -1) + 'ço';
  return f;
}
/* forma → { lemma, slot } (para trocar um verbo por outro na mesma pessoa e tempo) */
let FORMS = null;
function ptForms() {
  if (FORMS) return FORMS;
  FORMS = new Map();
  const add = inf => { for (let s = 0; s < 12; s++) { const f = ptConj(inf, s); if (f && !FORMS.has(f)) FORMS.set(f, { lemma: inf, slot: s }); } };
  Object.keys(PT_IRREG).forEach(add);
  (typeof PT_LEX_REG !== 'undefined' ? PT_LEX_REG : []).forEach(add);
  ['puxar', 'encher', 'pisar', 'chutar', 'quebrar', 'mexer', 'valer'].forEach(add);
  return FORMS;
}
/* pessoa → lugar do presente: eu, você, ele, ela, nós, vocês, eles, elas */
const PRES_SLOT = [0, 1, 1, 1, 2, 3, 3, 3];
function conjPhrase(inf, person) { return ptConj(inf, PRES_SLOT[person]); }
/* conjuga a primeira palavra de uma locução ("começar uma conversa" → "começo uma conversa") */
function conjLocucao(loc, slot) {
  const [v, ...rest] = loc.split(' ');
  return [ptConj(v, slot), ...rest].join(' ');
}

/* ——— Encontrar conceitos numa frase e reescrever para o tradutor ——— */
function verboRegex(c) {
  const forms = ptForms();
  const fs = [...forms.entries()].filter(([, v]) => v.lemma === c.verbo).map(([f]) => f);
  if (!fs.length) fs.push(c.verbo);
  return U(new RegExp(`\\b(${fs.sort((a, b) => b.length - a.length).join('|')}) (${c.resto})\\b`, 'gi'));
}
function conceitos(text) {
  const found = [];
  let rewritten = text;
  for (const c of CONCEITOS) {
    const re = c.tipo === 'verbo' ? verboRegex(c) : U(c.re);
    let hit = false;
    rewritten = rewritten.replace(re, (...args) => {
      const m = args[0];
      hit = true;
      if (c.tipo === 'verbo') {
        const info = ptForms().get(String(args[1]).toLowerCase());
        return info ? conjLocucao(c.por, info.slot) : m;
      }
      return typeof c.por === 'function' ? c.por(...args) : c.por;
    });
    if (hit && !found.some(f => f.id === c.id)) found.push(c);
  }
  rewritten = rewritten.replace(U(/\b(com|para|de) n(ele|ela|eles|elas)\b/gi), '$1 $2');
  if (/^\p{Lu}/u.test(text)) rewritten = rewritten.replace(/^\s*(\p{Ll})/u, (m, c) => c.toUpperCase());
  return { found, rewritten: rewritten.replace(/\s{2,}/g, ' ').trim() };
}

/* ——— Sujeito oculto ———
   Em português o sujeito some quando a frase anterior já disse quem é:
   “Tito era feliz. Pensava sempre no próximo.” → quem pensava é o Tito.
   O tradutor neural vê uma frase de cada vez e chutaria “eu”. Aqui o app acompanha
   o sujeito e o deixa explícito antes de traduzir. */
const PRON_SUJ = { eu: '1s', você: '3s', ele: '3sm', ela: '3sf', nós: '1p', 'a gente': '1p', vocês: '3p', eles: '3pm', elas: '3pf' };
const ADV_INICIO = /^(sempre|nunca|também|ontem|hoje|amanhã|depois|então|já|ainda|só|agora|logo|às vezes|de manhã|à noite|todo dia|todos os dias)\b[,]?\s*/iu;
function generoDe(sentence, nome) {
  const s = sentence.toLowerCase();
  if (/\b(uma|a|esta|essa)\s+\p{L}+a\b/u.test(s.replace(/^\S+\s+\S+/, '')) && /\b(é|era|foi|está|estava)\s+(uma|a)\b/u.test(s)) return 'f';
  if (/\b(é|era|foi|está|estava)\s+(um|o)\b/u.test(s)) return 'm';
  if (/^(a|as|uma)\s/i.test(sentence)) return 'f';
  if (/^(o|os|um)\s/i.test(sentence)) return 'm';
  if (nome && /a$/i.test(nome) && !/^(luca|joshua|nikita)$/i.test(nome)) return 'f';
  return 'm';
}
function sujeitoOculto(list) {
  const forms = ptForms();
  let suj = null;   // { p: '3s'|'3p'|'1s'|'1p', g: 'm'|'f' }
  return list.map(sent => {
    const s = sent.trim();
    const low = s.toLowerCase();
    const lead = (low.match(ADV_INICIO) || [''])[0];
    const rest = low.slice(lead.length);
    const first = (rest.match(/^[\p{L}]+/u) || [''])[0];
    const two = (rest.match(/^[\p{L}]+\s+[\p{L}]+/u) || [''])[0];
    // sujeito explícito no começo: pronome
    const pk = PRON_SUJ[two] ? two : PRON_SUJ[first] ? first : null;
    if (pk) { const c = PRON_SUJ[pk]; suj = { p: c.slice(0, 2), g: c[2] || (suj && suj.g) || 'm' }; return s; }
    const info = forms.get(first);
    if (!info) {
      // começa com um nome ou com “o/a + nome” seguido de verbo: vira o novo sujeito
      const toks = (s.replace(ADV_INICIO, '').match(/[\p{L}]+/gu) || []);
      const det = /^(o|a|os|as|um|uma|meu|minha|meus|minhas|seu|sua|seus|suas|nosso|nossa|esse|essa|este|esta)$/i;
      let i = 0; const dets = [];
      while (i < toks.length && det.test(toks[i])) dets.push(toks[i++].toLowerCase());
      for (let j = i + 1; j <= i + 3 && j < toks.length; j++) {
        const v = forms.get(toks[j].toLowerCase());
        if (!v) continue;
        const plural = [3, 6, 8].includes(v.slot) || dets.some(d => /s$/.test(d));
        const fem = dets.some(d => /^(a|as|uma|minha|minhas|sua|suas|nossa|essa|esta)$/.test(d));
        const masc = dets.some(d => /^(o|os|um|meu|meus|seu|seus|nosso|esse|este)$/.test(d));
        suj = { p: plural ? '3p' : '3s', g: fem ? 'f' : masc ? 'm' : generoDe(s, toks[i]) };
        break;
      }
      return s;
    }
    // começa com verbo, sem sujeito: usa o sujeito que vem da frase anterior
    if (!suj) return s;
    const sl = info.slot;
    const terceira = [1, 5, 7].includes(sl), plural3 = [3, 6, 8].includes(sl);
    let pron = '';
    if (suj.p === '3s' && terceira) pron = suj.g === 'f' ? 'ela' : 'ele';
    else if (suj.p === '3p' && plural3) pron = suj.g === 'f' ? 'elas' : 'eles';
    if (!pron) return s;
    const body = s.charAt(0).toLowerCase() + s.slice(1);
    return pron.charAt(0).toUpperCase() + pron.slice(1) + ' ' + body;
  });
}

/* Nomes próprios não se traduzem: o tradutor às vezes troca “Maria” por “Mary”.
   Se um nome do português sumiu e apareceu um nome novo no lugar, devolve o original. */
function manterNomes(pt, out) {
  if (!/[A-Za-zÀ-ÿ]/.test(out)) return out;   // escrita não latina: não se aplica
  const ptToks = pt.match(/[\p{L}]+/gu) || [];
  const comum = w => SETS.pt.has(w.toLowerCase()) || ptForms().has(w.toLowerCase()) || /^(depois|então|agora|logo|cedo|tarde|semana|domingo|segunda|sábado|ainda|também)$/i.test(w);
  const names = ptToks.filter(w => /^\p{Lu}/u.test(w) && !comum(w));
  let res = out;
  for (const n of names) {
    if (res.includes(n)) continue;
    const outToks = res.match(/[\p{L}]+/gu) || [];
    const cand = outToks.filter((w, i) => /^\p{Lu}/u.test(w) && !ptToks.includes(w) && (i > 0 || ptToks[0] === n) && !/^(I|My|The|A|An|He|She|We|They|You|It|His|Her|Our|Their|El|La|Los|Las|Mi|Le|Les|Il|Elle|Ils|Lo|Gli|Der|Die|Das|Ich|Er|Sie|Wir|Mein|Meine)$/.test(w));
    if (cand.length === 1) res = res.replace(new RegExp(`(?<![\\p{L}])${cand[0]}(?![\\p{L}])`, 'u'), n);
  }
  return res;
}

/* Divide um texto em frases. */
function frases(text) {
  return String(text).split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
}

/* Complemento que define o sentido de um verbo na frase (até 3 palavras, para antes de vírgula/conjunção). */
function complemento(sentence, verbForm) {
  const words = sentence.replace(/[.!?…]+$/, '').split(/\s+/);
  const i = words.findIndex(w => w.toLowerCase().replace(/[,;:]$/, '') === verbForm.toLowerCase());
  if (i < 0) return '';
  const out = [];
  for (const w of words.slice(i + 1)) {
    const clean = w.toLowerCase();
    if (/^(e|mas|que|porque|quando|se|ou|depois|antes|então)$/.test(clean)) break;
    if (out.length >= 2 && /^(de|da|do|em|no|na|às|as|ao|à|pela|pelo|com|para|todo|toda)$/.test(clean)) break;
    out.push(w.replace(/[,;:]$/, ''));
    if (/[,;:]$/.test(w) || out.length >= 3) break;
  }
  return out.join(' ');
}

/* Diferença palavra a palavra entre o que o aluno escreveu e uma referência (para marcar). */
function diffWords(a, b) {
  const tok = s => String(s).split(/(\s+)/).filter(x => x.trim());
  const A = tok(a), B = tok(b);
  const norm = w => w.toLowerCase().replace(/[.,!?¡¿;:"“”]/g, '');
  const dp = Array.from({ length: A.length + 1 }, () => Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
    dp[i][j] = norm(A[i]) === norm(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (norm(A[i]) === norm(B[j])) { out.push({ t: B[j], k: 'eq' }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: A[i], k: 'del' }); i++; }
    else { out.push({ t: B[j], k: 'add' }); j++; }
  }
  while (i < A.length) out.push({ t: A[i++], k: 'del' });
  while (j < B.length) out.push({ t: B[j++], k: 'add' });
  const same = dp[0][0], score = Math.round(2 * same / Math.max(1, A.length + B.length) * 100);
  return { parts: out, score };
}

/* Romanização do coreano (Romanização Revisada, simplificada). */
function romanKo(text) {
  const I = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const V = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const F = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
  return [...String(text)].map(ch => {
    const c = ch.charCodeAt(0) - 0xAC00;
    if (c < 0 || c > 11171) return ch;
    return I[Math.floor(c / 588)] + V[Math.floor((c % 588) / 28)] + F[c % 28];
  }).join('');
}

/* ——— Em que língua a pessoa escreveu? ———
   O diário aceita português ou a língua estudada e descobre sozinho. */
const PALAVRAS = {
  pt: 'eu você voce não nao que de um uma com para pra é está esta muito mas meu minha ele ela nós também hoje ontem tô tá e o os as do da dos das no na em se foi era tenho quero vou isso isto aqui gente porque quando mais já ainda sempre nunca coisa amanhã casa trabalho estou fui fiz',
  en: 'i you the and is are am to of my he she we it in with was were have has not do did this that me they at on for be but so today yesterday very',
  es: 'yo tú el la los las y es está estoy muy pero mi con para que de un una no hoy ayer tengo quiero voy soy fui hice también porque cuando más ya todavía siempre nunca cosa mañana casa trabajo ella nosotros',
  fr: 'je tu il elle nous vous le la les et est suis pas très mon ma mes avec pour que de un une aujourd hier ai veux vais fait aussi parce quand plus déjà toujours jamais chose demain maison travail ne',
  de: 'ich du er sie wir ihr der die das und ist bin nicht sehr mein meine mit für ein eine heute gestern habe will gehe auch weil wenn mehr schon immer nie morgen haus arbeit zu den dem',
  it: 'io tu lui lei noi voi il lo la gli le e è sono non molto mio mia con per che di un una oggi ieri ho voglio vado anche perché quando più già sempre mai cosa domani casa lavoro'
};
const SETS = Object.fromEntries(Object.entries(PALAVRAS).map(([k, v]) => [k, new Set(v.split(' '))]));
function detectaLingua(text, langId) {
  const t = String(text);
  const script = { ja: /[぀-ヿ一-鿿]/, ko: /[가-힯]/, he: /[֐-׿]/ }[langId];
  if (script) return script.test(t) ? langId : 'pt';
  const words = t.toLowerCase().match(/[\p{L}]+/gu) || [];
  if (!words.length) return 'pt';
  const score = k => words.reduce((n, w) => n + (SETS[k] && SETS[k].has(w) ? 1 : 0), 0);
  let pt = score('pt'), tg = score(langId);
  if (/[ãõ]/i.test(t)) pt += 2;
  if (langId === 'es' && /[ñ¿¡]/.test(t)) tg += 2;
  if (langId === 'de' && /[ßäöü]/i.test(t)) tg += 2;
  if (langId === 'fr' && /\b(je|j'|j’|c'est|n'|qu')/i.test(t)) tg += 2;
  return tg > pt ? langId : 'pt';
}

/* ——— Gramática: terminações regulares por pessoa ———
   Confere QUALQUER verbo regular depois do pronome, mesmo os que o app nunca viu
   (“yo toma” → “yo tomo”). Pessoas: 1s, 2s, 3s, 1p, 2p, 3p. Classes: as famílias de verbos. */
const TERM = {
  es: {
    pron: { yo: '1s', tú: '2s', tu: '2s', él: '3s', ella: '3s', usted: '3s', nosotros: '1p', nosotras: '1p', ellos: '3p', ellas: '3p', ustedes: '3p' },
    classes: { '-ar': { '1s': 'o', '2s': 'as', '3s': 'a', '1p': 'amos', '3p': 'an' }, '-er/-ir': { '1s': 'o', '2s': 'es', '3s': 'e', '1p': 'emos', '3p': 'en' } },
    pula: 'me te se lo la le nos os les no ya también siempre nunca'.split(' '),
    nao: 'nada casa mucho poco ahora aquí allí entonces hoy mañana ayer tampoco muy pero una uno algo cada toda todo misma mismo sola solo sólo nunca siempre tarde pronto'.split(' ')
  },
  it: {
    pron: { io: '1s', tu: '2s', lui: '3s', lei: '3s', noi: '1p', voi: '2p', loro: '3p' },
    classes: { '-are': { '1s': 'o', '2s': 'i', '3s': 'a', '1p': 'iamo', '2p': 'ate', '3p': 'ano' }, '-ere': { '1s': 'o', '2s': 'i', '3s': 'e', '1p': 'iamo', '2p': 'ete', '3p': 'ono' } },
    pula: 'mi ti si lo la li le ci vi ne non già anche sempre mai'.split(' '),
    nao: 'molto poco ancora adesso oggi domani ieri sempre mai tanto tutta tutto qui sola solo cosa casa'.split(' ')
  },
  fr: {
    pron: { je: '1s', tu: '2s', il: '3s', elle: '3s', on: '3s', nous: '1p', vous: '2p', ils: '3p', elles: '3p' },
    classes: { '-er': { '1s': 'e', '2s': 'es', '3s': 'e', '1p': 'ons', '2p': 'ez', '3p': 'ent' } },
    pula: "ne n me m te t se s le la les lui y en l".split(' '),
    nao: 'très bien aussi toujours jamais souvent encore déjà ici demain hier tout toute même seule seul'.split(' ')
  },
  de: {
    pron: { ich: '1s', du: '2s', er: '3s', es: '3s', wir: '1p', ihr: '2p' },
    classes: { 'regular': { '1s': 'e', '2s': 'st', '3s': 't', '1p': 'en', '2p': 't' } },
    pula: 'nicht auch immer nie heute gern oft'.split(' '),
    nao: 'sehr heute morgen gestern immer nie auch noch schon hier dort alle alles gerne'.split(' ')
  }
};
const PESSOA_PT = { '1s': 'eu', '2s': 'tu/você', '3s': 'ele/ela', '1p': 'nós', '2p': 'vocês', '3p': 'eles/elas' };
/* Para um pronome e a palavra seguinte, devolve a correção da terminação (ou null). */
function confereTerminacao(langId, pron, word) {
  const G = TERM[langId]; if (!G) return null;
  const want = G.pron[pron.toLowerCase()]; if (!want) return null;
  const w = word.toLowerCase();
  if (w.length < 4 || G.nao.includes(w) || /[éèíóú]$/.test(w)) return null;   // pretérito (tomé, mangé…) e palavras que não são verbo
  for (const [cls, P] of Object.entries(G.classes)) {
    if (w.endsWith(P[want])) return null;            // já está na pessoa certa nesta família
  }
  // acha em que pessoa a palavra está, pela terminação mais longa
  let best = null;
  for (const [cls, P] of Object.entries(G.classes)) for (const [p, end] of Object.entries(P)) {
    if (p === want || !w.endsWith(end)) continue;
    if (!best || end.length > best.end.length) best = { cls, p, end };
  }
  if (!best) return null;
  const P = G.classes[best.cls];
  // terminações iguais em duas pessoas (fr: e = je/il; es: o só existe em 1s) — sem certeza, não corrige
  const same = Object.entries(P).filter(([p, e]) => e === best.end).map(([p]) => p);
  if (same.includes(want)) return null;
  if (!P[want]) return null;
  const stem = word.slice(0, word.length - best.end.length);
  if (stem.length < 2) return null;
  let fix = stem + P[want];
  // ortografia: manger → nous mangeons, commencer → nous commençons; pagar → (es) sem mudança no presente
  if (langId === 'fr' && want === '1p') fix = fix.replace(/gons$/, 'geons').replace(/cons$/, 'çons');
  if (langId === 'it' && want === '2s') fix = fix.replace(/ii$/, 'i').replace(/ci$/, stem.endsWith('c') ? 'chi' : 'ci').replace(/gi$/, stem.endsWith('g') ? 'ghi' : 'gi');
  return { fix, why: `Com “${pron}” (${PESSOA_PT[want]}), a terminação é “-${P[want]}”: “${fix}”. “${word}” é a forma de ${PESSOA_PT[best.p]}.` };
}

/* ——— Variações: a frase da pessoa muda de pessoa e de tempo ———
   “Eu acordei cedo e fui correr” → “Ela acordou cedo e foi correr” / “Nós acordamos…” / “Eu acordo cedo…”.
   Saber uma língua é conseguir variar o que se diz, não decorar a frase. */
const VAR_PESSOAS = { eu: 'eu', ele: '3s', ela: '3s', você: '3s', 'a gente': '3s', nós: 'nós', eles: '3p', elas: '3p', vocês: '3p' };
/* lugar da conjugação para (pessoa, tempo); null = sem forma segura */
function lugar(pessoa, tempo, lemma) {
  const T = { pres: { eu: 0, '3s': 1, nós: 2, '3p': 3 }, pret: { eu: 4, '3s': 5, '3p': 6, nós: null }, imp: { eu: 7, '3s': 7, '3p': 8, nós: null } };
  return T[tempo][pessoa];
}
const NOS_PRET = { ser: 'fomos', ir: 'fomos', ter: 'tivemos', fazer: 'fizemos', estar: 'estivemos', poder: 'pudemos', querer: 'quisemos', dizer: 'dissemos', dar: 'demos', ver: 'vimos', vir: 'viemos', saber: 'soubemos', trazer: 'trouxemos', pôr: 'pusemos', caber: 'coubemos' };
const NOS_IMP = { ser: 'éramos', ir: 'íamos', ter: 'tínhamos', vir: 'vínhamos', pôr: 'púnhamos' };
function formaNos(lemma, tempo) {
  // pretérito de “nós” = presente nos verbos regulares (acordamos, comemos, partimos)
  if (tempo === 'pret') return NOS_PRET[lemma] || ptConj(lemma, 2);
  if (tempo === 'imp') { if (NOS_IMP[lemma]) return NOS_IMP[lemma]; const e = lemma.slice(-2), r = lemma.slice(0, -2); return r + (e === 'ar' ? 'ávamos' : 'íamos'); }
  return null;
}
/* palavras que parecem verbo mas quase sempre são outra coisa nesta posição */
const NAO_VERBO = new Set(['para', 'pela', 'pelo', 'sobre', 'entre', 'como', 'casa', 'cedo', 'logo', 'mesmo', 'meio', 'certo', 'junto']);
/* “fui/foi/foram” é ir quando vem seguido de lugar ou de infinitivo; senão é ser */
function serOuIr(f, low, i, forms) {
  if (!f || f.lemma !== 'ser' || !/^(fui|foi|foram|fomos)$/.test(low[i])) return f;
  let j = i + 1; while (j < low.length && !/[\p{L}]/u.test(low[j])) j++;
  const nx = low[j] || '';
  if (/^(a|ao|à|aos|às|para|pra|pro|embora|lá|até|no|na|em)$/.test(nx) || (forms.get(nx) && forms.get(nx).slot === 11)) return { lemma: 'ir', slot: f.slot };
  return f;
}
/* concordância do adjetivo depois de ser/estar/ficar quando a pessoa muda
   (“Eu estou cansado” → “Ela está cansada” · “Nós estamos cansados”) */
const COPULA = new Set(['ser', 'estar', 'ficar', 'parecer', 'continuar', 'andar']);
const COPULA_NOS = new Set(['estamos', 'estávamos', 'estivemos', 'somos', 'éramos', 'fomos', 'ficamos', 'ficávamos', 'parecemos', 'continuamos', 'andamos']);
const DET_ANTES = new Set(['o', 'a', 'os', 'as', 'no', 'na', 'nos', 'nas', 'do', 'da', 'dos', 'das', 'um', 'uma', 'meu', 'minha', 'seu', 'sua', 'teu', 'tua', 'nosso', 'nossa', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'pelo', 'pela', 'ao', 'num', 'numa']);
const ADJ_PULA = new Set(['muito', 'muita', 'tão', 'bem', 'meio', 'super', 'mas', 'e', 'pouco', 'bastante', 'mais', 'menos', 'um', 'nem', 'ou']);
const ADJ_PARA = new Set(['em', 'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'com', 'para', 'pra', 'a', 'o', 'os', 'as', 'porque', 'que', 'quando', 'se', 'hoje', 'agora', 'cedo', 'tarde', 'aqui', 'lá', 'ali', 'ainda', 'sempre', 'já', 'ontem', 'amanhã', 'por', 'sem', 'até', 'como', 'onde', 'assim']);
function flexAdj(w, gen, plur) {
  let x = w.toLowerCase();
  if (/(ão|ões)$/.test(x)) return w;
  if (gen === 'f') x = x.replace(/o$/, 'a').replace(/os$/, 'as');
  if (plur && !/s$/.test(x)) x = /[aeiouéêó]$/.test(x) ? x + 's' : /z$|r$/.test(x) ? x + 'es' : /l$/.test(x) ? x.replace(/l$/, 'is') : x;
  return x;
}
function concordaAdj(txt, de, para, forms) {
  if (de === para) return txt;
  const plur = para === 'nós' || para === '3p', gen = para === '3s' ? 'f' : null;
  const toks = txt.match(/[\p{L}]+|[^\p{L}]+/gu) || [];
  let on = false;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!/\p{L}/u.test(t)) { if (/[.;!?]/.test(t)) on = false; continue; }
    const lw = t.toLowerCase(), f = forms.get(lw);
    if ((f && COPULA.has(f.lemma)) || COPULA_NOS.has(lw)) { on = true; continue; }
    if (!on) continue;
    if (ADJ_PULA.has(lw)) continue;
    if (ADJ_PARA.has(lw) || f) { on = false; continue; }
    toks[i] = flexAdj(t, gen, plur);
  }
  return toks.join('');
}

function variacoes(frase) {
  const forms = ptForms();
  const toks = frase.match(/[\p{L}]+|[^\p{L}]+/gu) || [];
  const low = toks.map(t => t.toLowerCase());
  // acha o primeiro verbo conjugado (não infinitivo nem gerúndio)
  let vi = -1, info = null;
  for (let i = 0; i < toks.length; i++) {
    const f = NAO_VERBO.has(low[i]) ? null : serOuIr(forms.get(low[i]), low, i, forms);
    if (f && f.slot <= 8) { vi = i; info = f; break; }
  }
  if (!info) return [];
  const slotTempo = s => (s <= 3 ? 'pres' : s <= 6 ? 'pret' : 'imp');
  const slotPessoa = s => ({ 0: 'eu', 1: '3s', 2: 'nós', 3: '3p', 4: 'eu', 5: '3s', 6: '3p', 7: '3s', 8: '3p' })[s];
  // sujeito: pronome logo antes do verbo (ou oculto)
  let pi = -1, sujeito = null;
  for (let j = vi - 1; j >= 0 && j >= vi - 4; j--) { if (VAR_PESSOAS[low[j]]) { pi = j; sujeito = VAR_PESSOAS[low[j]]; break; } }
  let tempo = slotTempo(info.slot), pessoa = sujeito || slotPessoa(info.slot);
  if (info.slot === 7 && !sujeito) pessoa = 'eu';
  // todos os verbos da frase na mesma pessoa e tempo mudam juntos
  const alvo = toks.map((t, i) => { const f = NAO_VERBO.has(low[i]) || (i !== vi && DET_ANTES.has(low[i - 2])) ? null : serOuIr(forms.get(low[i]), low, i, forms); return f && f.slot <= 8 && slotTempo(f.slot) === tempo && (slotPessoa(f.slot) === pessoa || (f.slot === 7 && pessoa === 'eu')) || i === vi ? f : null; });
  // sujeito que é um nome (“Meus pais moram…”): só dá para variar o tempo, não a pessoa
  const antes = toks.slice(0, vi).join('').replace(ADV_INICIO, '').trim();
  const temNome = pi < 0 && /[\p{L}]/u.test(antes);
  const monta = (novaPessoa, novoTempo, pron) => {
    const out = toks.slice();
    for (let i = 0; i < toks.length; i++) {
      const f = alvo[i]; if (!f) continue;
      const s = novaPessoa === 'nós' ? null : lugar(novaPessoa, novoTempo, f.lemma);
      const nova = novaPessoa === 'nós' && (novoTempo === 'pres' ? ptConj(f.lemma, 2) : formaNos(f.lemma, novoTempo)) || (s !== null && s !== undefined ? ptConj(f.lemma, s) : null);
      if (!nova) return null;
      out[i] = /^\p{Lu}/u.test(toks[i]) ? nova.charAt(0).toUpperCase() + nova.slice(1) : nova;
    }
    let txt;
    if (pi >= 0) { out[pi] = /^\p{Lu}/u.test(toks[pi]) ? pron.charAt(0).toUpperCase() + pron.slice(1) : pron; txt = out.join(''); }
    else if (temNome) txt = out.join('');
    else if (vi === 0) { txt = out.join(''); txt = pron.charAt(0).toUpperCase() + pron.slice(1) + ' ' + txt.charAt(0).toLowerCase() + txt.slice(1); }
    else { out[vi] = pron + ' ' + out[vi].toLowerCase(); txt = out.join(''); }
    txt = concordaAdj(txt, pessoa, novaPessoa, forms);
    if (novoTempo === 'pres' && tempo !== 'pres') txt = txt.replace(U(/\bontem\b/g), 'hoje').replace(U(/\bOntem\b/g), 'Hoje');
    return txt.replace(/\s{2,}/g, ' ');
  };
  const nomeTempo = { pres: 'presente', pret: 'passado', imp: 'passado contínuo' };
  const res = [];
  const add = (p, t, pron, label) => { const v = monta(p, t, pron); if (v && v !== frase && !res.some(r => r.pt === v)) res.push({ pt: v, label }); };
  if (!temNome) {
    if (pessoa !== '3s') add('3s', tempo, 'ela', `outra pessoa: ela · ${nomeTempo[tempo]}`);
    if (pessoa !== 'nós') add('nós', tempo, 'nós', `nós · ${nomeTempo[tempo]}`);
    if (pessoa !== '3p') add('3p', tempo, 'eles', `eles · ${nomeTempo[tempo]}`);
  }
  const outroTempo = tempo === 'pres' ? 'pret' : 'pres';
  add(pessoa === 'nós' ? 'nós' : pessoa, outroTempo, ({ eu: 'eu', '3s': 'ela', nós: 'nós', '3p': 'eles' })[pessoa], `${({ eu: 'eu', '3s': 'ela', nós: 'nós', '3p': 'eles' })[pessoa]} · ${nomeTempo[outroTempo]}`);
  return res.slice(0, 4);
}
