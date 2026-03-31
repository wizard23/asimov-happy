# asimov-freud – API-Spezifikation v2.2 (DE)
made using: https://chatgpt.com/c/69613f6e-8a38-832a-bc2c-8cd870b59049

> **Status:** verbindliche Spezifikation (Greenfield v1)
>
> **Kernidee:** Provider-transparente Market-Data API, die Provider-Responses *weitgehend unveraendert* liefert (keine Normalisierung/kein Parsing von Zahlen), aber **streng gegen JSON Schemas validiert** und **jedes Response-Schema zur Laufzeit mitsendet** (Schema-Discovery).

---

## 1. Zweck
Diese Spezifikation beschreibt die REST-API **asimov-freud**.

Ziel ist eine **provider-transparente**, **schema-beschriebene** Market-Data-API mit:

- expliziten Providern (Yahoo Finance, Alpha Vantage)
- unveraenderten Provider-Daten (keine Normalisierung, kein Parsing von Zahlen)
- maschinenlesbaren JSON Schemas (Schema Registry)
- Runtime-Schema-Verlinkung (`Link: rel="describedby"`)
- harter Validierung (Schema-Mismatch => 502 Bad Gateway)
- JWT-basierter Authentifizierung (nur fuer Alpha Vantage)
- einheitlichem Fehlerformat (`application/problem+json`)

Diese Datei ist als **verbindliche Implementierungsgrundlage** fuer Menschen und AI-Modelle gedacht.

---

## 2. Ziele und Nicht-Ziele

### 2.1 Ziele

- **Provider-Transparenz:** Der Client sieht explizit, welche Upstream-API (Provider) die Daten liefert.
- **Keine Datenverluste:** `data` ist provider-nah (strings bleiben strings, Zahlen bleiben so wie geliefert).
- **Schema-getriebener Vertrag:** Jede Response verweist auf ein JSON Schema (Schema Registry). Backend validiert strikt dagegen.
- **Fail-Fast bei Upstream-Aenderungen:** Schema-Mismatch => **502 Bad Gateway** + Problem Details.
- **JWT Auth**: Bestimmte Endpoints (Alpha Vantage) sind geschuetzt (JWT Bearer). Yahoo Finance Endpoints sind public.
- **Docs & Contract konsistent:** `/openapi.json` (OpenAPI 3.1) ist die "Single Source of Truth", `/docs` rendert exakt diese Spec.

### 2.2 Nicht-Ziele

- Keine Vereinheitlichung auf "minimal common denominator" zwischen Providern.
- Keine stillschweigende Normalisierung/Transformation (ausser seltenes gezieltes Filtern; dann muss das Schema die resultierenden Daten beschreiben).

---

## 3. Architekturueberblick

```
Client
  |
  |- GET /.well-known/asimov-freud   -> Discovery
  |- GET /openapi.json               -> Maschinenlesbarer API-Vertrag
  |- GET /docs                       -> Menschliche API-Dokumentation
  |- GET /schemas/**                 -> JSON Schema Registry
  |
  \- GET /v1/...                     -> API Endpoints
```

---

## 4. Grundprinzipien

1. **Provider-Transparenz**
   - Endpoints sind provider-spezifisch
   - Keine Vereinheitlichung auf kleinsten gemeinsamen Nenner
   - Keine versteckte Normalisierung

2. **Schema als Vertrag**
   - Jede Response verweist explizit auf ein JSON Schema
   - Backend validiert strikt gegen Schema
   - Schema beschreibt exakt die gelieferten Daten

3. **Meta + Data Wrapper**
   - `meta`: stabiler, API-eigener Vertrag
   - `data`: Provider-Payload (weitgehend unveraendert)

4. **Fail Fast**
   - Schema-Mismatch => Log + Metrics + Alarm
   - Client erhaelt **502 Bad Gateway**
   - Keine fehlerhaften Daten werden ausgeliefert

---

## 5. High-Level Architektur

**Discovery -> OpenAPI -> Schema Registry -> Endpoints**

- `GET /.well-known/asimov-freud` – Einstiegspunkt (Discovery)
- `GET /openapi.json` – OpenAPI 3.1 Spec (maschinenlesbar)
- `GET /docs` – Interaktive Dokumentation (nur Render von `/openapi.json`)
- `GET /schemas` und `GET /schemas/**` – JSON Schema Registry (versioniert, immutable)
- `GET /v1/providers/...` – Provider-spezifische Datenendpoints
- `POST /v1/auth/*` – JWT Auth Endpoints

---

## 6. Discovery

### 6.1 Endpoint

**GET `/.well-known/asimov-freud`** (oeffentlich)

### 6.2 Response (Beispiel)

```json
{
  "name": "asimov-freud",
  "apiVersion": "v1",
  "openapi": "/openapi.json",
  "docs": "/docs",
  "schemaRegistry": "/schemas",
  "mediaTypes": {
    "default": "application/json",
    "problem": "application/problem+json"
  },
  "auth": {
    "type": "jwt-bearer",
    "tokenEndpoint": "/v1/auth/token",
    "refreshEndpoint": "/v1/auth/refresh",
    "logoutEndpoint": "/v1/auth/logout"
  }
}
```

---

## 7. OpenAPI & Docs

### 7.1 OpenAPI

**GET `/openapi.json`** (oeffentlich)

- Liefert vollstaendige **OpenAPI 3.1** Spec
- Enthaelt:
  - alle Endpoints
  - Security Schemes (JWT Bearer)
  - Request/Response-Body-Schemas via `$ref` auf Schema Registry
  - Standard-Fehlerresponses (`application/problem+json`)

### 7.2 Docs

**GET `/docs`** (oeffentlich)

- Interaktive Dokumentation (Swagger UI / Redoc / Scalar o.Ae.)
- Rendert **ausschliesslich** `/openapi.json`
- Read-only, keine eigene "Wahrheit"

---

## 8. Schema Registry

### 8.1 Index

**GET `/schemas`** (oeffentlich)

Liefert einen Index aller Schemas (IDs, Versionen, URLs).

**Empfohlenes Format:**

```json
{
  "schemas": [
    { "id": "problem", "version": "1.0.0", "url": "/schemas/problem/1.0.0.json" },
    { "id": "common/meta", "version": "1.0.0", "url": "/schemas/common/meta-1.0.0.json" },

    { "id": "auth/token-request", "version": "1.0.0", "url": "/schemas/auth/token-request/1.0.0.json" },
    { "id": "auth/token-response", "version": "1.0.0", "url": "/schemas/auth/token-response/1.0.0.json" },
    { "id": "auth/refresh-request", "version": "1.0.0", "url": "/schemas/auth/refresh-request/1.0.0.json" },
    { "id": "auth/logout-request", "version": "1.0.0", "url": "/schemas/auth/logout-request/1.0.0.json" },

    { "id": "providers/yahoo-finance/equities/chart", "version": "1.0.0", "url": "/schemas/providers/yahoo-finance/equities/chart/1.0.0.json" },
    { "id": "providers/yahoo-finance/equities/fundamentals-time-series", "version": "1.0.0", "url": "/schemas/providers/yahoo-finance/equities/fundamentals-time-series/1.0.0.json" },

    { "id": "providers/alpha-vantage/equities/time-series-daily", "version": "1.0.0", "url": "/schemas/providers/alpha-vantage/equities/time-series-daily/1.0.0.json" },
    { "id": "providers/alpha-vantage/equities/time-series-daily-adjusted", "version": "1.0.0", "url": "/schemas/providers/alpha-vantage/equities/time-series-daily-adjusted/1.0.0.json" },
    { "id": "providers/alpha-vantage/equities/financials-balance-sheet", "version": "1.0.0", "url": "/schemas/providers/alpha-vantage/equities/financials-balance-sheet/1.0.0.json" },
    { "id": "providers/alpha-vantage/equities/financials-income-statement", "version": "1.0.0", "url": "/schemas/providers/alpha-vantage/equities/financials-income-statement/1.0.0.json" }
  ]
}
```

### 8.2 Immutability & Caching

- Schema-URLs sind **versioniert** und dadurch **immutable**.
- Fuer `/schemas/**` gilt:
  - `Cache-Control: public, max-age=31536000, immutable`
  - `ETag: "..."` (empfohlen)

---

## 9. Runtime Schema-Verlinkung (kritisch)

Jede Response enthaelt einen Schema-Link:

- **Success (200)**: Schema des Response-Wrappers (provider/capability)
- **Errors (4xx/5xx)**: Schema `problem/1.0.0`

### 9.1 Header-Format

```http
Link: </schemas/.../.../1.0.0.json>; rel="describedby"
```

### 9.2 Beispiele

**200:**

```http
Link: </schemas/providers/alpha-vantage/equities/time-series-daily/1.0.0.json>; rel="describedby"
```

**Problem:**

```http
Link: </schemas/problem/1.0.0.json>; rel="describedby"
```

---

## 10. Gemeinsames Response-Envelope

### 10.1 Envelope-Format

Jede Datenresponse ist:

```json
{
  "meta": {
    "api": "asimov-freud",
    "provider": "alpha-vantage",
    "capability": "equities/time-series-daily",
    "schema": {
      "id": "providers/alpha-vantage/equities/time-series-daily",
      "version": "1.0.0"
    },
    "retrievedAt": "2026-01-09T18:20:00Z",
    "requestId": "req_abc123",
    "cache": { "hit": false, "ttlSeconds": 60 }
  },
  "data": { }
}
```

### 10.2 Regeln

- `meta` ist strikt validiert
- `data` entspricht exakt dem referenzierten Schema
- Zahlen bleiben Strings, wenn Provider sie als Strings liefert

### 10.3 `meta` Pflichtfelder

- `api` (const) = `"asimov-freud"`
- `provider` (string)
- `capability` (string)
- `schema.id` + `schema.version` (Semver)
- `retrievedAt` (ISO date-time)

Optional:
- `requestId`
- `cache` (`hit`, `ttlSeconds`)
- `warnings` (Array von Strings)

### 10.4 Transformations-Policy

- Standard: `data` = Provider-Payload **as-is** (keine Normalisierung).
- In jedem Fall gilt: **Das ausgelieferte `data` muss zum Schema passen**.

---

## 11. Endpoints – Market Data

### 11.1 Public – Yahoo Finance

**Provider:** `yahoo-finance` (intern: yahoo-finance2@3.11.2)

1) **GET** `/v1/providers/yahoo-finance/equities/{symbol}/chart`

- Query (optional): `range`, `interval`, `includePrePost` (strings/boolean)
- Response-Schema: `providers/yahoo-finance/equities/chart@1.0.0`

2) **GET** `/v1/providers/yahoo-finance/equities/{symbol}/fundamentals-time-series`

- Query (optional): provider-spezifische Parameter (z.B. `type`, `period`, `metrics` ...)
- Response-Schema: `providers/yahoo-finance/equities/fundamentals-time-series@1.0.0`

> Hinweis: Provider-spezifische Query-Parameter sind zulaessig und werden in OpenAPI dokumentiert.

### 11.2 Auth – Alpha Vantage

**Provider:** `alpha-vantage` (intern: fetch)

JWT erforderlich:

```http
Authorization: Bearer <jwt>
```

1) **GET** `/v1/providers/alpha-vantage/equities/{symbol}/time-series/daily`
- Response-Schema: `providers/alpha-vantage/equities/time-series-daily@1.0.0`

2) **GET** `/v1/providers/alpha-vantage/equities/{symbol}/time-series/daily-adjusted`
- Response-Schema: `providers/alpha-vantage/equities/time-series-daily-adjusted@1.0.0`

3) **GET** `/v1/providers/alpha-vantage/equities/{symbol}/financials/balance-sheet`
- Response-Schema: `providers/alpha-vantage/equities/financials-balance-sheet@1.0.0`

4) **GET** `/v1/providers/alpha-vantage/equities/{symbol}/financials/income-statement`
- Response-Schema: `providers/alpha-vantage/equities/financials-income-statement@1.0.0`

---

## 12. Auth – Reines JWT

### 12.1 Ueberblick

- Access Tokens: JWT Bearer
- Refresh Tokens: empfohlen (Rotation)
- Token-Responses sind **nicht cachebar** (`Cache-Control: no-store`).

### 12.2 Token Issuance

**POST** `/v1/auth/token` (public)

**Request Body (token-request@1.0.0):**

```json
{
  "grant_type": "password",
  "username": "user",
  "password": "secret",
  "scope": "alpha-vantage:read"
}
```

**200 Response (token-response@1.0.0):**

```json
{
  "token_type": "Bearer",
  "access_token": "<jwt>",
  "expires_in": 900,
  "refresh_token": "<refresh-token>",
  "scope": "alpha-vantage:read"
}
```

**Headers:**

- `Cache-Control: no-store`
- `Link: </schemas/auth/token-response/1.0.0.json>; rel="describedby"`

### 12.3 Refresh

**POST** `/v1/auth/refresh` (public)

**Request Body (refresh-request@1.0.0):**

```json
{ "refresh_token": "<refresh-token>" }
```

**200 Response:** gleiches Schema wie token-response.

**Refresh Token Rotation (empfohlen, verbindlich wenn implementiert):**
- Bei erfolgreichem Refresh wird ein **neuer** `refresh_token` ausgegeben.
- Der alte Refresh Token wird serverseitig invalidiert.

### 12.4 Logout / Revocation

**POST** `/v1/auth/logout` (public)

**Zweck:** Refresh Token invalidieren (serverseitige Revocation)

**Request Body (logout-request@1.0.0):**

```json
{ "refresh_token": "<refresh-token>" }
```

**Response:**

- `204 No Content`
- `Cache-Control: no-store`

---

## 13. Fehlerformat (Problem Details)

### 13.1 Media Type

- `Content-Type: application/problem+json`
- `Link: </schemas/problem/1.0.0.json>; rel="describedby"`

### 13.2 Standard-Felder

- `type` (URL)
- `title` (string)
- `status` (int)
- `detail` (string, optional)
- `instance` (string, optional)

Optional:
- `errors[]` mit `{ path, message, keyword?, schemaPath?, params? }`
- `context` (object) fuer Debug/Observability

---

## 14. Auth-Fehler (JWT)

### 14.1 401 Unauthorized

**Wann:** Token fehlt/ungueltig/abgelaufen

**Headers:**

```http
WWW-Authenticate: Bearer realm="asimov-freud", error="invalid_token", error_description="The access token is missing or invalid"
Cache-Control: no-store
```

**Body (Beispiel):**

```json
{
  "type": "https://api.example.com/problems/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing or invalid access token.",
  "instance": "/v1/providers/alpha-vantage/equities/AAPL/time-series/daily",
  "context": {
    "api": "asimov-freud",
    "auth": { "scheme": "Bearer", "error": "invalid_token" },
    "requestId": "req_abc123"
  }
}
```

### 14.2 403 Forbidden

**Wann:** Token gueltig, aber keine Berechtigung

**Headers (empfohlen):**

```http
WWW-Authenticate: Bearer realm="asimov-freud", error="insufficient_scope", error_description="The token does not grant access to this resource"
Cache-Control: no-store
```

**Body (Beispiel):**

```json
{
  "type": "https://api.example.com/problems/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "Your token is valid but does not grant access to this resource.",
  "instance": "/v1/providers/alpha-vantage/equities/AAPL/balance-sheet",
  "context": {
    "api": "asimov-freud",
    "auth": {
      "scheme": "Bearer",
      "error": "insufficient_scope",
      "required": ["alpha-vantage:read"],
      "granted": ["yahoo-finance:read"]
    },
    "requestId": "req_abc123"
  }
}
```

---

## 15. Kritischer Fehler: Upstream Schema Mismatch (502)

### 15.1 Wann

- Upstream call erfolgreich (oder zumindest Payload vorhanden)
- Payload verletzt das erwartete JSON Schema

### 15.2 Response

**Status:** `502 Bad Gateway`

**Headers:**
- `Content-Type: application/problem+json`
- `Link: </schemas/problem/1.0.0.json>; rel="describedby"`
- `Cache-Control: no-store`

**Body (canonical):**

```json
{
  "type": "https://api.example.com/problems/upstream-schema-mismatch",
  "title": "Upstream response no longer matches contract",
  "status": 502,
  "detail": "alpha-vantage returned a payload that does not match schema providers/alpha-vantage/equities/time-series-daily@1.0.0",
  "instance": "/v1/providers/alpha-vantage/equities/AAPL/time-series/daily",
  "errors": [
    {
      "path": "/data/Time Series (Daily)/2026-01-08/4. close",
      "message": "must be string",
      "keyword": "type",
      "schemaPath": "#/properties/data/..."
    }
  ],
  "context": {
    "api": "asimov-freud",
    "provider": "alpha-vantage",
    "capability": "equities/time-series-daily",
    "expectedSchema": {
      "id": "providers/alpha-vantage/equities/time-series-daily",
      "version": "1.0.0",
      "url": "/schemas/providers/alpha-vantage/equities/time-series-daily/1.0.0.json"
    },
    "requestId": "req_abc123",
    "retrievedAt": "2026-01-09T18:20:00Z",
    "upstream": {
      "httpStatus": 200,
      "note": "Upstream call succeeded but payload validation failed"
    }
  }
}
```

### 15.3 Backend Pflichtverhalten

- Log (ohne Tokens/Secrets)
- Metrics (counter + labels: provider/capability/schemaVersion)
- Alarm (Pager/Slack etc.)
- **Nie** inkonsistente Daten ausliefern

---

## 16. Weitere Upstream-Fehler (empfohlen)

Optional (aber empfohlen) separate Problem-Klasse:

- `type: https://api.example.com/problems/upstream-unavailable`
- Status je nach Fall: 502/503/504
- `context.upstream.httpStatus`, `context.upstream.latencyMs`, etc.

---

## 17. Caching-Regeln (verbindlich)

- **Schemas:** `Cache-Control: public, max-age=31536000, immutable`
- **Auth Token Responses:** `Cache-Control: no-store`
- **Problem Responses:** `Cache-Control: no-store`

---

## 18. Observability (empfohlen)

- `requestId` in `meta` (und Problem `context.requestId`), zusaetzlich als Header `X-Request-Id` moeglich.
- Niemals Tokens loggen; hoechstens `jti` oder Hash.

---

## 19. Versionierung

- API-Version ueber Pfad: `/v1/...`
- Schema-Versionierung per Semver in Schema-URLs.
- Breaking Schema Change => neues MAJOR in Schema-URL.

---

## 20. Mindestumfang an Schemas (verbindlich)

Mindestens diese Schemas muessen existieren und werden vom Backend zur Validierung verwendet:

- `problem/1.0.0`
- `common/meta-1.0.0`
- `auth/token-request/1.0.0`
- `auth/token-response/1.0.0`
- `auth/refresh-request/1.0.0`
- `auth/logout-request/1.0.0`
- `providers/yahoo-finance/equities/chart/1.0.0`
- `providers/yahoo-finance/equities/fundamentals-time-series/1.0.0`
- `providers/alpha-vantage/equities/time-series-daily/1.0.0`
- `providers/alpha-vantage/equities/time-series-daily-adjusted/1.0.0`
- `providers/alpha-vantage/equities/financials-balance-sheet/1.0.0`
- `providers/alpha-vantage/equities/financials-income-statement/1.0.0`

---

## 21. Implementationshinweis (verbindlich)

Fuer jeden Provider-Endpoint gilt der Ablauf:

1) Upstream request (yahoo-finance2 bzw. fetch)
2) Optional: minimales Filtern (selten)
3) **Validiere `data` gegen Endpoint-Schema**
4) Erzeuge `meta`
5) **Validiere Gesamtresponse (meta+data) gegen Endpoint-Schema**
6) Bei Validierung ok: 200 + Link describedby
7) Bei Validierung fail:
   - Log + Metrics + Alarm
   - 502 Problem `upstream-schema-mismatch`

---

## 22. Zusammenfassung

**asimov-freud** ist:

- provider-transparent
- schema-getrieben
- strikt validierend
- JWT-gesichert fuer Alpha Vantage
- robust gegen Upstream-Aenderungen (Fail-Fast)

Diese Spezifikation ist die verbindliche Grundlage fuer Implementierung und Weiterentwicklung.
