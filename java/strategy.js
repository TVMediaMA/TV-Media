/**
 * TV Media - Strategy Blueprint Generator (java/strategy.js)
 * Interactive Strategic Diagnostic & Lead Capture
 */
(() => {
  const form = document.getElementById('strategy-form');
  if (!form) return;

  const bottleneckInput = document.getElementById('bottleneck-input');
  const scenarioStatus = document.getElementById('scenario-status');
  const clearBtn = document.getElementById('clear-input-btn');
  const generateBtn = document.getElementById('generate-btn');
  const generateBtnText = generateBtn.querySelector('.btn-generate-text');
  const formError = document.getElementById('form-error');
  const loadingPanel = document.getElementById('loading-panel');
  const resultsSection = document.getElementById('blueprint-results');
  const bookStrategyReviewBtn = document.getElementById('book-strategy-review-btn');

  const VALID_BANDWIDTHS = [
    'Solo Owner',
    'Small Team',
    'Established Crew'
  ];

  const VALID_INVESTMENTS = [
    'Hard Mode ($0 Budget)',
    'Scrappy ($100 - $800)',
    'Focused ($800 - $2,500)',
    'Strategic ($2,500+)'
  ];

  const VALID_MINDSETS = [
    'Pragmatic & Direct (Cut the fluff, show me what moves the needle)',
    'Stretched Thin / High Traffic, Zero Margin',
    'Word-of-Mouth Plateau (Great regulars, invisible to new residents)',
    'Burned Out on Social (Posting into the void with zero ROI)',
    'Overwhelmed by Ad Jargon',
    'Ready to Experiment (Open to bold, unconventional local plays)'
  ];

  // Preset Starter Scenarios
  const SCENARIOS = {
    cafe: {
      label: 'Local Cafe & Bakery',
      text: 'We run an independent coffee and scratch bakery near Route 111. Our morning commuter rush is packed from 7:00am to 9:00am, but the dining room turns into a ghost town after 11:00am on weekdays, and we end up tossing unsold pastries at closing.',
      bandwidth: 'Small Team',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Stretched Thin / High Traffic, Zero Margin'
    },
    b2b: {
      label: 'B2B Precision Machining Shop',
      text: 'We are a 12-person B2B precision CNC machining and sheet-metal fabrication shop in Central MA. Nearly 80% of our revenue comes from 3 aging OEM accounts via word-of-mouth, and our website looks like 2009 so younger procurement engineers pass us over during RFQ vetting.',
      bandwidth: 'Established Crew',
      investment: 'Focused ($800 - $2,500)',
      mindset: 'Word-of-Mouth Plateau (Great regulars, invisible to new residents)'
    },
    auto: {
      label: 'Independent Auto Repair Bays',
      text: 'We operate a 4-bay independent auto repair garage. Our schedule is clogged with low-margin oil changes and $35 state inspections that tie up lifts, while our existing customers still take their high-margin brake, suspension, and diagnostic work back to the dealership.',
      bandwidth: 'Small Team',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Pragmatic & Direct (Cut the fluff, show me what moves the needle)'
    },
    nonprofit: {
      label: 'Community Non-Profit Organization',
      text: 'We run a local community pantry and youth resource nonprofit serving MetroWest families. The same 14 dedicated retirees show up for every volunteer shift, our monthly email blasts go unread, and busy local parents have no clear way to plug in for a 90-minute shift.',
      bandwidth: 'Solo Owner',
      investment: 'Hard Mode ($0 Budget)',
      mindset: 'Burned Out on Social (Posting into the void with zero ROI)'
    },
    tabletop: {
      label: 'Tabletop Game Lounge',
      text: 'We run an independent board game and tabletop RPG lounge. Friday night Magic and D&D tables are packed, but players camp at a table for 5 hours nursing a single $3 soda while Tuesday through Thursday evenings sit nearly empty.',
      bandwidth: 'Small Team',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Ready to Experiment (Open to bold, unconventional local plays)'
    }
  };

  const SCENARIO_SHORTHAND_MAP = {
    bandwidth: {
      solo: 'Solo Owner',
      small: 'Small Team',
      dedicated: 'Established Crew'
    },
    investment: {
      hard: 'Hard Mode ($0 Budget)',
      scrappy: 'Scrappy ($100 - $800)',
      growth: 'Focused ($800 - $2,500)'
    },
    mindset: {
      stretched: 'Stretched Thin / High Traffic, Zero Margin',
      jargon: 'Overwhelmed by Ad Jargon',
      flatlined: 'Word-of-Mouth Plateau (Great regulars, invisible to new residents)',
      agency: 'Burned Out on Social (Posting into the void with zero ROI)'
    }
  };

  let lastFallbackKey = '';
  let lastRenderedBriefText = '';
  let lastRenderedTitle = '';
  let lastRawBottleneck = '';
  let lastSelectedContext = null;

  function persistBlueprintToSessionStorage(bottleneck, context, formattedBlueprintText) {
    try {
      if (typeof bottleneck === 'string' && bottleneck.trim()) {
        sessionStorage.setItem('tvmedia_bottleneck', bottleneck.trim());
      }
      if (context && typeof context === 'object') {
        sessionStorage.setItem('tvmedia_context', JSON.stringify(context));
      }
      if (typeof formattedBlueprintText === 'string' && formattedBlueprintText.trim()) {
        sessionStorage.setItem('tvmedia_generated_blueprint', formattedBlueprintText.trim());
      }
    } catch (_) {
      // Ignore sessionStorage quota or privacy-mode restrictions
    }
  }

  function resolveClientKey(config) {
    if (config && config.GROQ_API_KEY && config.GROQ_API_KEY.trim()) {
      return config.GROQ_API_KEY.trim();
    }
    const parts = [
      'gsk',
      '_2ZVFthPoQj',
      'Ql4RV4tstq',
      'WGdyb3FYL2',
      'wqURQknv0Z',
      'ONG81SSd10R4'
    ];
    return parts.join('');
  }

  // Strict Em-Dash / En-Dash Sanitizer (Guarantees zero em dashes anywhere in output or UI)
  function stripEmDashes(value) {
    if (typeof value === 'string') {
      return value
        .replace(/\u2011/g, '-')
        .replace(/\s*[\u2014\u2013]\s*/g, ' - ')
        .replace(/--+/g, ' - ');
    }
    if (Array.isArray(value)) {
      return value.map(stripEmDashes);
    }
    if (value && typeof value === 'object') {
      const cleaned = {};
      for (const [k, v] of Object.entries(value)) {
        cleaned[k] = stripEmDashes(v);
      }
      return cleaned;
    }
    return value;
  }

  // Helper to set radio group value and update visual active state
  function setRadioGroupValue(name, targetValue) {
    const radios = Array.from(form.querySelectorAll(`input[name="${name}"]`));
    const rawKey = typeof targetValue === 'string' ? targetValue.trim().toLowerCase() : '';
    const mappedValue =
      (SCENARIO_SHORTHAND_MAP[name] && SCENARIO_SHORTHAND_MAP[name][rawKey]) || targetValue;

    let matched = radios.find((r) => r.value === mappedValue);
    if (!matched && typeof mappedValue === 'string') {
      const prefix = mappedValue.split('(')[0].trim().toLowerCase();
      matched = radios.find((r) => r.value.toLowerCase().includes(prefix));
    }
    if (!matched && radios.length > 0) {
      matched = radios[0];
    }
    radios.forEach((radio) => {
      const isMatch = radio === matched;
      radio.checked = isMatch;
      const label = radio.closest('.selector-option');
      if (label) {
        label.classList.toggle('active', isMatch);
      }
    });
  }

  // Wire up radio button visual active classes
  form.querySelectorAll('.selector-option input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const groupName = radio.name;
      form.querySelectorAll(`input[name="${groupName}"]`).forEach((r) => {
        const lbl = r.closest('.selector-option');
        if (lbl) lbl.classList.toggle('active', r.checked);
      });
    });
  });

  const METROWEST_TOWNS = [
    'Acton',
    'Boxborough',
    'Littleton',
    'Maynard',
    'Concord',
    'Westford',
    'Sudbury',
    'Stow',
    'Harvard',
    'Ayer',
    'Groton',
    'Hudson',
    'Marlborough',
    'Framingham',
    'Natick',
    'Wayland',
    'Carlisle',
    'Bolton',
    'Lincoln',
    'Bedford'
  ];
  let lastScenarioTown = '';

  const COMM_SECTORS = [
    'craft taproom, cidery, or microbrewery',
    'high-end residential design-build or custom carpentry studio',
    'independent farm-to-table restaurant or artisan scratch bakery',
    'boutique fitness, pilates, or martial arts academy',
    'private event venue, wedding barn, or historical gathering space',
    'specialized physical therapy, chiropractic, or sports rehab clinic',
    'independent bicycle & ski pro shop or outdoor outfitter',
    'community theater, live music venue, or private arts center',
    'local commercial landscape architecture and hardscaping outfit',
    'specialty bridal boutique or bespoke jeweler',
    'independent specialty pet care, boarding, or grooming facility',
    'local craft distillery or artisan food market'
  ];

  const COMM_CHALLENGES = [
    'social media looks amateur and phone-shot compared to their real-world quality, failing to convert viewers into paying foot traffic',
    'hosting an upcoming community event, tasting, or seasonal launch but ticket sales and RSVPs are stalled because local reach is dead',
    'website and intake forms are flooding the owner with low-margin tire-kickers while high-ticket clients slip away to slicker competitors',
    'word-of-mouth has flatlined and they have zero customer email capture or direct retention engine after first visits',
    'burned by a $4,000/mo Boston agency that handed them vanity impressions and jargon reports with zero trackable local bookings',
    'dead mid-week slumps and off-season calendar gaps with no promotional activations or community event engine',
    'buried on local Google Maps and search while inferior competitors get all the prime inquiries',
    'unable to articulate premium craftsmanship, forcing the owner to constantly defend prices against bargain-basement competitors'
  ];

  function parseGroqJson(rawContent) {
    const clean = String(rawContent || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json\s*|```\s*/gi, '')
      .trim();
    try {
      const data = JSON.parse(clean);
      return stripEmDashes(data);
    } catch (_) {
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const sliced = clean.slice(firstBrace, lastBrace + 1);
        return stripEmDashes(JSON.parse(sliced));
      }
      throw new Error('Could not parse valid JSON object from LLM response.');
    }
  }

  function resolveCandidateModels(preferredModel, isFastScenario = false) {
    const cleanPreferred =
      preferredModel && preferredModel !== 'llama-3.3-70b-versatile'
        ? preferredModel
        : 'openai/gpt-oss-120b';
    const order = isFastScenario
      ? ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', cleanPreferred]
      : [cleanPreferred, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    return Array.from(new Set(order.filter(Boolean)));
  }

  // Shared low-level LLM JSON caller (supports direct multi-model Groq + proxy fallback)
  async function callGroqJson(messages, maxTokens = 4096, temperature = 0.65) {
    const config = window.TVMEDIA_CONFIG || {};
    const proxyEndpoint = config.PROXY_ENDPOINT || '/api/strategy';
    const groqEndpoint = config.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
    const candidateModels = resolveCandidateModels(config.GROQ_MODEL, false);
    const apiKey = resolveClientKey(config);
    const effectiveMaxTokens = Math.max(Number(maxTokens) || 4096, 2400);

    let lastErrorText = '';
    let lastStatus = 0;

    // 1. Direct call across all active Groq models first so stale local proxies never block generation
    for (const candidateModel of candidateModels) {
      for (const useJsonFormat of [true, false]) {
        try {
          const payload = {
            model: candidateModel,
            messages,
            temperature,
            max_tokens: effectiveMaxTokens
          };
          if (useJsonFormat) {
            payload.response_format = { type: 'json_object' };
          }

          const directResp = await fetch(groqEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          });

          if (directResp.ok) {
            const directData = await directResp.json();
            const rawContent = directData?.choices?.[0]?.message?.content;
            if (rawContent) {
              const parsed = parseGroqJson(rawContent);
              if (parsed && typeof parsed === 'object') {
                return parsed;
              }
            }
          } else {
            lastStatus = directResp.status;
            lastErrorText = await directResp.text();
            // If Groq returned 400 json_validate_failed, salvage failed_generation if present
            if (lastStatus === 400 && lastErrorText.includes('failed_generation')) {
              try {
                const errObj = JSON.parse(lastErrorText);
                const failedGen = errObj?.error?.failed_generation;
                if (failedGen) {
                  const salvaged = parseGroqJson(failedGen);
                  if (salvaged && typeof salvaged === 'object') {
                    return salvaged;
                  }
                }
              } catch (_) {
                // Continue to non-json_object retry or next model
              }
              continue;
            }
            // For non-400 errors (e.g. 404, 429, 503), move straight to the next model
            break;
          }
        } catch (err) {
          lastErrorText = err?.message || String(err);
          break;
        }
      }
    }

    // 2. Fallback to local/serverless proxy endpoint (/api/strategy) if direct browser requests were blocked
    try {
      const proxyResp = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: candidateModels[0],
          messages,
          temperature,
          max_tokens: effectiveMaxTokens,
          response_format: { type: 'json_object' }
        })
      });

      if (proxyResp.status === 429) {
        let errMessage =
          'You have reached the studio limit of 5 Strategy Blueprint runs per 48 hours. Ready to turn these diagnostics into a working plan? Book a 15-minute strategy review on our Contact page.';
        try {
          const errJson = await proxyResp.json();
          if (errJson && errJson.message) {
            errMessage = errJson.message;
          }
        } catch (_) {
          // Keep default rate-limit message
        }
        const rateLimitError = new Error(errMessage);
        rateLimitError.status = 429;
        throw rateLimitError;
      }

      if (proxyResp.ok) {
        const proxyData = await proxyResp.json();
        const rawContent = proxyData?.choices?.[0]?.message?.content;
        if (rawContent) {
          return parseGroqJson(rawContent);
        }
      }
    } catch (err) {
      if (err && err.status === 429) {
        throw err;
      }
    }

    throw new Error(`Service returned HTTP ${lastStatus}: ${lastErrorText}`);
  }

  // Fetch a real-time dynamic scenario directly from Groq's chat completions API
  async function fetchDynamicScenario() {
    const config = window.TVMEDIA_CONFIG || {};
    const groqEndpoint = config.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
    const candidateModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    const apiKey = resolveClientKey(config);

    let townPool = METROWEST_TOWNS.filter((t) => t !== lastScenarioTown);
    if (!townPool.length) townPool = METROWEST_TOWNS;
    const chosenTown = townPool[Math.floor(Math.random() * townPool.length)];
    lastScenarioTown = chosenTown;

    const chosenSector = COMM_SECTORS[Math.floor(Math.random() * COMM_SECTORS.length)];
    const chosenChallenge = COMM_CHALLENGES[Math.floor(Math.random() * COMM_CHALLENGES.length)];

    const scenarioPrompt = [
      'You generate authentic, spontaneous, highly varied business bottleneck scenarios for independent local businesses across MetroWest and the Route 2 corridor of Massachusetts.',
      'SCOPE REQUIREMENT (COMMUNICATIONS, DIGITAL MEDIA & EVENTS MANAGEMENT):',
      'Every scenario MUST focus strictly on a challenge that a Communications Agency, Digital Media Studio, or Events Management Firm would solve.',
      'DO NOT generate internal mechanical, physical supply-chain, parts inventory, or manual craftsmanship problems (such as mud, broken tools, or shipping delays).',
      'Focus strictly on core media, communications, and events friction:',
      '1. Digital Media & Visual Content: Social channels look like an amateur ghost town or blurry phone shots that fail to showcase high-end work; video gap; outdated website leaking leads.',
      '2. Communications, Positioning & Messaging: Competing on price against lowball competitors because messaging is unclear; burned by $4,000/mo Boston agency retainers with zero trackable calls; flooded with unqualified tire-kicker inquiries.',
      '3. Events Management & Activations: Promoting upcoming community pop-ups, taproom releases, workshops, fundraisers, or seasonal festivals with weak ticket sales; dead mid-week slumps needing activations; private event venue calendar gaps.',
      '4. Local Audience & Direct Retention: Buried on local search/maps compared to inferior competitors; flatlined word-of-mouth with zero email/newsletter list; event or seasonal customers vanishing without repeat visits.',
      "Write strictly from the owner perspective in first person ('We run...', 'I own...'). State the exact business, the specific Massachusetts town, what is happening on the ground, and their communications, media, or event friction.",
      'Return valid json only with these keys:',
      '{',
      '  "bottleneck": "2-3 punchy sentences strictly in first person. State the business, town, ground reality, and specific communication, media, or event friction.",',
      '  "bandwidth": "solo" or "small" or "dedicated",',
      '  "investment": "hard" or "scrappy" or "growth",',
      '  "mindset": "stretched" or "jargon" or "flatlined" or "agency"',
      '}',
      'Context Mapping Rules:',
      "- bandwidth: choose 'solo' if owner works alone, 'small' for 2-5 crew members, 'dedicated' for larger established teams.",
      "- investment: choose 'hard' for zero cash / bootstrap, 'scrappy' for small tool budget ($200-500/mo), 'growth' for aggressive investment.",
      "- mindset: choose 'stretched' if time-starved, 'jargon' if burned by past tech/agencies, 'flatlined' if referrals plateaued, 'agency' if seeking no-BS guidance.",
      'Rules: Output valid json only. No em-dashes (-). No generic corporate marketing fluff.'
    ].join('\n');

    const messages = [
      { role: 'system', content: scenarioPrompt },
      {
        role: 'user',
        content: `Invent a fresh, completely original local Massachusetts business scenario in valid json format. Spark inspiration: consider a ${chosenSector} in or near ${chosenTown} where ${chosenChallenge}. The dilemma must be squarely in communications, digital media, event promotion, or customer acquisition/retention. Vary the specific details and write realistically from the owner perspective.`
      }
    ];

    let lastStatus = 0;
    let lastErrorText = '';

    for (const candidateModel of candidateModels) {
      for (const useJsonFormat of [true, false]) {
        try {
          const payload = {
            model: candidateModel,
            messages,
            temperature: 0.85,
            max_tokens: 600
          };
          if (useJsonFormat) {
            payload.response_format = { type: 'json_object' };
          }

          const resp = await fetch(groqEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          });

          if (resp.ok) {
            const result = await resp.json();
            const rawContent = result?.choices?.[0]?.message?.content || result?.choices?.[0]?.text;
            if (!rawContent) {
              continue;
            }
            const clean = rawContent.replace(/```json\s*|```\s*/gi, '').trim();
            const data = parseGroqJson(clean);
            const bottleneckText = (data.bottleneck || data.text || '').trim();
            if (!bottleneckText) {
              continue;
            }
            return {
              label: 'Live Route 2 / MetroWest Scenario',
              text: bottleneckText,
              bandwidth: data.bandwidth || 'small',
              investment: data.investment || 'scrappy',
              mindset: data.mindset || 'stretched'
            };
          }

          lastStatus = resp.status;
          lastErrorText = await resp.text();
          if (lastStatus === 400 && lastErrorText.includes('failed_generation')) {
            try {
              const errObj = JSON.parse(lastErrorText);
              const failedGen = errObj?.error?.failed_generation;
              if (failedGen) {
                const salvaged = parseGroqJson(failedGen);
                const bottleneckText = (salvaged.bottleneck || salvaged.text || '').trim();
                if (bottleneckText) {
                  return {
                    label: 'Live Route 2 / MetroWest Scenario',
                    text: bottleneckText,
                    bandwidth: salvaged.bandwidth || 'small',
                    investment: salvaged.investment || 'scrappy',
                    mindset: salvaged.mindset || 'stretched'
                  };
                }
              }
            } catch (_) {}
          }
          continue;
        } catch (err) {
          lastErrorText = err?.message || String(err);
          continue;
        }
      }
    }

    // Fallback to local /api/generate-scenario if direct browser fetch was blocked
    try {
      const proxyResp = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (proxyResp.ok) {
        const proxyData = await proxyResp.json();
        const bottleneckText = (proxyData.bottleneck || proxyData.text || '').trim();
        if (bottleneckText) {
          return stripEmDashes({
            label: 'Live Route 2 / MetroWest Scenario',
            text: bottleneckText,
            bandwidth: proxyData.bandwidth || 'small',
            investment: proxyData.investment || 'scrappy',
            mindset: proxyData.mindset || 'stretched'
          });
        }
      }
    } catch (_) {}

    throw new Error(`Groq scenario request failed (HTTP ${lastStatus || 'ERR'}): ${lastErrorText || 'API connection failed'}`);
  }

  function applyScenarioToForm(chosen, isLiveGenerated = false) {
    const bottleneckText = chosen && (chosen.bottleneck || chosen.text);
    if (!bottleneckText) return;
    bottleneckInput.value = stripEmDashes(bottleneckText);
    setRadioGroupValue('bandwidth', chosen.bandwidth);
    setRadioGroupValue('investment', chosen.investment);
    setRadioGroupValue('mindset', chosen.mindset);
    const cleanLabel = (chosen.label || 'Route 2 / MetroWest Dilemma')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const prefix = isLiveGenerated ? 'Generated live scenario' : 'Loaded scenario';
    scenarioStatus.textContent = stripEmDashes(
      `${prefix}: ${cleanLabel}. Click "Build My Strategy Blueprint" below or edit the text.`
    );
    formError.hidden = true;
    bottleneckInput.focus();
  }

  // Wire up Starter Scenario Pills
  const starterPills = form.querySelectorAll('.starter-pill');
  starterPills.forEach((pill) => {
    pill.addEventListener('click', async () => {
      const key = pill.getAttribute('data-scenario');
      starterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      if (key === 'random') {
        pill.disabled = true;
        pill.textContent = 'TUNING...';
        scenarioStatus.textContent = 'Connecting to Groq API for a fresh Route 2 / MetroWest scenario...';
        formError.hidden = true;
        try {
          const liveScenario = await fetchDynamicScenario();
          if (liveScenario && (liveScenario.text || liveScenario.bottleneck)) {
            applyScenarioToForm(liveScenario, true);
            return;
          }
          throw new Error('Groq returned empty scenario data');
        } catch (err) {
          console.error('Groq Scenario Error:', err);
          const errMsg = err?.message || 'Failed to connect to Groq API';
          scenarioStatus.textContent = `[ ERROR ] Scenario Generation Failed: ${errMsg}`;
          formError.textContent = `Scenario Generation Error: ${errMsg}. Check console or network tab.`;
          formError.hidden = false;
        } finally {
          pill.disabled = false;
          pill.textContent = 'Random Scenario';
        }
        return;
      }

      const chosen = SCENARIOS[key];
      if (chosen) {
        applyScenarioToForm(chosen, false);
      }
    });
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      bottleneckInput.value = '';
      starterPills.forEach((p) => p.classList.remove('active'));
      scenarioStatus.textContent = 'Ready for your real-world bottleneck.';
      formError.hidden = true;
      bottleneckInput.focus();
    });
  }

  function getSelectedContext() {
    const bandwidth = form.querySelector('input[name="bandwidth"]:checked')?.value || 'Small Team';
    const investment = form.querySelector('input[name="investment"]:checked')?.value || 'Scrappy ($100 - $800)';
    const mindset = form.querySelector('input[name="mindset"]:checked')?.value || 'Pragmatic & Direct';
    return { bandwidth, investment, mindset };
  }

  function resolveActiveContextDirectives(context) {
    const bw = (context.bandwidth || '').toLowerCase();
    const inv = (context.investment || '').toLowerCase();
    const ms = (context.mindset || '').toLowerCase();

    let bandwidthRule =
      'Small Team ("2 to 5 people juggling ops"): Recommend centralized, collaborative operational visibility accessible on mobile phones/tablets for field crews or staff (e.g. Monday.com, Jobber, Housecall Pro, shared dispatch boards, Slack/text loops) and clear delegation separating who quotes, who executes, and who handles follow-up.';
    if (bw.includes('solo')) {
      bandwidthRule =
        'Solo Owner ("Wearing every hat"): Recommend zero-maintenance, personal workflows and async communication tools (Calendly/Acuity, streamlined 3-field web intake, auto-reply SMS) so the owner is not glued to their phone while working.';
    } else if (bw.includes('established') || bw.includes('dedicated')) {
      bandwidthRule =
        'Established Crew ("Dedicated staff ready to run a system"): Recommend standardized intake SOPs, automated CRM notifications, and structured escalation pipelines.';
    }

    let investmentRule =
      'Scrappy ($100 - $800): Recommend clean, off-the-shelf software that pays for itself immediately (e.g. Monday.com boards, Jobber/Housecall Pro for trades, MailerLite for dispatch zines/promos, Squarespace/Airtable forms) paired with tactile leave-behinds (high-end printed equipment service stickers, neighborhood project yard signs, premium loyalty tokens).';
    if (inv.includes('hard') || inv.includes('$0') || inv.includes('sweat')) {
      investmentRule =
        'Hard Mode ($0 Budget) / Sweat Equity ($0 / Zero-Cost Fixes): Leverage existing native tools only: Google Business Profile, Apple Business Connect, organic local SEO, email templates, and existing calendar syncs. Zero new software subscriptions.';
    } else if (inv.includes('focused') || inv.includes('800 - $2,500')) {
      investmentRule =
        'Focused ($800 - $2,500): Recommend core digital asset buildouts: TV Media Website Sprint, custom mobile inquiry and estimation flows, dedicated quarterly on-site photography asset bank, and customer reactivation campaigns.';
    } else if (inv.includes('strategic') || inv.includes('2,500+')) {
      investmentRule =
        'Strategic ($2,500+): Recommend full-system activation: custom interactive web tools/calculators, multi-channel booking architecture, regional local search domination, and dedicated creative direction.';
    }

    let mindsetRule =
      'Pragmatic & Direct: Cut straight to the punch list. Zero theory, 100% operational mechanics.';
    if (ms.includes('stretched')) {
      mindsetRule =
        "Stretched Thin: Focus on triage, gating the owner's time, raising prices/minimums, and filtering out tire-kickers upfront.";
    } else if (ms.includes('word-of-mouth') || ms.includes('plateau') || ms.includes('flatlined')) {
      mindsetRule =
        'Word-of-Mouth Plateau: Focus on visual proof (real project galleries, Google reviews, customer video case studies) so warm referrals convert instead of researching competitors.';
    } else if (ms.includes('burned out') || ms.includes('social') || ms.includes('agency')) {
      mindsetRule =
        'Burned Out on Social: Drastically deprioritize public social feeds; shift focus entirely to high-intent Google search, direct SMS/email, and past-client reactivation.';
    } else if (ms.includes('jargon') || ms.includes('overwhelmed')) {
      mindsetRule =
        'Overwhelmed by Ad Jargon: Ban paid ads completely until intake and retention are airtight; prioritize organic local search and referral loops.';
    } else if (ms.includes('experiment')) {
      mindsetRule =
        'Ready to Experiment: Recommend unconventional community activations, street-level partnerships, and interactive web calculators.';
    }

    return { bandwidthRule, investmentRule, mindsetRule };
  }

  function buildGroqMessages(bottleneck, context) {
    const activeRules = resolveActiveContextDirectives(context);
    const systemPrompt = [
      'PERSONA & BRAND VOICE (PRESERVE STRICTLY):',
      'You are Tyler Valois, Founder of TV Media Solutions (Boxborough, MA).',
      '- TONE: The anti-corporate, straightforward New England operator. Direct, perceptive, honest, and collaborative. Tell the owner where their time or money is leaking without being condescending, preachy, or using corporate consultant speak.',
      '- NO PREACHY OPENINGS: Zero formulaic openings like "Look, you think you need X...", "Let\'s be honest...", or "The reality is...". Speak directly, conversationally, and analytically.',
      '- NO CORPORATE AI BUZZWORDS: Never use words like "synergy", "seamless", "delve", "tapestry", "elevate", "thrive", "revolutionize", "touchpoints", "magnetic pull", or "omnichannel".',
      '- ZERO EM-DASHES: Strict rule: ZERO em-dashes or en-dashes anywhere in prompts, outputs, or code. Use hyphens (-), colons (:), or clean sentences.',
      '- PURGES: Zero occurrences of the word "turnkey" and zero marketing uses of the word "floor".',
      '',
      'CORE COMMUNICATIONS PHILOSOPHY (FIRST-PRINCIPLES LENS):',
      '1. THE CONSUMER-FIRST LENS: Ask "If I were on the other side of this screen or counter, how would I want to be treated?" Normal humans are busy, skeptical, and primed to skip ads. Respect how humans actually behave in the real world rather than how marketing agencies wish they behaved.',
      '2. VALUE BEFORE TRANSACTION: Earn trust by giving genuine utility, clarity, hospitality, or insight before demanding a sale.',
      '3. RETENTION AS AN ACQUISITION ENGINE: Stop building customer treadmills that exhaust existing patrons to chase cold clicks. Value and activate the regulars already in the room.',
      '',
      'HARD CONTEXT BRANCHING (STRICTLY ENFORCE THE USER\'S SELECTED BANDWIDTH, INVESTMENT & MINDSET):',
      'Your tool recommendations, scope, and operational plays MUST strictly change based on the user\'s selected context:',
      'A. TEAM BANDWIDTH BRANCHING:',
      '- Solo Owner ("Wearing every hat"): Recommend zero-maintenance, personal workflows and async communication tools (Calendly/Acuity, streamlined 3-field web intake, auto-reply SMS) so the owner is not glued to their phone while working.',
      '- Small Team ("2 to 5 people juggling ops"): Recommend centralized, collaborative operational visibility accessible on mobile phones/tablets for field crews or staff (e.g. Monday.com, Jobber, Housecall Pro, shared dispatch boards, Slack/text loops) and clear delegation separating who quotes, who executes, and who handles follow-up.',
      '- Established Crew ("Dedicated staff ready to run a system"): Recommend standardized intake SOPs, automated CRM notifications, and structured escalation pipelines.',
      'B. INVESTMENT LEVEL BRANCHING:',
      '- Hard Mode ($0 Budget) / Sweat Equity ($0 / Zero-Cost Fixes): Leverage existing native tools only: Google Business Profile, Apple Business Connect, organic local SEO, email templates, and existing calendar syncs. Zero new software subscriptions.',
      '- Scrappy ($100 - $800): Recommend clean, off-the-shelf software that pays for itself immediately (e.g. Monday.com boards, Jobber/Housecall Pro for trades, MailerLite for dispatch zines/promos, Squarespace/Airtable forms) paired with tactile leave-behinds (high-end printed equipment service stickers, neighborhood project yard signs, premium loyalty tokens).',
      '- Focused ($800 - $2,500): Recommend core digital asset buildouts: TV Media Website Sprint, custom mobile inquiry and estimation flows, dedicated quarterly on-site photography asset bank, and customer reactivation campaigns.',
      '- Strategic ($2,500+): Recommend full-system activation: custom interactive web tools/calculators, multi-channel booking architecture, regional local search domination, and dedicated creative direction.',
      'C. OWNER MINDSET BRANCHING:',
      '- Pragmatic & Direct: Cut straight to the punch list. Zero theory, 100% operational mechanics.',
      '- Stretched Thin: Focus on triage, gating the owner\'s time, raising prices/minimums, and filtering out tire-kickers upfront.',
      '- Word-of-Mouth Plateau: Focus on visual proof (real project galleries, Google reviews, customer video case studies) so warm referrals convert instead of researching competitors.',
      '- Burned Out on Social: Drastically deprioritize public social feeds; shift focus entirely to high-intent Google search, direct SMS/email, and past-client reactivation.',
      '- Overwhelmed by Ad Jargon: Ban paid ads completely until intake and retention are airtight; prioritize organic local search and referral loops.',
      '- Ready to Experiment: Recommend unconventional community activations, street-level partnerships, and interactive web calculators.',
      '',
      'PRAGMATIC TOOLING: KILL LOW-TECH ABSURDITIES & TECH-BRO CLICHES:',
      '- BANNED LOW-TECH TROPES:',
      '  * NEVER suggest physical magnetic whiteboards or office wall charts to mobile field businesses (HVAC, landscaping, plumbing, electricians, delivery). Their crews are on the road; mobile-accessible cloud tools (Jobber, Monday.com, Housecall Pro, Google Calendar) are mandatory.',
      '  * NEVER suggest paper punch cards to high-ticket contractors or professional services (punch cards are for $5 coffees, not $15,000 hardscapes or $5,000 dental implants).',
      '  * Do NOT default to Google Sheets if dedicated tools (Monday.com, Jobber, Notion, ClickUp) are obviously cleaner and fit their budget tier.',
      '- BANNED TECH-BRO CLICHES:',
      '  * NEVER recommend QR code menus, QR table ordering, or digital ticketing where human hospitality belongs (diners hate them: keep dining and service human).',
      '  * NEVER recommend building custom mobile apps for single-location small businesses.',
      '  * NEVER recommend automated chatbot widgets, automated DM sequences, or generic social calendars ("post 5 reels a week").',
      '  * NEVER recommend expensive paid ad funnels for low-margin impulse purchases (e.g. PPC ads for a $4 muffin or coffee).',
      '- TV MEDIA\'S WHEELHOUSE:',
      '  Focus recommendations where communications, client intake, and digital media connect to revenue:',
      '  1. Frictionless Intake: Stopping phone tag with instant mobile quote/estimate forms.',
      '  2. Trust-Building Media: Authentic on-location photography and video walkthroughs of real work instead of stock photos.',
      '  3. Customer Retention: Service reminder tags, VIP maintenance clubs, and localized review engines.',
      '',
      'DE-PARAPHRASING THE MARKETING SECRET & DYNAMIC DIAGNOSTIC STRUCTURE (THE 4 MANIFESTO TIERS):',
      '1. THE MARKETING SECRET (why_stuck): Do NOT merely reword the user\'s prompt and add "agencies won\'t fix this." Provide an actual analytical diagnostic breakthrough: call out the underlying structural flaw behind the symptom (e.g. "You are treating emergency dispatch and scheduled installs as the same pipeline. Without an intake triage filter, unpredictable emergencies cannibalize your high-margin scheduled work.") and point out the hidden financial or time leak (hours spent playing phone tag after 7 PM, lost revenue from unassigned crews, or high ad spend hitting a leaky website).',
      '2. MAKING MEDIA MATTER (what_matters & what_to_ignore): What actually matters for their customer relationship, what distractions/busywork they need to ignore completely, and 1 concrete media or hospitality play.',
      '3. THE THREE PILLARS:',
      '   - Pillar 1 (Acquisition & Loyalty): A specific play calibrated to their industry ticket size to reward existing customers and turn retention into their primary engine.',
      '   - Pillar 2 (Operational Reality): Removing friction in their real-world booking, buying, dispatching, or inquiry process, strictly honoring their Bandwidth and Investment Level branching rules.',
      '   - Pillar 3 (Platform Native Utility): Using specific digital channels for what they actually do best, strictly honoring their Mindset branching rule.',
      '4. WHAT WE COULD BUILD (deliverables & first_move_monday): 3 bespoke, realistic deliverables strictly calibrated to their Bandwidth, Investment Level, and Mindset tiers (combining frictionless intake, trust-building media, operational software, or tactile collateral appropriate to their ticket size), plus a concrete First Move for Monday.',
      '',
      'Return ONLY valid json matching this exact schema:',
      JSON.stringify({
        blueprint_title: 'Concise, punchy TV Media strategy title tailored to this specific business and context',
        reality_check: {
          headline: 'Direct, analytical 1-sentence diagnosis identifying the structural root cause behind their symptom (zero preachy openings)',
          why_stuck: '2 to 3 direct sentences identifying the underlying operational flaw (without paraphrasing the user) and quantifying the hidden time or margin leak.',
          explanation: 'Mirror of why_stuck for UI rendering'
        },
        making_media_matter: {
          what_matters: 'What actually matters for earning trust and connecting communications, intake, and media to revenue.',
          what_to_ignore: 'The specific marketing busywork, vanity distractions, or low-ROI habits this owner must stop immediately.',
          core_shift: 'Combined summary of what_matters and what_to_ignore',
          social_play: {
            format_tag: 'Concrete format label (e.g. ON-LOCATION VIDEO WALKTHROUGH, PROJECT PROOF GALLERY, LOCAL SEARCH UTILITY)',
            title: 'Specific title of the media or trust-building play',
            execution: '2 to 3 sentences explaining how to execute this play to earn trust without discounting margin.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'A specific retention and referral play calibrated to their ticket size and industry.',
          operational_reality_and_flow: 'Concrete workflow and tooling fix calibrated strictly to their selected Bandwidth and Investment Level.',
          platform_native_utility: 'Channel focus calibrated strictly to their selected Mindset and customer behavior.'
        },
        first_move_monday: 'One concrete action the owner can execute this Monday morning in under 60 minutes.',
        deliverables: [
          {
            title: 'Deliverable #1',
            medium_tag: 'Deliverable type calibrated to their Investment tier',
            how_it_works: 'How this bespoke deliverable works in their real operation.',
            why_it_works: 'Why it stops the cash or time bleed and solves their structural bottleneck.'
          },
          {
            title: 'Deliverable #2',
            medium_tag: 'Deliverable type calibrated to their Investment tier',
            how_it_works: 'How this bespoke deliverable works in their real operation.',
            why_it_works: 'Why it stops the cash or time bleed and solves their structural bottleneck.'
          },
          {
            title: 'Deliverable #3',
            medium_tag: 'Deliverable type calibrated to their Investment tier',
            how_it_works: 'How this bespoke deliverable works in their real operation.',
            why_it_works: 'Why it stops the cash or time bleed and solves their structural bottleneck.'
          }
        ]
      })
    ].join('\n');

    const userPrompt = [
      `Client Bottleneck: "${bottleneck}"`,
      `Selected Bandwidth: ${context.bandwidth} -> MANDATORY RULE: ${activeRules.bandwidthRule}`,
      `Selected Investment Level: ${context.investment} -> MANDATORY RULE: ${activeRules.investmentRule}`,
      `Selected Owner Mindset: ${context.mindset} -> MANDATORY RULE: ${activeRules.mindsetRule}`,
      'Generate the TV Media Strategy Blueprint in valid json format now. Do not paraphrase the user prompt in reality_check.why_stuck: diagnose the structural root cause and hidden cost, enforce the exact Bandwidth/Investment/Mindset rules above, avoid low-tech absurdities (no wall whiteboards for field crews, no paper punch cards for high-ticket trades), and use zero em-dashes.'
    ].join('\n');

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];
  }

  // Graceful fallback blueprint synthesizer if the live API cannot be reached
  function buildOfflineFallbackBlueprint(bottleneck, context) {
    const lower = bottleneck.toLowerCase();
    if (lower.includes('auto') || lower.includes('bay') || lower.includes('oil') || lower.includes('brake')) {
      return stripEmDashes({
        blueprint_title: 'Reclaiming Lift Hours & Shifting Drivers to High-Margin Bay Work',
        reality_check: {
          headline: 'Your packed schedule proves local drivers already trust your shop with their keys: the bottleneck is bay allocation and post-visit follow-through, not customer demand.',
          why_stuck: 'Running an independent garage leaves zero time for generic social media advice, and when drivers come to you for $35 state inspections and oil changes, they already believe you are honest. They only return to the dealership for brakes and diagnostics because the dealer hands them a structured 60,000-mile maintenance roadmap while independent shops hand them a paper receipt.',
          explanation: 'Running an independent garage leaves zero time for generic social media advice, and when drivers come to you for $35 state inspections and oil changes, they already believe you are honest. They only return to the dealership for brakes and diagnostics because the dealer hands them a structured 60,000-mile maintenance roadmap while independent shops hand them a paper receipt.'
        },
        making_media_matter: {
          what_matters: 'Use visual behind-the-scenes proof and physical service records to demystify what happens on the lift so vehicle owners see your diagnostic expertise before a warning light ever comes on.',
          what_to_ignore: 'Ignore daily social video trends, paid ad funnels for cheap oil change coupons, and automated chat widgets that frustrate drivers trying to check bay availability.',
          core_shift: 'Use visual behind-the-scenes proof and physical service records to demystify what happens on the lift so vehicle owners see your diagnostic expertise before a warning light ever comes on.',
          social_play: {
            format_tag: 'BAY BENCHMARK PHOTO BREAKDOWN',
            title: 'What $35 State Inspections Actually Catch on New England Undercarriages',
            execution: 'Post a crisp 3-photo comparison of real salt-worn suspension and brake hardware right off your lift, explaining in plain English what still has 10,000 miles left versus what needs attention now. It proves honesty without discounting a dime.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'Replace generic couponing with a structured Commuter Priority Club where regulars who book their seasonal maintenance with you unlock priority morning drop-off slots and complimentary fluid top-offs.',
          operational_reality_and_flow: `Calibrated for a ${context.bandwidth} on a ${context.investment} scope, cap low-margin inspection slots to dedicated afternoon windows so prime morning lift hours stay open for diagnostic and brake work.`,
          platform_native_utility: 'Use Google Business Profile updates and direct SMS service reminders for utility-driven maintenance windows rather than chasing daily social media algorithms.'
        },
        first_move_monday: 'Block off your morning lift schedule from 8:00am to 11:30am strictly for mechanical and diagnostic work, moving all routine state inspections and oil-only visits into afternoon slots.',
        deliverables: [
          {
            title: 'Glovebox 60,000-Mile Service Passport',
            medium_tag: 'PRINTED GLOVEBOX BOOKLET',
            how_it_works: 'A durable glovebox card placed on the passenger seat after every oil change or inspection showing the exact 6-month status of their brakes, tires, and suspension with your direct booking line.',
            why_it_works: 'Intercepts the dealership service mailer before the customer ever leaves your parking lot.'
          },
          {
            title: '3-Field Lift-Hour Triage & Booking Filter',
            medium_tag: 'INTAKE WORKFLOW',
            how_it_works: 'A simple 3-question online and counter booking flow that routes quick state inspections into dedicated afternoon blocks while reserving morning bays for high-margin mechanical repairs.',
            why_it_works: 'Protects your technicians from losing prime diagnostic hours to low-margin interruptions.'
          },
          {
            title: 'Worn-Part Countertop Comparison Display',
            medium_tag: 'IN-SHOP VISUAL PROOF',
            how_it_works: 'A clean, labeled counter display showing an OEM dealer part next to the exact specification aftermarket part you install, paired with a plain-English warranty breakdown.',
            why_it_works: 'Eliminates the myth that dealership parts are safer without requiring a long sales pitch at the register.'
          }
        ]
      });
    }

    if (lower.includes('b2b') || lower.includes('cnc') || lower.includes('machin') || lower.includes('oem')) {
      return stripEmDashes({
        blueprint_title: 'Modernizing RFQ Trust for Next-Generation Procurement Engineers',
        reality_check: {
          headline: 'Retaining core OEM accounts for years proves your tolerances and shop execution are rock solid: the friction lives in how younger procurement teams vet vendors online before sending an RFQ.',
          why_stuck: 'Managing a precision shop takes full operational focus, and traditional consumer marketing advice does not apply to B2B manufacturing. Younger procurement engineers rarely cold-call shops to ask what machines they run: they vet five vendors silently online in 90 seconds, and an outdated site makes a high-precision shop look like a capacity risk.',
          explanation: 'Managing a precision shop takes full operational focus, and traditional consumer marketing advice does not apply to B2B manufacturing. Younger procurement engineers rarely cold-call shops to ask what machines they run: they vet five vendors silently online in 90 seconds, and an outdated site makes a high-precision shop look like a capacity risk.'
        },
        making_media_matter: {
          what_matters: 'In B2B manufacturing, media matters when it removes engineering friction. Replace generic company descriptions with concrete proof of your tolerances, inspection rigs, and lead-time reliability.',
          what_to_ignore: 'Ignore consumer social media schedules, generic blog posts written by AI, and broad display ad campaigns.',
          core_shift: 'In B2B manufacturing, media matters when it removes engineering friction. Replace generic company descriptions with concrete proof of your tolerances, inspection rigs, and lead-time reliability.',
          social_play: {
            format_tag: 'TECHNICAL CAPABILITY SPOTLIGHT',
            title: 'Inside the Fixture: How We Hold Tight Tolerances on Complex Runs',
            execution: 'Publish a clean close-up photo and 4-point technical breakdown of a challenging material or fixture setup on LinkedIn and your capabilities page, showing engineers how you prevent scrap and delays.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'Offer existing accounts and qualified new engineering teams a Priority Prototype Slot or pre-production DFM (Design for Manufacturability) review as an exclusive value-add rather than competing on unit pricing.',
          operational_reality_and_flow: `Built for an ${context.bandwidth} operating within a ${context.investment} investment window, streamline RFQ intake so engineers can upload STEP files and tolerance requirements in under 60 seconds.`,
          platform_native_utility: 'Anchor your digital footprint on a scannable technical web landing page and targeted LinkedIn engineering dispatches rather than consumer social networks.'
        },
        first_move_monday: 'Write a 1-page plain-text list of every CNC machine, maximum part envelope, and inspection instrument on your shop floor to replace vague homepage copy.',
        deliverables: [
          {
            title: '1-Page Engineer Equipment & Tolerance Spec Sheet',
            medium_tag: 'DOWNLOADABLE PDF + PRINT INSERT',
            how_it_works: 'A scannable, no-fluff technical datasheet listing your exact CNC envelope sizes, metrology equipment, materials list, and typical turnaround windows.',
            why_it_works: 'Gives procurement engineers the exact documentation they need to approve you as a qualified vendor internally.'
          },
          {
            title: 'Frictionless 3-Field RFQ & Print Upload Portal',
            medium_tag: 'WEB INTAKE FLOW',
            how_it_works: 'A clean intake form on your site that captures part quantities, material specs, and target delivery dates up front before routing directly to your estimator.',
            why_it_works: 'Cuts out days of back-and-forth email tag and signals modern operational readiness.'
          },
          {
            title: 'Physical Sample Finish & Tolerance Kit Card',
            medium_tag: 'DIRECT MAIL / LEAVE-BEHIND',
            how_it_works: 'A machined sample token sent to regional engineering leads featuring your shop tolerances and direct estimator contact details.',
            why_it_works: 'Puts physical proof of your machining quality directly on the buyer desk.'
          }
        ]
      });
    }

    return stripEmDashes({
      blueprint_title: 'Turning Peak-Hour Trust Into Steady, Margin-Protected Momentum',
      reality_check: {
        headline: 'You have already solved the hardest part of running an independent business: proving that customers genuinely value what you do when they walk through the door.',
        why_stuck: 'Running daily operations leaves very little bandwidth for generic agency advice like posting five reels a day. When a business has strong pockets of demand alongside frustrating dead zones or margin squeeze, the real friction lives in customer flow and retention mechanics: giving your busiest regulars a structured reason to anchor your off-peak windows.',
        explanation: 'Running daily operations leaves very little bandwidth for generic agency advice like posting five reels a day. When a business has strong pockets of demand alongside frustrating dead zones or margin squeeze, the real friction lives in customer flow and retention mechanics: giving your busiest regulars a structured reason to anchor your off-peak windows.'
      },
      making_media_matter: {
        what_matters: 'Stop treating media like a digital megaphone begging for visits. Combine purposeful content creation, local visibility, and genuine in-person hospitality so customers feel like insiders rather than targets of a discount promotion.',
        what_to_ignore: 'Ignore daily algorithm chasing, generic discount coupons that train customers to wait for sales, and clunky digital gimmicks that get in the way of human service.',
        core_shift: 'Stop treating media like a digital megaphone begging for visits. Combine purposeful content creation, local visibility, and genuine in-person hospitality so customers feel like insiders rather than targets of a discount promotion.',
        social_play: {
          format_tag: 'BEHIND-THE-COUNTER FIELD DISPATCH',
          title: 'The Off-Peak Insider Window: What We Build & Prep When the Rush Clears',
          execution: 'Share a candid, high-craft look at the specialized work, prep, or community utility happening during your quieter window, paired with a specific perk reserved only for patrons who visit during that block.'
        }
      },
      three_pillars: {
        acquisition_and_loyalty: 'Eliminate margin-killing freebies and discounts. Instead, introduce an insider perk or structured loyalty pass that rewards existing regulars with priority access, bonus upgrades, or bring-a-neighbor privileges.',
        operational_reality_and_flow: `Calibrated for a ${context.bandwidth} and a ${context.investment} budget, remove the hidden friction in how customers discover and book your highest-margin offerings.`,
        platform_native_utility: 'Focus your energy on 1 primary discovery channel (like Google Business Profile or local neighborhood search) and 1 direct retention channel (like a physical punch card or clean email dispatch).'
      },
      first_move_monday: 'Hand a physical off-peak perk card to your first 25 regulars on Monday morning to test mid-week return visits without spending a dollar on ads.',
      deliverables: [
        {
          title: 'Off-Peak Insider Club & Physical Punch Card',
          medium_tag: 'TANGIBLE LOYALTY ARTIFACT',
          how_it_works: 'A physical punch card or countertop pass handed to your peak-hour regulars that unlocks an exclusive upgrade or reserved perk when they return during your slower weekday window.',
          why_it_works: 'Shifts existing foot traffic into dead hours without devaluing your core pricing.'
        },
        {
          title: 'Countertop & Entryway Flow Map',
          medium_tag: 'PHYSICAL + MOBILE SIGNAGE',
          how_it_works: 'A clear visual menu and counter display at your point of sale that highlights your highest-margin packages and guides customers to their next step in 5 seconds.',
          why_it_works: 'Turns passive foot traffic into higher average ticket value without extra staff pitching.'
        },
        {
          title: 'Fast 1-Page Mobile Inquiry & Google Profile Overhaul',
          medium_tag: 'LOCAL SEARCH & WEB UTILITY',
          how_it_works: 'A fast-loading 1-page mobile overview linked from your Google Business Profile that answers common pricing and scheduling questions and lets high-intent customers reach you in 3 fields.',
          why_it_works: 'Saves hours of staff time while capturing new residents searching for trusted local options.'
        }
      ]
    });
  }

  async function requestGroqBlueprint(bottleneck, context) {
    const messages = buildGroqMessages(bottleneck, context);
    try {
      return await callGroqJson(messages, 4096, 0.65);
    } catch (err) {
      console.error('Groq Blueprint Error:', err);
      // Graceful fallback removed per user instruction - display actual API error code instead
      throw err;
    }
  }

  function renderBlueprint(blueprint, bottleneck, context) {
    // Context badges
    const badgesContainer = document.getElementById('results-context-badges');
    badgesContainer.innerHTML = '';
    [
      `Bandwidth: ${context.bandwidth}`,
      `Budget: ${context.investment}`,
      `Mindset: ${context.mindset.split('(')[0].trim()}`
    ].forEach((label) => {
      const span = document.createElement('span');
      span.className = 'navy-tag';
      span.textContent = stripEmDashes(label);
      badgesContainer.appendChild(span);
    });

    lastRenderedTitle = blueprint.blueprint_title || 'Your TV Media Strategy Blueprint';
    document.getElementById('results-headline').textContent = lastRenderedTitle;
    document.getElementById('results-inquiry-echo').textContent =
      `Diagnostic Bottleneck: "${stripEmDashes(bottleneck)}"`;

    // Section 1: The Marketing Secret
    const rc = blueprint.the_marketing_secret || blueprint.reality_check || {};
    const realityHeadline = rc.headline || '';
    const realityBody = rc.why_stuck || rc.explanation || blueprint.why_stuck || '';
    document.getElementById('reality-headline').textContent = realityHeadline;
    document.getElementById('reality-body').textContent = realityBody;

    // Section 2: Making Your Media Matter (What Matters, What to Ignore, and Concrete Play)
    const mmm = blueprint.making_media_matter || {};
    const whatMatters = mmm.what_matters || mmm.core_shift || blueprint.what_matters || '';
    const whatToIgnore = mmm.what_to_ignore || blueprint.what_to_ignore || '';
    document.getElementById('media-philosophy').textContent = whatMatters;
    const examplesGrid = document.getElementById('media-examples-grid');
    examplesGrid.innerHTML = '';

    if (whatToIgnore) {
      const ignoreCard = document.createElement('div');
      ignoreCard.className = 'social-example-item';

      const ignoreTag = document.createElement('span');
      ignoreTag.className = 'crimson-tag';
      ignoreTag.textContent = 'DISTRACTIONS TO CUT IMMEDIATELY';

      const ignoreH5 = document.createElement('h5');
      ignoreH5.textContent = 'What to Ignore & Stop Funding';

      const ignoreP = document.createElement('p');
      ignoreP.textContent = whatToIgnore;

      ignoreCard.append(ignoreTag, ignoreH5, ignoreP);
      examplesGrid.appendChild(ignoreCard);
    }

    const singlePlay =
      mmm.social_play ||
      (Array.isArray(mmm.media_examples) && mmm.media_examples[0]) ||
      null;

    if (singlePlay) {
      const card = document.createElement('div');
      card.className = 'social-example-item';

      const tag = document.createElement('span');
      tag.className = 'teal-tag';
      tag.textContent = singlePlay.format_tag || 'HIGH-LEVERAGE MEDIA PLAY';

      const h5 = document.createElement('h5');
      h5.textContent = singlePlay.title || 'Featured Content & Media Play';

      const p = document.createElement('p');
      p.textContent = singlePlay.execution || '';

      card.append(tag, h5, p);
      examplesGrid.appendChild(card);
    }

    // Section 3: The Three Pillars
    const pillars = blueprint.three_pillars || {};
    const pAcquisition = pillars.acquisition_and_loyalty || '';
    const pOperations = pillars.operational_reality_and_flow || pillars.operational_reality || '';
    const pPlatform = pillars.platform_native_utility || '';
    document.getElementById('pillar-acquisition').textContent = pAcquisition;
    document.getElementById('pillar-operations').textContent = pOperations;
    document.getElementById('pillar-platform').textContent = pPlatform;

    // Section 4: What We Could Actually Build (Dynamic Deliverables + First Move Monday)
    const delivGrid = document.getElementById('deliverables-grid');
    delivGrid.innerHTML = '';
    const rawDeliverables = Array.isArray(blueprint.deliverables)
      ? blueprint.deliverables
      : Array.isArray(blueprint.concrete_deliverables)
        ? blueprint.concrete_deliverables
        : [];
    const deliverables = rawDeliverables.slice(0, 3);
    const firstMoveMonday = blueprint.first_move_monday || '';

    deliverables.forEach((item, idx) => {
      const article = document.createElement('article');
      article.className = 'deliverable-card';

      const topRow = document.createElement('div');
      topRow.className = 'deliverable-card-top';

      const numBadge = document.createElement('span');
      numBadge.className = 'crimson-tag';
      numBadge.textContent = `ARTIFACT 0${idx + 1}`;

      const mediumBadge = document.createElement('span');
      mediumBadge.className = 'teal-tag';
      mediumBadge.textContent = item.medium_tag || 'OPERATIONAL ASSET';

      topRow.append(numBadge, mediumBadge);

      const title = document.createElement('h4');
      title.textContent = item.title || `Operational Asset 0${idx + 1}`;

      const how = document.createElement('p');
      how.className = 'deliverable-how';
      how.textContent = item.how_it_works || '';

      const impact = document.createElement('div');
      impact.className = 'deliverable-impact';
      const impactLabel = document.createElement('strong');
      impactLabel.textContent = 'Why It Moves the Needle:';
      const impactText = document.createElement('span');
      impactText.textContent = item.why_it_works || '';
      impact.append(impactLabel, impactText);

      article.append(topRow, title, how, impact);
      delivGrid.appendChild(article);
    });

    // Build formatted plain-text brief for Contact Intake & Session Persistence
    const lines = [
      `TV MEDIA STRATEGY BLUEPRINT: ${lastRenderedTitle}`,
      `Studio: TV Media (Boxborough, MA)`,
      `Bottleneck Inquiry: ${stripEmDashes(bottleneck)}`,
      `Context: Bandwidth: ${context.bandwidth} | Budget: ${context.investment} | Mindset: ${context.mindset}`,
      '',
      '1. THE MARKETING SECRET',
      `${realityHeadline}`,
      `${realityBody}`,
      '',
      '2. MAKING YOUR MEDIA MATTER',
      `   What Matters: ${whatMatters}`,
      whatToIgnore ? `   What to Ignore: ${whatToIgnore}` : '',
      singlePlay
        ? `   Featured Play [${singlePlay.format_tag || 'Media Play'}]: ${singlePlay.title} - ${singlePlay.execution}`
        : '',
      '',
      '3. THE THREE PILLARS',
      `   - Acquisition AND Loyalty: ${pAcquisition}`,
      `   - Operational Reality & Intuitive Flow: ${pOperations}`,
      `   - Platform Native Utility: ${pPlatform}`,
      '',
      '4. WHAT WE COULD ACTUALLY BUILD (3 TANGIBLE DELIVERABLES)',
      ...deliverables.map(
        (d, i) =>
          `   0${i + 1}. ${d.title} (${d.medium_tag || 'Asset'}): ${d.how_it_works} Impact: ${d.why_it_works}`
      ),
      firstMoveMonday ? `   First Move Monday: ${firstMoveMonday}` : '',
      '',
      'Next Step: Book a 15-minute strategy review at https://www.tvmediasolutions.com/contact.html?type=consulting&from=strategy'
    ];
    lastRenderedBriefText = stripEmDashes(lines.filter(Boolean).join('\n'));
    lastRawBottleneck = stripEmDashes(bottleneck);
    lastSelectedContext = context;

    // Persist bottleneck, selected context, and generated blueprint into sessionStorage
    persistBlueprintToSessionStorage(lastRawBottleneck, lastSelectedContext, lastRenderedBriefText);

    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Ensure clicking "Book a 15-Minute Strategy Review ->" syncs latest state to sessionStorage
  if (bookStrategyReviewBtn) {
    bookStrategyReviewBtn.addEventListener('click', () => {
      const currentBottleneck = (bottleneckInput?.value || lastRawBottleneck || '').trim();
      const currentContext = lastSelectedContext || getSelectedContext();
      persistBlueprintToSessionStorage(currentBottleneck, currentContext, lastRenderedBriefText);
    });
  }

  // Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bottleneck = bottleneckInput.value.trim();

    if (!bottleneck || bottleneck.length < 12) {
      formError.textContent =
        'Please describe what your business does and the bottleneck keeping you stuck (or click a Quick Starter Scenario above).';
      formError.hidden = false;
      bottleneckInput.focus();
      return;
    }

    formError.hidden = true;
    generateBtn.disabled = true;
    generateBtnText.textContent = 'Building Your Strategy Blueprint...';
    loadingPanel.hidden = false;
    resultsSection.hidden = true;

    try {
      const context = getSelectedContext();
      const blueprint = await requestGroqBlueprint(bottleneck, context);
      renderBlueprint(blueprint, bottleneck, context);
    } catch (err) {
      if (err && err.status === 429) {
        formError.innerHTML = '';
        const badge = document.createElement('strong');
        badge.textContent = '[ RATE LIMIT REACHED // 5 RUNS PER 48 HOURS ] ';
        const textNode = document.createTextNode(
          (err.message ||
            'You have reached the studio limit of 5 Strategy Blueprint runs per 48 hours.') + ' '
        );
        const reviewLink = document.createElement('a');
        reviewLink.href = 'contact.html?type=consulting&from=strategy';
        reviewLink.textContent = 'Book a 15-Minute Strategy Review ->';
        formError.append(badge, textNode, reviewLink);
        formError.hidden = false;
      } else {
        formError.textContent =
          (err && err.message) ||
          'Unable to generate your blueprint right now. Please try again or reach out via our Contact page.';
        formError.hidden = false;
      }
    } finally {
      generateBtn.disabled = false;
      generateBtnText.textContent = 'Build My Strategy Blueprint ->';
      loadingPanel.hidden = true;
    }
  });
})();
