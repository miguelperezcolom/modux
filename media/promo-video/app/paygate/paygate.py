"""A toy card gateway for the demo: POST /charge, GET /transactions. Cards ending in 0000 are declined.
PAYGATE_DELAY (seconds) makes it answer as slowly as a real bank, so a purchase is seen PENDING first."""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

transactions = []


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path != "/charge":
            return self._send(404, {"error": "not found"})
        req = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        time.sleep(float(os.environ.get("PAYGATE_DELAY", "0")))
        card = str(req.get("card") or "")
        accepted = not card.endswith("0000")
        reason = "" if accepted else "Card declined by the issuing bank"
        transactions.append({"purchaseId": req.get("purchaseId"), "amount": req.get("amount"),
                             "result": "ACCEPTED" if accepted else "DECLINED"})
        self._send(200, {"accepted": accepted, "reason": reason})

    def do_GET(self):
        if self.path != "/transactions":
            return self._send(404, {"error": "not found"})
        self._send(200, transactions)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9099), Handler).serve_forever()
