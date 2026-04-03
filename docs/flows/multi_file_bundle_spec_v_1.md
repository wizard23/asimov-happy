# Multi-File Bundle Spec v1
Created with https://chatgpt.com/c/69638e74-8cf8-832f-a500-b8e989869160

## Goals
- **Deterministic**: unambiguous boundaries, no guessing
- **Copy/paste friendly**
- **Tool-friendly**: easy to parse with a small script
- **Supports binary assets** (via base64) if needed
- **AI-agent friendly** for handoff and automation

---

## 1. Header (required)

At the very top of the bundle:

```
BUNDLE-SPEC: 1
ENCODING: utf-8
NEWLINE: lf
ROOT: <repo-root-name-or-dot>
```

### Rules
- `BUNDLE-SPEC` **must** be `1`
- `ENCODING` is informational (typically `utf-8`)
- `NEWLINE` is `lf` or `crlf`
- `ROOT` is informational (e.g. `.` or `my-project`)

---

## 2. File entries (required)

Each file entry starts with `FILE:` and ends with `END-FILE`.

```
FILE: path/relative/to/root.ext
TYPE: text/plain; charset=utf-8
MODE: 0644
SHA256: <optional>
---BEGIN---
<file content exactly as-is>
---END---
END-FILE
```

### Rules
- Paths **must**:
  - be relative
  - use `/` as separator
  - not start with `/`
  - not contain `..`
- `TYPE` is MIME-like and optional (helps humans and tools)
- `MODE` is a 4-digit octal Unix mode (optional, default `0644`)
- `SHA256` is optional, for integrity checking
- Content between `---BEGIN---` and `---END---` is **verbatim**
- Empty files are allowed (`---BEGIN---` immediately followed by `---END---`)

---

## 3. Binary file entries (optional)

Binary content (images, fonts, etc.) may be embedded using base64.

```
FILE: assets/logo.png
TYPE: image/png
MODE: 0644
ENC: base64
SHA256: <optional>
---BEGIN---
iVBORw0KGgoAAAANSUhEUgAA...
---END---
END-FILE
```

### Rules
- If `ENC: base64` is present, content **must** be base64
- If `ENC` is absent, content is treated as plain text

---

## 4. Footer (recommended)

```
END-BUNDLE
```

The footer is optional but strongly recommended for validation.

---

## 5. Example bundle

```
BUNDLE-SPEC: 1
ENCODING: utf-8
NEWLINE: lf
ROOT: .

FILE: package.json
TYPE: application/json; charset=utf-8
MODE: 0644
---BEGIN---
{
  "name": "demo",
  "private": true,
  "type": "module"
}
---END---
END-FILE

FILE: src/index.ts
TYPE: text/typescript; charset=utf-8
MODE: 0644
---BEGIN---
export function hello(name: string) {
  return `Hello, ${name}!`;
}
---END---
END-FILE

FILE: README.md
TYPE: text/markdown; charset=utf-8
MODE: 0644
---BEGIN---
# Demo

Run:

```sh
node --version
```
---END---
END-FILE

END-BUNDLE
```

---

## 6. Parsing algorithm (normative)

A conforming parser **must**:
1. Read header lines until the first `FILE:`
2. For each file entry:
   - parse metadata lines until `---BEGIN---`
   - read content verbatim until `---END---`
   - require the next line to be `END-FILE`
3. Stop at `END-BUNDLE` or end-of-file

### Validation requirements
- Reject absolute paths
- Reject paths containing `..`
- Require all markers to appear on their own line

---

## 7. Minimal form (allowed)

For compact bundles, metadata may be omitted:

```
FILE: src/main.ts
---BEGIN---
console.log("hi");
---END---
END-FILE
```

Defaults:
- `TYPE`: `text/plain; charset=utf-8`
- `MODE`: `0644`

---

## 8. Agent handoff hint (optional)

For AI-assisted workflows, the following line may be added to the header:

```
INTENT: Create these files exactly as specified; do not modify content unless instructed.
```

---

## 9. Future extensions (non-normative)

Possible compatible extensions:
- Patch entries (`PATCH:` with unified diffs)
- Bundle signatures
- Content-addressed file blocks

These are intentionally excluded from v1 to keep parsing trivial and robust.

