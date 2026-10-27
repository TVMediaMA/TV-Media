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
        "PERSONA:",
        "You are Tyler Valois, Founder of TV Media Solutions (Boxborough, MA).",
        "",
        "VOICE GUIDELINES (AUTHENTIC TV MEDIA BRAND VOICE):",
        "- Straightforward, anti-corporate New England operator.",
        "- You are glad to help, but you do not blow smoke, you do not use corporate buzzwords, and you do not talk like a gentle HR consultant.",
        "- You tell the owner exactly where they are going wrong and why their current approach is bleeding cash or wasting hours.",
        '- No formulaic openings like "Look, you think you need X, but you should do Y."',
        '- No corporate buzzwords ("synergy", "elevate", "delve", "tapestry", "seamless", "thrive", "magnetic pull", "omnichannel").',
        "- Ground every recommendation in real-world friction: quiet weekday shifts, ad spend with zero conversion tracking, websites that take 8 seconds to load on mobile, neglecting regulars to chase cold clicks.",
        "",
        "REQUIRED OUTPUT STRUCTURE (THE 4 MANIFESTO TIERS):",
        "1. THE REALITY CHECK: The blunt truth about their situation. Acknowledge what they are up against, call out the mistake they are making, and explain why standard agency advice is burning their money.",
        "2. MAKING MEDIA MATTER: The foundation. How to earn trust and give customers something tangible to care about before asking them to spend a dollar. Includes 1 concrete media play.",
        "3. THE THREE PILLARS:",
        "   - Pillar 1 (Acquisition & Loyalty): How to stop chasing cold leads and start turning the customers already walking through the door into repeat revenue.",
        "   - Pillar 2 (Operational Reality): Removing friction in their real-world booking, buying, or visit process.",
        "   - Pillar 3 (Platform Native Utility): Using digital channels for what they actually do best instead of posting generic noise across everything.",
        "4. WHAT WE COULD BUILD: 3 concrete, realistic physical or digital deliverables (e.g. on-site QR table loops, local Google Profile overhaul, print-ready promo kits, custom intake flows).",
        "",
        "STRICT GUARDRAILS:",
        "- ZERO em-dashes or en-dashes anywhere in output. Use hyphens (-), colons (:), commas, or periods.",
        '- ZERO occurrences of "turnkey" or marketing uses of "floor".',
        "",
        "Return ONLY valid JSON matching this schema:",
        json.dumps(
            {
                "blueprint_title": "Concise, punchy TV Media strategy title",
                "reality_check": {
                    "headline": "Blunt, straightforward 1-sentence truth calling out where they are going wrong without formulaic openings",
                    "explanation": "2 to 3 direct sentences acknowledging what they are up against, why their current setup is bleeding cash or hours, and why standard agency advice fails here.",
                },
                "making_media_matter": {
                    "core_shift": "How to earn trust and give customers something tangible to care about before asking them to spend a dollar.",
                    "social_play": {
                        "format_tag": "Format label",
                        "title": "Title of the play",
                        "execution": "2 to 3 sentences explaining how to execute this play to earn trust without discounting margin.",
                    },
                },
                "three_pillars": {
                    "acquisition_and_loyalty": "How to stop chasing cold leads and start turning the customers already walking through the door into repeat revenue.",
                    "operational_reality_and_flow": "Removing friction in their real-world booking, buying, or visit process, calibrated to their team bandwidth and budget.",
                    "platform_native_utility": "Using digital channels for what they actually do best instead of posting generic noise across everything.",
                },
                "deliverables": [
                    {
                        "title": "Deliverable #1",
                        "medium_tag": "Deliverable type",
                        "how_it_works": "How this concrete physical or digital deliverable works on the ground.",
                        "why_it_works": "Why it stops the cash/time bleed and fixes their specific bottleneck.",
                    },
                    {
                        "title": "Deliverable #2",
                        "medium_tag": "Deliverable type",
                        "how_it_works": "How this concrete physical or digital deliverable works on the ground.",
                        "why_it_works": "Why it stops the cash/time bleed and fixes their specific bottleneck.",
                    },
                    {
                        "title": "Deliverable #3",
                        "medium_tag": "Deliverable type",
                        "how_it_works": "How this concrete physical or digital deliverable works on the ground.",
                        "why_it_works": "Why it stops the cash/time bleed and fixes their specific bottleneck.",
                    },
                ],
            }
        ),
    ]
)


def sanitize_text_obj(obj):
    if isinstance(obj, str):
        cleaned = re.sub(r"\s*[\u2014\u2013]\s*", " - ", obj)
        cleaned = re.sub(r"--+", " - ", cleaned)
        return cleaned
    if isinstance(obj, list):
        return [sanitize_text_obj(item) for item in obj]
    if isinstance(obj, dict):
        return {k: sanitize_text_obj(v) for k, v in obj.items()}
    return obj


def check_and_record_rate_limit(client_ip):
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




def load_dotenv(dotenv_path=".env"):
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
            if key and key not in os.environ:
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

        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        endpoint = os.environ.get(
            "GROQ_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions"
        ).strip()
        model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

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
        fallback_models = [
            primary_model,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
        ]
        candidate_models = []
        for m in fallback_models:
            if m and m not in candidate_models:
                candidate_models.append(m)

        last_http_err = None
        last_err_body = ""

        for candidate_model in candidate_models:
            groq_body = {
                "model": candidate_model,
                "messages": messages,
                "temperature": payload.get("temperature", 0.65),
                "max_tokens": payload.get("max_tokens", 2048),
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
                    self.send_response(resp.status)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(resp_bytes)
                    return
            except urllib.error.HTTPError as http_err:
                last_http_err = http_err
                last_err_body = http_err.read().decode("utf-8", errors="replace")
                if http_err.code == 404 and "model_not_found" in last_err_body:
                    continue
                break
            except Exception as exc:
                self._send_json(502, {"error": f"Upstream request failed: {exc}"})
                return

        if last_http_err is not None:
            self._send_json(
                last_http_err.code,
                {
                    "error": f"Groq API error ({last_http_err.code})",
                    "details": last_err_body,
                },
            )

    def _handle_generate_scenario(self):
        api_key = os.environ.get("GROQ_API_KEY", "").strip()
        endpoint = os.environ.get(
            "GROQ_ENDPOINT", "https://api.groq.com/openai/v1/chat/completions"
        ).strip()
        model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip()

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
                "content": f"Generate a fresh, specific operational bottleneck scenario for {seed}.",
            },
        ]

        candidate_models = []
        for m in [model, "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        last_http_err = None
        last_err_body = ""

        for candidate_model in candidate_models:
            groq_body = {
                "model": candidate_model,
                "messages": messages,
                "temperature": 0.88,
                "max_tokens": 450,
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
                    parsed = sanitize_text_obj(json.loads(content_str))
                    scenario_out = {
                        "bottleneck": str(parsed.get("bottleneck") or parsed.get("text") or "").strip(),
                        "bandwidth": str(parsed.get("bandwidth") or "small").strip().lower(),
                        "investment": str(parsed.get("investment") or "scrappy").strip().lower(),
                        "mindset": str(parsed.get("mindset") or "stretched").strip().lower(),
                    }
                    self._send_json(200, scenario_out)
                    return
            except urllib.error.HTTPError as http_err:
                last_http_err = http_err
                last_err_body = http_err.read().decode("utf-8", errors="replace")
                if http_err.code == 404 and "model_not_found" in last_err_body:
                    continue
                break
            except Exception as exc:
                self._send_json(502, {"error": f"Scenario generation failed: {exc}"})
                return

        if last_http_err is not None:
            self._send_json(
                last_http_err.code,
                {
                    "error": f"Groq API error ({last_http_err.code})",
                    "details": last_err_body,
                },
            )

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
