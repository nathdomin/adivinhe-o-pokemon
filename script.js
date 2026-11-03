'use strict';

/* ==========================================================================
   Adivinhe o Pokémon
   O CSS cuida de todas as animações; aqui ficam só os dados, as regras do
   jogo e a troca de estados/variáveis CSS.
   ========================================================================== */

const API = 'https://pokeapi.co/api/v2';
const TOTAL_SPECIES = 1025;
const MAX_TRIES = 6;
const HINT_COUNT = 6;
/* Nível de revelação (--reveal) depois de 0..6 erros. */
const REVEAL_STEPS = [0, 0.14, 0.28, 0.44, 0.62, 0.8, 1];

const DIFFICULTIES = {
  easy:   { label: 'Fácil',   max: 151,  multiplier: 1 },
  medium: { label: 'Médio',   max: 386,  multiplier: 1.5 },
  hard:   { label: 'Difícil', max: 1025, multiplier: 2 },
};

const TYPE_PT = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta',
  ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno', ground: 'Terra', flying: 'Voador',
  psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão',
  dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};
const COLOR_PT = {
  black: 'Preto', blue: 'Azul', brown: 'Marrom', gray: 'Cinza', green: 'Verde',
  pink: 'Rosa', purple: 'Roxo', red: 'Vermelho', white: 'Branco', yellow: 'Amarelo',
};
const HABITAT_PT = {
  cave: 'Caverna', forest: 'Floresta', grassland: 'Campo', mountain: 'Montanha', rare: 'Raro',
  'rough-terrain': 'Terreno acidentado', sea: 'Mar', urban: 'Urbano', 'waters-edge': 'Beira d’água',
};
const ROMAN = { i: 'I', ii: 'II', iii: 'III', iv: 'IV', v: 'V', vi: 'VI', vii: 'VII', viii: 'VIII', ix: 'IX', x: 'X' };

const SPECIAL_NAMES = {
  'nidoran-f': 'Nidoran♀', 'nidoran-m': 'Nidoran♂', 'mr-mime': 'Mr. Mime', 'mime-jr': 'Mime Jr.',
  'mr-rime': 'Mr. Rime', farfetchd: 'Farfetch’d', sirfetchd: 'Sirfetch’d', 'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z', 'type-null': 'Type: Null', 'jangmo-o': 'Jangmo-o', 'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o', flabebe: 'Flabébé', 'wo-chien': 'Wo-Chien', 'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu', 'chi-yu': 'Chi-Yu',
};

/* ---------- Utilidades ---------- */

const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* Até o simples acesso a window.localStorage pode lançar erro (cookies bloqueados,
   modo privado). Por isso tudo fica dentro de try/catch e o jogo funciona sem ele. */
function makeStore(getStorage) {
  return {
    get(key, fallback) {
      try {
        const raw = getStorage().getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { getStorage().setItem(key, JSON.stringify(value)); } catch { /* armazenamento indisponível */ }
    },
  };
}
const local = makeStore(() => window.localStorage);
const session = makeStore(() => window.sessionStorage);

/* "Mr. Mime", "mr-mime" e "MR MIME" viram a mesma chave: "mrmime". */
function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function prettify(slug) {
  if (SPECIAL_NAMES[slug]) return SPECIAL_NAMES[slug];
  return slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

async function getJSON(url, tries = 3) {
  let lastError;
  for (let attempt = 0; attempt < tries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < tries - 1) await sleep(500 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function preload(url) {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
}

/* Reinicia uma animação CSS ligada a uma classe. */
function retrigger(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

/* ---------- Elementos e estado ---------- */

const els = {
  screen: $('#screen'),
  stage: $('#stage'),
  mon: $('#mon'),
  stageName: $('#stage-name'),
  tries: $('#tries'),
  score: $('#score'),
  streak: $('#streak'),
  hints: $('#hints'),
  wrong: $('#wrong'),
  status: $('#status'),
  form: $('#guess-form'),
  input: $('#guess-input'),
  suggest: $('#suggestions'),
  skip: $('#skip-btn'),
  result: $('#result'),
  resultTitle: $('#result-title'),
  resultText: $('#result-text'),
  again: $('#again-btn'),
  menu: $('#menu-btn'),
  play: $('#play-btn'),
  retry: $('#retry-btn'),
  record: $('#record'),
  errorText: $('#error-text'),
};

const savedDifficulty = local.get('adp:difficulty', 'easy');

const state = {
  names: [],              // slugs das espécies, na ordem do id (índice + 1)
  lookup: new Map(),      // chave normalizada -> nome para exibir
  difficulty: savedDifficulty in DIFFICULTIES ? savedDifficulty : 'easy',
  seen: new Set(),        // ids já sorteados nesta sessão
  score: 0,
  streak: 0,
  best: local.get('adp:best', { streak: 0, score: 0 }),
  round: null,
  busy: false,
};

const setState = (value) => { els.screen.dataset.state = value; };
const setPhase = (value) => { els.screen.dataset.phase = value; };
const setReveal = (value) => { els.screen.style.setProperty('--reveal', value); };
const setStatus = (text) => { els.status.textContent = text; };

/* ---------- Dados dos Pokémon ---------- */

async function ensureNames() {
  if (state.names.length) return;

  let names = session.get('adp:names:v1', null);
  if (!Array.isArray(names) || names.length < TOTAL_SPECIES) {
    const data = await getJSON(`${API}/pokemon-species?limit=${TOTAL_SPECIES}`);
    names = data.results.map((entry) => entry.name);
    session.set('adp:names:v1', names);
  }

  state.names = names;
  state.lookup = new Map(names.map((slug) => [normalize(slug), prettify(slug)]));
  state.lookup.set('nidoran', 'Nidoran');
}

function pickId() {
  const max = Math.min(DIFFICULTIES[state.difficulty].max, state.names.length);
  const candidates = () => {
    const list = [];
    for (let id = 1; id <= max; id++) if (!state.seen.has(id)) list.push(id);
    return list;
  };

  let pool = candidates();
  if (!pool.length) {
    for (let id = 1; id <= max; id++) state.seen.delete(id);
    pool = candidates();
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildRound(id, pokemon, species) {
  const image = pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default;
  if (!image) throw new Error(`Pokémon ${id} sem imagem`);

  const slug = species.name;
  const englishName = species.names?.find((entry) => entry.language.name === 'en')?.name;
  const name = englishName || prettify(slug);

  const accepted = new Set([normalize(slug), normalize(name)]);
  if (slug.startsWith('nidoran')) accepted.add('nidoran');

  const types = [...pokemon.types].sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name);
  const ability = (pokemon.abilities.find((entry) => !entry.is_hidden) || pokemon.abilities[0])?.ability.name;
  const generation = String(species.generation?.name || '').split('-')[1];
  const habitat = species.habitat?.name;
  const color = species.color?.name;
  const letters = normalize(name).length;

  const hints = [
    { label: 'Geração', parts: [{ text: `Geração ${ROMAN[generation] || '?'}` }] },
    {
      label: types.length > 1 ? 'Tipos' : 'Tipo',
      parts: types.map((type) => ({ text: TYPE_PT[type] || prettify(type), chip: type })),
    },
    {
      label: 'Altura e peso',
      parts: [{ text: `${decimal.format(pokemon.height / 10)} m · ${decimal.format(pokemon.weight / 10)} kg` }],
    },
    {
      label: habitat ? 'Cor e habitat' : 'Cor',
      parts: [{ text: [COLOR_PT[color] || 'Desconhecida', HABITAT_PT[habitat]].filter(Boolean).join(' · ') }],
    },
    { label: 'Habilidade', parts: [{ text: ability ? prettify(ability) : 'Desconhecida' }] },
    { label: 'Nome', parts: [{ text: `Começa com “${name.charAt(0).toUpperCase()}” · ${letters} letras` }] },
  ];

  return { id, name, image, accepted, hints, wrong: 0, shown: 0, guessed: new Set(), over: false };
}

/* ---------- Interface ---------- */

function renderTries() {
  const used = state.round ? state.round.wrong : 0;
  els.tries.replaceChildren(
    ...Array.from({ length: MAX_TRIES }, (_, index) => {
      const ball = document.createElement('i');
      ball.className = 'ball' + (index < used ? ' is-used' : '');
      return ball;
    }),
  );
  els.tries.setAttribute('aria-label', `Tentativas restantes: ${MAX_TRIES - used}`);
}

function renderHud() {
  els.score.textContent = state.score;
  els.streak.textContent = state.streak;
}

function renderRecord() {
  const { streak, score } = state.best;
  els.record.textContent = streak || score
    ? `Recorde: sequência de ${streak} · ${score} pontos`
    : 'Ainda sem recorde. Bora estrear!';
}

function renderLockedHints() {
  els.hints.replaceChildren(
    ...Array.from({ length: HINT_COUNT }, (_, index) => {
      const item = document.createElement('li');
      item.className = 'hint is-locked';
      item.innerHTML = '<span class="hint__label"></span><span class="hint__value"></span>';
      item.firstChild.textContent = `Dica ${index + 1}`;
      item.lastChild.textContent = '• • •';
      return item;
    }),
  );
}

function openHint(index, animate = true) {
  const hint = state.round.hints[index];
  const item = els.hints.children[index];
  const value = item.querySelector('.hint__value');

  item.classList.remove('is-locked');
  item.querySelector('.hint__label').textContent = hint.label;
  value.replaceChildren(
    ...hint.parts.map((part) => {
      const span = document.createElement('span');
      span.textContent = part.text;
      if (part.chip) span.className = `chip t-${part.chip}`;
      return span;
    }),
  );
  if (animate) retrigger(item, 'is-open');
}

function syncHints() {
  const round = state.round;
  const target = Math.min(HINT_COUNT, round.wrong + 1);
  while (round.shown < target) openHint(round.shown++);
  els.skip.disabled = round.over || round.shown >= HINT_COUNT;
}

function renderRound(round) {
  els.mon.src = round.image;
  els.mon.alt = 'Silhueta de um Pokémon misterioso';
  els.stageName.textContent = '';
  els.wrong.replaceChildren();
  els.input.value = '';
  els.form.hidden = false;
  els.result.hidden = true;
  closeSuggestions();
  setStatus('');
  setReveal(REVEAL_STEPS[0]);
  renderLockedHints();
  renderTries();
  renderHud();
  syncHints();
}

function showError(error) {
  console.error(error);
  els.errorText.textContent = 'Não foi possível falar com a PokeAPI. Verifique a conexão e tente de novo.';
  setState('error');
  setPhase('idle');
  els.retry.focus({ preventScroll: true });
}

/* Em telas de toque o foco abriria o teclado e esconderia o jogo; só foca com mouse. */
function focusInput() {
  if (state.round && !state.round.over && window.matchMedia('(pointer: fine)').matches) {
    els.input.focus({ preventScroll: true });
  }
}

function powerOn() {
  retrigger(els.screen, 'is-powering');
}

/* ---------- Fluxo do jogo ---------- */

async function startRound() {
  if (state.busy) return;
  state.busy = true;
  setState('loading');
  setPhase('idle');
  setReveal(0);

  try {
    await ensureNames();
    const id = pickId();
    const [pokemon, species] = await Promise.all([
      getJSON(`${API}/pokemon/${id}`),
      getJSON(`${API}/pokemon-species/${id}`),
    ]);
    const round = buildRound(id, pokemon, species);
    await preload(round.image);

    state.seen.add(id);
    state.round = round;
    renderRound(round);
    setState('playing');
    setPhase('playing');
    powerOn();
    focusInput();
  } catch (error) {
    showError(error);
  } finally {
    state.busy = false;
  }
}

function backToMenu() {
  state.round = null;
  renderRecord();
  setState('start');
  setPhase('idle');
  els.play.focus({ preventScroll: true });
}

function registerMiss(label) {
  const round = state.round;
  round.wrong++;

  if (label) {
    const chip = document.createElement('li');
    chip.textContent = label;
    els.wrong.append(chip);
  }
  renderTries();

  if (round.wrong >= MAX_TRIES) {
    endRound(false);
    return;
  }
  setReveal(REVEAL_STEPS[round.wrong]);
  syncHints();
  retrigger(els.stage, 'is-wrong');
}

function submitGuess(raw) {
  const round = state.round;
  if (!round || round.over || state.busy) return;

  const key = normalize(raw);
  if (!key) return;

  const label = state.lookup.get(key);
  if (!label) {
    setStatus('Não achei esse Pokémon. Escolha um nome da lista.');
    retrigger(els.form, 'is-shake');
    return;
  }
  if (round.guessed.has(key)) {
    setStatus(`Você já tentou ${label}.`);
    retrigger(els.form, 'is-shake');
    return;
  }

  round.guessed.add(key);
  els.input.value = '';
  closeSuggestions();

  if (round.accepted.has(key)) {
    endRound(true);
  } else {
    setStatus(`${label} não é. Veja a nova dica!`);
    registerMiss(label);
  }
}

function skipHint() {
  const round = state.round;
  if (!round || round.over || round.shown >= HINT_COUNT) return;
  setStatus('Dica liberada, mas custou uma tentativa.');
  registerMiss(null);
  focusInput();
}

function calcPoints(round) {
  const base = Math.max(10, 100 - 15 * round.wrong);
  return Math.round(base * DIFFICULTIES[state.difficulty].multiplier);
}

function endRound(won) {
  const round = state.round;
  round.over = true;

  let points = 0;
  if (won) {
    points = calcPoints(round);
    state.score += points;
    state.streak += 1;
    state.best.streak = Math.max(state.best.streak, state.streak);
    state.best.score = Math.max(state.best.score, state.score);
    local.set('adp:best', state.best);
  } else {
    state.streak = 0;
  }

  while (round.shown < HINT_COUNT) openHint(round.shown++, false);
  setReveal(1);
  els.mon.alt = `Imagem de ${round.name}`;
  els.stageName.textContent = round.name;
  setStatus('');
  closeSuggestions();
  renderHud();
  renderTries();

  els.form.hidden = true;
  els.result.hidden = false;
  els.resultTitle.textContent = won ? 'Acertou!' : 'Não foi dessa vez!';
  els.resultText.textContent = won
    ? `Era ${round.name}. +${points} pontos${state.streak > 1 ? ` · sequência de ${state.streak}` : ''}.`
    : `Era ${round.name}. Sua sequência voltou a zero.`;
  setPhase(won ? 'won' : 'lost');
  els.again.focus({ preventScroll: true });
}

/* ---------- Autocomplete ---------- */

let options = [];
let activeOption = -1;

function closeSuggestions() {
  options = [];
  activeOption = -1;
  els.suggest.hidden = true;
  els.suggest.replaceChildren();
  els.input.setAttribute('aria-expanded', 'false');
  els.input.removeAttribute('aria-activedescendant');
}

function highlightOption(index) {
  activeOption = index;
  [...els.suggest.children].forEach((item, i) => item.setAttribute('aria-selected', String(i === index)));
  if (index >= 0) {
    els.input.setAttribute('aria-activedescendant', `option-${index}`);
    els.suggest.children[index].scrollIntoView({ block: 'nearest' });
  } else {
    els.input.removeAttribute('aria-activedescendant');
  }
}

function updateSuggestions() {
  const query = normalize(els.input.value);
  if (!query || !state.lookup.size || !state.round || state.round.over) {
    closeSuggestions();
    return;
  }

  const starts = [];
  const contains = [];
  for (const [key, label] of state.lookup) {
    if (key.startsWith(query)) starts.push(label);
    else if (key.includes(query)) contains.push(label);
    if (starts.length >= 6) break;
  }
  options = starts.concat(contains).slice(0, 6);
  if (!options.length) {
    closeSuggestions();
    return;
  }

  els.suggest.replaceChildren(
    ...options.map((label, index) => {
      const item = document.createElement('li');
      item.id = `option-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.textContent = label;
      return item;
    }),
  );
  els.suggest.hidden = false;
  els.input.setAttribute('aria-expanded', 'true');
  activeOption = -1;
}

function chooseOption(label) {
  els.input.value = label;
  closeSuggestions();
  submitGuess(label);
}

/* ---------- Eventos ---------- */

els.input.addEventListener('input', () => {
  setStatus('');
  updateSuggestions();
});

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' && options.length) {
    event.preventDefault();
    highlightOption((activeOption + 1) % options.length);
  } else if (event.key === 'ArrowUp' && options.length) {
    event.preventDefault();
    highlightOption((activeOption - 1 + options.length) % options.length);
  } else if (event.key === 'Enter' && activeOption >= 0) {
    event.preventDefault();
    chooseOption(options[activeOption]);
  } else if (event.key === 'Escape') {
    closeSuggestions();
  }
});

els.input.addEventListener('blur', closeSuggestions);

/* mousedown não pode tirar o foco do campo; a escolha acontece no click. */
els.suggest.addEventListener('mousedown', (event) => event.preventDefault());
els.suggest.addEventListener('click', (event) => {
  const item = event.target.closest('li');
  if (item) chooseOption(item.textContent);
});

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  submitGuess(els.input.value);
});
els.form.addEventListener('animationend', () => els.form.classList.remove('is-shake'));
els.mon.addEventListener('animationend', () => els.stage.classList.remove('is-wrong'));

els.screen.addEventListener('animationend', (event) => {
  if (event.target === els.screen) els.screen.classList.remove('is-powering');
});

els.skip.addEventListener('click', skipHint);
els.play.addEventListener('click', startRound);
els.again.addEventListener('click', startRound);
els.retry.addEventListener('click', startRound);
els.menu.addEventListener('click', backToMenu);

document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
  radio.checked = radio.value === state.difficulty;
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    state.difficulty = radio.value;
    local.set('adp:difficulty', radio.value);
  });
});

/* Aba em segundo plano: o CSS pausa as animações contínuas. */
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-hidden', document.hidden);
});

/* ---------- Início ---------- */

renderTries();
renderHud();
renderRecord();
powerOn();
ensureNames().catch(() => { /* tenta de novo ao iniciar a rodada */ });
