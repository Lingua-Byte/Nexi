/* RAIZ — palavras vizinhas.
   Quando a pessoa escreve sobre um assunto da vida dela, o diário libera o pacote de palavras daquele mundo.
   Tudo em português: o tradutor interno traduz para a língua estudada no próprio aparelho. */
const CAMPOS = [
  { id: 'cozinha', nome: 'Na cozinha', icone: '☕', gatilho: 'café comida cozinhar cozinho cozinhei almoço almocei jantar jantei bolo pão leite cozinha comer comi tomei', palavras: ['xícara', 'açúcar', 'colher', 'panela', 'forno', 'geladeira', 'padaria', 'sobremesa'] },
  { id: 'casa', nome: 'Em casa', icone: '🏠', gatilho: 'casa quarto sala apartamento moro morar mudei mudamos', palavras: ['janela', 'porta', 'cama', 'sofá', 'escada', 'chave', 'vizinho', 'banheiro'] },
  { id: 'familia', nome: 'A família', icone: '👪', gatilho: 'mãe pai irmão irmã avó avô filho filha família marido esposa', palavras: ['tio', 'tia', 'primo', 'prima', 'neto', 'casamento', 'parente', 'sogra'] },
  { id: 'trabalho', nome: 'No trabalho', icone: '💼', gatilho: 'trabalho trabalhar trabalhei trabalha emprego chefe reunião escritório trampo', palavras: ['salário', 'colega', 'prazo', 'cliente', 'projeto', 'férias', 'contrato', 'entrevista'] },
  { id: 'estudo', nome: 'Estudando', icone: '📚', gatilho: 'escola aula prova faculdade estudar estudei estudo professor professora', palavras: ['caderno', 'lápis', 'nota', 'matéria', 'lição', 'biblioteca', 'diploma', 'dever de casa'] },
  { id: 'transporte', nome: 'Indo e vindo', icone: '🚌', gatilho: 'ônibus carro metrô bicicleta trânsito busão peguei dirigir', palavras: ['estação', 'motorista', 'passagem', 'estrada', 'semáforo', 'atraso', 'ponto de ônibus', 'bilhete'] },
  { id: 'clima', nome: 'O tempo lá fora', icone: '🌦', gatilho: 'chuva choveu chover calor frio sol vento nublado', palavras: ['nuvem', 'tempestade', 'guarda-chuva', 'neve', 'temperatura', 'previsão do tempo', 'trovão', 'arco-íris'] },
  { id: 'saude', nome: 'Saúde', icone: '🩺', gatilho: 'médico médica remédio dor doente gripe hospital cansado cansada', palavras: ['febre', 'farmácia', 'consulta', 'receita', 'tosse', 'enfermeira', 'exame', 'vacina'] },
  { id: 'emocoes', nome: 'O que eu sinto', icone: '💛', gatilho: 'feliz triste saudade cansado raiva medo amor amo sinto chateado bolado', palavras: ['alegria', 'ansiedade', 'orgulho', 'vergonha', 'ciúme', 'esperança', 'calma', 'solidão'] },
  { id: 'lazer', nome: 'Diversão', icone: '🎉', gatilho: 'filme música festa praia jogo série dançar rolê curti', palavras: ['ingresso', 'show', 'passeio', 'livro', 'dança', 'piscina', 'fim de semana', 'cinema'] },
  { id: 'compras', nome: 'Comprando', icone: '🛒', gatilho: 'comprar comprei mercado loja preço dinheiro caro barato grana', palavras: ['desconto', 'troco', 'cartão', 'recibo', 'fila', 'vendedor', 'promoção', 'carrinho'] },
  { id: 'natureza', nome: 'Natureza', icone: '🌳', gatilho: 'parque árvore mar praia montanha jardim plantar planta', palavras: ['flor', 'rio', 'floresta', 'pássaro', 'grama', 'pedra', 'céu', 'estrela'] },
  { id: 'corpo', nome: 'O corpo', icone: '✋', gatilho: 'cabeça mão pé olho olhos cabelo coração braço corpo', palavras: ['perna', 'boca', 'nariz', 'ouvido', 'costas', 'dente', 'pele', 'ombro'] },
  { id: 'roupas', nome: 'O que eu visto', icone: '👕', gatilho: 'roupa casaco vestido sapato camiseta vesti', palavras: ['camisa', 'calça', 'saia', 'meia', 'chapéu', 'bolsa', 'jaqueta', 'tênis'] },
  { id: 'horas', nome: 'O tempo que passa', icone: '⏰', gatilho: 'hoje ontem amanhã manhã noite semana tarde cedo', palavras: ['madrugada', 'meio-dia', 'relógio', 'mês', 'ano', 'feriado', 'aniversário', 'calendário'] },
  { id: 'cidade', nome: 'Pela cidade', icone: '🏙', gatilho: 'cidade rua centro bairro esquina interior', palavras: ['praça', 'prédio', 'calçada', 'ponte', 'igreja', 'museu', 'prefeitura', 'mercado'] },
  { id: 'conversa', nome: 'Conversando', icone: '📱', gatilho: 'celular ligar liguei mensagem conversar conversei falei papo', palavras: ['internet', 'senha', 'e-mail', 'foto', 'vídeo', 'carregador', 'aplicativo', 'notícia'] },
  { id: 'esporte', nome: 'Em movimento', icone: '⚽', gatilho: 'correr corri academia futebol exercício treino nadar', palavras: ['time', 'gol', 'campeonato', 'bola', 'corrida', 'piscina', 'juiz', 'torcida'] },
  { id: 'bichos', nome: 'Bichos', icone: '🐾', gatilho: 'cachorro gato gatinho bicho pássaro cão', palavras: ['cavalo', 'vaca', 'galinha', 'peixe', 'coelho', 'macaco', 'borboleta', 'tartaruga'] },
  { id: 'viagem', nome: 'Viajando', icone: '✈️', gatilho: 'viajar viajei viagem avião hotel mala férias', palavras: ['passaporte', 'aeroporto', 'mapa', 'turista', 'reserva', 'voo', 'praia', 'lembrança'] }
];

/* Raridade dos conceitos da coleção: os mais difíceis de traduzir valem mais. */
const LENDARIOS = new Set(['saudade', 'saudade-n', 'quesaudade', 'cafune', 'cafune-v', 'jeitinho', 'gambiarra', 'xodo', 'sextou', 'alheia', 'cintura', 'ressaca', 'proximo', 'mefazfalta', 'vaquinha', 'malandro']);
