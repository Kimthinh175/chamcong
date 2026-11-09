#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Static Frontend Server for ZMM220 Web Console (Port 8099).
Serves index.html, style.css, and app.js from ./frontend/ (also maps /csl/check and /csl/login).
"""
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
HOST = "127.0.0.1"
PORT = 8099


class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path in ("/csl/check", "/csl/login"):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    print(f"[ZMM220-FE] Frontend Static Server running on http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), FrontendHandler).serve_forever()
