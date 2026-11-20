(() => {
  'use strict';
  const data = window.RADAR;
  const main = document.getElementById('content');
  if (!data) {
    document.getElementById('loading').textContent = 'Dashboard data is missing. Run main.ts and open the dashboard inside the output directory.';
    return;
  }

  const PAGE_SIZE = 12;
  const fmt = new Intl.NumberFormat('en-US');
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
  const multiple = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 });
  const money = (value) => value == null ? '—' : '$' + compact.format(value);
  const percent = (value) => value == null ? '—' : (value > 0 ? '+' : '') + value.toFixed(1) + '%';
  const ratio = (value) => multiple.format(value) + '×';
  const factor = (value) => value.toFixed(3) + '×';
  const category = (row) => row.category || 'Uncategorized';
  const label = (name) => name === 'Dexs' ? 'DEXs' : name;
  const status = (row) => row.watchlist ? 'Watchlist' : 'Below floor';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
  const ordered = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'en'));
  const valueKey = 'implied_value_usd';
  const columns = {
    rank: 'Rank', name: 'Protocol', category: 'Category', tvl_usd: 'TVL',
    change_7d: '7D TVL', [valueKey]: 'Implied value', mcap_usd: 'Market cap',
  };
  const rankingColumns = ['rank', 'name', 'category', 'tvl_usd', 'change_7d', valueKey];
  const marketColumns = ['name', 'category', 'tvl_usd', 'change_7d', 'mcap_usd'];
  const candidates = new Map(data.rows.map((r) => [r.slug, r]));
  const recorded = new Map(data.recorded.map((r) => [r.slug, r]));
  const totals = data.rows.reduce((agg, r) => {
    agg.tvl += r.tvl_usd;
    agg.sectors.set(category(r), (agg.sectors.get(category(r)) || 0) + 1);
    return agg;
  }, { tvl: 0, sectors: new Map() });
  let state;
  let boardPath = '#board';
  let marketPath = '#recorded';

  document.getElementById('snapshot-date').textContent = 'SNAPSHOT · ' + date.format(new Date(data.as_of));

  function readRoute() {
    const [path, query] = location.hash.slice(1).split('?');
    const route = new URLSearchParams(query);
    const view = ['detail', 'token', 'recorded', 'method'].includes(path) ? path : 'board';
    const keys = view === 'recorded' ? marketColumns : rankingColumns;
    const sort = keys.includes(route.get('sort')) ? route.get('sort') : view === 'recorded' ? 'mcap_usd' : valueKey;
    return {
      view, slug: route.get('id'), q: route.get('q') || '', category: route.get('category') || '',
      chain: route.get('chain') || '', watch: view === 'board' && route.get('watch') === '1',
      sort, dir: route.get('dir') === 'asc' ? 'asc' : 'desc',
      page: Math.max(1, Number.parseInt(route.get('page'), 10) || 1),
    };
  }

  function saveFilters() {
    const query = new URLSearchParams();
    for (const key of ['q', 'category', 'chain']) if (state[key]) query.set(key, state[key]);
    if (state.watch) query.set('watch', '1');
    const defaultSort = state.view === 'recorded' ? 'mcap_usd' : valueKey;
    if (state.sort !== defaultSort) query.set('sort', state.sort);
    if (state.dir === 'asc') query.set('dir', 'asc');
    if (state.page > 1) query.set('page', state.page);
    const path = '#' + state.view + (query.size ? '?' + query : '');
    history.replaceState(null, '', path);
    if (state.view === 'board') boardPath = path;
    else marketPath = path;
  }

  function detailPath(row, isMarket) {
    return '#' + (isMarket ? 'token' : 'detail') + '?' + new URLSearchParams({ id: row.slug });
  }

  function renderScatter() {
    const left = 51, right = 570, top = 14, bottom = 143;
    const x = (tvl) => left + (right - left) * (Math.log10(Math.max(5e6, Math.min(5e9, tvl))) - Math.log10(5e6)) / 3;
    const y = (growth) => bottom - (bottom - top) * (Math.max(-30, Math.min(30, growth)) + 30) / 60;
    const ticks = [[5e6, '$5M'], [5e7, '$50M'], [5e8, '$500M'], [5e9, '$5B']];
    const crosses = ticks.map(([value, tick]) =>
      `<path d="M${x(value)} ${top}V${bottom}" class="${value === 5e7 ? 'floor-line' : 'gridline'}"/>
        <text x="${x(value)}" y="163" text-anchor="middle">${tick}</text>`).join('');
    const grid = [-30, 0, 30].map((value) =>
      `<path d="M${left} ${y(value)}H${right}" class="${value === 0 ? 'zero-line' : 'gridline'}"/>
        <text x="40" y="${y(value) + 4}" text-anchor="end">${value > 0 ? '+' : ''}${value}%</text>`).join('');
    const points = (watch) => data.rows.filter((r) => r.watchlist === watch && r.change_7d != null).map((r) =>
      `<circle cx="${x(r.tvl_usd).toFixed(2)}" cy="${y(r.change_7d).toFixed(2)}" r="${watch ? 4.2 : 2.8}" class="${watch ? 'watch-point' : 'early-point'}"><title>${escape(r.name)} · ${money(r.tvl_usd)} TVL · ${percent(r.change_7d)} in 7 days</title></circle>`).join('');
    return `
      <figure class="map">
        <figcaption><strong>TVL momentum</strong><span class="mono">7D CHANGE × TVL</span></figcaption>
        <svg viewBox="0 0 594 171" role="img" aria-label="Scatter plot of seven-day TVL change versus TVL, log scale. Weekly changes are clipped at plus or minus 30 percent and missing changes are omitted.">
          ${crosses}${grid}${points(false)}${points(true)}
        </svg>
        <div class="map-legend">
          <span><i class="dot"></i> Watchlist</span>
          <span><i class="dot early"></i> Below floor</span>
          <span class="map-note">Log TVL · growth clipped at ±30%</span>
        </div>
      </figure>`;
  }

  function renderOverview() {
    return `
      <section class="overview">
        <div class="hero">
          <div class="hero-copy">
            <p class="eyebrow"><span></span> DEFI LAUNCH RESEARCH</p>
            <h1>Token launch<br><em>radar.</em></h1>
            <p>Ranked estimates for protocols whose snapshot records no token. Open any row to see its peers, valuation and farm plan.</p>
          </div>
          ${renderScatter()}
        </div>
        <div class="metrics">
          <div><span>Ranked protocols</span><strong>${fmt.format(data.rows.length)}</strong><small>${data.rows.length - data.watchlist_size} below the watchlist floor</small></div>
          <div><span>Watchlist coverage</span><strong>${data.watchlist_size}<i> / ${data.watchlist_size}</i></strong><small>${money(data.floor_usd)} TVL floor</small></div>
          <div><span>Tracked TVL</span><strong>${money(totals.tvl)}</strong><small>Sum across ranked records</small></div>
          <div><span>Valuation peer set</span><strong>${data.calibration.n}</strong><small>Recorded market cap + TVL</small></div>
        </div>
      </section>`;
  }

  function renderSectors() {
    const sectors = [...totals.sectors].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en')).slice(0, 6);
    const top = sectors[0][1];
    return `<aside class="rail">
      <section class="panel sector-panel" aria-labelledby="sector-title">
        <div class="rail-head"><h3 id="sector-title">Sector mix</h3><span class="mono">ALL RANKS</span></div>
        <div class="sect-list">${sectors.map(([name, count]) => `
          <button type="button" class="sector" data-sector="${escape(name)}" aria-pressed="false">
            <span>${escape(label(name))}</span><b>${count}</b>
            <svg class="sector-bar" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
              <rect width="100" height="4" rx="1" class="sector-track"/><rect width="${100 * count / top}" height="4" rx="1" class="sector-fill"/>
            </svg>
          </button>`).join('')}
        </div>
      </section>
      <section class="rail-note">
        <strong>What is implied value?</strong>
        <p>Estimated market cap if the snapshot held. An entry estimate with no launch probability attached.</p>
        <a href="#method">Read the methodology <span aria-hidden="true">↗</span></a>
      </section>
    </aside>`;
  }

  function renderFilters(source, isMarket) {
    const choices = (values) => values.map((value) => `<option value="${escape(value)}">${escape(label(value))}</option>`).join('');
    return `<div class="toolbar">
      <label class="search"><span class="sr-only">Search protocols</span>
        <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="4.8"/><path d="m12 12 4.2 4.2"/></svg>
        <input id="search" type="search" autocomplete="off" maxlength="100" placeholder="Search protocols…">
        <kbd aria-hidden="true">/</kbd>
      </label>
      <label class="select"><span class="sr-only">Category</span><select id="category"><option value="">All categories</option>${choices(ordered(source.map(category)))}</select></label>
      <label class="select"><span class="sr-only">Chain</span><select id="chain"><option value="">All chains</option>${choices(ordered(source.flatMap((r) => r.chains)))}</select></label>
      ${isMarket ? '' : '<button class="watch-toggle" id="watch" type="button" aria-pressed="false"><span></span> Watchlist</button>'}
      <button class="quiet" id="clear" type="button" hidden>Reset</button>
    </div>`;
  }

  function renderBoard(isMarket) {
    const source = isMarket ? data.recorded : data.rows;
    const fields = isMarket ? marketColumns : rankingColumns;
    main.innerHTML = `
      ${isMarket ? `<section class="page-head">
        <p class="eyebrow"><span></span> SNAPSHOT TOKEN RECORDS</p><h1>Recorded tokens.</h1>
        <p>${fmt.format(source.length)} protocol records contain token metadata or a market cap. The peer model uses ${data.calibration.n} comparable records with a positive market cap.</p>
      </section>` : renderOverview()}
      <section class="board-layout${isMarket ? ' full' : ''}" aria-label="${isMarket ? 'Recorded tokens' : 'Ranked board'}">
        <div class="panel board-panel">
          <div class="board-head">
            <h2 id="board-heading">${isMarket ? 'Token records' : 'Ranked board'}</h2>
            <span id="result-count" class="mono" role="status"></span>
          </div>
          ${renderFilters(source, isMarket)}
          <div class="table-scroll">
            <table aria-labelledby="board-heading">
              <thead><tr>${fields.map((field) => `<th class="col-${field}" scope="col">
                <button type="button" data-sort="${field}">${columns[field]} <span aria-hidden="true"></span></button>
              </th>`).join('')}<th class="col-open" scope="col"><span class="sr-only">Details</span></th></tr></thead>
              <tbody id="results"></tbody>
            </table>
          </div>
          <div class="pagination"><span class="mono" id="page-status"></span><div>
            <button type="button" id="previous" aria-label="Previous page">←</button>
            <button type="button" id="next" aria-label="Next page">→</button>
          </div></div>
        </div>
        ${isMarket ? '' : renderSectors()}
      </section>`;
    const search = main.querySelector('#search');
    const categorySelect = main.querySelector('#category');
    const chain = main.querySelector('#chain');
    const watch = main.querySelector('#watch');
    const refresh = () => {
      state.page = 1;
      updateBoard(source, isMarket);
      saveFilters();
    };
    search.value = state.q;
    categorySelect.value = state.category;
    chain.value = state.chain;
    state.category = categorySelect.value;
    state.chain = chain.value;
    search.addEventListener('input', () => { state.q = search.value; refresh(); });
    categorySelect.addEventListener('change', () => { state.category = categorySelect.value; refresh(); });
    chain.addEventListener('change', () => { state.chain = chain.value; refresh(); });
    watch?.addEventListener('click', () => { state.watch = !state.watch; refresh(); });
    main.querySelector('#clear').addEventListener('click', () => {
      state.q = state.category = state.chain = '';
      state.watch = false;
      search.value = categorySelect.value = chain.value = '';
      refresh();
      search.focus();
    });
    for (const button of main.querySelectorAll('[data-sector]')) {
      button.addEventListener('click', () => {
        const name = button.dataset.sector;
        state.category = state.category === name ? '' : name;
        categorySelect.value = state.category;
        refresh();
      });
    }
    for (const button of main.querySelectorAll('[data-sort]')) {
      button.addEventListener('click', () => {
        const next = button.dataset.sort;
        state.dir = state.sort === next ? (state.dir === 'asc' ? 'desc' : 'asc') :
          ['rank', 'name', 'category'].includes(next) ? 'asc' : 'desc';
        state.sort = next;
        refresh();
      });
    }
    for (const [control, delta] of [['#previous', -1], ['#next', 1]]) {
      main.querySelector(control).addEventListener('click', () => {
        state.page += delta;
        updateBoard(source, isMarket);
        saveFilters();
      });
    }
    updateBoard(source, isMarket);
  }

  function updateBoard(source, isMarket) {
    const terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = source.filter((r) => {
      const text = [r.name, r.slug, r.symbol, category(r), ...r.chains].join(' ').toLowerCase();
      return (!state.watch || r.watchlist) && (!state.category || category(r) === state.category) &&
        (!state.chain || r.chains.includes(state.chain)) && terms.every((word) => text.includes(word));
    });
    const direction = state.dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const av = state.sort === 'category' ? category(a) : a[state.sort];
      const bv = state.sort === 'category' ? category(b) : b[state.sort];
      if (av == null || bv == null) return (av == null) - (bv == null) || a.name.localeCompare(b.name, 'en');
      const order = typeof av === 'number' ? av - bv : av.localeCompare(bv, 'en');
      return order * direction || (a.rank ?? 0) - (b.rank ?? 0) || a.name.localeCompare(b.name, 'en');
    });
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const visible = list.slice(start, start + PAGE_SIZE);
    const count = list.length;
    main.querySelector('#result-count').textContent = fmt.format(count) + ' / ' + fmt.format(source.length) + ' PROTOCOLS';
    main.querySelector('#results').innerHTML = visible.length ? visible.map((r) => renderRow(r, isMarket)).join('') :
      `<tr><td colspan="${isMarket ? 6 : 7}" class="empty">No matching records. Try another chain or clear your filters.</td></tr>`;
    main.querySelector('#page-status').textContent = count ? `${start + 1}–${start + visible.length} OF ${count}` : '0 RESULTS';
    main.querySelector('#previous').disabled = state.page <= 1;
    main.querySelector('#next').disabled = state.page >= pages;
    main.querySelector('#clear').hidden = !(state.q || state.category || state.chain || state.watch);
    main.querySelector('#watch')?.setAttribute('aria-pressed', state.watch);
    for (const button of main.querySelectorAll('[data-sector]')) button.setAttribute('aria-pressed', button.dataset.sector === state.category);
    for (const button of main.querySelectorAll('[data-sort]')) {
      const active = button.dataset.sort === state.sort;
      button.closest('th').setAttribute('aria-sort', active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      button.lastElementChild.textContent = active ? (state.dir === 'asc' ? '↑' : '↓') : '';
    }
  }

  function chainLine(row) {
    const names = row.chains.slice(0, 2).join(' · ');
    return escape(names || 'Chain unreported') + (row.chains.length > 2 ? ` <span>+${row.chains.length - 2}</span>` : '');
  }

  function renderRow(row, isMarket) {
    const href = detailPath(row, isMarket);
    const initial = row.name.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() || '•';
    const palette = [...category(row)].reduce((n, c) => n + c.codePointAt(0), 0) % 5;
    const changeClass = row.change_7d == null || row.change_7d === 0 ? 'muted' : row.change_7d > 0 ? 'up' : 'down';
    const value = isMarket ? row.mcap_usd : row.implied_value_usd;
    return `<tr>
      ${isMarket ? '' : `<td class="col-rank mono rank">${String(row.rank).padStart(2, '0')}</td>`}
      <td class="col-name"><div class="protocol">
        <span class="avatar tone-${palette}" aria-hidden="true">${escape(initial)}</span>
        <div><a class="protocol-link" href="${escape(href)}">${escape(row.name)}</a>
          ${row.watchlist ? '<span class="row-watch" title="Snapshot watchlist" aria-label="Watchlist"></span>' : ''}
          <span class="chains">${chainLine(row)}</span>
        </div>
      </div></td>
      <td class="col-category"><span class="category">${escape(label(category(row)))}</span></td>
      <td class="col-tvl_usd mono number">${money(row.tvl_usd)}</td>
      <td class="col-change_7d mono number ${changeClass}">${percent(row.change_7d)}</td>
      <td class="col-${isMarket ? 'mcap_usd' : valueKey} mono number valuation" title="${value == null ? 'Unreported' : usd.format(value)}">${money(value)}</td>
      <td class="col-open"><span aria-hidden="true">↗</span></td>
    </tr>`;
  }

  function renderDetail(row) {
    const m = row.model;
    const age = m.age == null ? 'Unreported' : fmt.format(m.age) + ' days tracked';
    const midpoint = m.high === m.low ? .5 : (Math.log(m.value) - Math.log(m.low)) / (Math.log(m.high) - Math.log(m.low));
    const recomputed = Math.max(1, Math.min(1e14, Math.round(row.tvl_usd * m.growthFactor * m.breadthFactor * m.ageFactor * m.multiple)));
    main.innerHTML = `
      <div class="crumbs"><a href="${escape(boardPath)}">← Ranked board</a><span>/</span><span>${escape(row.name)}</span></div>
      <section class="detail-hero">
        <div>
          <div class="detail-tags"><span class="tag mint">RANK ${String(row.rank).padStart(2, '0')}</span><span class="tag">${status(row)}</span><span class="tag">Records no token</span></div>
          <h1>${escape(row.name)}</h1>
          <p>${escape(label(category(row)))} <span>·</span> ${escape(row.chains.slice(0, 4).join(' / ') || 'Chain unreported')}${row.chains.length > 4 ? ' +' + (row.chains.length - 4) : ''}</p>
        </div>
        <div class="detail-value"><span>IMPLIED VALUE</span><strong>${money(m.value)}</strong><small>${usd.format(m.value)} USD · Entry estimate</small></div>
      </section>
      <div class="detail-grid">
        <section class="panel anatomy" aria-labelledby="anatomy-title">
          <div class="section-heading"><h2 id="anatomy-title">Valuation anatomy</h2><span class="tag">${m.evidence}</span></div>
          <div class="range">
            <div><span>Peer sensitivity</span><strong class="mono">${money(m.low)} – ${money(m.high)}</strong></div>
            <svg viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label="Model estimate marked between the blended lower and upper quartile values">
              <path d="M1 6h98" stroke="#33425d" stroke-width="5" stroke-linecap="round"/>
              <path d="M2 6h96" stroke="#8b90ff" stroke-width="2" stroke-linecap="round"/>
              <path d="M${2 + 96 * midpoint} 1v10" stroke="#b7f7d7" stroke-width="1.1"/>
            </svg>
            <p>Blended peer quartiles with the same TVL and modifiers.</p>
          </div>
          <dl class="formula">
            <div><dt>Snapshot TVL</dt><dd>${usd.format(row.tvl_usd)}</dd></div>
            <div><dt>Peer multiple <small>${m.direct} category · ${m.related} related · ${m.market} market</small></dt><dd>${ratio(m.multiple)}</dd></div>
            <div><dt>Weekly momentum <small>${row.change_7d == null ? 'Unreported · neutral' : percent(row.change_7d) + ' TVL'}</small></dt><dd>${factor(m.growthFactor)}</dd></div>
            <div><dt>Chain breadth <small>${m.breadth} tracked</small></dt><dd>${factor(m.breadthFactor)}</dd></div>
            <div><dt>Time tracked <small>${age}</small></dt><dd>${factor(m.ageFactor)}</dd></div>
            <div class="formula-total"><dt>Recomputed value</dt><dd>${usd.format(recomputed)}</dd></div>
          </dl>
          <div class="examples">
            <div class="section-heading"><h3>Peer examples</h3><span class="mono">MARKET CAP / TVL</span></div>
            ${m.examples.map((peer) => `<div class="example"><a href="#token?${escape(new URLSearchParams({ id: peer.slug }))}">${escape(peer.name)}</a><small>${peer.group}</small><span class="mono">${ratio(peer.ratio)}</span></div>`).join('')}
          </div>
          <p class="model-foot">${escape(m.family)} peer family. Values use full-precision inputs. <a href="#method">Full methodology ↗</a></p>
        </section>
        <section class="panel farm" aria-labelledby="farm-title">
          <div class="section-heading"><h2 id="farm-title">Farm plan</h2><span class="tag mint">${escape(row.route.chain)}</span></div>
          <div class="farm-intro"><strong>${escape(row.route.label)}</strong><span>Trial budgets and review times are estimates.</span></div>
          <ol>${row.farm_steps.map((step) => {
            const [action, cost] = step.split(' | ');
            const at = action.indexOf(' · ');
            return `<li><div><h3>${escape(action.slice(0, at))}</h3><p>${escape(action.slice(at + 3))}</p><small class="mono">${escape(cost)}</small></div></li>`;
          }).join('')}</ol>
          ${row.route.reference ? `<p class="reference"><span>PRODUCT REFERENCE</span> ${escape(row.route.reference)}</p>` : ''}
        </section>
      </div>`;
  }

  function renderToken(row) {
    main.innerHTML = `
      <div class="crumbs"><a href="${escape(marketPath)}">← Recorded tokens</a><span>/</span><span>${escape(row.name)}</span></div>
      <section class="page-head"><p class="eyebrow"><span></span> RECORDED TOKEN</p><h1>${escape(row.name)}</h1>
        <p>${escape(label(category(row)))} · ${escape(row.chains.join(' / ') || 'Chain unreported')}</p>
      </section>
      <section class="panel token-panel" aria-label="Snapshot metrics">
        <div class="metrics">
          <div><span>Recorded market cap</span><strong>${money(row.mcap_usd)}</strong><small>${row.mcap_usd == null ? 'Unreported' : usd.format(row.mcap_usd)}</small></div>
          <div><span>Snapshot TVL</span><strong>${money(row.tvl_usd)}</strong><small>${usd.format(row.tvl_usd)}</small></div>
          <div><span>Market cap / TVL</span><strong>${row.mcap_usd == null ? '—' : ratio(row.mcap_usd / row.tvl_usd)}</strong><small>Observed ratio</small></div>
          <div><span>Recorded ticker</span><strong>${escape(row.symbol ?? '—')}</strong><small>${escape(row.gecko_id ?? 'CoinGecko ID unreported')}</small></div>
        </div>
      </section>`;
  }

  function renderMethod() {
    const m = data.settings;
    main.innerHTML = `
      <section class="page-head"><p class="eyebrow"><span></span> VALUATION MODEL</p><h1>How the radar ranks.</h1>
        <p>Market cap conditional on the protocol’s frozen record, with the estimate and its assumptions visible together.</p>
      </section>
      <div class="method-grid">
        <section class="panel article">
          <h2>From TVL to implied value</h2>
          <p class="equation mono">TVL × peer multiple × growth × breadth × time tracked</p>
          <h3>Build a comparable peer set</h3>
          <p>Use positive snapshot market caps and TVL for ${data.calibration.n} recorded-token protocols. Screen out obvious custody, bridge, staking and versioned products. Take quartiles of log(market cap / TVL). The market-wide median is <b>${ratio(data.calibration.mid)}</b>.</p>
          <h3>Borrow evidence when a category is thin</h3>
          <p>The baseline uses up to ${m.marketNeighbors} market peers closest by TVL on a log scale. Blend quartiles of related categories toward that baseline with weight n / (n + ${m.familyPrior}), then blend same-category quartiles toward the result with weight n / (n + ${m.categoryPrior}). Groups are disjoint and both blends are geometric. Empty groups inherit the preceding estimate.</p>
          <h3>Apply bounded operating signals</h3>
          <dl class="formula">
            <div><dt>Weekly TVL change</dt><dd>1 + ${m.growthWeight} × change, clipped to ±${m.growthLimit}%</dd></div>
            <div><dt>Chain breadth</dt><dd>1 + ${m.breadthWeight} × log₂(chains), capped at ${m.breadthLimit} chains</dd></div>
            <div><dt>Time tracked</dt><dd>${m.maturityFloor} → ${(m.maturityFloor + m.maturitySpan).toFixed(2)}× over ${m.maturityDays} days</dd></div>
          </dl>
          <p>Unreported growth, chain breadth and listing age receive a neutral factor. Listing age measures time in DefiLlama’s index. The median yields the rank and the first and third quartiles show peer sensitivity.</p>
        </section>
        <section class="panel article">
          <h2>How to read the board</h2>
          <h3>Coverage</h3>
          <p>All ${data.watchlist_size} snapshot watchlist members and ${data.rows.length - data.watchlist_size} qualifying records below ${money(data.floor_usd)} TVL. Early expansion uses product and known-sibling screens. A protocol “records no token” when all three token fields are null.</p>
          <h3>Limits</h3>
          <p>Implied value is Signal Atlas’s estimate of hypothetical market cap. It does not measure FDV, token supply, launch odds or claim eligibility. TVL can include rehypothecation or overlap across products. Weekly change can reflect price moves. Peer sensitivity is a scenario range.</p>
          <h3>Farm plans</h3>
          <p>Named routes describe product mechanics when available. Category-based routes show where to start verification. Confirm product availability, fees, exit terms and program rules before transacting.</p>
          <h3>Source</h3>
          <p>${escape(data.source)}</p>
        </section>
      </div>`;
  }

  function render() {
    state = readRoute();
    for (const link of document.querySelectorAll('[data-view]')) {
      const view = state.view === 'detail' ? 'board' : state.view === 'token' ? 'recorded' : state.view;
      if (link.dataset.view === view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    if (state.view === 'detail' && candidates.has(state.slug)) renderDetail(candidates.get(state.slug));
    else if (state.view === 'token' && recorded.has(state.slug)) renderToken(recorded.get(state.slug));
    else if (state.view === 'method') renderMethod();
    else if (state.view === 'detail' || state.view === 'token') {
      main.innerHTML = '<section class="page-head"><h1>Record unavailable.</h1><p><a href="#board">Return to the ranked board →</a></p></section>';
    } else {
      if (state.view === 'board') boardPath = location.hash.startsWith('#board') ? location.hash : '#board';
      else marketPath = location.hash;
      renderBoard(state.view === 'recorded');
    }
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#content') return;
    render();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey &&
        !event.target.closest('input, textarea, select, [contenteditable]')) {
      const search = main.querySelector('#search');
      if (search) { event.preventDefault(); search.focus(); }
    }
  });
  render();
})();
