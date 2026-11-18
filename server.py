"""Local dev server: serves the dashboard and a small allow-listed RSS proxy.

Run:  python server.py   (then open http://localhost:8123/)

Browsers block cross-origin RSS requests (CORS) and the free public proxies are
unreliable, so the page first asks this server's /proxy endpoint, which fetches
the feed server-side. Only the hosts listed in ALLOWED_HOSTS can be proxied.
"""
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
}
USER_AGENT = "Mozilla/5.0 (compatible; DHEditorialDashboard/1.0)"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/proxy":
            return self.proxy(urllib.parse.parse_qs(parsed.query).get("url", [""])[0])
        return super().do_GET()

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
        except Exception as error:  # network failure, timeout, etc.
            return self.reply(502, f"upstream error: {error}".encode())

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
