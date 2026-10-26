/**
 * TV Media - Contact Form & Studio Intake Handler (java/contact.js)
 * Asynchronous dispatch to Google Apps Script Web App with on-page confirmation modal.
 */
(() => {
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5LGQen09VBiqT-Q88UMfVg_jTulpfZTRqmI2RNSXKYpHgm3LDuULusyvUou4LRaJW/exec';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn ? submitBtn.querySelector('.btn-submit-text') : null;
  const errorBanner = document.getElementById('form-error-banner');
  const modal = document.getElementById('contact-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalDismissBtn = document.getElementById('modal-dismiss-btn');
  const modalRecap = document.getElementById('modal-recap');

  // Handle URL query parameters to pre-check service chips (e.g., ?type=workshop)
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = (urlParams.get('type') || urlParams.get('service') || '').toLowerCase();
  const fromParam = (urlParams.get('from') || '').toLowerCase();
  if (typeParam || fromParam === 'strategy') {
    const effectiveType = typeParam || 'consulting';
    const chips = form.querySelectorAll('input[name="services"]');
    chips.forEach(chip => {
      const val = chip.value.toLowerCase();
      if (
        (effectiveType === 'workshop' && val.includes('workshop')) ||
        (effectiveType === 'consulting' && val.includes('consulting')) ||
        (effectiveType === 'social' && val.includes('social')) ||
        (effectiveType === 'sprint' && val.includes('sprint')) ||
        (effectiveType === 'content' && val.includes('content')) ||
        (effectiveType === 'audit' && val.includes('audit'))
      ) {
        chip.checked = true;
      }
    });
  }

  // Hydrate bottleneck, context, and generated blueprint from sessionStorage (Strategy Generator handoff)
  const notesTextarea = document.getElementById('contact-notes');
  const hiddenBlueprintInput = document.getElementById('contact-generated-blueprint');

  function buildCombinedBlueprintPayload() {
    try {
      const storedBlueprint = (sessionStorage.getItem('tvmedia_generated_blueprint') || '').trim();
      const storedContextRaw = (sessionStorage.getItem('tvmedia_context') || '').trim();
      let contextSummary = '';
      if (storedContextRaw) {
        try {
          const parsed = JSON.parse(storedContextRaw);
          if (parsed && typeof parsed === 'object') {
            contextSummary = [
              parsed.bandwidth ? `Bandwidth: ${parsed.bandwidth}` : '',
              parsed.investment ? `Investment: ${parsed.investment}` : '',
              parsed.mindset ? `Mindset: ${parsed.mindset}` : ''
            ]
              .filter(Boolean)
              .join(' | ');
          } else {
            contextSummary = storedContextRaw;
          }
        } catch (_) {
          contextSummary = storedContextRaw;
        }
      }

      if (!storedBlueprint && !contextSummary) {
        return '';
      }
      if (storedBlueprint && contextSummary && !storedBlueprint.includes(contextSummary)) {
        return `Selected Context: ${contextSummary}\n\n${storedBlueprint}`;
      }
      return storedBlueprint || `Selected Context: ${contextSummary}`;
    } catch (_) {
      return '';
    }
  }

  try {
    const storedBottleneck = (sessionStorage.getItem('tvmedia_bottleneck') || '').trim();
    if (storedBottleneck && notesTextarea && !notesTextarea.value.trim()) {
      notesTextarea.value = storedBottleneck.slice(0, 1000);
    }
    const combinedBlueprint = buildCombinedBlueprintPayload();
    if (combinedBlueprint && hiddenBlueprintInput) {
      hiddenBlueprintInput.value = combinedBlueprint;
    }
  } catch (_) {
    // Ignore sessionStorage access errors
  }

  // Field validation helpers
  function clearErrors() {
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    form.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('has-error'));
    if (errorBanner) {
      errorBanner.hidden = true;
      errorBanner.textContent = '';
    }
  }

  function showError(fieldId, errorId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);
    if (input) input.classList.add('has-error');
    if (errorEl) errorEl.textContent = message;
  }

  function validateEmail(email) {
    if (!email || email.length > 80) return false;
    const basicFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicFormat.test(email)) return false;
    // Validate email ends in standard domains (.com, .org, .edu, .net, .io, .co)
    return /\.(com|org|edu|net|io|co)$/i.test(email.trim());
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Modal helpers
  function openModal(data) {
    if (!modal) return;
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || 'Anonymous';
    if (modalRecap) {
      modalRecap.innerHTML = `
        <div class="recap-row"><strong>Selected Services:</strong> <span>${escapeHtml(data.services || 'Consulting')}</span></div>
        <div class="recap-row"><strong>Name:</strong> <span>${escapeHtml(fullName)}</span></div>
        <div class="recap-row"><strong>Email:</strong> <span>${escapeHtml(data.email)}</span></div>
        ${data.businessName ? `<div class="recap-row"><strong>Business Name:</strong> <span>${escapeHtml(data.businessName)}</span></div>` : ''}
        ${data.website ? `<div class="recap-row"><strong>Website:</strong> <span>${escapeHtml(data.website)}</span></div>` : ''}
        <div class="recap-row"><strong>Monthly Newsletter:</strong> <span>${data.newsletter ? 'Subscribed' : 'Not opted in'}</span></div>
        <div class="recap-row"><strong>Studio Promos ($100 Off):</strong> <span>${data.studioPromos ? 'Claimed' : 'Not selected'}</span></div>
      `;
    }
    modal.hidden = false;
    document.body.classList.add('modal-active');
    if (modalCloseBtn) modalCloseBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('modal-active');
    if (submitBtn) submitBtn.focus();
  }

  // Modal event listeners
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const firstNameInput = document.getElementById('contact-first-name');
    const lastNameInput = document.getElementById('contact-last-name');
    const emailInput = document.getElementById('contact-email');
    const businessInput = document.getElementById('contact-business');
    const websiteInput = document.getElementById('contact-website');
    const notesInput = document.getElementById('contact-notes');
    const newsletterInput = document.getElementById('optin_newsletter') || document.getElementById('contact-newsletter');
    const promosInput = document.getElementById('optin_promos') || document.getElementById('contact-promos');
    const botTrapInput = document.getElementById('studio-bot-trap');
    const confessionalInput = document.getElementById('ai-confessional-booth');

    const firstName = (firstNameInput?.value || '').trim();
    const lastName = (lastNameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const businessName = (businessInput?.value || '').trim();
    const website = (websiteInput?.value || '').trim();
    const notes = (notesInput?.value || '').trim();
    const newsletter = newsletterInput?.checked ? 'yes' : 'no';
    const studioPromos = promosInput?.checked ? 'yes' : 'no';
    const studioBotTrap = (botTrapInput?.value || '').trim();
    const aiConfessionalBooth = (confessionalInput?.value || '').trim();

    let hasErrors = false;

    if (!firstName) {
      showError('contact-first-name', 'first-name-error', 'Please enter your first name.');
      hasErrors = true;
    }

    if (!lastName) {
      showError('contact-last-name', 'last-name-error', 'Please enter your last name.');
      hasErrors = true;
    }

    if (!email) {
      showError('contact-email', 'email-error', 'Please enter your email address.');
      hasErrors = true;
    } else if (email.length > 80) {
      showError('contact-email', 'email-error', 'Email address must be 80 characters or fewer.');
      hasErrors = true;
    } else if (!validateEmail(email)) {
      showError('contact-email', 'email-error', 'Please provide a valid email ending in standard domains (.com, .org, .edu, .net, .io, .co).');
      hasErrors = true;
    }

    if (!notes) {
      showError('contact-notes', 'notes-error', 'Please describe your business and the bottleneck you would like to solve.');
      hasErrors = true;
    } else if (notes.length > 1000) {
      showError('contact-notes', 'notes-error', 'Notes cannot exceed 1000 characters.');
      hasErrors = true;
    }

    if (hasErrors) {
      const firstError = form.querySelector('.has-error');
      if (firstError) firstError.focus();
      return;
    }

    // Collect selected service chips
    const selectedChips = Array.from(
      form.querySelectorAll('input[name="services"]:checked')
    ).map(cb => cb.value);
    const servicesString = selectedChips.length > 0 ? selectedChips.join(', ') : 'Consulting';

    // Retrieve hidden generated blueprint + context payload (if present)
    const generatedBlueprintInput = document.getElementById('contact-generated-blueprint');
    const generatedBlueprintPayload = (
      (generatedBlueprintInput && generatedBlueprintInput.value) ||
      buildCombinedBlueprintPayload() ||
      ''
    ).trim();

    // Failsafe: append the generated blueprint & context block to the FormData notes payload
    // while keeping the visible #contact-notes textarea clean for the user
    const notesPayloadForDispatch = generatedBlueprintPayload
      ? `${notes}\n\n=== ATTACHED STRATEGY BLUEPRINT & CONTEXT ===\n${generatedBlueprintPayload}`
      : notes;

    // Prepare FormData payload for Google Apps Script Web App
    const formData = new FormData();
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('name', `${firstName} ${lastName}`.trim()); // Fallback alias
    formData.append('businessName', businessName);
    formData.append('business', businessName); // Fallback alias
    formData.append('website', website);
    formData.append('email', email);
    formData.append('services', servicesString);
    formData.append('notes', notesPayloadForDispatch);
    formData.append('generatedBlueprint', generatedBlueprintPayload);
    formData.append('optin_newsletter', newsletter);
    formData.append('optin_promos', studioPromos);
    formData.append('newsletter', newsletter);
    formData.append('studioPromos', studioPromos);
    formData.append('studio_bot_trap', studioBotTrap);
    formData.append('ai_confessional_booth', aiConfessionalBooth);
    formData.append('timestamp', new Date().toISOString());
    formData.append('source', fromParam === 'strategy' ? 'tvmediasolutions.com/contact?from=strategy' : 'tvmediasolutions.com/contact');

    // UI Loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }
    if (btnText) {
      btnText.textContent = 'TRANSMITTING DISPATCH...';
    }

    try {
      // Send async POST to Google Apps Script Web App endpoint
      await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });

      // Show confirmation modal with summary
      openModal({
        firstName,
        lastName,
        email,
        businessName,
        website,
        services: servicesString,
        notes,
        newsletter: newsletterInput?.checked,
        studioPromos: promosInput?.checked
      });

      // Clear Strategy Generator sessionStorage keys after successful submission
      try {
        sessionStorage.removeItem('tvmedia_bottleneck');
        sessionStorage.removeItem('tvmedia_context');
        sessionStorage.removeItem('tvmedia_generated_blueprint');
      } catch (_) {
        // Ignore sessionStorage errors
      }

      // Reset form
      form.reset();
      if (generatedBlueprintInput) {
        generatedBlueprintInput.value = '';
      }

      // Ensure newsletter defaults to checked after reset
      if (newsletterInput) newsletterInput.checked = true;

    } catch (err) {
      console.error('Submission failed:', err);
      if (errorBanner) {
        const contactEmail = (window.TVMEDIA_CONTACT && window.TVMEDIA_CONTACT.email) || 'tvmediama@gmail.com';
        errorBanner.hidden = false;
        errorBanner.textContent = `Dispatch transmission interrupted. Please check your connection or email us directly at ${contactEmail}.`;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
      if (btnText) {
        btnText.textContent = 'SEND INQUIRY DISPATCH ->';
      }
    }
  });
})();

