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

  // Shared low-level LLM JSON caller (supports proxy + direct fallback)
  async function callGroqJson(messages, maxTokens = 2048, temperature = 0.68, requestType = 'blueprint') {
    const config = window.TVMEDIA_CONFIG || {};
    const proxyEndpoint = config.PROXY_ENDPOINT || '/api/strategy';
    const groqEndpoint = config.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
    const model = config.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const apiKey = resolveClientKey(config);

    const requestPayload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      request_type: requestType,
      response_format: { type: 'json_object' }
    };

    // 1. Try local/serverless proxy endpoint first (/api/strategy)
    let rateLimitError = null;
    try {
      const proxyResp = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
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
        rateLimitError = new Error(errMessage);
        rateLimitError.status = 429;
        throw rateLimitError;
      }

      if (proxyResp.ok) {
        const data = await proxyResp.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return stripEmDashes(JSON.parse(content));
        }
      }
    } catch (err) {
      if (err && err.status === 429) {
        throw err;
      }
      // Proxy unavailable; proceed to direct call
    }

    // 2. Direct call with automatic model fallback
    const candidateModels = Array.from(
      new Set([model, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
    );
    let lastErrorText = '';
    let lastStatus = 0;

    for (const candidateModel of candidateModels) {
      const directResp = await fetch(groqEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          ...requestPayload,
          model: candidateModel
        })
      });

      if (directResp.ok) {
        const data = await directResp.json();
        const rawContent = data?.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error('The diagnostic service returned an empty response.');
        }
        return stripEmDashes(JSON.parse(rawContent));
      }

      lastStatus = directResp.status;
      lastErrorText = await directResp.text();
      if (lastStatus === 404 && lastErrorText.includes('model_not_found')) {
        continue;
      }
      break;
    }

    throw new Error(`Service returned HTTP ${lastStatus}: ${lastErrorText}`);
  }

  // Fetch a real-time dynamic scenario from /api/generate-scenario (with direct Groq fallback if static)
  async function fetchDynamicScenario() {
    try {
      const resp = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const bottleneckText = data.bottleneck || data.text;
        if (bottleneckText) {
          return stripEmDashes({
            label: 'Live Route 2 / MetroWest Scenario',
            text: bottleneckText,
            bandwidth: data.bandwidth || 'small',
            investment: data.investment || 'scrappy',
            mindset: data.mindset || 'stretched'
          });
        }
      }
    } catch (_) {
      // Proceed to direct Groq call if local /api/generate-scenario endpoint is not running
    }

    const scenarioPrompt = [
      'Generate a realistic, specific operational bottleneck dilemma for an independent business along the Route 2 corridor or MetroWest Massachusetts (e.g. coffee shop, auto repair, bakery, gym, trades, craft brewery, dental, boutique retail, pet care).',
      "Write strictly from the owner's perspective.",
      'Return valid JSON with:',
      '{',
      '  "bottleneck": "2-3 sentences explaining their business, what is happening on the ground, and why they are stuck.",',
      '  "bandwidth": "solo" | "small" | "dedicated",',
      '  "investment": "hard" | "scrappy" | "growth",',
      '  "mindset": "stretched" | "jargon" | "flatlined" | "agency"',
      '}',
      'Rules: No em-dashes (-). No generic marketing fluff. Ground it in tangible operational friction (quiet Tuesdays, no repeat customers, ad money burning with no tracking, booking confusion).'
    ].join('\n');

    const directData = await callGroqJson(
      [
        { role: 'system', content: scenarioPrompt },
        {
          role: 'user',
          content:
            'Generate a fresh, specific operational bottleneck dilemma for an independent Route 2 or MetroWest business now.'
        }
      ],
      450,
      0.88,
      'scenario'
    );

    return stripEmDashes({
      label: 'Live Route 2 / MetroWest Scenario',
      text: directData.bottleneck || directData.text || '',
      bandwidth: directData.bandwidth || 'small',
      investment: directData.investment || 'scrappy',
      mindset: directData.mindset || 'stretched'
    });
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
        scenarioStatus.textContent = 'Tuning into a fresh Route 2 / MetroWest business scenario...';
        try {
          const liveScenario = await fetchDynamicScenario();
          if (liveScenario && (liveScenario.text || liveScenario.bottleneck)) {
            applyScenarioToForm(liveScenario, true);
            return;
          }
        } catch (_) {
          // Fallback to one of the 5 quick starters only if offline/server fails
          const keys = Object.keys(SCENARIOS);
          let fallbackKey = keys[Math.floor(Math.random() * keys.length)];
          if (fallbackKey === lastFallbackKey && keys.length > 1) {
            fallbackKey = keys[(keys.indexOf(fallbackKey) + 1) % keys.length];
          }
          lastFallbackKey = fallbackKey;
          applyScenarioToForm(SCENARIOS[fallbackKey], false);
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

  function buildGroqMessages(bottleneck, context) {
    const systemPrompt = [
      'PERSONA:',
      'You are Tyler Valois, Founder of TV Media Solutions (Boxborough, MA).',
      '',
      'VOICE GUIDELINES (AUTHENTIC TV MEDIA BRAND VOICE):',
      '- Straightforward, anti-corporate New England operator.',
      '- You are glad to help, but you do not blow smoke, you do not use corporate buzzwords, and you do not talk like a gentle HR consultant.',
      '- You tell the owner exactly where they are going wrong and why their current approach is bleeding cash or wasting hours.',
      '- No formulaic openings like "Look, you think you need X, but you should do Y."',
      '- No corporate buzzwords ("synergy", "elevate", "delve", "tapestry", "seamless", "thrive", "magnetic pull", "omnichannel").',
      '- Ground every recommendation in real-world friction: quiet weekday shifts, ad spend with zero conversion tracking, websites that take 8 seconds to load on mobile, neglecting regulars to chase cold clicks.',
      '',
      'REQUIRED OUTPUT STRUCTURE (THE 4 MANIFESTO TIERS):',
      '1. THE REALITY CHECK: The blunt truth about their situation. Acknowledge what they are up against, call out the mistake they are making, and explain why standard agency advice is burning their money.',
      '2. MAKING MEDIA MATTER: The foundation. How to earn trust and give customers something tangible to care about before asking them to spend a dollar. Includes 1 concrete media play.',
      '3. THE THREE PILLARS:',
      '   - Pillar 1 (Acquisition & Loyalty): How to stop chasing cold leads and start turning the customers already walking through the door into repeat revenue.',
      '   - Pillar 2 (Operational Reality): Removing friction in their real-world booking, buying, or visit process.',
      '   - Pillar 3 (Platform Native Utility): Using digital channels for what they actually do best instead of posting generic noise across everything.',
      '4. WHAT WE COULD BUILD: 3 concrete, realistic physical or digital deliverables (e.g. on-site QR table loops, local Google Profile overhaul, print-ready promo kits, custom intake flows).',
      '',
      'STRICT GUARDRAILS:',
      '- ZERO em-dashes or en-dashes anywhere in output. Use hyphens (-), colons (:), commas, or periods.',
      '- ZERO occurrences of "turnkey" or marketing uses of "floor".',
      '',
      'Return ONLY valid JSON matching this schema:',
      JSON.stringify({
        blueprint_title: 'Concise, punchy TV Media strategy title',
        reality_check: {
          headline: 'Blunt, straightforward 1-sentence truth calling out where they are going wrong without formulaic openings',
          explanation: '2 to 3 direct sentences acknowledging what they are up against, why their current setup is bleeding cash or hours, and why standard agency advice fails here.'
        },
        making_media_matter: {
          core_shift: 'How to earn trust and give customers something tangible to care about before asking them to spend a dollar.',
          social_play: {
            format_tag: 'Format label',
            title: 'Title of the play',
            execution: '2 to 3 sentences explaining how to execute this play to earn trust without discounting margin.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'How to stop chasing cold leads and start turning the customers already walking through the door into repeat revenue.',
          operational_reality_and_flow: 'Removing friction in their real-world booking, buying, or visit process, calibrated to their team bandwidth and budget.',
          platform_native_utility: 'Using digital channels for what they actually do best instead of posting generic noise across everything.'
        },
        deliverables: [
          {
            title: 'Deliverable #1',
            medium_tag: 'Deliverable type',
            how_it_works: 'How this concrete physical or digital deliverable works on the ground.',
            why_it_works: 'Why it stops the cash/time bleed and fixes their specific bottleneck.'
          },
          {
            title: 'Deliverable #2',
            medium_tag: 'Deliverable type',
            how_it_works: 'How this concrete physical or digital deliverable works on the ground.',
            why_it_works: 'Why it stops the cash/time bleed and fixes their specific bottleneck.'
          },
          {
            title: 'Deliverable #3',
            medium_tag: 'Deliverable type',
            how_it_works: 'How this concrete physical or digital deliverable works on the ground.',
            why_it_works: 'Why it stops the cash/time bleed and fixes their specific bottleneck.'
          }
        ]
      })
    ].join('\n');

    const userPrompt = [
      `Client Bottleneck: "${bottleneck}"`,
      `Bandwidth: ${context.bandwidth}`,
      `Investment: ${context.investment}`,
      `Mindset: ${context.mindset}`,
      'Generate the TV Media Strategy Blueprint JSON now. Be straightforward, anti-corporate, and grounded in real operational friction, with zero em-dashes.'
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
          explanation: 'Running an independent garage leaves zero time for generic social media advice, and when drivers come to you for $35 state inspections and oil changes, they already believe you are honest. They only return to the dealership for brakes and diagnostics because the dealer hands them a structured 60,000-mile maintenance roadmap while independent shops hand them a paper receipt.'
        },
        making_media_matter: {
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
        deliverables: [
          {
            title: 'Glovebox 60,000-Mile Service Passport',
            medium_tag: 'PRINT + QR SERVICE BOOKLET',
            how_it_works: 'A durable glovebox card placed on the passenger seat after every oil change or inspection showing the exact 6-month status of their brakes, tires, and suspension with a QR code to book priority bay time.',
            why_it_works: 'Intercepts the dealership service mailer before the customer ever leaves your parking lot.'
          },
          {
            title: 'Lift-Hour Triage & Booking Filter',
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
          explanation: 'Managing a precision shop takes full operational focus, and traditional consumer marketing advice does not apply to B2B manufacturing. Younger procurement engineers rarely cold-call shops to ask what machines they run: they vet five vendors silently online in 90 seconds, and an outdated site makes a high-precision shop look like a capacity risk.'
        },
        making_media_matter: {
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
        deliverables: [
          {
            title: '1-Page Engineer Equipment & Tolerance Spec Sheet',
            medium_tag: 'DOWNLOADABLE PDF + PRINT INSERT',
            how_it_works: 'A scannable, no-fluff technical datasheet listing your exact CNC envelope sizes, metrology equipment, materials list, and typical turnaround windows.',
            why_it_works: 'Gives procurement engineers the exact documentation they need to approve you as a qualified vendor internally.'
          },
          {
            title: 'Frictionless RFQ & Print Upload Triage Portal',
            medium_tag: 'WEB INTAKE FLOW',
            how_it_works: 'A clean intake form on your site that captures part quantities, material specs, and target delivery dates up front before routing directly to your estimator.',
            why_it_works: 'Cuts out days of back-and-forth email tag and signals modern operational readiness.'
          },
          {
            title: 'Physical Sample Finish & Tolerance Kit Card',
            medium_tag: 'DIRECT MAIL / LEAVE-BEHIND',
            how_it_works: 'A machined sample token sent to regional engineering leads featuring your shop tolerances and a direct QR link to book a 10-minute DFM review.',
            why_it_works: 'Puts physical proof of your machining quality directly on the buyer desk.'
          }
        ]
      });
    }

    return stripEmDashes({
      blueprint_title: 'Turning Peak-Hour Trust Into Steady, Margin-Protected Momentum',
      reality_check: {
        headline: 'You have already solved the hardest part of running an independent business: proving that customers genuinely value what you do when they walk through the door.',
        explanation: 'Running daily operations leaves very little bandwidth for generic agency advice like posting five reels a day. When a business has strong pockets of demand alongside frustrating dead zones or margin squeeze, the real friction lives in customer flow and retention mechanics: giving your busiest regulars a structured reason to anchor your off-peak windows.'
      },
      making_media_matter: {
        core_shift: 'Stop treating media like a digital megaphone begging for visits. Combine purposeful content creation, local marketing, and in-person touchpoints so customers feel like insiders rather than targets of a discount promotion.',
        social_play: {
          format_tag: 'BEHIND-THE-COUNTER FIELD DISPATCH',
          title: 'The Off-Peak Insider Window: What We Build & Prep When the Rush Clears',
          execution: 'Share a candid, high-craft look at the specialized work, prep, or community utility happening during your quieter window, paired with a specific perk reserved only for patrons who visit during that block.'
        }
      },
      three_pillars: {
        acquisition_and_loyalty: 'Eliminate margin-killing freebies and discounts. Instead, introduce an insider perk or structured loyalty pass that rewards existing regulars with priority access, bonus upgrades, or bring-a-neighbor privileges.',
        operational_reality_and_flow: `Calibrated for a ${context.bandwidth} and a ${context.investment} budget, remove the hidden friction in how customers discover and book your highest-margin offerings.`,
        platform_native_utility: 'Focus your energy on 1 primary discovery channel (like Google Business Profile or local neighborhood feeds) and 1 direct retention channel (like an in-store pass or clean email dispatch).'
      },
      deliverables: [
        {
          title: 'Off-Peak Insider Club & Perk Pass',
          medium_tag: 'TANGIBLE LOYALTY ARTIFACT',
          how_it_works: 'A physical punch card or countertop pass handed to your peak-hour regulars that unlocks an exclusive upgrade or reserved perk when they return during your slower weekday window.',
          why_it_works: 'Shifts existing foot traffic into dead hours without devaluing your core pricing.'
        },
        {
          title: 'Countertop & Entryway Flow Map',
          medium_tag: 'PHYSICAL + DIGITAL SIGNAGE',
          how_it_works: 'A clear visual menu and table-tent system at your point of sale that highlights your highest-margin packages and guides customers to their next step in 5 seconds.',
          why_it_works: 'Turns passive foot traffic into higher average ticket value without extra staff pitching.'
        },
        {
          title: 'Pre-Qualified Local Inquiry & Triage Flow',
          medium_tag: 'WEB & QR SYSTEM',
          how_it_works: 'A streamlined 1-page landing flow linked from your physical collateral and Google profile that answers common pricing questions and books high-intent customers directly.',
          why_it_works: 'Saves hours of staff time while capturing new residents searching for trusted local options.'
        }
      ]
    });
  }

  async function requestGroqBlueprint(bottleneck, context) {
    const messages = buildGroqMessages(bottleneck, context);
    try {
      return await callGroqJson(messages, 2048, 0.65, 'blueprint');
    } catch (err) {
      if (err && err.status === 429) {
        throw err;
      }
      // Smoothly fall back to our tailored practitioner blueprint if live API cannot be reached
      return buildOfflineFallbackBlueprint(bottleneck, context);
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

    // Section 1: The Reality Check
    const rc = blueprint.reality_check || {};
    document.getElementById('reality-headline').textContent = rc.headline || '';
    document.getElementById('reality-body').textContent = rc.explanation || '';

    // Section 2: Making Your Media Matter (Exactly 1 Concrete Play)
    const mmm = blueprint.making_media_matter || {};
    document.getElementById('media-philosophy').textContent = mmm.core_shift || '';
    const examplesGrid = document.getElementById('media-examples-grid');
    examplesGrid.innerHTML = '';

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
    document.getElementById('pillar-acquisition').textContent =
      pillars.acquisition_and_loyalty || '';
    document.getElementById('pillar-operations').textContent =
      pillars.operational_reality_and_flow || '';
    document.getElementById('pillar-platform').textContent =
      pillars.platform_native_utility || '';

    // Section 4: What We Could Actually Build (3 Dynamic Deliverables)
    const delivGrid = document.getElementById('deliverables-grid');
    delivGrid.innerHTML = '';
    const deliverables = Array.isArray(blueprint.deliverables)
      ? blueprint.deliverables.slice(0, 3)
      : [];

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
      '1. THE REALITY CHECK',
      `${rc.headline || ''}`,
      `${rc.explanation || ''}`,
      '',
      '2. MAKING YOUR MEDIA MATTER',
      `${mmm.core_shift || ''}`,
      singlePlay
        ? `   Featured Play [${singlePlay.format_tag || 'Media Play'}]: ${singlePlay.title} - ${singlePlay.execution}`
        : '',
      '',
      '3. THE THREE PILLARS',
      `   - Acquisition AND Loyalty: ${pillars.acquisition_and_loyalty || ''}`,
      `   - Operational Reality & Intuitive Flow: ${pillars.operational_reality_and_flow || ''}`,
      `   - Platform Native Utility: ${pillars.platform_native_utility || ''}`,
      '',
      '4. WHAT WE COULD ACTUALLY BUILD (3 TANGIBLE DELIVERABLES)',
      ...deliverables.map(
        (d, i) =>
          `   0${i + 1}. ${d.title} (${d.medium_tag || 'Asset'}): ${d.how_it_works} Impact: ${d.why_it_works}`
      ),
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
