const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Neural network background: drifting nodes, faint links, occasional signals
(function () {
  const c = document.getElementById('net');
  if (!c || !c.getContext) return;
  const ctx = c.getContext('2d');
  const VIOLET = '139,137,255', CYAN = '94,234,212', LINK = 165;
  let w, h, nodes = [], pulses = [], mouse = { x: -1e4, y: -1e4 }, raf = 0, last = 0, lastPulse = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, Math.max(28, (w * h) / 17000)));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.4 + 0.8, col: Math.random() < 0.72 ? VIOLET : CYAN,
    }));
    pulses = [];
  }

  function spawnPulse() {
    const a = nodes[(Math.random() * nodes.length) | 0];
    let best = null, bd = LINK;
    nodes.forEach((n) => { if (n === a) return; const d = Math.hypot(n.x - a.x, n.y - a.y); if (d < bd && d > 30) { bd = d; best = n; } });
    if (best) pulses.push({ a, b: best, p: 0, speed: 0.006 + Math.random() * 0.006 });
  }

  function draw(move) {
    ctx.clearRect(0, 0, w, h);
    if (move) nodes.forEach((n) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
    });
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > LINK * LINK) continue;
        const d = Math.sqrt(d2);
        const mx = (a.x + b.x) / 2 - mouse.x, my = (a.y + b.y) / 2 - mouse.y;
        const near = Math.max(0, 1 - Math.hypot(mx, my) / 220);
        ctx.strokeStyle = `rgba(${VIOLET},${(1 - d / LINK) * (0.24 + near * 0.4)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    nodes.forEach((n) => {
      ctx.fillStyle = `rgba(${n.col},.12)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(${n.col},.75)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
    });
    pulses = pulses.filter((p) => {
      p.p += p.speed;
      if (p.p >= 1) return false;
      const x = p.a.x + (p.b.x - p.a.x) * p.p, y = p.a.y + (p.b.y - p.a.y) * p.p;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, `rgba(${CYAN},.9)`); g.addColorStop(1, `rgba(${CYAN},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, 6.283); ctx.fill();
      return true;
    });
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < 1000 / 40) return; // ~40fps is plenty for slow drift
    last = t;
    if (t - lastPulse > 700 && pulses.length < 6) { spawnPulse(); lastPulse = t; }
    draw(true);
  }

  resize();
  addEventListener('resize', () => { resize(); if (reduceMotion) draw(false); });
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
  if (reduceMotion) { draw(false); return; }
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  });
  raf = requestAnimationFrame(loop);
})();

// Ask this portfolio: BM25 retrieval over the page's own passages
(function () {
  const form = document.getElementById('askForm');
  const input = document.getElementById('q');
  const out = document.getElementById('askOut');
  if (!form) return;

  const STOP = new Set(('a an and are as at be been but by can could did do does done for from had has have he her him his how i if in into is it its me my of on or our over she so than that the their them then there these they this to was we were what when where which who why will with would you your sanket kesarkar about any ever tell show give some much many more most also just has experience worked work use used using know knows anything something').split(' '));

  // Query expansion so plain-language questions find technical wording
  const SYN = {
    llm: ['model', 'gpt', 'gemini', 'langchain', 'langgraph'],
    ai: ['llm', 'model', 'agents', 'rag', 'langgraph', 'fine-tuning'],
    cutting: ['cut', 'eliminated', 'reduced'], cut: ['eliminated', 'reduced'],
    cost: ['spend', 'saved', 'revenue'], costs: ['spend', 'saved', 'revenue'],
    money: ['spend', 'saved', 'revenue'], saving: ['spend', 'saved'], savings: ['spend', 'saved'],
    rag: ['retrieval', 'pgvector', 'embeddings', 'bm25', 'citations'],
    retrieval: ['rag', 'pgvector', 'embeddings', 'bm25'],
    finetune: ['lora', 'axolotl', 'fine-tuning'], fine: ['lora', 'axolotl'], tuning: ['lora', 'axolotl'],
    queue: ['rabbitmq', 'rq', 'dead-letter'], queues: ['rabbitmq', 'rq', 'dead-letter'],
    messaging: ['rabbitmq', 'queues', 'webhook'],
    cloud: ['aws', 'gcp', 'azure'],
    certification: ['certified', 'certifications'], certifications: ['certified'], certified: ['certifications'],
    scrum: ['scrummaster', 'agile', 'csm'], agile: ['scrum', 'scrummaster'],
    leadership: ['mentored', 'mentoring', 'mentor', 'teaching', 'promoted', 'manager', 'scrummaster'], lead: ['mentored', 'teaching', 'manager'], mentoring: ['mentored', 'mentor', 'teaching'],
    achievements: ['promoted', 'recognized', 'mentor'], awards: ['recognized', 'promoted'], teaching: ['teaching', 'assistant'],
    performance: ['latency', 'response', 'p50', 'p95'], speed: ['latency', 'response', 'p50'], fast: ['latency', 'response'],
    security: ['oauth', 'rbac', 'jwt', 'credential', 'cmek', 'least-privilege'], auth: ['oauth', 'rbac', 'jwt'],
    devops: ['docker', 'deployments', 'rollback', 'terraform', 'kubernetes', 'github actions'],
    deploy: ['deployments', 'rollback', 'releases'], ci: ['github actions', 'jenkins', 'releases'],
    agents: ['langgraph', 'mcp', 'agentic'], agentic: ['langgraph', 'mcp', 'agents'],
    frontend: ['react', 'redux', 'dashboard', 'typescript'], ui: ['react', 'dashboard'],
    monitoring: ['cloudwatch', 'x-ray', 'alerts', 'incidents'], observability: ['cloudwatch', 'x-ray', 'tracing'],
    realtime: ['websocket', 'streams', 'live'], streaming: ['sse', 'streams', 'websocket'],
  };

  const stem = (w) => {
    if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
    else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
    else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
    return w;
  };
  const tokenize = (s) => s.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9+#]+/).filter(Boolean);
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Build the corpus from the page itself, so it never drifts from what's written
  const chunks = [];
  const add = (el, src, text, show, weight = 1) => {
    if (!el.id) el.id = 'src-' + chunks.length;
    chunks.push({ el, src, text: clean(text), show: clean(show || text), weight });
  };
  document.querySelectorAll('.role li').forEach((li) => add(li, li.closest('[data-src]').dataset.src, li.textContent));
  document.querySelectorAll('.deltas li').forEach((li) => {
    const t = `${li.querySelector('.d-label').textContent}: ${li.querySelector('s').textContent} to ${li.querySelector('b').textContent}. ${li.querySelector('.d-how').textContent}.`;
    add(li, 'Impact', t);
  });
  document.querySelectorAll('.project').forEach((p) => {
    const name = p.querySelector('h3').textContent;
    const desc = p.querySelector('.p-desc').textContent;
    const rest = [p.querySelector('.p-kind'), p.querySelector('.stack-line'), ...p.querySelectorAll('.flow li')].map((n) => n.textContent).join(' ');
    add(p, 'Project / ' + name, name + ' ' + desc + ' ' + rest, desc + ' Built with ' + p.querySelector('.stack-line').textContent + '.');
  });
  document.querySelectorAll('.stack-list > div').forEach((row) => {
    const dt = row.querySelector('dt').textContent, dd = row.querySelector('dd').textContent;
    add(row, 'Stack / ' + dt, dt + ' ' + dd, dd, 0.55); // prefer evidence of use over a list of names
  });
  document.querySelectorAll('.achv').forEach((e) => add(e, 'Achievements', [...e.querySelectorAll('.achv-when, h3, .achv-text, .achv-path li')].map((c) => [...c.children].length && c.matches('li') ? [...c.children].map((x) => x.textContent).join(': ') : c.textContent).join('. ')));
  document.querySelectorAll('.edu').forEach((e) => add(e, 'Education', [...e.children].map((c) => c.textContent).join('. ')));
  document.querySelectorAll('.cert:not(.cert-wide)').forEach((e) => add(e, 'Certifications', [...e.children].filter((c) => !c.matches('.cert-id, .cert-link')).map((c) => c.textContent).join('. ')));
  document.querySelectorAll('.cert-list li').forEach((li) => add(li, 'Certifications / Microsoft', 'Microsoft Certified ' + li.querySelector('b').textContent + ' ' + li.childNodes[1].textContent + ', earned ' + li.querySelector('span').textContent + '.'));

  // Index
  const N = chunks.length;
  const df = new Map();
  let total = 0;
  chunks.forEach((c) => {
    c.tf = new Map();
    const toks = tokenize(c.text).map(stem);
    toks.forEach((t) => c.tf.set(t, (c.tf.get(t) || 0) + 1));
    c.len = toks.length; total += c.len;
    c.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
  });
  const avg = total / N, k1 = 1.4, b = 0.75;
  const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
  document.getElementById('nChunks').textContent = N;

  function search(q) {
    const raw = tokenize(q).filter((t) => !STOP.has(t));
    const terms = new Map();
    raw.forEach((t) => {
      terms.set(stem(t), 1);
      (SYN[t] || SYN[t.replace(/s$/, '')] || []).forEach((s) =>
        tokenize(s).forEach((x) => { const k = stem(x); if (!terms.has(k)) terms.set(k, 0.6); }));
    });
    const scored = chunks.map((c) => {
      let s = 0;
      terms.forEach((w, t) => {
        const f = c.tf.get(t); if (!f) return;
        s += w * idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * c.len / avg));
      });
      return { c, s: s * c.weight };
    }).filter((r) => r.s > 0).sort((x, y) => y.s - x.s);
    return { raw, terms, hits: scored };
  }

  const highlight = (text, terms) =>
    text.split(/([A-Za-z0-9+#]+)/).map((part, i) =>
      i % 2 && terms.has(stem(part.toLowerCase().replace(/['’]/g, ''))) ? `<mark>${esc(part)}</mark>` : esc(part)
    ).join('');

  function run(q) {
    q = q.trim();
    if (!q) { out.innerHTML = ''; return; }
    const { raw, terms, hits } = search(q);
    if (!raw.length) {
      out.innerHTML = `<div class="abstain"><b>Add a few specific words.</b>Try a tool, a company, or an outcome, like "LangGraph", "Accenture", or "latency".</div>`;
      return;
    }
    if (!hits.length || hits[0].s < 0.9) {
      out.innerHTML = `<div class="abstain"><b>Not enough evidence on this page to answer that.</b>Rather than guess, the search abstains. Try a tool, a company, or an outcome, like "LangGraph", "Accenture", or "latency".</div>`;
      return;
    }
    const top = hits[0].s;
    const shown = hits.filter((h) => h.s >= top * 0.35).slice(0, 3);
    out.innerHTML =
      `<p class="ask-meta">Top ${shown.length} of ${N} passages for <q>${esc(q)}</q></p>` +
      '<ol class="hits">' + shown.map((h) => `
        <li class="hit">
          <div class="hit-head">
            <span class="hit-src">${esc(h.c.src)}</span>
            <span class="hit-rel" title="Relevance relative to the top result">relevance <i style="--s:${(h.s / top).toFixed(2)}"></i></span>
          </div>
          <p>${highlight(h.c.show, terms)}</p>
          <a class="hit-link" href="#${h.c.el.id}" data-target="${h.c.el.id}">Go to source</a>
        </li>`).join('') + '</ol>';
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); });
  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => { input.value = c.dataset.q; run(input.value); }));

  out.addEventListener('click', (e) => {
    const a = e.target.closest('.hit-link'); if (!a) return;
    e.preventDefault();
    const el = document.getElementById(a.dataset.target);
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 2300);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault(); input.focus();
  });

  // Turn the stack lists into buttons that search for each tool (after indexing)
  document.querySelectorAll('.stack-list dd').forEach((dd) => {
    const items = dd.textContent.split(',').map((s) => s.trim()).filter(Boolean);
    dd.textContent = '';
    items.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'tag'; btn.textContent = t;
      btn.addEventListener('click', () => {
        input.value = t; run(t);
        document.getElementById('ask').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
      dd.append(btn);
    });
  });
})();

// Projects: step a request through each flow on demand
(function () {
  document.querySelectorAll('.project').forEach((p) => {
    const btn = p.querySelector('.trace-btn');
    const status = p.querySelector('.trace-status');
    const steps = [...p.querySelectorAll('.flow > li')];
    const label = (li) => li.classList.contains('fork')
      ? [...li.children].map((s) => s.textContent).join(' + ')
      : li.childNodes[0].textContent.trim();
    let timer;
    btn.addEventListener('click', () => {
      clearInterval(timer);
      steps.forEach((s) => s.classList.remove('on', 'done'));
      if (reduceMotion) {
        steps.forEach((s) => s.classList.add('done'));
        status.textContent = `Completed all ${steps.length} steps`;
        return;
      }
      btn.disabled = true;
      let i = 0;
      const tick = () => {
        if (i > 0) { steps[i - 1].classList.remove('on'); steps[i - 1].classList.add('done'); }
        if (i === steps.length) {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = btn.dataset.again;
          status.textContent = `Completed all ${steps.length} steps`;
          return;
        }
        steps[i].classList.add('on');
        status.textContent = `Step ${i + 1} of ${steps.length}: ${label(steps[i])}`;
        i++;
      };
      tick();
      timer = setInterval(tick, 480);
    });
  });
})();

// Before/after bars shrink into place when visible
(function () {
  const items = document.querySelectorAll('.deltas li');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('shown'); io.unobserve(en.target); } });
  }, { threshold: 0.4 });
  items.forEach((el) => io.observe(el));
})();

// Copy email
(function () {
  const btn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
      toast.textContent = 'Email copied';
    } catch (e) {
      toast.textContent = btn.dataset.email;
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  });
})();

console.log('%cHi, curious engineer. The search on this page is plain BM25, no model. Say hello: sanketkusa@gmail.com', 'font: 600 13px system-ui; color: #8B89FF');
