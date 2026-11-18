"""Local dev server: serves the dashboard and a small allow-listed RSS proxy.

Run:  python server.py   (then open http://localhost:8123/)

Browsers block cross-origin RSS requests (CORS) and the free public proxies are
unreliable, so the page first asks this server's /proxy endpoint, which fetches
the feed server-side. Only the hosts listed in ALLOWED_HOSTS can be proxied.
"""
import shutil
import ssl
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8123
ALLOWED_HOSTS = {
    "news.google.com",
    "trends.google.com",
    "www.deccanherald.com",
    "www.thehindu.com",
    "www.thequint.com",
    "timesofindia.indiatimes.com",
    "feeds.feedburner.com",
    "www.indiatoday.in",
    "www.hindustantimes.com",
    "indianexpress.com",
    "www.deccanchronicle.com",
    "www.thenewsminute.com",
    "www.livemint.com",
    "www.news18.com",
    "economictimes.indiatimes.com",
}
USER_AGENT = "Mozilla/5.0 (compatible; DHEditorialDashboard/1.0)"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/proxy":
            return self.proxy(urllib.parse.parse_qs(parsed.query).get("url", [""])[0])
        self._static = True  # tell end_headers() this is a normal file response
        return super().do_GET()

    def end_headers(self):
        # Local development: never let the browser keep an old copy of the page, styles or script.
        if getattr(self, "_static", False):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def proxy(self, target):
        host = urllib.parse.urlparse(target).hostname
        if urllib.parse.urlparse(target).scheme != "https" or host not in ALLOWED_HOSTS:
            return self.reply(403, b"host not allowed")
        request = urllib.request.Request(target, headers={"User-Agent": USER_AGENT, "Accept": "*/*"})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                body = response.read()
                return self.reply(200, body, response.headers.get("Content-Type", "application/xml"))
        except urllib.error.HTTPError as error:
            return self.reply(error.code, f"upstream HTTP {error.code}".encode())
        except urllib.error.URLError as error:
            # Python on Windows cannot always build a site's certificate chain (e.g. indiatoday.in).
            # curl uses the Windows certificate store, which can, and still verifies the certificate.
            if isinstance(error.reason, ssl.SSLCertVerificationError) and shutil.which("curl"):
                return self.fetch_with_curl(target)
            return self.reply(502, f"upstream error: {error}".encode())
        except Exception as error:  # timeout, etc.
            return self.reply(502, f"upstream error: {error}".encode())

    def fetch_with_curl(self, target):
        try:
            result = subprocess.run(
                ["curl", "-s", "-L", "--fail", "--max-time", "15", "-A", USER_AGENT, target],
                capture_output=True,
                timeout=20,
            )
        except Exception as error:
            return self.reply(502, f"upstream error: {error}".encode())
        if result.returncode != 0 or not result.stdout:
            return self.reply(502, f"upstream error: curl exit {result.returncode}".encode())
        return self.reply(200, result.stdout, "application/xml")

    def reply(self, status, body, content_type="text/plain"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"Serving on http://localhost:{PORT}/  (RSS proxy at /proxy?url=...)")
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
