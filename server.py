#!/usr/bin/env python3
"""
TV Media Local Development & Groq API Proxy Server (server.py)
Serves static site files and provides a secure `/api/strategy` POST endpoint
that reads GROQ_API_KEY from `.env` so API keys are never exposed in public code.
"""
import json
import os
import ssl
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


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
        if self.path == "/api/strategy":
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_POST(self):
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
