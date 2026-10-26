// Example configuration template for TV Media Strategy Blueprint Generator.
// Copy this file to `java/config.local.js` (which is git-ignored) for local static testing,
// or run `python3 server.py` to proxy requests through `/api/strategy` using `.env`.
window.TVMEDIA_CONFIG = {
  PROXY_ENDPOINT: '/api/strategy',
  GROQ_ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_API_KEY: '', // Set in git-ignored java/config.local.js or server-side .env
  CONTACT_EMAIL: 'tvmediama@gmail.com',
  CONTACT_PHONE: '978-501-3526'
};

