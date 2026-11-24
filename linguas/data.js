/* RAIZ — dados das línguas.
   Ordem das pessoas em todo o app:
   0 eu · 1 você · 2 ele · 3 ela · 4 nós · 5 vocês · 6 eles · 7 elas */

const PT_PRON = ['eu', 'você', 'ele', 'ela', 'nós', 'vocês', 'eles', 'elas'];
const PT_SER = ['eu sou', 'você é', 'ele é', 'ela é', 'nós somos', 'vocês são', 'eles são', 'elas são'];
const PT_ESTAR = ['eu estou', 'você está', 'ele está', 'ela está', 'nós estamos', 'vocês estão', 'eles estão', 'elas estão'];
const PT_SERESTAR = ['eu sou / estou', 'você é / está', 'ele é / está', 'ela é / está', 'nós somos / estamos', 'vocês são / estão', 'eles são / estão', 'elas são / estão'];
const PT_ERA = ['eu era / estava', 'você era / estava', 'ele era / estava', 'ela era / estava', 'nós éramos / estávamos', 'vocês eram / estavam', 'eles eram / estavam', 'elas eram / estavam'];

/* 6 formas (eu, tu/você, ele/ela, nós, vocês, eles/elas) -> 8 pessoas */
const MAP6 = [0, 1, 2, 2, 3, 4, 5, 5];

const LANGS = [
  {
    id: 'en', name: 'Inglês', native: 'English', glyph: 'I', color: '#2B59FF', ink: '#0D1E66', tts: 'en-US', dir: 'ltr',
    pron: ['I', 'you', 'he', 'she', 'we', 'you', 'they', 'they'],
    pronNote: '“You” serve para você e para vocês. “They” serve para eles e elas. “I” é sempre maiúsculo.',
    ser: { same: true, label: 'to be', verb: ['am', 'is'], forms8: ['am', 'are', 'is', 'is', 'are', 'are', 'are', 'are'],
      note: 'Em inglês, ser e estar são o MESMO verbo: to be. “I am tired” (estou cansado) e “I am Brazilian” (sou brasileiro).',
      ex: [['Eu sou brasileiro.', 'I am Brazilian.'], ['Eu estou cansado.', 'I am tired.']] }
  },
  {
    id: 'fr', name: 'Francês', native: 'Français', glyph: 'Je', color: '#FF5A36', ink: '#6B1600', tts: 'fr-FR', dir: 'ltr',
    pron: ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'],
    pronNote: '“Vous” é vocês e também o “você” formal. Antes de vogal, “je” vira “j’” (j’ai).',
    ser: { same: true, label: 'être', forms6: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
      note: 'Em francês, ser e estar são o MESMO verbo: être. “Je suis fatigué” (estou cansado), “Je suis brésilien” (sou brasileiro).',
      ex: [['Eu sou brasileiro.', 'Je suis brésilien.'], ['Eu estou cansado.', 'Je suis fatigué.']] }
  },
  {
    id: 'es', name: 'Espanhol', native: 'Español', glyph: 'Yo', color: '#FFB703', ink: '#5C3B00', tts: 'es-ES', dir: 'ltr',
    pron: ['yo', 'tú', 'él', 'ella', 'nosotros', 'ustedes', 'ellos', 'ellas'],
    pronNote: 'Na Espanha, “vocês” informal é “vosotros”. Na América Latina usa-se “ustedes”. O pronome costuma ser omitido: “soy” já quer dizer “eu sou”.',
    ser: { same: false, label: 'ser · estar',
      ser6: ['soy', 'eres', 'es', 'somos', 'son', 'son'],
      estar6: ['estoy', 'estás', 'está', 'estamos', 'están', 'están'],
      note: 'Igual ao português: ser para o que é permanente, estar para o que é momentâneo.',
      ex: [['Eu sou brasileiro.', 'Yo soy brasileño.'], ['Eu estou cansado.', 'Yo estoy cansado.']] }
  },
  {
    id: 'de', name: 'Alemão', native: 'Deutsch', glyph: 'Ich', color: '#00A676', ink: '#003D2B', tts: 'de-DE', dir: 'ltr',
    pron: ['ich', 'du', 'er', 'sie', 'wir', 'ihr', 'sie', 'sie'],
    pronNote: '“Sie” com maiúscula é o “você/vocês” formal. “sie” minúsculo é ela e também eles/elas — o verbo ajuda a diferenciar.',
    ser: { same: true, label: 'sein', forms6: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
      note: 'Em alemão, ser e estar são o MESMO verbo: sein. “Ich bin müde” (estou cansado), “Ich bin Brasilianer” (sou brasileiro).',
      ex: [['Eu sou brasileiro.', 'Ich bin Brasilianer.'], ['Eu estou cansado.', 'Ich bin müde.']] }
  },
  {
    id: 'it', name: 'Italiano', native: 'Italiano', glyph: 'Io', color: '#FF3EA5', ink: '#5E0034', tts: 'it-IT', dir: 'ltr',
    pron: ['io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'loro'],
    pronNote: '“Lei” com maiúscula também é o “você” formal. “Loro” serve para eles e elas. Como no espanhol, o pronome costuma ser omitido.',
    ser: { same: false, label: 'essere · stare',
      ser6: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
      estar6: ['sto', 'stai', 'sta', 'stiamo', 'state', 'stanno'],
      note: 'Cuidado: o italiano usa “essere” para quase tudo, inclusive estados (“sono stanco” = estou cansado). “Stare” aparece em “come stai?” (como você está?) e em “sto mangiando” (estou comendo).',
      ex: [['Eu estou cansado.', 'Io sono stanco.'], ['Como você está?', 'Come stai?']] }
  },
  {
    id: 'ja', name: 'Japonês', native: '日本語', glyph: '私', color: '#E63946', ink: '#5A0910', tts: 'ja-JP', dir: 'ltr', roman: true,
    pron: ['私', 'あなた', '彼', '彼女', '私たち', 'あなたたち', '彼ら', '彼女たち'],
    pronR: ['watashi', 'anata', 'kare', 'kanojo', 'watashitachi', 'anatatachi', 'karera', 'kanojotachi'],
    topic: ['私は', 'あなたは', '彼は', '彼女は', '私たちは', 'あなたたちは', '彼らは', '彼女たちは'],
    topicR: ['watashi wa', 'anata wa', 'kare wa', 'kanojo wa', 'watashitachi wa', 'anatatachi wa', 'karera wa', 'kanojotachi wa'],
    pronNote: 'No dia a dia o pronome quase sempre é omitido. “あなた” pode soar distante — prefere-se o nome da pessoa. は (wa) marca o tema da frase. O verbo não muda com a pessoa!',
    ser: { same: false, label: 'です · います', jaSer: ['〜です', '~ desu'], jaEstar: ['〜に います', '~ ni imasu'],
      note: 'です (desu) é o “ser”: 私は 学生です = eu sou estudante. います (imasu) é “estar/existir” para pessoas e animais em um lugar: 私は 家に います = estou em casa. Estados (“estou cansado”) usam adjetivo + です.',
      ex: [['Eu sou estudante.', '私は 学生です。', 'watashi wa gakusei desu'], ['Eu estou em casa.', '私は 家に います。', 'watashi wa ie ni imasu']] }
  },
  {
    id: 'ko', name: 'Coreano', native: '한국어', glyph: '나', color: '#7B4DFF', ink: '#24006B', tts: 'ko-KR', dir: 'ltr', roman: true,
    pron: ['저', '너', '그', '그녀', '우리', '너희', '그들', '그녀들'],
    pronR: ['jeo', 'neo', 'geu', 'geunyeo', 'uri', 'neohui', 'geudeul', 'geunyeodeul'],
    topic: ['저는', '너는', '그는', '그녀는', '우리는', '너희는', '그들은', '그녀들은'],
    topicR: ['jeoneun', 'neoneun', 'geuneun', 'geunyeoneun', 'urineun', 'neohuineun', 'geudeureun', 'geunyeodeureun'],
    pronNote: '저 (jeo) é o “eu” educado; 나 (na) é o “eu” entre amigos. 너 (neo) só com íntimos. 는/은 marca o tema. O verbo não muda com a pessoa — muda com o nível de educação. Aqui usamos o educado (-요).',
    ser: { same: false, label: '이에요 · 있어요', koSer: ['〜이에요 / 예요', '~ieyo / yeyo'], koEstar: ['〜에 있어요', '~e isseoyo'],
      note: '이에요/예요 é o “ser” (depois de consoante 이에요, de vogal 예요): 저는 학생이에요 = sou estudante. 있어요 (isseoyo) é “estar em / ter”: 저는 집에 있어요 = estou em casa.',
      ex: [['Eu sou estudante.', '저는 학생이에요.', 'jeoneun haksaengieyo'], ['Eu estou em casa.', '저는 집에 있어요.', 'jeoneun jibe isseoyo']] }
  },
  {
    id: 'he', name: 'Hebraico', native: 'עברית', glyph: 'אני', color: '#0096C7', ink: '#00344A', tts: 'he-IL', dir: 'rtl', roman: true,
    pron: ['אני', 'אתה / את', 'הוא', 'היא', 'אנחנו', 'אתם / אתן', 'הם', 'הן'],
    pronR: ['aní', 'atá / at', 'hu', 'hi', 'anáchnu', 'atém / atén', 'hem', 'hen'],
    pronM: ['אני', 'אתה', 'הוא', 'היא', 'אנחנו', 'אתם', 'הם', 'הן'],
    pronF: ['אני', 'את', 'הוא', 'היא', 'אנחנו', 'אתן', 'הם', 'הן'],
    pronMR: ['aní', 'atá', 'hu', 'hi', 'anáchnu', 'atém', 'hem', 'hen'],
    pronFR: ['aní', 'at', 'hu', 'hi', 'anáchnu', 'atén', 'hem', 'hen'],
    pronNote: 'Escreve-se da direita para a esquerda. “Você” e “vocês” têm forma masculina e feminina (אתה atá / את at). No presente, o verbo muda pelo gênero e número, não pela pessoa.',
    ser: { same: true, label: 'היה (passado)', heFull: {
        t: ['אני הייתי', 'אתה היית / את היית', 'הוא היה', 'היא הייתה', 'אנחנו היינו', 'אתם הייתם / אתן הייתן', 'הם היו', 'הן היו'],
        r: ['aní hayíti', 'atá hayíta / at hayít', 'hu hayá', 'hi haytá', 'anáchnu hayínu', 'atém hayítem / atén hayíten', 'hem hayú', 'hen hayú'] },
      note: 'Surpresa: no presente o hebraico NÃO usa verbo ser/estar! “אני מורה” (aní moré) = eu sou professor. “אני עייף” (aní ayéf) = estou cansado. O verbo היה aparece no passado (era/estava) — é ele que você treina aqui.',
      ex: [['Eu sou professor.', 'אני מורה.', 'aní moré'], ['Eu estava cansado.', 'הייתי עייף.', 'hayíti ayéf']] }
  }
];

/* Banco de verbos — os mais falados no dia a dia.
   pt: [eu, você/ele/ela, nós, vocês/eles/elas]
   detect: formas em português para achar o verbo no que você escreve. */
const VERBS = [
  { id: 'ter', pt: 'ter', ptf: ['tenho', 'tem', 'temos', 'têm'], detect: 'tenho tem temos têm ter tive teve tinha tínhamos tiveram tenha',
    en: ['have', 'has'], fr: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], es: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen', 'tienen'],
    de: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'], it: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
    ja: ['持っています', 'motte imasu'], ko: ['있어요', 'isseoyo'],
    he: { full: { t: ['יש לי', 'יש לך', 'יש לו', 'יש לה', 'יש לנו', 'יש לכם / לכן', 'יש להם', 'יש להן'],
      r: ['yesh li', 'yesh lechá / lach', 'yesh lo', 'yesh la', 'yesh lánu', 'yesh lachém / lachén', 'yesh lahém', 'yesh lahén'] } } },
  { id: 'querer', pt: 'querer', ptf: ['quero', 'quer', 'queremos', 'querem'], detect: 'quero quer queremos querem querer queria quis quiser queriam',
    en: ['want', 'wants'], fr: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'], es: ['quiero', 'quieres', 'quiere', 'queremos', 'quieren', 'quieren'],
    de: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'], it: ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono'],
    ja: ['欲しいです', 'hoshii desu'], ko: ['원해요', 'wonhaeyo'],
    he: { f: ['רוצה', 'רוצה', 'רוצים', 'רוצות'], r: ['rotsé', 'rotsá', 'rotsím', 'rotsót'] } },
  { id: 'ir', pt: 'ir', ptf: ['vou', 'vai', 'vamos', 'vão'], detect: 'vou vai vamos vão ir fui foi fomos foram ia íamos iam',
    en: ['go', 'goes'], fr: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], es: ['voy', 'vas', 'va', 'vamos', 'van', 'van'],
    de: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'], it: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'],
    ja: ['行きます', 'ikimasu'], ko: ['가요', 'gayo'],
    he: { f: ['הולך', 'הולכת', 'הולכים', 'הולכות'], r: ['holéch', 'holéchet', 'holchím', 'holchót'] } },
  { id: 'fazer', pt: 'fazer', ptf: ['faço', 'faz', 'fazemos', 'fazem'], detect: 'faço faz fazemos fazem fazer fiz fez fizemos fizeram fazia',
    en: ['do', 'does'], fr: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'], es: ['hago', 'haces', 'hace', 'hacemos', 'hacen', 'hacen'],
    de: ['mache', 'machst', 'macht', 'machen', 'macht', 'machen'], it: ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno'],
    ja: ['します', 'shimasu'], ko: ['해요', 'haeyo'],
    he: { f: ['עושה', 'עושה', 'עושים', 'עושות'], r: ['osé', 'osá', 'osím', 'osót'] } },
  { id: 'poder', pt: 'poder', ptf: ['posso', 'pode', 'podemos', 'podem'], detect: 'posso pode podemos podem poder pude pôde podia podiam',
    en: ['can', 'can'], fr: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'], es: ['puedo', 'puedes', 'puede', 'podemos', 'pueden', 'pueden'],
    de: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'], it: ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono'],
    ja: ['できます', 'dekimasu'], ko: ['할 수 있어요', 'hal su isseoyo'],
    he: { f: ['יכול', 'יכולה', 'יכולים', 'יכולות'], r: ['yachól', 'yecholá', 'yecholím', 'yecholót'] } },
  { id: 'falar', pt: 'falar', ptf: ['falo', 'fala', 'falamos', 'falam'], detect: 'falo fala falamos falam falar falei falou falaram falava',
    en: ['speak', 'speaks'], fr: ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'], es: ['hablo', 'hablas', 'habla', 'hablamos', 'hablan', 'hablan'],
    de: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'], it: ['parlo', 'parli', 'parla', 'parliamo', 'parlate', 'parlano'],
    ja: ['話します', 'hanashimasu'], ko: ['말해요', 'malhaeyo'],
    he: { f: ['מדבר', 'מדברת', 'מדברים', 'מדברות'], r: ['medabér', 'medabéret', 'medabrím', 'medabrót'] } },
  { id: 'comer', pt: 'comer', ptf: ['como', 'come', 'comemos', 'comem'], detect: 'come comemos comem comer comi comeu comeram comia',
    en: ['eat', 'eats'], fr: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'], es: ['como', 'comes', 'come', 'comemos', 'comen', 'comen'],
    de: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'], it: ['mangio', 'mangi', 'mangia', 'mangiamo', 'mangiate', 'mangiano'],
    ja: ['食べます', 'tabemasu'], ko: ['먹어요', 'meogeoyo'],
    he: { f: ['אוכל', 'אוכלת', 'אוכלים', 'אוכלות'], r: ['ochél', 'ochélet', 'ochlím', 'ochlót'] } },
  { id: 'beber', pt: 'beber', ptf: ['bebo', 'bebe', 'bebemos', 'bebem'], detect: 'bebo bebe bebemos bebem beber bebi bebeu beberam bebia',
    en: ['drink', 'drinks'], fr: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'], es: ['bebo', 'bebes', 'bebe', 'bebemos', 'beben', 'beben'],
    de: ['trinke', 'trinkst', 'trinkt', 'trinken', 'trinkt', 'trinken'], it: ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono'],
    ja: ['飲みます', 'nomimasu'], ko: ['마셔요', 'masyeoyo'],
    he: { f: ['שותה', 'שותה', 'שותים', 'שותות'], r: ['shoté', 'shotá', 'shotím', 'shotót'] } },
  { id: 'gostar', pt: 'gostar', ptf: ['gosto', 'gosta', 'gostamos', 'gostam'], detect: 'gosto gosta gostamos gostam gostar gostei gostou gostava adoro adora amo',
    en: ['like', 'likes'], fr: ['aime', 'aimes', 'aime', 'aimons', 'aimez', 'aiment'],
    es: { full: ['me gusta', 'te gusta', 'a él le gusta', 'a ella le gusta', 'nos gusta', 'a ustedes les gusta', 'a ellos les gusta', 'a ellas les gusta'] },
    de: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'],
    it: { full: ['mi piace', 'ti piace', 'gli piace', 'le piace', 'ci piace', 'vi piace', 'a loro piace', 'a loro piace'] },
    ja: ['好きです', 'suki desu'], ko: ['좋아해요', 'joahaeyo'],
    he: { f: ['אוהב', 'אוהבת', 'אוהבים', 'אוהבות'], r: ['ohév', 'ohévet', 'ohavím', 'ohavót'] } },
  { id: 'precisar', pt: 'precisar', ptf: ['preciso', 'precisa', 'precisamos', 'precisam'], detect: 'preciso precisa precisamos precisam precisar precisei precisou precisava',
    en: ['need', 'needs'], fr: ['ai besoin', 'as besoin', 'a besoin', 'avons besoin', 'avez besoin', 'ont besoin'],
    es: ['necesito', 'necesitas', 'necesita', 'necesitamos', 'necesitan', 'necesitan'],
    de: ['brauche', 'brauchst', 'braucht', 'brauchen', 'braucht', 'brauchen'],
    it: ['ho bisogno', 'hai bisogno', 'ha bisogno', 'abbiamo bisogno', 'avete bisogno', 'hanno bisogno'],
    ja: ['必要です', 'hitsuyō desu'], ko: ['필요해요', 'piryohaeyo'],
    he: { f: ['צריך', 'צריכה', 'צריכים', 'צריכות'], r: ['tsaríkh', 'tsrikhá', 'tsrikhím', 'tsrikhót'] } },
  { id: 'saber', pt: 'saber', ptf: ['sei', 'sabe', 'sabemos', 'sabem'], detect: 'sei sabe sabemos sabem saber soube sabia sabiam',
    en: ['know', 'knows'], fr: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'], es: ['sé', 'sabes', 'sabe', 'sabemos', 'saben', 'saben'],
    de: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'], it: ['so', 'sai', 'sa', 'sappiamo', 'sapete', 'sanno'],
    ja: ['知っています', 'shitte imasu'], ko: ['알아요', 'arayo'],
    he: { f: ['יודע', 'יודעת', 'יודעים', 'יודעות'], r: ['yodéa', 'yodáat', 'yod’ím', 'yod’ót'] } },
  { id: 'ver', pt: 'ver', ptf: ['vejo', 'vê', 'vemos', 'veem'], detect: 'vejo vê vemos veem ver vi viu vimos viram via assisto assistir',
    en: ['see', 'sees'], fr: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], es: ['veo', 'ves', 've', 'vemos', 'ven', 'ven'],
    de: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'], it: ['vedo', 'vedi', 'vede', 'vediamo', 'vedete', 'vedono'],
    ja: ['見ます', 'mimasu'], ko: ['봐요', 'bwayo'],
    he: { f: ['רואה', 'רואה', 'רואים', 'רואות'], r: ['roé', 'roá', 'roím', 'roót'] } },
  { id: 'dormir', pt: 'dormir', ptf: ['durmo', 'dorme', 'dormimos', 'dormem'], detect: 'durmo dorme dormimos dormem dormir dormi dormiu dormia',
    en: ['sleep', 'sleeps'], fr: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'], es: ['duermo', 'duermes', 'duerme', 'dormimos', 'duermen', 'duermen'],
    de: ['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen'], it: ['dormo', 'dormi', 'dorme', 'dormiamo', 'dormite', 'dormono'],
    ja: ['寝ます', 'nemasu'], ko: ['자요', 'jayo'],
    he: { f: ['ישן', 'ישנה', 'ישנים', 'ישנות'], r: ['yashén', 'yeshená', 'yeshením', 'yeshenót'] } },
  { id: 'trabalhar', pt: 'trabalhar', ptf: ['trabalho', 'trabalha', 'trabalhamos', 'trabalham'], detect: 'trabalho trabalha trabalhamos trabalham trabalhar trabalhei trabalhou trabalhava',
    en: ['work', 'works'], fr: ['travaille', 'travailles', 'travaille', 'travaillons', 'travaillez', 'travaillent'],
    es: ['trabajo', 'trabajas', 'trabaja', 'trabajamos', 'trabajan', 'trabajan'],
    de: ['arbeite', 'arbeitest', 'arbeitet', 'arbeiten', 'arbeitet', 'arbeiten'], it: ['lavoro', 'lavori', 'lavora', 'lavoriamo', 'lavorate', 'lavorano'],
    ja: ['働きます', 'hatarakimasu'], ko: ['일해요', 'ilhaeyo'],
    he: { f: ['עובד', 'עובדת', 'עובדים', 'עובדות'], r: ['ovéd', 'ovédet', 'ovdím', 'ovdót'] } },
  { id: 'morar', pt: 'morar', ptf: ['moro', 'mora', 'moramos', 'moram'], detect: 'moro mora moramos moram morar morei morou morava',
    en: ['live', 'lives'], fr: ['habite', 'habites', 'habite', 'habitons', 'habitez', 'habitent'], es: ['vivo', 'vives', 'vive', 'vivimos', 'viven', 'viven'],
    de: ['wohne', 'wohnst', 'wohnt', 'wohnen', 'wohnt', 'wohnen'], it: ['abito', 'abiti', 'abita', 'abitiamo', 'abitate', 'abitano'],
    ja: ['住んでいます', 'sunde imasu'], ko: ['살아요', 'sarayo'],
    he: { f: ['גר', 'גרה', 'גרים', 'גרות'], r: ['gar', 'gará', 'garím', 'garót'] } },
  { id: 'entender', pt: 'entender', ptf: ['entendo', 'entende', 'entendemos', 'entendem'], detect: 'entendo entende entendemos entendem entender entendi entendeu entendia',
    en: ['understand', 'understands'], fr: ['comprends', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent'],
    es: ['entiendo', 'entiendes', 'entiende', 'entendemos', 'entienden', 'entienden'],
    de: ['verstehe', 'verstehst', 'versteht', 'verstehen', 'versteht', 'verstehen'], it: ['capisco', 'capisci', 'capisce', 'capiamo', 'capite', 'capiscono'],
    ja: ['分かります', 'wakarimasu'], ko: ['이해해요', 'ihaehaeyo'],
    he: { f: ['מבין', 'מבינה', 'מבינים', 'מבינות'], r: ['mevín', 'mevína', 'meviním', 'mevinót'] } }
];

/* formas de ser/estar em português: avisam que esse verbo já é a base */
const BASE_DETECT = 'sou é somos são ser era éramos eram estou está estamos estão estar estava estávamos estavam';

/* Léxico livre: verbos comuns do português que o caderno reconhece em qualquer frase,
   além do banco. Regulares têm as formas geradas; irregulares listam as suas. */
const PT_LEX_REG = ('acordar levantar tomar chegar voltar comprar pagar estudar aprender escrever abrir fechar ajudar pensar ' +
  'achar ficar deixar levar começar terminar esperar encontrar conhecer viver andar correr jogar brincar cozinhar limpar ' +
  'lavar usar chamar perguntar responder partir mudar passar lembrar esquecer amar adorar assistir ligar mandar enviar ' +
  'receber ganhar vender beijar abraçar chorar cantar dançar nadar viajar dirigir caminhar parar continuar tentar ' +
  'acreditar explicar ensinar mostrar olhar procurar cuidar sonhar descansar almoçar jantar treinar morrer nascer ' +
  'decidir resolver escolher sorrir gritar falar trabalhar morar gostar precisar entender comer beber dormir ' +
  'arrumar organizar planejar preparar escutar rezar orar visitar namorar casar separar cumprimentar agradecer ' +
  'desculpar comemorar praticar repetir traduzir ler esperar entrar subir descer atender acompanhar pegar tirar bater botar').split(' ');
const PT_LEX_IRR = {
  ser: 'sou é somos são era eram fui foi foram sido', estar: 'estou está estamos estão estava estive esteve',
  ter: 'tenho tem temos têm tinha tive teve', ir: 'vou vai vamos vão ia fui foi fomos foram',
  fazer: 'faço faz fazemos fazem fazia fiz fez fizeram', poder: 'posso pode podemos podem podia pude pôde',
  querer: 'quero quer queremos querem queria quis quiseram', saber: 'sei sabe sabemos sabem sabia soube',
  ver: 'vejo vê vemos veem via vi viu viram', vir: 'venho vem vimos vêm vinha vim veio vieram',
  dizer: 'digo diz dizemos dizem dizia disse disseram', dar: 'dou dá damos dão dava dei deu deram',
  sair: 'saio sai saímos saem saía saí saiu saíram', trazer: 'trago traz trazemos trazem trazia trouxe trouxeram',
  ouvir: 'ouço ouve ouvimos ouvem ouvia ouvi ouviu', ler: 'leio lê lemos leem lia li leu leram',
  pedir: 'peço pede pedimos pedem pedia pedi pediu', sentir: 'sinto sente sentimos sentem sentia senti sentiu',
  conseguir: 'consigo consegue conseguimos conseguem conseguia consegui conseguiu', preferir: 'prefiro prefere preferimos preferem preferi',
  perder: 'perco perde perdemos perdem perdia perdi perdeu', rir: 'rio ri rimos riem ria riu', dormir: 'durmo dorme dormimos dormem dormia dormi dormiu',
  pôr: 'ponho põe pomos põem punha pus pôs', cair: 'caio cai caímos caem caía caí caiu caíram', vestir: 'visto veste vestimos vestem vesti vestiu', seguir: 'sigo segue seguimos seguem segui seguiu'
};
/* palavras que parecem verbo mas quase sempre são outra coisa */
const PT_LEX_SKIP = new Set('como casa jogo trabalho almoço janta volta passo ganho caminho sonho canto cuidado ajuda chamada pergunta resposta conta lembrança mudança fala'.split(' '));

/* Verbos que mudam de sentido conforme o contexto: em outra língua, cada sentido pode
   virar uma palavra diferente. Tradução é de conceito, não de palavra. */
const PT_SENSES = {
  tomar: ['café / bebida', 'banho', 'remédio', 'sol', 'conta (cuidar)', 'decisão', 'susto'],
  pegar: ['ônibus / condução', 'um objeto', 'gripe / doença', 'no sono', 'trânsito'],
  fazer: ['uma tarefa', 'frio / calor (tempo)', 'aniversário', 'a barba', 'sentido'],
  dar: ['um presente', 'uma volta', 'certo / errado', 'para (ser possível)'],
  ficar: ['num lugar', 'cansado / feliz (mudar de estado)', 'com (guardar)', 'bem (roupa)'],
  passar: ['o tempo', 'por um lugar', 'na prova', 'roupa', 'mal'],
  levar: ['carregar', 'tempo (leva uma hora)', 'alguém a um lugar'],
  deixar: ['permitir', 'largar / esquecer', 'de (parar de)'],
  achar: ['encontrar', 'opinião (eu acho que)'],
  ter: ['possuir', 'idade', 'que (obrigação)', 'existir (tem café?)'],
  sair: ['de um lugar', 'passear / sair com amigos', 'dar resultado'],
  botar: ['colocar', 'roupa'], pôr: ['colocar', 'roupa', 'a mesa'],
  tirar: ['remover', 'foto', 'nota', 'férias'],
  bater: ['na porta', 'papo', 'o carro'],
  cair: ['no chão', 'a ficha (entender)', 'bem (combinar)'],
  jogar: ['um jogo / esporte', 'fora (descartar)', 'algo (arremessar)']
};
