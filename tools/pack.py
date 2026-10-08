"""Verschlüsselt die Rohdaten für die Krogstad-App.
Aufruf: python3 tools/pack.py rohdaten.json   → schreibt data.enc.json
Braucht nur den ÖFFENTLICHEN Schlüssel (keys.json); entschlüsseln kann nur Kilians App mit seinem Passwort."""
import sys, json, os, gzip, base64, datetime as dt
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = os.path.join(os.path.dirname(__file__), "..")
b = lambda x: base64.b64encode(x).decode()
ub = lambda s: int.from_bytes(base64.urlsafe_b64decode(s + "=" * (-len(s) % 4)), "big")

def main(src):
    keys = json.load(open(os.path.join(ROOT, "keys.json")))
    pub = rsa.RSAPublicNumbers(ub(keys["pub"]["e"]), ub(keys["pub"]["n"])).public_key()
    data = json.load(open(src, encoding="utf-8"))
    data.setdefault("stand", dt.datetime.now(dt.timezone.utc).isoformat()[:16] + "Z")
    raw = gzip.compress(json.dumps(data, ensure_ascii=False).encode())
    k = AESGCM.generate_key(256); iv = os.urandom(12)
    ct = AESGCM(k).encrypt(iv, raw, None)
    ek = pub.encrypt(k, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    json.dump({"v": 1, "gzip": True, "stand": data["stand"], "ek": b(ek), "iv": b(iv), "ct": b(ct)}, open(os.path.join(ROOT, "data.enc.json"), "w"))
    print("data.enc.json", len(ct), "Bytes, Stand", data["stand"])

if __name__ == "__main__":
    main(sys.argv[1])
