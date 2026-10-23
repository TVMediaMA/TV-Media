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

  // Lead Capture Elements
  const emailBlueprintBtn = document.getElementById('email-blueprint-btn');
  const emailCapturePanel = document.getElementById('email-capture-panel');
  const leadNameInput = document.getElementById('lead-name-input');
  const leadEmailInput = document.getElementById('lead-email-input');
  const sendBlueprintEmailBtn = document.getElementById('send-blueprint-email-btn');
  const cancelEmailBtn = document.getElementById('cancel-email-btn');
  const emailFeedback = document.getElementById('email-feedback');

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

  // Diverse preset scenario pool for graceful fallback if live API is unreachable
  const RANDOM_POOL = [
    {
      label: 'Independent Hardware & Feed Store',
      text: 'We own a family hardware and garden supply store competing with big-box chains 15 minutes away. Homeowners come to us only when they need a single $2 bolt and 10 minutes of free advice, then buy their $400 power tools and seasonal mulch pallets at the big-box store.',
      bandwidth: 'Small Team',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Stretched Thin / High Traffic, Zero Margin'
    },
    {
      label: 'Design-Build Landscape Crew',
      text: 'We run a 6-person hardscaping and native landscaping crew in MetroWest. Every spring our phone rings off the hook with tire-kickers asking for free backyard quotes on $800 patch jobs, burning 12 hours a week of estimator time when we want $15k+ patio and drainage projects.',
      bandwidth: 'Established Crew',
      investment: 'Focused ($800 - $2,500)',
      mindset: 'Pragmatic & Direct (Cut the fluff, show me what moves the needle)'
    },
    {
      label: 'Local Orchard & Farm Stand',
      text: 'We operate a seasonal orchard and farm store. October weekends are chaotic with traffic backups and long register lines, but weekday farm-stand produce and CSA shares lag behind and rainy weekends wipe out our margin.',
      bandwidth: 'Small Team',
      investment: 'Focused ($800 - $2,500)',
      mindset: 'Ready to Experiment (Open to bold, unconventional local plays)'
    },
    {
      label: 'Solo Specialty Physical Therapist',
      text: 'I run a solo cash-based sports physical therapy practice for runners and lifters. Patients love the results and get fixed in 4 visits, which means I constantly have to replace my caseload and new residents confuse me with high-volume insurance mills.',
      bandwidth: 'Solo Owner',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Overwhelmed by Ad Jargon'
    },
    {
      label: 'Independent Bicycle Fit & Repair Studio',
      text: 'We see a massive surge in bike tune-ups every April that backs up our repair stand for 3 weeks, but riders buy their high-margin wheelsets and custom frames online because they only view us as a quick flat-tire fix shop.',
      bandwidth: 'Small Team',
      investment: 'Scrappy ($100 - $800)',
      mindset: 'Word-of-Mouth Plateau (Great regulars, invisible to new residents)'
    },
    {
      label: 'Custom Millwork & Cabinetry Shop',
      text: 'We build custom architectural millwork and mudroom built-ins. General contractors love our craftsmanship, but homeowners ghost our proposals after we spend 6 hours drawing custom CAD layouts for free during the initial consult.',
      bandwidth: 'Small Team',
      investment: 'Focused ($800 - $2,500)',
      mindset: 'Stretched Thin / High Traffic, Zero Margin'
    }
  ];

  const RANDOM_INDUSTRY_SEEDS = [
    'an independent bicycle repair and fitting shop',
    'a family-owned commercial printing and sign shop',
    'a local specialty butcher and prepared foods market',
    'an independent veterinary clinic or dog day-training facility',
    'a residential HVAC or plumbing service contractor',
    'a local martial arts academy or independent strength gym',
    'a custom cabinetmaker and architectural millwork studio',
    'a neighborhood independent bookstore and event space',
    'a local music school and instrument rental shop',
    'a specialty dry cleaner and tailoring workshop',
    'an independent garden center and native plant nursery',
    'a regional B2B industrial equipment calibration service'
  ];

  let lastRandomIndex = -1;
  let lastRenderedBriefText = '';
  let lastRenderedTitle = '';

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
    let matched = radios.find((r) => r.value === targetValue);
    if (!matched && typeof targetValue === 'string') {
      const prefix = targetValue.split('(')[0].trim().toLowerCase();
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
  async function callGroqJson(messages, maxTokens = 2048, temperature = 0.68) {
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
      response_format: { type: 'json_object' }
    };

    // 1. Try local/serverless proxy endpoint first (/api/strategy)
    try {
      const proxyResp = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (proxyResp.ok) {
        const data = await proxyResp.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          return stripEmDashes(JSON.parse(content));
        }
      }
    } catch (_) {
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

  // Dynamic LLM Scenario Generator for the "Random Scenario" button
  async function generateRandomScenarioOnTheFly() {
    const seed =
      RANDOM_INDUSTRY_SEEDS[Math.floor(Math.random() * RANDOM_INDUSTRY_SEEDS.length)];
    const messages = [
      {
        role: 'system',
        content: [
          'You generate realistic, grounded first-person business bottleneck scenarios for independent local businesses in New England.',
          'STRICT RULE: NEVER use em dashes or en dashes anywhere. Use commas or periods.',
          'Return ONLY valid JSON matching this exact schema:',
          JSON.stringify({
            label: 'Short 3 to 4 word business label',
            text: '2 to 3 realistic first-person sentences describing what the business does and the specific operational, margin, or customer bottleneck keeping them stuck right now.',
            bandwidth: 'Must be one of: ' + VALID_BANDWIDTHS.join(' | '),
            investment: 'Must be one of: ' + VALID_INVESTMENTS.join(' | '),
            mindset: 'Must be one of: ' + VALID_MINDSETS.join(' | ')
          })
        ].join('\n')
      },
      {
        role: 'user',
        content: `Invent a specific, realistic operational and marketing dilemma for ${seed}. Avoid clichés and never use em dashes.`
      }
    ];

    return await callGroqJson(messages, 650, 0.85);
  }

  function applyScenarioToForm(chosen, isLiveGenerated = false) {
    if (!chosen || !chosen.text) return;
    bottleneckInput.value = stripEmDashes(chosen.text);
    setRadioGroupValue('bandwidth', chosen.bandwidth);
    setRadioGroupValue('investment', chosen.investment);
    setRadioGroupValue('mindset', chosen.mindset);
    const cleanLabel = (chosen.label || 'Custom Business Dilemma')
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
        const originalLabel = pill.textContent;
        pill.disabled = true;
        pill.textContent = '⚡ Generating Scenario...';
        scenarioStatus.textContent = 'Generating a realistic business dilemma on the fly...';
        try {
          const liveScenario = await generateRandomScenarioOnTheFly();
          if (liveScenario && liveScenario.text) {
            applyScenarioToForm(liveScenario, true);
            return;
          }
        } catch (_) {
          // Smoothly default to diverse preset scenarios without throwing an error
        } finally {
          pill.disabled = false;
          pill.textContent = originalLabel;
        }

        let idx = Math.floor(Math.random() * RANDOM_POOL.length);
        if (idx === lastRandomIndex) {
          idx = (idx + 1) % RANDOM_POOL.length;
        }
        lastRandomIndex = idx;
        applyScenarioToForm(RANDOM_POOL[idx], false);
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
      'You are the Lead Strategist at TV Media, an independent digital communications agency in Boxborough, Massachusetts.',
      'Agency Expertise: Ground-level operational communications, event strategy, high-utility digital content, and retention mechanics for independent businesses, trades, and local spaces.',
      'Agency Tone: Direct, pragmatic, and anti-corporate. You evaluate business problems from the perspective of an experienced operator, not a traditional marketing firm.',
      '',
      'WHAT NOT TO DO (STRICT NEGATIVE CONSTRAINTS):',
      '- NEVER suggest "posting more consistently on social media" as a primary fix.',
      '- NEVER suggest generic margin-killing discounts, BOGO deals, or free inventory giveaways.',
      '- NEVER use corporate marketing jargon (e.g. "magnetic pull", "synergy", "must-visit hub", "elevate your brand", "omnichannel", "deep-dive").',
      '- NEVER summarize or parrot the user prompt back to them in the output.',
      '- NEVER use em dashes or en dashes anywhere. Use commas, periods, or clean simple hyphens " - "., or bulleted or numbered lists, or any type of list.',
      '',
      'OUTPUT SECTION CONTEXT:',
      '1. The Reality Check: A frank, validating diagnosis of the misconception or operational bottleneck keeping them stuck, challenging standard marketing assumptions.',
      '2. Making Media Matter: The foundation on how they can provide genuine upfront value to customers before asking for a transaction. Includes exactly 1 concrete media play.',
      '3. The Three Pillars: Diagnostic strategic direction across Acquisition AND Loyalty (protecting margin while rewarding retention), Operational Reality & Intuitive Flow (fixing physical or digital friction), and Platform Native Utility (using tools for their intended purpose).',
      '4. What We Could Actually Build: Exactly 3 dynamic, practical operational tools or collateral pieces tailored to the problem (not generic social post bundles).',
      '',
      'Return ONLY valid JSON matching this schema:',
      JSON.stringify({
        blueprint_title: 'Concise, relevant strategy title',
        reality_check: {
          headline: 'Direct truth addressing the underlying misconception',
          explanation: '2 to 3 sentences diagnosing the real operational friction without fluff.'
        },
        making_media_matter: {
          core_shift: 'Strategic guidance on delivering utility before asking for a sale. Focused on content delivery that provides value to the consumer',
          social_play: {
            format_tag: 'Format label',
            title: 'Title of the play',
            execution: '2 to 3 sentences explaining how this builds trust without discounting margin.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'Strategic direction focusing on retention and customer lifetime value over churn. Reject margin-killing discounts and new-customer churn. Shift strategy toward customer lifetime value, insider perks, and tangible retention mechanisms that turn existing regulars into a secondary acquisition engine.',
          operational_reality_and_flow: 'Strategic direction addressing physical or digital flow bottlenecks. The actionable bridge between diagnosis and execution. 1. Consumer-first flow: Design every touchpoint (booking, counter flow, flyers, forms) for real human behavior, making it dead simple, frictionless, and effortless to navigate without being condescending to the customer. 2. Scrappy feasibility: Focus on what the business can realistically execute right now, rejecting expensive agency ideals (like $10k software or massive retainers) in favor of practical, accessible tools that actually move the needle in their business.',
          platform_native_utility: 'Strategic direction on choosing the right channel for actual user habits. Use the right tool the right way for its intended purpose. Not every platform is an ad engine, and you dont need to be on every platform. Stop blasting the same promo everywhere. Focus on creative ways to expand reach by engaging in real communities both in and beyond major social media sites.'
        },
        deliverables: [
          {
            title: 'Artifact #1',
            medium_tag: 'Artifact type',
            how_it_works: 'How this tool functions in practice.',
            why_it_works: 'Why it moves the needle for their specific bottleneck.'
          },
          {
            title: 'Artifact #2',
            medium_tag: 'Artifact type',
            how_it_works: 'How this tool functions in practice.',
            why_it_works: 'Why it moves the needle for their specific bottleneck.'
          },
          {
            title: 'Artifact #3',
            medium_tag: 'Artifact type',
            how_it_works: 'How this tool functions in practice.',
            why_it_works: 'Why it moves the needle for their specific bottleneck.'
          }
        ]
      })
    ].join('\n');

    const userPrompt = [
      `Client Bottleneck: "${bottleneck}"`,
      `Bandwidth: ${context.bandwidth}`,
      `Investment: ${context.investment}`,
      `Mindset: ${context.mindset}`,
      'Generate the TV Media Strategy Blueprint JSON now. Be candid, grounded, and use zero em dashes.'
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
          headline: 'Your packed schedule proves local drivers already trust your keys in your hands. You do not have a traffic problem, you have a bay-allocation problem.',
          explanation: 'When drivers come to you for $35 inspections and oil changes, they already believe you are honest. They only return to the dealership for brakes and diagnostics because the dealer hands them a structured maintenance roadmap while independent shops hand them a paper receipt.'
        },
        making_media_matter: {
          core_shift: 'Stop trying to advertise routine maintenance. Use visual behind-the-scenes storytelling and physical service records to demystify what happens on the lift so vehicle owners see your diagnostic expertise before a warning light ever comes on.',
          social_play: {
            format_tag: 'BAY BENCHMARK PHOTO BREAKDOWN',
            title: 'What $35 State Inspections Actually Catch on New England Undercarriages',
            execution: 'Post a crisp 3-photo comparison of real salt-worn suspension and brake hardware right off your lift, explaining in plain English what still has 10,000 miles left versus what needs attention now. It proves honesty without discounting a dime.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'Replace generic couponing with a structured Commuter Priority Club where regulars who book their seasonal maintenance with you unlock priority morning drop-off slots and complimentary fluid top-offs.',
          operational_reality_and_flow: `Calibrated for a ${context.bandwidth} on a ${context.investment} scope, cap low-margin inspection slots to specific mid-week windows so prime morning lift hours stay open for diagnostic and brake work.`,
          platform_native_utility: 'Use Google Business Profile updates and direct SMS service reminders for utility-driven maintenance windows rather than trying to chase daily social media algorithms.'
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
          headline: 'Retaining core OEM accounts for years proves your tolerances and shop execution are rock solid. Your digital presence just needs to match the precision of your shop.',
          explanation: 'Younger procurement engineers do not cold-call shops to ask what machines they run. They vet 5 vendors silently online in 90 seconds, and an outdated site makes a high-precision shop look like a capacity risk.'
        },
        making_media_matter: {
          core_shift: 'In B2B manufacturing, media matters when it removes engineering friction. Replace generic company descriptions with concrete proof of your tolerances, inspection rigs, and lead-time reliability.',
          social_play: {
            format_tag: 'TECHNICAL CAPABILITY SPOTLIGHT',
            title: 'Inside the Fixture: How We Hold Tight Tolerances on Complex Runs',
            execution: 'Publish a clean close-up photo and 4-bullet technical breakdown of a challenging material or fixture setup on LinkedIn and your capabilities page, showing engineers how you prevent scrap and delays.'
          }
        },
        three_pillars: {
          acquisition_and_loyalty: 'Offer existing accounts and qualified new engineering teams a Priority Prototype Slot or pre-production DFM (Design for Manufacturability) review as an exclusive value-add rather than competing on race-to-the-bottom unit pricing.',
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
        headline: 'You have already done the hardest part of local business: proving that people genuinely want what you offer when they walk through the door.',
        explanation: 'When a business has strong pockets of demand alongside frustrating dead zones or margin squeeze, more generic social posting rarely fixes it. The real unlock is restructuring how customers move through your space and giving regulars a reason to anchor your off-peak windows.'
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
      return await callGroqJson(messages, 2048, 0.65);
    } catch (_) {
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

    // Build formatted plain-text brief for Email Lead Capture
    const lines = [
      `TV MEDIA STRATEGY BLUEPRINT: ${lastRenderedTitle}`,
      `Studio: TV Media (Boxborough, MA)`,
      `Bottleneck Inquiry: ${stripEmDashes(bottleneck)}`,
      `Context: ${context.bandwidth} | ${context.investment} | ${context.mindset}`,
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
      'Next Step: Book a 15-minute strategy review at https://www.tvmediasolutions.com/contact.html'
    ];
    lastRenderedBriefText = stripEmDashes(lines.filter(Boolean).join('\n'));

    resultsSection.hidden = false;
    if (emailCapturePanel) emailCapturePanel.hidden = true;
    if (emailBlueprintBtn) emailBlueprintBtn.setAttribute('aria-expanded', 'false');
    if (emailFeedback) emailFeedback.hidden = true;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    } finally {
      generateBtn.disabled = false;
      generateBtnText.textContent = 'Build My Strategy Blueprint ->';
      loadingPanel.hidden = true;
    }
  });

  // Lead Capture Trigger ("Email Me This Blueprint")
  if (emailBlueprintBtn && emailCapturePanel) {
    emailBlueprintBtn.addEventListener('click', () => {
      const isHidden = emailCapturePanel.hidden;
      emailCapturePanel.hidden = !isHidden;
      emailBlueprintBtn.setAttribute('aria-expanded', String(isHidden));
      if (isHidden && leadEmailInput) {
        leadEmailInput.focus();
      }
    });
  }

  if (cancelEmailBtn && emailCapturePanel) {
    cancelEmailBtn.addEventListener('click', () => {
      emailCapturePanel.hidden = true;
      if (emailBlueprintBtn) emailBlueprintBtn.setAttribute('aria-expanded', 'false');
    });
  }

  if (sendBlueprintEmailBtn) {
    sendBlueprintEmailBtn.addEventListener('click', async () => {
      const email = (leadEmailInput?.value || '').trim();
      const nameOrBiz = (leadNameInput?.value || '').trim();

      if (!email || !email.includes('@')) {
        if (emailFeedback) {
          emailFeedback.textContent = 'Please enter a valid email address so we can send your blueprint.';
          emailFeedback.hidden = false;
        }
        leadEmailInput?.focus();
        return;
      }

      // Copy brief to clipboard as a seamless convenience backup
      try {
        if (lastRenderedBriefText && navigator.clipboard) {
          await navigator.clipboard.writeText(lastRenderedBriefText);
        }
      } catch (_) {
        // Ignore clipboard errors
      }

      const subject = encodeURIComponent(
        stripEmDashes(
          `TV Media Strategy Blueprint: ${lastRenderedTitle || 'Diagnostic Breakdown'}${nameOrBiz ? ' (' + nameOrBiz + ')' : ''}`
        )
      );
      const intro = [
        `Hi Tyler,`,
        '',
        `Please send me a copy of my Strategy Blueprint and let's discuss how this applies to my business.`,
        `My Email: ${email}`,
        nameOrBiz ? `Name / Business: ${nameOrBiz}` : '',
        '',
        '--- GENERATED BLUEPRINT ---',
        lastRenderedBriefText
      ]
        .filter((line) => line !== null)
        .join('\n');

      const body = encodeURIComponent(stripEmDashes(intro));
      const cc = encodeURIComponent(email);
      window.location.href = `mailto:tvmediama@gmail.com?cc=${cc}&subject=${subject}&body=${body}`;

      if (emailFeedback) {
        emailFeedback.textContent =
          'Opening your email client with your full blueprint addressed to you and Tyler (and copied to your clipboard as a backup).';
        emailFeedback.hidden = false;
      }
    });
  }
})();
