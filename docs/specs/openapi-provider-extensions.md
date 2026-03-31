# OpenAPI Provider Extensions

This document defines optional OpenAPI vendor extensions that let the frontend discover providers,
auth scopes, and example requests directly from the backend API spec. These extensions are meant to
avoid any provider-specific hardcoding in the UI.

## Goals

- Discover providers and their capabilities without frontend constants.
- Discover auth scopes per provider and per operation.
- Provide example request inputs for UI defaults and curl examples.

## Extensions

### x-provider

Identifies the provider for an operation when the path alone is insufficient.

- Type: string
- Example: "financial-modeling-prep"
- Placement: Operation Object

### x-scopes

Declares required scopes for an operation when the security scheme is bearer auth.
The frontend can use this to populate scope pickers and to label endpoints.

- Type: array of strings
- Example: ["alpaca:read"]
- Placement: Operation Object

### x-parameter-defaults

Provides default values for query/path/header parameters that the UI can prefill.
This is useful when OpenAPI schemas do not include `default` or `example` values.

- Type: object (string keys, string values)
- Example: { "symbol": "AAPL", "interval": "1d", "outputsize": "compact" }
- Placement: Operation Object

### x-curl-example

A fully formed curl example for the operation. The frontend can display this verbatim.
If present, this overrides auto-generated curl strings in the UI.

- Type: string
- Example: "curl -sS \"${baseUrl}/v1/providers/yahoo-finance/equities/AAPL/chart?interval=1d\""
- Placement: Operation Object

### x-provider-display

Optional display metadata for providers. This is intended for spec-wide usage and
lets the UI show human-friendly labels without hardcoding.

- Type: object
- Example:
  { "id": "alpaca", "label": "Alpaca", "description": "Account, positions, and bars" }
- Placement: OpenAPI Document Object (top-level), under `x-provider-display` as an array

## Example Usage

```json
{
  "paths": {
    "/v1/providers/alpaca/account": {
      "get": {
        "summary": "Alpaca account",
        "security": [{ "bearerAuth": [] }],
        "x-provider": "alpaca",
        "x-scopes": ["alpaca:read"],
        "x-curl-example": "curl -sS -H \"Authorization: Bearer <jwt>\" \"${baseUrl}/v1/providers/alpaca/account\"",
        "responses": {
          "200": {
            "description": "Account details",
            "content": {
              "application/json": {
                "schema": { "$ref": "/schemas/providers/alpaca/account/1.0.0.json" }
              }
            }
          }
        }
      }
    }
  },
  "x-provider-display": [
    { "id": "alpaca", "label": "Alpaca", "description": "Account, positions, and bars" },
    { "id": "alpha-vantage", "label": "Alpha Vantage", "description": "Market data" },
    { "id": "yahoo-finance", "label": "Yahoo Finance", "description": "Public market data" }
  ]
}
```

## Frontend Interpretation Notes

- If `x-provider` is omitted, the frontend may fall back to the provider path segment
  (e.g., `/v1/providers/{provider}/...`).
- If `x-scopes` is omitted, the operation is treated as public.
- `x-parameter-defaults` should be merged with any existing OpenAPI `default` values;
  explicit OpenAPI defaults win when both are present.
- `x-curl-example` should be used verbatim if provided.
