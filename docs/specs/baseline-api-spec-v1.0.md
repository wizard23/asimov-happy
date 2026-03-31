# Baseline API Spec v1.0 (DE)

> Zweck: Diese Baseline definiert **nur** die **gemeinsamen Infrastruktur-Endpoints** (Discovery, OpenAPI, Docs, Schema Registry) sowie **JWT-Auth-Endpoints**.
>
> **Nicht enthalten:** Domain-/Business-Endpoints (z.B. `todos`, `reminders`) und **keine Provider-spezifischen Endpoints**.

---

## 1. Begriffe (Normativ)

* **Baseline**: Der Teil einer API, der unabhängig von Domänen immer gleich bleibt (Discovery, OpenAPI, Docs, Schemas, Auth).
* **OpenAPI**: Maschinenlesbarer API-Vertrag (OpenAPI 3.1).
* **Schema Registry**: Versionierte JSON-Schemas, die Requests/Responses beschreiben.
* **Problem Details**: Einheitliches Fehlerformat mit `application/problem+json`.

---

## 2. Ziele und Nicht-Ziele

### 2.1 Ziele (Normativ)

1. **Single Source of Truth**: `/openapi.json` ist der verbindliche, maschinenlesbare Vertrag.
2. **Menschliche Docs**: `/docs` rendert ausschließlich `/openapi.json`.
3. **Schema Registry**: `/schemas/**` liefert versionierte, immutable JSON Schemas.
4. **Auth Basis**: `/v1/auth/*` stellt JWT Token Issuance/Refresh/Logout bereit.

### 2.2 Nicht-Ziele (Normativ)

1. Keine Definition von Domain-Endpoints (z.B. Todo-CRUD).
2. Keine Provider/Upstream-Konzepte.
3. Keine Vorgaben für CQRS/Eventsourcing/Storage.

---

## 3. High-Level Architektur (Informativ)

```
Client
  |
  |- GET /.well-known/<service>   -> Discovery
  |- GET /openapi.json            -> OpenAPI 3.1
  |- GET /docs                    -> UI (nur Render)
  |- GET /schemas                 -> Schema-Index
  |- GET /schemas/**              -> JSON Schemas (versioniert)
  |
  \- /v1/...                      -> Domain API + Auth
```

---

## 4. Discovery (Normativ)

### 4.1 Endpoint

**GET `/.well-known/<service>`** (öffentlich)

* `<service>` **MUSS** der Service-Name sein (z.B. `todo-api`).

### 4.2 Response (Normativ)

Response **MUSS** folgende Felder enthalten:

```json
{
  "name": "<service>",
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

## 5. OpenAPI & Docs (Normativ)

### 5.1 OpenAPI

**GET `/openapi.json`** (öffentlich)

* **MUSS** eine gültige **OpenAPI 3.1** Spezifikation liefern.
* **MUSS** alle Domain-Endpoints (aus der jeweiligen Domänen-Spezifikation) enthalten.
* **MUSS** Security Schemes für JWT Bearer enthalten (siehe §8).

### 5.2 Docs

**GET `/docs`** (öffentlich)

* **MUSS** eine interaktive Doku rendern (Swagger UI / Redoc / Scalar o.Ä.).
* **DARF NICHT** eine eigene Wahrheit enthalten.
* **MUSS** ausschließlich `/openapi.json` rendern.

---

## 6. Schema Registry (Normativ)

### 6.1 Index

**GET `/schemas`** (öffentlich)

* Liefert einen Index aller Schemas.
* Jedes Schema **MUSS** eine `id`, `version` (Semver) und `url` besitzen.

Empfohlenes Format:

```json
{
  "schemas": [
    { "id": "problem", "version": "1.0.0", "url": "/schemas/problem/1.0.0.json" },
    { "id": "common/meta", "version": "1.0.0", "url": "/schemas/common/meta-1.0.0.json" },

    { "id": "auth/token-request", "version": "1.0.0", "url": "/schemas/auth/token-request/1.0.0.json" },
    { "id": "auth/token-response", "version": "1.0.0", "url": "/schemas/auth/token-response/1.0.0.json" },
    { "id": "auth/refresh-request", "version": "1.0.0", "url": "/schemas/auth/refresh-request/1.0.0.json" },
    { "id": "auth/logout-request", "version": "1.0.0", "url": "/schemas/auth/logout-request/1.0.0.json" }
  ]
}
```

### 6.2 Immutability & Caching

* Schema-URLs **MÜSSEN** versioniert sein und sind dadurch **immutable**.
* Für `/schemas/**` gilt:

  * `Cache-Control: public, max-age=31536000, immutable`
  * `ETag: "..."` (empfohlen)

---

## 7. Problem Details (Normativ)

### 7.1 Media Type

* Fehlerresponses **MÜSSEN** `Content-Type: application/problem+json` verwenden.

### 7.2 Schema-Link

Jede Fehlerresponse **MUSS** auf das Problem-Schema verweisen:

```http
Link: </schemas/problem/1.0.0.json>; rel="describedby"
```

### 7.3 Mindestfelder

Problem-Body **MUSS** enthalten:

* `type` (string, URL oder URN)
* `title` (string)
* `status` (int)

Optional:

* `detail` (string)
* `instance` (string)
* `errors` (array)
* `context` (object)

---

## 8. Auth – JWT Bearer (Normativ)

### 8.1 Überblick

* Access Tokens: **JWT** (Bearer)
* Token-Responses sind **nicht cachebar** (`Cache-Control: no-store`).

### 8.2 Token Issuance

**POST `/v1/auth/token`** (public)

**Request Body** (`auth/token-request@1.0.0`):

```json
{
  "grant_type": "password",
  "username": "user",
  "password": "secret",
  "scope": "<scope>"
}
```

**200 Response** (`auth/token-response@1.0.0`):

```json
{
  "token_type": "Bearer",
  "access_token": "<jwt>",
  "expires_in": 900,
  "refresh_token": "<refresh-token>",
  "scope": "<scope>"
}
```

**Headers (Normativ):**

* `Cache-Control: no-store`
* `Link: </schemas/auth/token-response/1.0.0.json>; rel="describedby"`

### 8.3 Refresh

**POST `/v1/auth/refresh`** (public)

**Request Body** (`auth/refresh-request@1.0.0`):

```json
{ "refresh_token": "<refresh-token>" }
```

**200 Response:** gleiches Schema wie `auth/token-response@1.0.0`.

**Refresh Token Rotation (Normativ wenn implementiert):**

* Bei erfolgreichem Refresh **SOLL** ein neuer `refresh_token` ausgegeben werden.
* Der alte Refresh Token **SOLL** serverseitig invalidiert werden.

### 8.4 Logout / Revocation

**POST `/v1/auth/logout`** (public)

**Request Body** (`auth/logout-request@1.0.0`):

```json
{ "refresh_token": "<refresh-token>" }
```

**Response (Normativ):**

* `204 No Content`
* `Cache-Control: no-store`

---

## 9. Auth-Fehler (Normativ)

### 9.1 401 Unauthorized

**Wann:** Token fehlt/ungültig/abgelaufen.

**Headers:**

```http
WWW-Authenticate: Bearer realm="<service>", error="invalid_token", error_description="The access token is missing or invalid"
Cache-Control: no-store
```

**Body:** `application/problem+json` (siehe §7).

### 9.2 403 Forbidden

**Wann:** Token gültig, aber keine Berechtigung.

**Headers (empfohlen):**

```http
WWW-Authenticate: Bearer realm="<service>", error="insufficient_scope", error_description="The token does not grant access to this resource"
Cache-Control: no-store
```

**Body:** `application/problem+json` (siehe §7).

---

## 10. Versionierung (Normativ)

* API-Version **MUSS** über Pfad erfolgen: `/v1/...`.
* Schemas **MÜSSEN** Semver-versioniert sein.
* Breaking Schema Change => neues **MAJOR** in Schema-URL.

---

## 11. Integration mit Domänen-Spezifikationen (Normativ)

* Eine Domänen-Spezifikation (z.B. `todo-api-spec-v1.2.md`) **MUSS**:

  * ihre Domain-Endpoints definieren,
  * ihre Request/Response-Schemas in `/schemas/**` einhängen,
  * und diese Endpoints in `/openapi.json` dokumentieren.

* Diese Baseline definiert **keine** Domain-Endpunkte und trifft **keine** Annahmen über Datenmodelle.
