/* Dados de exemplo (demonstração). Fotos "art:" são ilustrações geradas; troque por fotos reais no painel. */
(function(){
const A=(s,n)=>Array.from({length:n},(_,i)=>`art:${s}:${i}`);
const P=(o)=>Object.assign({status:'ativo',destaque:false,offmarket:false,cidade:'Rio de Janeiro',estado:'RJ',quartos:0,suites:0,banheiros:0,vagas:0,area:0,condominio:0,iptu:0,destaques:[],comodidades:[],video:'',criadoEm:'2026-10-01'},o);
const props=[
P({id:'p-leblon-cob',finalidade:'venda',tipo:'Cobertura',titulo:'Cobertura duplex com vista para o mar',bairro:'Leblon',preco:9800000,condominio:6200,iptu:3100,quartos:4,suites:4,banheiros:6,vagas:4,area:420,destaque:true,fotos:A('leblon',5),video:'',
 descricao:'Duplex no coração do Leblon, a dois quarteirões da praia, com terraço privativo, piscina e vista aberta para o mar e para o Corcovado.\n\nO living em três ambientes se integra ao terraço gourmet por esquadrias de piso a teto. No piso superior, a suíte master com closing e banheira de frente para o mar.\n\nAcabamento em mármore e madeira de lei, automação completa e serviços de condomínio de hotel.',
 destaques:['Terraço com piscina privativa','Vista mar e Corcovado','Automação completa','Elevador privativo'],comodidades:['Piscina','Academia','Segurança 24h','Varanda gourmet','Ar-condicionado','Automação']}),
P({id:'p-joa-casa',finalidade:'venda',tipo:'Casa',titulo:'Casa contemporânea em condomínio fechado',bairro:'Joá',preco:14500000,condominio:8400,iptu:5200,quartos:5,suites:5,banheiros:7,vagas:6,area:780,destaque:true,fotos:A('joa',5),
 descricao:'Arquitetura contemporânea assinada, integrada à mata e com vista panorâmica para a Lagoa da Tijuca e o oceano.\n\nSão 780 m² de área construída em um terreno de 1.600 m², com piscina de borda infinita, spa, cinema e adega climatizada.\n\nPrivacidade total dentro de um dos condomínios mais reservados da cidade.',
 destaques:['Piscina de borda infinita','Cinema e adega','Terreno de 1.600 m²','Vista panorâmica'],comodidades:['Piscina','Spa','Cinema','Adega','Segurança 24h','Heliponto']}),
P({id:'p-ipanema-apt',finalidade:'venda',tipo:'Apartamento',titulo:'Apartamento reformado a uma quadra da praia',bairro:'Ipanema',preco:3850000,condominio:2900,iptu:1400,quartos:3,suites:2,banheiros:4,vagas:2,area:165,destaque:true,fotos:A('ipanema',4),
 descricao:'Reformado por escritório de arquitetura, com planta aberta, cozinha integrada e varanda com vista para o canal do Jardim de Alah.\n\nAndar alto, sol da manhã e silêncio raro para a região. Prédio com portaria 24h e área de lazer completa.',
 destaques:['Reforma completa','Planta aberta','Vista canal e mar'],comodidades:['Portaria 24h','Varanda','Academia','Salão de festas']}),
P({id:'p-barra-casa',finalidade:'venda',tipo:'Casa',titulo:'Casa com piscina e jardim na Barra',bairro:'Barra da Tijuca',preco:6200000,condominio:3800,iptu:2800,quartos:5,suites:4,banheiros:6,vagas:5,area:560,destaque:true,fotos:A('barra',4),
 descricao:'Casa ampla em condomínio de alto padrão na Barra, com jardim paisagístico, piscina aquecida e espaço gourmet. Ideal para famílias que querem segurança, área verde e proximidade com a praia.',
 destaques:['Piscina aquecida','Espaço gourmet','Paisagismo'],comodidades:['Piscina','Churrasqueira','Quadra','Segurança 24h','Playground']}),
P({id:'p-recreio-apt',finalidade:'venda',tipo:'Apartamento',titulo:'Apartamento frente-mar no Recreio',bairro:'Recreio',preco:1650000,condominio:1500,iptu:700,quartos:3,suites:1,banheiros:3,vagas:2,area:118,fotos:A('recreio',4),
 descricao:'Frente para a praia do Recreio, com varanda e vista permanente do mar. Condomínio com infraestrutura de clube e ótimo custo-benefício para morar ou investir.',
 destaques:['Frente-mar','Condomínio clube'],comodidades:['Piscina','Quadra','Academia','Playground']}),
P({id:'p-itanhanga-terreno',finalidade:'venda',tipo:'Terreno',titulo:'Terreno plano em condomínio no Itanhangá',bairro:'Itanhangá',preco:2400000,condominio:1800,iptu:900,area:1200,fotos:A('itanhanga',3),
 descricao:'Terreno plano de 1.200 m², pronto para construir, em condomínio com ruas arborizadas e controle de acesso. Projeto arquitetônico sugerido disponível.',
 destaques:['Plano e murado','Pronto para construir'],comodidades:['Segurança 24h','Ruas arborizadas']}),
P({id:'p-botafogo-apt',finalidade:'aluguel',tipo:'Apartamento',titulo:'Apartamento mobiliado com vista para o Pão de Açúcar',bairro:'Botafogo',preco:9500,condominio:1800,iptu:550,quartos:2,suites:1,banheiros:2,vagas:1,area:98,destaque:true,fotos:A('botafogo',4),
 descricao:'Mobiliado e decorado, pronto para morar. Vista deslumbrante para o Pão de Açúcar, próximo ao metrô e a restaurantes.',
 destaques:['Mobiliado','Vista Pão de Açúcar'],comodidades:['Mobiliado','Ar-condicionado','Portaria 24h','Academia']}),
P({id:'p-ipanema-loc',finalidade:'aluguel',tipo:'Apartamento',titulo:'Alto padrão em Ipanema, pronto para morar',bairro:'Ipanema',preco:16000,condominio:2400,iptu:900,quartos:3,suites:2,banheiros:3,vagas:2,area:150,fotos:A('ipanema2',4),
 descricao:'Apartamento amplo, claro e arejado, com varanda gourmet e acabamento de primeira. A uma quadra da praia.',
 destaques:['Varanda gourmet','A 1 quadra da praia'],comodidades:['Varanda gourmet','Portaria 24h','Ar-condicionado']}),
P({id:'p-barra-sala',finalidade:'aluguel',tipo:'Comercial',titulo:'Sala comercial em torre corporativa',bairro:'Barra da Tijuca',preco:7800,condominio:2100,iptu:600,banheiros:2,vagas:2,area:96,fotos:A('barrasala',3),
 descricao:'Sala em torre corporativa com recepção, controle de acesso, vista livre e estacionamento. Pronta para uso.',
 destaques:['2 vagas','Torre corporativa'],comodidades:['Recepção','Estacionamento','Ar-condicionado central']}),
P({id:'p-recreio-casa',finalidade:'aluguel',tipo:'Casa',titulo:'Casa em condomínio com quintal e piscina',bairro:'Recreio',preco:12500,condominio:1900,iptu:800,quartos:4,suites:2,banheiros:4,vagas:3,area:320,fotos:A('recreio2',4),
 descricao:'Casa ampla para quem quer qualidade de vida: quintal gramado, piscina, churrasqueira e condomínio com segurança.',
 destaques:['Quintal e piscina','Condomínio seguro'],comodidades:['Piscina','Churrasqueira','Aceita pets']}),
P({id:'p-gavea-vendido',finalidade:'venda',tipo:'Apartamento',titulo:'Apartamento com varanda na Gávea',bairro:'Gávea',preco:2900000,quartos:3,suites:1,banheiros:3,vagas:2,area:140,status:'vendido',fotos:A('gavea',3),descricao:'Imóvel vendido — exemplo de portfólio.',criadoEm:'2026-06-10'}),
P({id:'p-lagoa-alugado',finalidade:'aluguel',tipo:'Apartamento',titulo:'Cobertura na Lagoa',bairro:'Lagoa',preco:22000,quartos:3,suites:3,banheiros:4,vagas:3,area:210,status:'alugado',fotos:A('lagoa',3),descricao:'Imóvel alugado — exemplo de portfólio.',criadoEm:'2026-07-02'}),
/* Reservados (off-market): o público só vê a vitrine; o resto fica em "secrets" (só no painel) */
P({id:'p-priv-1',offmarket:true,ref:'QP-001',finalidade:'venda',tipo:'Mansão',titulo:'Mansão frente-mar em condomínio reservado',bairro:'São Conrado',preco:0,faixa:'Acima de R$ 30 milhões',quartos:7,suites:7,banheiros:11,vagas:10,area:1800,
 teaser:'Residência de arquitetura autoral, píer privativo e heliponto. Negociada com total discrição.',fotos:['art:priv1:0'],capa:'art:priv1:0'}),
P({id:'p-priv-2',offmarket:true,ref:'QP-002',finalidade:'venda',tipo:'Cobertura',titulo:'Cobertura triplex com vista 360°',bairro:'Ipanema',preco:0,faixa:'R$ 15 a 20 milhões',quartos:5,suites:5,banheiros:8,vagas:5,area:640,
 teaser:'Triplex com terraço e piscina, vista 360° do mar à Lagoa. Proprietário prefere não expor o imóvel.',fotos:['art:priv2:0'],capa:'art:priv2:0'}),
P({id:'p-priv-3',offmarket:true,ref:'QP-003',finalidade:'venda',tipo:'Casa',titulo:'Casa assinada em rua fechada',bairro:'Jardim Botânico',preco:0,faixa:'R$ 8 a 12 milhões',quartos:4,suites:4,banheiros:6,vagas:4,area:520,
 teaser:'Projeto de arquiteto premiado, jardim com mata atlântica ao fundo. Visita apenas mediante apresentação de perfil.',fotos:['art:priv3:0'],capa:'art:priv3:0'})
];
const secrets={
 'p-priv-1':{endereco:'(exemplo) Rua ..., São Conrado',precoReal:'R$ 34.000.000',proprietario:'(exemplo) Nome / telefone',notas:'Exemplo: aceitar apenas compradores com carta de crédito comprovada.'},
 'p-priv-2':{endereco:'(exemplo) Av. Vieira Souto',precoReal:'R$ 17.500.000',proprietario:'',notas:''},
 'p-priv-3':{endereco:'(exemplo) Rua ..., Jardim Botânico',precoReal:'R$ 9.800.000',proprietario:'',notas:''}
};
const settings={
 nome:'Quézia Santos',marca:'Quézia Santos',titulo:'Corretora de Imóveis',creci:'',
 instagram:'queziarj',tiktok:'',youtube:'',facebook:'',linkedin:'',whatsapp:'',telefone:'',email:'',
 endereco:'',cidade:'Rio de Janeiro',horario:'Segunda a sábado, 9h às 19h',foto:'',
 heroTitulo:'Imóveis de alto padrão, com',heroDestaque:'atendimento sob medida.',
 heroSub:'Compra, venda e locação no Rio de Janeiro com discrição, estratégia e um olhar cuidadoso para cada história.',
 bio:'Sou Quézia Santos, corretora de imóveis no Rio de Janeiro.\n\nAcredito que um imóvel nunca é só metragem: é o lugar onde uma vida acontece. Por isso meu trabalho começa ouvindo — o que você busca, o que não abre mão e o que ainda nem percebeu que quer.\n\nDa primeira visita à entrega das chaves, cuido de cada etapa com transparência, estratégia e discrição.',
 valores:['Transparência em cada etapa','Discrição absoluta com seus dados e seu patrimônio','Estratégia de preço baseada em mercado, não em achismo','Atendimento pessoal, do primeiro contato às chaves'],
 regioes:['Leblon','Ipanema','Lagoa','Jardim Botânico','Gávea','São Conrado','Joá','Barra da Tijuca','Recreio','Botafogo'],
 anos:'',depoimentos:[]
};
const videos=[]; 
window.QS_SEED={props,secrets,settings,videos};
})();
