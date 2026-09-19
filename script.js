document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('pokemon-search');
  const searchBtn = document.getElementById('search-btn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const typesDropdown = document.getElementById('types-dropdown');
  const typeBadges = document.querySelectorAll('.type-badge');
  const autocompleteList = document.getElementById('autocomplete-list');

  // Telas
  const searchScreen = document.getElementById('search-screen');
  const resultScreen = document.getElementById('result-screen');
  const backBtn = document.getElementById('back-btn');

  // Elementos do Card do Pokémon
  const card = document.getElementById('pokemon-card');
  const nameEl = document.getElementById('pokemon-name');
  const idEl = document.getElementById('pokemon-id');
  const spriteEl = document.getElementById('pokemon-sprite');
  const typesEl = document.getElementById('pokemon-types');
  const heightEl = document.getElementById('pokemon-height');
  const weightEl = document.getElementById('pokemon-weight');
  const abilitiesEl = document.getElementById('pokemon-abilities');
  const statsListEl = document.getElementById('pokemon-stats');
  const cryBtn = document.getElementById('cry-btn');
  const siteLogo = document.getElementById('site-logo');

  // Elementos da seção de efetividade de tipo
  const matchupsWrap = document.getElementById('type-matchups');
  const matchupAttackStrongEl = document.getElementById('matchup-attack-strong');
  const matchupAttackWeakEl = document.getElementById('matchup-attack-weak');
  const matchupDefenseWeakEl = document.getElementById('matchup-defense-weak');
  const matchupDefenseResistEl = document.getElementById('matchup-defense-resist');
  const matchupDefenseImmuneWrap = document.getElementById('matchup-defense-immune-wrap');
  const matchupDefenseImmuneEl = document.getElementById('matchup-defense-immune');

  let audioGrito = null;

  // Nomes das estatísticas base traduzidos para exibição
  const NOMES_STATS = {
    'hp': 'HP',
    'attack': 'Ataque',
    'defense': 'Defesa',
    'special-attack': 'Ataque Esp.',
    'special-defense': 'Defesa Esp.',
    'speed': 'Velocidade'
  };

  // O maior valor possível de um base stat na PokeAPI é 255,
  // usado aqui só para calcular a largura da barrinha visual.
  const STAT_MAXIMO = 255;

  // Lista completa de nomes/ids da PokeAPI, carregada uma vez e usada
  // para o autocomplete (evita chamar a API a cada tecla digitada).
  let listaCompleta = [];
  let debounceTimer = null;
  let indiceAtivo = -1;

  // Monta a URL do sprite pequeno (ícone) usado nas sugestões do autocomplete.
  function spriteMiniUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  // ---------------------------------------------------------
  // "Fru fru" estético: clicar na bolinha do topo troca o ícone entre
  // Poké Ball -> Great Ball -> Ultra Ball -> Master Ball -> (volta pra Poké Ball)
  // ---------------------------------------------------------
  const BALLS = [
    {
      nome: 'Poké Ball',
      svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='#fff' stroke='#171c21' stroke-width='4'/><path d='M4 50h92' stroke='#171c21' stroke-width='4'/><path d='M4 50a46 46 0 0 1 92 0z' fill='#bc0007'/><circle cx='50' cy='50' r='14' fill='#fff' stroke='#171c21' stroke-width='4'/><circle cx='50' cy='50' r='6' fill='#f0f4fb'/></svg>`
    },
    {
      nome: 'Great Ball',
      svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='#fff' stroke='#171c21' stroke-width='4'/><path d='M4 50h92' stroke='#171c21' stroke-width='4'/><path d='M4 50a46 46 0 0 1 92 0z' fill='#1f5fc4'/><path d='M20 30 q30 -18 60 0' fill='none' stroke='#e6222c' stroke-width='6' stroke-linecap='round'/><circle cx='50' cy='50' r='14' fill='#fff' stroke='#171c21' stroke-width='4'/><circle cx='50' cy='50' r='6' fill='#f0f4fb'/></svg>`
    },
    {
      nome: 'Ultra Ball',
      svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='#fff' stroke='#171c21' stroke-width='4'/><path d='M4 50h92' stroke='#171c21' stroke-width='4'/><path d='M4 50a46 46 0 0 1 92 0z' fill='#171c21'/><path d='M14 34 q36 -20 72 0' fill='none' stroke='#ffcb05' stroke-width='6' stroke-linecap='round'/><circle cx='50' cy='50' r='14' fill='#fff' stroke='#171c21' stroke-width='4'/><circle cx='50' cy='50' r='6' fill='#f0f4fb'/></svg>`
    },
    {
      nome: 'Master Ball',
      svg: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='46' fill='#fff' stroke='#171c21' stroke-width='4'/><path d='M4 50h92' stroke='#171c21' stroke-width='4'/><path d='M4 50a46 46 0 0 1 92 0z' fill='#7a3ec0'/><circle cx='34' cy='26' r='6' fill='#ff6fb0'/><circle cx='66' cy='26' r='6' fill='#ff6fb0'/><circle cx='50' cy='18' r='6' fill='#ff6fb0'/><circle cx='50' cy='50' r='14' fill='#fff' stroke='#171c21' stroke-width='4'/><circle cx='50' cy='50' r='6' fill='#f0f4fb'/></svg>`
    }
  ];

  let indiceBolaAtual = 0;

  function aplicarBola(indice) {
    const bola = BALLS[indice];
    siteLogo.src = `data:image/svg+xml;utf8,${encodeURIComponent(bola.svg)}`;
    siteLogo.alt = `Logo PokeSearch (${bola.nome})`;
    siteLogo.title = `${bola.nome} — clique para trocar`;
  }

  if (siteLogo) {
    siteLogo.addEventListener('click', () => {
      indiceBolaAtual = (indiceBolaAtual + 1) % BALLS.length;
      aplicarBola(indiceBolaAtual);
    });
  }

  // ---------------------------------------------------------
  // Controle de telas: busca <-> resultado
  // ---------------------------------------------------------
  function mostrarTelaBusca() {
    resultScreen.classList.add('hidden');
    searchScreen.classList.remove('hidden');
    searchInput.value = '';
    esconderSugestoes();
    searchInput.focus();
  }

  function mostrarTelaResultado() {
    searchScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
  }

  backBtn.addEventListener('click', () => {
    mostrarTelaBusca();
  });

  // ---------------------------------------------------------
  // Carrega a lista de todos os Pokémon (apenas nome + url) uma vez
  // ---------------------------------------------------------
  async function carregarListaCompleta() {
    try {
      const resposta = await fetch('https://pokeapi.co/api/v2/pokemon?limit=2000');
      const dados = await resposta.json();
      listaCompleta = dados.results.map((p) => {
        // Extrai o id a partir da url (ex: .../pokemon/25/)
        const partes = p.url.split('/').filter(Boolean);
        const id = partes[partes.length - 1];
        return { name: p.name, id };
      });
    } catch (erro) {
      console.error('Erro ao carregar lista de Pokémon:', erro);
    }
  }

  // ---------------------------------------------------------
  // Autocomplete: mostra sugestões enquanto o usuário digita
  // ---------------------------------------------------------
  function mostrarSugestoes(termo) {
    autocompleteList.innerHTML = '';
    indiceAtivo = -1;

    if (!termo) {
      autocompleteList.classList.add('hidden');
      return;
    }

    const termoNormalizado = termo.trim().toLowerCase().replace('#', '');

    const correspondencias = listaCompleta
      .filter(p => p.name.includes(termoNormalizado) || p.id === termoNormalizado)
      // Ordem alfabética pelo nome antes de cortar para os 8 primeiros
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);

    if (correspondencias.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'autocomplete-empty';
      vazio.textContent = 'Nenhum Pokémon encontrado';
      autocompleteList.appendChild(vazio);
      autocompleteList.classList.remove('hidden');
      return;
    }

    correspondencias.forEach(p => {
      const item = document.createElement('li');
      item.className = 'autocomplete-item';
      item.dataset.name = p.name;

      // Miniatura do Pokémon ao lado do nome
      const spriteImg = document.createElement('img');
      spriteImg.className = 'ac-sprite';
      spriteImg.src = spriteMiniUrl(p.id);
      spriteImg.alt = '';
      spriteImg.loading = 'lazy';
      spriteImg.onerror = () => { spriteImg.style.visibility = 'hidden'; };

      const infoWrap = document.createElement('span');
      infoWrap.className = 'ac-info';

      const nomeSpan = document.createElement('span');
      nomeSpan.className = 'ac-name';
      nomeSpan.textContent = p.name;

      const idSpan = document.createElement('span');
      idSpan.className = 'ac-id';
      idSpan.textContent = `#${String(p.id).padStart(3, '0')}`;

      infoWrap.appendChild(nomeSpan);
      infoWrap.appendChild(idSpan);

      item.appendChild(spriteImg);
      item.appendChild(infoWrap);

      item.addEventListener('click', () => {
        searchInput.value = p.name;
        esconderSugestoes();
        carregarPokemon(p.name);
      });

      autocompleteList.appendChild(item);
    });

    autocompleteList.classList.remove('hidden');
  }

  function esconderSugestoes() {
    autocompleteList.classList.add('hidden');
    autocompleteList.innerHTML = '';
    indiceAtivo = -1;
  }

  // Navegação das sugestões com as setas do teclado
  function navegarSugestoes(direcao) {
    const itens = autocompleteList.querySelectorAll('.autocomplete-item');
    if (itens.length === 0) return;

    itens[indiceAtivo]?.classList.remove('active');
    indiceAtivo += direcao;

    if (indiceAtivo < 0) indiceAtivo = itens.length - 1;
    if (indiceAtivo >= itens.length) indiceAtivo = 0;

    itens[indiceAtivo].classList.add('active');
    itens[indiceAtivo].scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------
  // Alternar estados dos Botões de Filtro
  // ---------------------------------------------------------
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const filterType = chip.getAttribute('data-filter');

      if (filterType === 'types') {
        typesDropdown.classList.remove('hidden');
      } else {
        typesDropdown.classList.add('hidden');
      }
    });
  });

  // ---------------------------------------------------------
  // Efetividade de tipo: busca os dados de cada tipo do Pokémon na PokeAPI
  // (endpoint /type/) e calcula um resumo de ataque (o que ele bate forte/fraco)
  // e defesa (do que ele toma mais/menos dano, e imunidades).
  // ---------------------------------------------------------
  function criarBadgeTipo(nomeTipo, semEfeito) {
    const badge = document.createElement('span');
    badge.className = `type-badge ${nomeTipo}${semEfeito ? ' no-effect' : ''}`;
    badge.textContent = semEfeito ? `${nomeTipo} (0x)` : nomeTipo;
    return badge;
  }

  function preencherBadges(container, nomes) {
    container.innerHTML = '';
    nomes.forEach(item => {
      const nome = typeof item === 'string' ? item : item.nome;
      const semEfeito = typeof item === 'object' && item.semEfeito;
      container.appendChild(criarBadgeTipo(nome, semEfeito));
    });
  }

  async function carregarEfetividade(tiposDoPokemon) {
    try {
      const dadosTipos = await Promise.all(
        tiposDoPokemon.map(t => fetch(t.type.url).then(r => r.json()))
      );

      // --- Ataque: com quais tipos de ataque este Pokémon (via STAB) é
      // super eficaz, e com quais é pouco eficaz ou não causa efeito ---
      const ataqueForte = new Set();
      const ataqueFracoSet = new Map(); // nome -> semEfeito (true/false)

      dadosTipos.forEach(tipo => {
        tipo.damage_relations.double_damage_to.forEach(t => ataqueForte.add(t.name));
        tipo.damage_relations.half_damage_to.forEach(t => {
          if (!ataqueForte.has(t.name)) ataqueFracoSet.set(t.name, false);
        });
        tipo.damage_relations.no_damage_to.forEach(t => {
          ataqueFracoSet.set(t.name, true);
        });
      });

      // --- Defesa: multiplica os multiplicadores de dano recebido de cada
      // um dos tipos do Pokémon (combina corretamente pokémons com 2 tipos) ---
      const multiplicadores = {};
      dadosTipos.forEach(tipo => {
        tipo.damage_relations.double_damage_from.forEach(t => {
          multiplicadores[t.name] = (multiplicadores[t.name] ?? 1) * 2;
        });
        tipo.damage_relations.half_damage_from.forEach(t => {
          multiplicadores[t.name] = (multiplicadores[t.name] ?? 1) * 0.5;
        });
        tipo.damage_relations.no_damage_from.forEach(t => {
          multiplicadores[t.name] = (multiplicadores[t.name] ?? 1) * 0;
        });
      });

      const defesaFraca = [];
      const defesaResistente = [];
      const defesaImune = [];

      Object.entries(multiplicadores).forEach(([nome, mult]) => {
        if (mult === 0) defesaImune.push(nome);
        else if (mult > 1) defesaFraca.push(nome);
        else if (mult < 1) defesaResistente.push(nome);
      });

      // Preenche a UI
      preencherBadges(matchupAttackStrongEl, Array.from(ataqueForte).sort());
      preencherBadges(
        matchupAttackWeakEl,
        Array.from(ataqueFracoSet.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([nome, semEfeito]) => ({ nome, semEfeito }))
      );
      preencherBadges(matchupDefenseWeakEl, defesaFraca.sort());
      preencherBadges(matchupDefenseResistEl, defesaResistente.sort());

      if (defesaImune.length > 0) {
        preencherBadges(matchupDefenseImmuneEl, defesaImune.sort());
        matchupDefenseImmuneWrap.classList.remove('hidden');
      } else {
        matchupDefenseImmuneWrap.classList.add('hidden');
      }

      matchupsWrap.classList.remove('hidden');
    } catch (erro) {
      // Se a PokeAPI não tiver (ou falhar em retornar) os dados de tipo,
      // a seção simplesmente fica escondida em vez de quebrar o card.
      console.error('Erro ao buscar efetividade de tipo:', erro);
      matchupsWrap.classList.add('hidden');
    }
  }

  // ---------------------------------------------------------
  // Busca o Pokémon completo na API e preenche o card
  // ---------------------------------------------------------
  async function carregarPokemon(termoBusca) {
    if (!termoBusca) return;

    const query = termoBusca.trim().toLowerCase().replace('#', '');

    try {
      const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);

      if (!resposta.ok) {
        alert('Pokémon não encontrado!');
        return;
      }

      const pokemon = await resposta.json();

      nameEl.textContent = pokemon.name.toUpperCase();
      idEl.textContent = `#${String(pokemon.id).padStart(3, '0')}`;

      // GIF animado (estilo Black/White) vindo do repositório de sprites da PokeAPI no GitHub.
      // Nem todo Pokémon tem esse gif (a lista geralmente cobre até a Gen V, id 649),
      // então se ele falhar ao carregar caímos de volta pra artwork oficial (estática).
      const gifAnimado = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${pokemon.id}.gif`;
      const spriteFallback = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;

      spriteEl.onerror = () => {
        spriteEl.onerror = null; // evita loop caso o fallback também falhe
        spriteEl.src = spriteFallback;
      };
      spriteEl.src = gifAnimado;

      heightEl.textContent = (pokemon.height / 10).toFixed(1);
      weightEl.textContent = (pokemon.weight / 10).toFixed(1);

      typesEl.innerHTML = '';
      pokemon.types.forEach(t => {
        const badge = document.createElement('span');
        badge.className = `type-badge ${t.type.name}`;
        badge.textContent = t.type.name;
        typesEl.appendChild(badge);
      });

      // Aplica a cor do tipo principal como sotaque no topo do card
      const tipoPrincipal = pokemon.types[0]?.type.name;
      card.style.setProperty('--card-accent', `var(--type-${tipoPrincipal}, var(--secondary))`);

      // Busca a efetividade de tipo (ataque/defesa) em paralelo com o resto
      carregarEfetividade(pokemon.types);

      const habilidades = pokemon.abilities.map(a => a.ability.name).join(', ');
      abilitiesEl.textContent = habilidades;

      // Estatísticas base (hp, attack, defense, special-attack, special-defense, speed)
      statsListEl.innerHTML = '';
      pokemon.stats.forEach(s => {
        const nomeStat = NOMES_STATS[s.stat.name] || s.stat.name;
        const valor = s.base_stat;
        const porcentagem = Math.min(100, (valor / STAT_MAXIMO) * 100);

        const row = document.createElement('div');
        row.className = 'stat-row';

        const label = document.createElement('span');
        label.className = 'stat-row-label';
        label.textContent = nomeStat;

        const track = document.createElement('div');
        track.className = 'stat-bar-track';
        const fill = document.createElement('div');
        fill.className = 'stat-bar-fill';
        fill.style.width = `${porcentagem}%`;
        track.appendChild(fill);

        const valueEl = document.createElement('span');
        valueEl.className = 'stat-row-value';
        valueEl.textContent = valor;

        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(valueEl);
        statsListEl.appendChild(row);
      });

      if (pokemon.cries && pokemon.cries.latest) {
        audioGrito = new Audio(pokemon.cries.latest);
        cryBtn.style.display = 'inline-flex';
      } else {
        audioGrito = null;
        cryBtn.style.display = 'none';
      }

      // Só troca para a tela de resultado depois que os dados chegaram certinho
      mostrarTelaResultado();

    } catch (erro) {
      console.error('Erro ao buscar o Pokémon:', erro);
      alert('Erro ao realizar a busca. Tente novamente.');
    }
  }

  function tocarGrito() {
    if (audioGrito) {
      audioGrito.play();
    }
  }

  cryBtn.addEventListener('click', tocarGrito);

  // Executar busca ao clicar no botão
  searchBtn.addEventListener('click', () => {
    esconderSugestoes();
    carregarPokemon(searchInput.value);
  });

  // Digitação: mostra sugestões com debounce (evita processar a cada tecla)
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const valor = searchInput.value;
    debounceTimer = setTimeout(() => mostrarSugestoes(valor), 150);
  });

  // Teclado: Enter busca, setas navegam nas sugestões, Esc fecha
  searchInput.addEventListener('keydown', (e) => {
    const itens = autocompleteList.querySelectorAll('.autocomplete-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navegarSugestoes(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navegarSugestoes(-1);
    } else if (e.key === 'Enter') {
      if (indiceAtivo >= 0 && itens[indiceAtivo]) {
        searchInput.value = itens[indiceAtivo].dataset.name;
      }
      esconderSugestoes();
      carregarPokemon(searchInput.value);
    } else if (e.key === 'Escape') {
      esconderSugestoes();
    }
  });

  // Fecha a lista de sugestões ao clicar fora dela
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrapper')) {
      esconderSugestoes();
    }
  });

  // Clique nos badges do filtro de tipos
  typeBadges.forEach(badge => {
    badge.addEventListener('click', () => {
      const selectedType = badge.textContent.trim().toLowerCase();
      searchInput.value = selectedType;
      esconderSugestoes();
      carregarPokemon(selectedType);
    });
  });

  // Inicialização: apenas carrega a lista para o autocomplete.
  // A tela inicial fica só com a busca e os botões (sem pokémon nenhum carregado).
  carregarListaCompleta();
});
