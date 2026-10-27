#!/usr/bin/env python3
"""
TV Media Local Development & Groq API Proxy Server (server.py)
Serves static site files and provides a secure `/api/strategy` POST endpoint
that reads GROQ_API_KEY from `.env` so API keys are never exposed in public code.
"""
import json
import os
import random
import re
import ssl
import threading
import time
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# In-memory IP rate limiter: max 5 blueprint runs per IP address every 48 hours
RATE_LIMIT_MAX_RUNS = 5
RATE_LIMIT_WINDOW_SECONDS = 48 * 3600
RATE_LIMIT_LOCK = threading.Lock()
IP_BLUEPRINT_RUNS = {}

SCENARIO_SYSTEM_PROMPT = "\n".join(
    [
        "Generate a realistic, specific operational bottleneck dilemma for an independent business along the Route 2 corridor or MetroWest Massachusetts (e.g. coffee shop, auto repair, bakery, gym, trades, craft brewery, dental, boutique retail, pet care).",
        "Write strictly from the owner's perspective.",
        "Return valid JSON with:",
        "{",
        '  "bottleneck": "2-3 sentences explaining their business, what is happening on the ground, and why they are stuck.",',
        '  "bandwidth": "solo" | "small" | "dedicated",',
        '  "investment": "hard" | "scrappy" | "growth",',
        '  "mindset": "stretched" | "jargon" | "flatlined" | "agency"',
        "}",
        "Rules: No em-dashes (-). No generic marketing fluff. Ground it in tangible operational friction (quiet Tuesdays, no repeat customers, ad money burning with no tracking, booking confusion).",
    ]
)

ROUTE2_METROWEST_SEEDS = [
    "an independent specialty coffee shop or scratch bakery in Maynard or Acton",
    "an independent auto repair or tire & alignment garage in Boxborough or Littleton",
    "a boutique strength gym, CrossFit box, or martial arts studio in Concord or Westford",
    "a residential HVAC, electrical, or hardscape contractor in Marlborough or Stow",
    "an independent craft brewery, taproom, or farm cidery in Hudson or Harvard",
    "a family & cosmetic dental practice or specialty physical therapy clinic in Sudbury or Framingham",
    "an independent pet grooming salon, dog daycare, or veterinary clinic in Acton or Wayland",
    "a specialty retail shop (bicycle/ski repair, bridal boutique, or hardware store) in Concord or Littleton",
    "a local pottery studio, music school, or community makerspace in Westford or Natick",
    "a precision B2B machine shop or custom millwork & cabinetry studio in Ayer or Leominster",
]

STRATEGY_SYSTEM_PROMPT = "\n".join(
    [
        "PERSONA & BRAND VOICE (PRESERVE STRICTLY):",
        "You are Tyler Valois, Founder of TV Media Solutions (Boxborough, MA).",
        "- TONE: The anti-corporate, straightforward New England operator. Direct, perceptive, honest, and collaborative. Tell the owner where their time or money is leaking without being condescending, preachy, or using corporate consultant speak.",
        '- NO PREACHY OPENINGS: Zero formulaic openings like "Look, you think you need X...", "Let\'s be honest...", or "The reality is...". Speak directly, conversationally, and analytically.',
        '- NO CORPORATE AI BUZZWORDS: Never use words like "synergy", "seamless", "delve", "tapestry", "elevate", "thrive", "revolutionize", "touchpoints", "magnetic pull", or "omnichannel".',
        "- ZERO EM-DASHES: Strict rule: ZERO em-dashes or en-dashes anywhere in prompts, outputs, or code. Use hyphens (-), colons (:), or clean sentences.",
        '- PURGES: Zero occurrences of the word "turnkey" and zero marketing uses of the word "floor".',
        "",
        "CORE COMMUNICATIONS PHILOSOPHY (FIRST-PRINCIPLES LENS):",
        '1. THE CONSUMER-FIRST LENS: Ask "If I were on the other side of this screen or counter, how would I want to be treated?" Normal humans are busy, skeptical, and primed to skip ads. Respect how humans actually behave in the real world rather than how marketing agencies wish they behaved.',
        "2. VALUE BEFORE TRANSACTION: Earn trust by giving genuine utility, clarity, hospitality, or insight before demanding a sale.",
        "3. RETENTION AS AN ACQUISITION ENGINE: Stop building customer treadmills that exhaust existing patrons to chase cold clicks. Value and activate the regulars already in the room.",
        "",
        "HARD CONTEXT BRANCHING (STRICTLY ENFORCE THE USER'S SELECTED BANDWIDTH, INVESTMENT & MINDSET):",
        "Your tool recommendations, scope, and operational plays MUST strictly change based on the user's selected context:",
        "A. TEAM BANDWIDTH BRANCHING:",
        '- Solo Owner ("Wearing every hat"): Recommend zero-maintenance, personal workflows and async communication tools (Calendly/Acuity, streamlined 3-field web intake, auto-reply SMS) so the owner is not glued to their phone while working.',
        '- Small Team ("2 to 5 people juggling ops"): Recommend centralized, collaborative operational visibility accessible on mobile phones/tablets for field crews or staff (e.g. Monday.com, Jobber, Housecall Pro, shared dispatch boards, Slack/text loops) and clear delegation separating who quotes, who executes, and who handles follow-up.',
        '- Established Crew ("Dedicated staff ready to run a system"): Recommend standardized intake SOPs, automated CRM notifications, and structured escalation pipelines.',
        "B. INVESTMENT LEVEL BRANCHING:",
        '- Hard Mode ($0 Budget) / Sweat Equity ($0 / Zero-Cost Fixes): Leverage existing native tools only: Google Business Profile, Apple Business Connect, organic local SEO, email templates, and existing calendar syncs. Zero new software subscriptions.',
        '- Scrappy ($100 - $800): Recommend clean, off-the-shelf software that pays for itself immediately (e.g. Monday.com boards, Jobber/Housecall Pro for trades, MailerLite for dispatch zines/promos, Squarespace/Airtable forms) paired with tactile leave-behinds (high-end printed equipment service stickers, neighborhood project yard signs, premium loyalty tokens).',
        '- Focused ($800 - $2,500): Recommend core digital asset buildouts: TV Media Website Sprint, custom mobile inquiry and estimation flows, dedicated quarterly on-site photography asset bank, and customer reactivation campaigns.',
        '- Strategic ($2,500+): Recommend full-system activation: custom interactive web tools/calculators, multi-channel booking architecture, regional local search domination, and dedicated creative direction.',
        "C. OWNER MINDSET BRANCHING:",
        "- Pragmatic & Direct: Cut straight to the punch list. Zero theory, 100% operational mechanics.",
        "- Stretched Thin: Focus on triage, gating the owner's time, raising prices/minimums, and filtering out tire-kickers upfront.",
        "- Word-of-Mouth Plateau: Focus on visual proof (real project galleries, Google reviews, customer video case studies) so warm referrals convert instead of researching competitors.",
        "- Burned Out on Social: Drastically deprioritize public social feeds; shift focus entirely to high-intent Google search, direct SMS/email, and past-client reactivation.",
        "- Overwhelmed by Ad Jargon: Ban paid ads completely until intake and retention are airtight; prioritize organic local search and referral loops.",
        "- Ready to Experiment: Recommend unconventional community activations, street-level partnerships, and interactive web calculators.",
        "",
        "PRAGMATIC TOOLING: KILL LOW-TECH ABSURDITIES & TECH-BRO CLICHES:",
        "- BANNED LOW-TECH TROPES:",
        "  * NEVER suggest physical magnetic whiteboards or office wall charts to mobile field businesses (HVAC, landscaping, plumbing, electricians, delivery). Their crews are on the road; mobile-accessible cloud tools (Jobber, Monday.com, Housecall Pro, Google Calendar) are mandatory.",
        "  * NEVER suggest paper punch cards to high-ticket contractors or professional services (punch cards are for $5 coffees, not $15,000 hardscapes or $5,000 dental implants).",
        "  * Do NOT default to Google Sheets if dedicated tools (Monday.com, Jobber, Notion, ClickUp) are obviously cleaner and fit their budget tier.",
        "- BANNED TECH-BRO CLICHES:",
        "  * NEVER recommend QR code menus, QR table ordering, or digital ticketing where human hospitality belongs (diners hate them: keep dining and service human).",
        "  * NEVER recommend building custom mobile apps for single-location small businesses.",
        '  * NEVER recommend automated chatbot widgets, automated DM sequences, or generic social calendars ("post 5 reels a week").',
        "  * NEVER recommend expensive paid ad funnels for low-margin impulse purchases (e.g. PPC ads for a $4 muffin or coffee).",
        "- TV MEDIA'S WHEELHOUSE:",
        "  Focus recommendations where communications, client intake, and digital media connect to revenue:",
        "  1. Frictionless Intake: Stopping phone tag with instant mobile quote/estimate forms.",
        "  2. Trust-Building Media: Authentic on-location photography and video walkthroughs of real work instead of stock photos.",
        "  3. Customer Retention: Service reminder tags, VIP maintenance clubs, and localized review engines.",
        "",
        "DE-PARAPHRASING THE MARKETING SECRET & DYNAMIC DIAGNOSTIC STRUCTURE (THE 4 MANIFESTO TIERS):",
        '1. THE MARKETING SECRET (why_stuck): Do NOT merely reword the user\'s prompt and add "agencies won\'t fix this." Provide an actual analytical diagnostic breakthrough: call out the underlying structural flaw behind the symptom (e.g. "You are treating emergency dispatch and scheduled installs as the same pipeline. Without an intake triage filter, unpredictable emergencies cannibalize your high-margin scheduled work.") and point out the hidden financial or time leak (hours spent playing phone tag after 7 PM, lost revenue from unassigned crews, or high ad spend hitting a leaky website).',
        "2. MAKING MEDIA MATTER (what_matters & what_to_ignore): What actually matters for their customer relationship, what distractions/busywork they need to ignore completely, and 1 concrete media or hospitality play.",
        "3. THE THREE PILLARS:",
        "   - Pillar 1 (Acquisition & Loyalty): A specific play calibrated to their industry ticket size to reward existing customers and turn retention into their primary engine.",
        "   - Pillar 2 (Operational Reality): Removing friction in their real-world booking, buying, dispatching, or inquiry process, strictly honoring their Bandwidth and Investment Level branching rules.",
        "   - Pillar 3 (Platform Native Utility): Using specific digital channels for what they actually do best, strictly honoring their Mindset branching rule.",
        "4. WHAT WE COULD BUILD (deliverables & first_move_monday): 3 bespoke, realistic deliverables strictly calibrated to their Bandwidth, Investment Level, and Mindset tiers (combining frictionless intake, trust-building media, operational software, or tactile collateral appropriate to their ticket size), plus a concrete First Move for Monday.",
        "",
        "Return ONLY valid json matching this exact schema:",
        json.dumps(
            {
                "blueprint_title": "Concise, punchy TV Media strategy title tailored to this specific business and context",
                "reality_check": {
                    "headline": "Direct, analytical 1-sentence diagnosis identifying the structural root cause behind their symptom (zero preachy openings)",
                    "why_stuck": "2 to 3 direct sentences identifying the underlying operational flaw (without paraphrasing the user) and quantifying the hidden time or margin leak.",
                    "explanation": "Mirror of why_stuck for UI rendering",
                },
                "making_media_matter": {
                    "what_matters": "What actually matters for earning trust and connecting communications, intake, and media to revenue.",
                    "what_to_ignore": "The specific marketing busywork, vanity distractions, or low-ROI habits this owner must stop immediately.",
                    "core_shift": "Combined summary of what_matters and what_to_ignore",
                    "social_play": {
                        "format_tag": "Concrete format label (e.g. ON-LOCATION VIDEO WALKTHROUGH, PROJECT PROOF GALLERY, LOCAL SEARCH UTILITY)",
                        "title": "Specific title of the media or trust-building play",
                        "execution": "2 to 3 sentences explaining how to execute this play to earn trust without discounting margin.",
                    },
                },
                "three_pillars": {
                    "acquisition_and_loyalty": "A specific retention and referral play calibrated to their ticket size and industry.",
                    "operational_reality_and_flow": "Concrete workflow and tooling fix calibrated strictly to their selected Bandwidth and Investment Level.",
                    "platform_native_utility": "Channel focus calibrated strictly to their selected Mindset and customer behavior.",
                },
                "first_move_monday": "One concrete action the owner can execute this Monday morning in under 60 minutes.",
                "deliverables": [
                    {
                        "title": "Deliverable #1",
                        "medium_tag": "Deliverable type calibrated to their Investment tier",
                        "how_it_works": "How this bespoke deliverable works in their real operation.",
                        "why_it_works": "Why it stops the cash or time bleed and solves their structural bottleneck.",
                    },
                    {
                        "title": "Deliverable #2",
                        "medium_tag": "Deliverable type calibrated to their Investment tier",
                        "how_it_works": "How this bespoke deliverable works in their real operation.",
                        "why_it_works": "Why it stops the cash or time bleed and solves their structural bottleneck.",
                    },
                    {
                        "title": "Deliverable #3",
                        "medium_tag": "Deliverable type calibrated to their Investment tier",
                        "how_it_works": "How this bespoke deliverable works in their real operation.",
                        "why_it_works": "Why it stops the cash or time bleed and solves their structural bottleneck.",
                    },
                ],
            }
        ),
    ]
)


def sanitize_text_obj(obj):
    if isinstance(obj, str):
        cleaned = obj.replace("\u2011", "-")
        cleaned = re.sub(r"\s*[\u2014\u2013]\s*", " - ", cleaned)
        cleaned = re.sub(r"--+", " - ", cleaned)
        return cleaned
    if isinstance(obj, list):
        return [sanitize_text_obj(item) for item in obj]
    if isinstance(obj, dict):
        return {k: sanitize_text_obj(v) for k, v in obj.items()}
    return obj


def extract_and_parse_json(raw_text):
    if not raw_text or not isinstance(raw_text, str):
        raise ValueError("Empty LLM response text")
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", raw_text, flags=re.IGNORECASE)
    cleaned = re.sub(r"```json\s*|```\s*", "", cleaned, flags=re.IGNORECASE).strip()
    try:
        return sanitize_text_obj(json.loads(cleaned))
    except Exception:
        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            return sanitize_text_obj(json.loads(cleaned[first_brace : last_brace + 1]))
        raise


def check_and_record_rate_limit(client_ip):
    if client_ip in ("127.0.0.1", "::1", "localhost") and os.environ.get("ENFORCE_LOCAL_RATE_LIMIT") != "1":
        return True, 0
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    with RATE_LIMIT_LOCK:
        history = [ts for ts in IP_BLUEPRINT_RUNS.get(client_ip, []) if ts > cutoff]
        if len(history) >= RATE_LIMIT_MAX_RUNS:
            IP_BLUEPRINT_RUNS[client_ip] = history
            return False, len(history)
        history.append(now)
        IP_BLUEPRINT_RUNS[client_ip] = history
        return True, len(history)



def open_groq_request(req, timeout=45):
    try:
        ctx = ssl.create_default_context()
        if os.path.exists("/etc/ssl/cert.pem"):
            ctx.load_verify_locations("/etc/ssl/cert.pem")
        return urllib.request.urlopen(req, timeout=timeout, context=ctx)
    except urllib.error.URLError as exc:
        if isinstance(getattr(exc, "reason", None), ssl.SSLCertVerificationError):
            return urllib.request.urlopen(
                req, timeout=timeout, context=ssl._create_unverified_context()
            )
        raise




def load_dotenv(dotenv_path=".env", override=False):
    if not os.path.exists(dotenv_path):
        return
    with open(dotenv_path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            if key and (override or key not in os.environ):
                os.environ[key] = val


load_dotenv()


class TVMediaHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        if self.path.startswith("/api/strategy") or self.path.startswith("/api/generate-scenario"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith("/api/generate-scenario"):
            self._handle_generate_scenario()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/generate-scenario"):
            self._handle_generate_scenario()
            return
        if self.path != "/api/strategy":
            self.send_error(404, "Endpoint Not Found")
            return

        load_dotenv(override=True)
        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        endpoint = os.environ.get(
            "GROQ_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions"
        ).strip()
        model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        if model == "llama-3.3-70b-versatile":
            model = "openai/gpt-oss-120b"

        if not api_key:
            self._send_json(
                500,
                {"error": "Missing GROQ_API_KEY in server environment or .env file."},
            )
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body) if raw_body else {}
        except Exception as exc:
            self._send_json(400, {"error": f"Invalid JSON request body: {exc}"})
            return

        messages = payload.get("messages")
        if not isinstance(messages, list) or not messages:
            self._send_json(400, {"error": "Request must include a messages array."})
            return

        # Extract client IP (respecting X-Forwarded-For if behind a reverse proxy)
        forwarded_for = self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        client_ip = forwarded_for or (self.client_address[0] if self.client_address else "unknown")

        # Enforce 5 blueprint runs per IP per 48 hours and apply authoritative backend system prompt
        if payload.get("request_type") != "scenario":
            allowed, run_count = check_and_record_rate_limit(client_ip)
            if not allowed:
                self._send_json(
                    429,
                    {
                        "error": "rate_limit_exceeded",
                        "message": (
                            "You have reached the studio limit of 5 Strategy Blueprint runs per 48 hours. "
                            "Ready to turn these diagnostics into a working plan? Book a 15-minute strategy review with our team on the Contact page."
                        ),
                        "limit": RATE_LIMIT_MAX_RUNS,
                        "window_hours": 48,
                    },
                )
                return

            user_messages = [m for m in messages if isinstance(m, dict) and m.get("role") != "system"]
            messages = [{"role": "system", "content": STRATEGY_SYSTEM_PROMPT}] + user_messages

        primary_model = payload.get("model") or model
        if primary_model == "llama-3.3-70b-versatile":
            primary_model = "openai/gpt-oss-120b"
        fallback_models = [
            primary_model,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
        ]
        candidate_models = []
        for m in fallback_models:
            if m and m not in candidate_models:
                candidate_models.append(m)

        last_http_err = None
        last_err_body = ""
        req_max_tokens = max(int(payload.get("max_tokens", 4096) or 4096), 2400)

        for candidate_model in candidate_models:
            groq_body = {
                "model": candidate_model,
                "messages": messages,
                "temperature": payload.get("temperature", 0.65),
                "max_tokens": req_max_tokens,
                "response_format": {"type": "json_object"},
            }

            req = urllib.request.Request(
                endpoint,
                data=json.dumps(groq_body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                },
                method="POST",
            )

            try:
                with open_groq_request(req, timeout=45) as resp:
                    resp_bytes = resp.read()
                    raw_data = json.loads(resp_bytes.decode("utf-8"))
                    content_str = (
                        raw_data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "")
                    )
                    # Validate JSON is parseable before returning
                    parsed = extract_and_parse_json(content_str)
                    raw_data["choices"][0]["message"]["content"] = json.dumps(parsed)
                    out_bytes = json.dumps(raw_data).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.send_header("Content-Length", str(len(out_bytes)))
                    self.end_headers()
                    self.wfile.write(out_bytes)
                    return
            except urllib.error.HTTPError as http_err:
                last_http_err = http_err
                last_err_body = http_err.read().decode("utf-8", errors="replace")
                continue
            except Exception as exc:
                last_err_body = str(exc)
                continue

        if last_http_err is not None:
            self._send_json(
                last_http_err.code,
                {
                    "error": f"Groq API error ({last_http_err.code})",
                    "details": last_err_body,
                },
            )
        else:
            self._send_json(502, {"error": f"Upstream request failed: {last_err_body}"})

    def _handle_generate_scenario(self):
        load_dotenv(override=True)
        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        endpoint = os.environ.get(
            "GROQ_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions"
        ).strip()
        model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        if model == "llama-3.3-70b-versatile":
            model = "openai/gpt-oss-120b"

        if not api_key:
            self._send_json(
                500,
                {"error": "Missing GROQ_API_KEY in server environment or .env file."},
            )
            return

        seed = random.choice(ROUTE2_METROWEST_SEEDS)
        messages = [
            {"role": "system", "content": SCENARIO_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Generate a fresh, specific operational bottleneck scenario in json format for {seed}.",
            },
        ]

        candidate_models = []
        for m in ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b", model]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        last_http_err = None
        last_err_body = ""

        for candidate_model in candidate_models:
            groq_body = {
                "model": candidate_model,
                "messages": messages,
                "temperature": 0.85,
                "max_tokens": 2048,
                "response_format": {"type": "json_object"},
            }
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(groq_body).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                },
                method="POST",
            )
            try:
                with open_groq_request(req, timeout=30) as resp:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    content_str = (
                        raw_data.get("choices", [{}])[0]
                        .get("message", {})
                        .get("content", "{}")
                    )
                    parsed = extract_and_parse_json(content_str)
                    bottleneck_val = str(parsed.get("bottleneck") or parsed.get("text") or "").strip()
                    if not bottleneck_val:
                        continue
                    scenario_out = {
                        "bottleneck": bottleneck_val,
                        "bandwidth": str(parsed.get("bandwidth") or "small").strip().lower(),
                        "investment": str(parsed.get("investment") or "scrappy").strip().lower(),
                        "mindset": str(parsed.get("mindset") or "stretched").strip().lower(),
                    }
                    self._send_json(200, scenario_out)
                    return
            except urllib.error.HTTPError as http_err:
                last_http_err = http_err
                last_err_body = http_err.read().decode("utf-8", errors="replace")
                continue
            except Exception as exc:
                last_err_body = str(exc)
                continue

        if last_http_err is not None:
            self._send_json(
                last_http_err.code,
                {
                    "error": f"Groq API error ({last_http_err.code})",
                    "details": last_err_body,
                },
            )
        else:
            self._send_json(502, {"error": f"Scenario generation failed: {last_err_body}"})

    def _send_json(self, status_code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), TVMediaHandler)
    print(f"TV Media server running at http://localhost:{port}/strategy.html")
    server.serve_forever()
