# Krogstad (App)
Persönliche App von Kilian. Daten in data.enc.json sind verschlüsselt (RSA-OAEP + AES-GCM); nur die App mit Kilians Passwort kann sie lesen.
- Bauen: python3 tools/build.py
- Daten packen: python3 tools/pack.py rohdaten.json
