"""Run the real Mule HTTP/OAuth connection against a local OAuth stub (Java 17)."""

import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs


class OAuthStub(BaseHTTPRequestHandler):
    token_requests = 0
    protected_requests = 0
    violations = []

    def log_message(self, *_args):
        pass  # Never log Authorization headers or tokens.

    def respond(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        expected_auth = "Basic " + base64.b64encode(b"sonda:probe-secret").decode()
        valid = (
            self.path == "/v1/utils/oauth/token"
            and self.headers.get("Authorization") == expected_auth
            and self.headers.get_content_type() == "application/x-www-form-urlencoded"
            and parse_qs(body.decode()) == {
                "grant_type": ["client_credentials"], "scope": ["read"]
            }
        )
        if not valid:
            self.violations.append("Invalid token path, Basic authentication, or grant form")
            self.respond(400, {"error": "invalid_request"})
            return
        type(self).token_requests += 1
        self.respond(200, {
            "access_token": f"local-test-token-{self.token_requests}",
            "token_type": "Bearer", "expires_in": 3600, "scope": "read"
        })

    def do_GET(self):
        type(self).protected_requests += 1
        sequence = self.protected_requests
        expected_token = 1 if sequence <= 3 else 2
        valid = (
            self.path == "/v1/utils/oauth/protected"
            and self.headers.get("Authorization") == f"Bearer local-test-token-{expected_token}"
            and int(self.headers.get("Content-Length", 0)) == 0
        )
        if not valid:
            self.violations.append("Invalid protected path, bearer token, or GET body")
            self.respond(400, {"error": "invalid_request"})
        elif sequence == 3:
            self.respond(401, {"error": "invalid_token"})
        elif sequence == 5:
            self.respond(403, {"error": "insufficient_scope"})
        else:
            self.respond(200, {"ok": True})


def main():
    repo = Path(__file__).resolve().parents[3]
    server = ThreadingHTTPServer(("127.0.0.1", 0), OAuthStub)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_port
    command = [
        os.environ.get("MVN", "mvn"), *sys.argv[1:], "-B", "-ntp", "test",
        "-Dmunit.test=sondahub-oauth-integration-test.xml",
        "-Dsondahub.integration.enabled=true",
        "-Dsondahub.host=127.0.0.1", f"-Dsondahub.port={port}",
        "-Dsondahub.protocol=HTTP",
        f"-Dsondahub.oauth.tokenUrl=http://127.0.0.1:{port}/v1/utils/oauth/token",
        "-Dsondahub.oauth.clientId=sonda", "-Dsondahub.oauth.clientSecret=probe-secret",
        "-Dsondahub.oauth.scopes=read",
    ]
    try:
        result = subprocess.run(command, cwd=repo, check=False)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    if result.returncode:
        return result.returncode
    if OAuthStub.violations:
        raise AssertionError(OAuthStub.violations)
    assert OAuthStub.token_requests == 2, "Expected initial grant and one renewal only"
    assert OAuthStub.protected_requests == 5, "Expected token reuse, 401 retry, and no 403 retry"
    print("PASS: client credentials, bearer header, token reuse, 401 renewal, and no 403 renewal")
    return 0


if __name__ == "__main__":
    sys.exit(main())
