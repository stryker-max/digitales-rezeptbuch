# Herkunft und Änderungen

Lokaler OpenAI Sign-in with ChatGPT DevKit, Quellstand `0a36fefeb913055c8c7a1a29b63d82b96b2e841a` vom 27.10.2026: https://github.com/openai/sign-in-with-chatgpt-devkit/tree/0a36fefeb913055c8c7a1a29b63d82b96b2e841a/packages/local

Originale OAuth-, Profil-, Tokenrefresh-, Sperr- und Verschlüsselungsimplementierung samt Tests übernommen. Lizenz und Drittanbieterhinweise liegen bei. Gilt ausschließlich für die dort erlaubte nichtkommerzielle Nutzung; das persönliche Rezeptbuch erhält dadurch keine neue Projektlizenz.

Änderungen für Digitales Rezeptbuch: eigener Paketname und eigenständige Buildkonfiguration; `types.ts` und `responses.ts` erweitern den textbasierten Wrapper auf lokale Bild-/PDF-Daten und strukturierte Ausgaben. OAuth-Ziele, Berechtigungen, Identitätsprüfung und sichere Speicherung werden beibehalten. Keine API-Schlüssel-Fallbacks, keine privaten ChatGPT-Web-Endpunkte, kein Abruf fremder Anmeldedateien.

Zusätzlich optionaler serverseitiger `ChatGPTProfileStore`-Adapter und exportierte unveränderte Zustandsvalidierung. Der PostgreSQL-Adapter verwendet dieselben OAuth-Abläufe, einen exklusiven prozessübergreifenden Session-Lock und unmittelbar bestätigte verschlüsselte Refresh-Checkpoints. Lokaler Dateispeicher bleibt Standard.
