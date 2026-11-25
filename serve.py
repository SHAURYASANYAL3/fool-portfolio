#!/usr/bin/env python3
"""Tiny static dev server for this site:  python3 serve.py [port]   (default 8767)
Unlike `python3 -m http.server` it sends Cache-Control: no-store, so the browser never reuses a stale
wall.json / glimpse.js / face files after you regenerate or edit them."""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
httpd = ThreadingHTTPServer(("127.0.0.1", port), NoCache)
print(f"serving http://localhost:{port}/  (no-cache)  Ctrl+C to stop")
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    pass
