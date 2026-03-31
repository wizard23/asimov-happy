# Backend Libraries Specification v2.1
## (Normative, Fastify + OpenAPI + JSON Schema)

This document is **normative**. Keywords **MUST**, **MUST NOT**, **SHOULD**, **MAY** are to be interpreted as described in RFC 2119.

---

## 1. Versioning Rules

1. The implementation **MUST** use **`fastify@^5.6.0`**.
2. The OpenAPI specification version **MUST** be **OpenAPI 3.1**.
3. Unless explicitly specified otherwise in this document, the implementation **MUST** use the **latest available stable version** of each dependency.
4. Legacy APIs or behaviors from Fastify versions prior to v5 **MUST NOT** be used.

---

## 2. Goal

The goal of this specification is to define the required and optional libraries for implementing a TypeScript/Node.js backend with the following properties:

- Discovery endpoint under `/.well-known/*`
- OpenAPI specification available at `GET /openapi.json`
- Interactive documentation at `GET /docs`
- Versioned, immutable schema registry under `GET /schemas/**`
- Uniform response wrapper `{ meta, data }`
- Mandatory `Link: rel="describedby"` header for all domain responses
- Error responses using `application/problem+json`
- JWT authentication **only** for explicitly protected provider routes
- Strict upstream JSON Schema validation with **HTTP 502** on schema mismatch

---

## 3. Required Runtime Libraries

### 3.1 Web Framework

- **`fastify@^5.6.0`**
  - The primary HTTP server framework.
  - The implementation **MUST** use Fastify’s plugin and hook system for:
    - Route grouping
    - Authentication guards
    - Shared response and error handling

---

### 3.2 OpenAPI Specification and Documentation

- **`@fastify/swagger`**
  - The implementation **MUST** expose `GET /openapi.json`.
  - OpenAPI **3.1** **MUST** be explicitly enabled.
- **`@fastify/swagger-ui`**
  - The implementation **MUST** expose `GET /docs`.
  - The UI **MUST** reference `/openapi.json` as its specification source.

---

### 3.3 Schema Registry (Static Delivery)

- **`@fastify/static`**
  - The implementation **MUST** expose `GET /schemas/**` from a local directory.
  - All schema files **MUST** be served with the following HTTP header:
    - `Cache-Control: public, max-age=31536000, immutable`
  - Schema files **MUST** be treated as immutable.
  - Any schema change **MUST** result in a new versioned file path.

---

### 3.4 JSON Schema Validation

- **`ajv`**
  - The implementation **MUST** support JSON Schema **Draft 2020-12**.
  - Validation **MUST** be configured with:
    - `allErrors: true`
    - `strict: true`
  - Compiled validators **MUST** be cached and reused.
- **`ajv-formats`**
  - Standard formats (`date-time`, `uri`, `email`, etc.) **MUST** be enabled.

---

### 3.5 Upstream HTTP Client

- **`undici`**
  - All upstream HTTP requests **MUST** use `undici`.
  - Connection, header, and body timeouts **MUST** be configured.
  - Network errors, timeouts, and upstream HTTP errors (≥ 500)
    **MUST** be translated into `application/problem+json` responses.

---

### 3.6 JWT Authentication

- **`@fastify/jwt`**
  - JWT Bearer authentication **MUST** be supported.
  - Authentication **MUST** be applied only to explicitly protected route groups.
  - Public routes **MUST NOT** require authentication.
  - Tokens **MUST** be read from the `Authorization: Bearer <token>` header.

---

## 4. Required Developer Tooling

### 4.1 TypeScript

- **`typescript`**
- **`@types/node`**
- **`tsx`** (or equivalent TypeScript runtime)
  - The implementation **MUST** support development execution without a build step.

---

## 5. Testing (Recommended)

### 5.1 Test Runner

- **`vitest`**
  - Unit and integration testing **SHOULD** be implemented.

### 5.2 HTTP Testing

- **`supertest`** or **`@fastify/supertest`**
  - HTTP-level testing against the Fastify server **SHOULD** be used.
  - Test runners and HTTP clients are **orthogonal** concerns.

> The use of `fastify.inject()` is permitted but NOT RECOMMENDED when supertest is available.

---

## 6. Optional Runtime Libraries

### 6.1 Environment Configuration

- **`@fastify/env`**
  - Environment variables **SHOULD** be loaded and validated using JSON Schema.

### 6.2 Security Headers

- **`@fastify/helmet`**
  - Standard HTTP security headers **SHOULD** be enabled.

### 6.3 CORS

- **`@fastify/cors`**
  - CORS handling **MAY** be enabled when browser-based clients are supported.

### 6.4 Rate Limiting

- **`@fastify/rate-limit`**
  - Rate limiting **SHOULD** be used to protect upstream providers.

### 6.5 Development Logging

- **`pino-pretty`**
  - Pretty logging **MAY** be used in development environments.
  - Production logging **MUST** remain structured JSON.

---

## 7. Optional Tooling

### 7.1 Type Generation

- **`openapi-typescript`**
  - TypeScript types **MAY** be generated from `/openapi.json`.
  - This tool **MUST NOT** be used at runtime.

---

## 8. Non-Goals

The following concerns are explicitly out of scope:

- Database or ORM libraries
- GraphQL
- API gateway or proxy frameworks

