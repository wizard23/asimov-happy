# API Overlay Spezifikation v1.0 (Deutsch)

Diese Spezifikation beschreibt ein **deterministisches, discoverable Overlay-System** zur Ergänzung von **OpenAPI 3.1** Spezifikationen um **UI‑, Wire‑ und UX‑Informationen**, ohne die OpenAPI‑Spec selbst zu verändern.

Ziel ist es, ein Frontend (oder einen AI‑Agenten) in die Lage zu versetzen, **komfortable, typisierte Eingaben** (z. B. Date‑Picker, Symbol‑Picker, Presets) bereitzustellen, **ohne Heuristiken, Magie oder hardcodierte Provider‑Annahmen**.

---

## 1. Zielsetzung

Das Overlay-System soll:

- deterministisch sein (keine Namens‑ oder Typ‑Heuristiken)
- vollständig **discoverable** sein (wie OpenAPI Specs)
- unabhängig vom Frontend implementierbar sein
- versionierbar, validierbar und CI‑tauglich sein
- das Betrachten der API **ohne Overlay** weiterhin erlauben

Nicht-Ziele:

- keine Vermischung von UI‑Informationen mit OpenAPI (`x-*` Felder werden **nicht** verwendet)
- keine implizite Logik im Frontend (z. B. `from` → Datum raten)

---

## 2. Grundprinzip

Es gibt drei strikt getrennte Ebenen:

1. **OpenAPI 3.1 Spec**  
   Definiert den technischen Vertrag (Typen, Required, Constraints, Security).

2. **Overlay**  
   Definiert UI‑Controls, Wire‑Serialisierung, Resolver, Presets, zusätzliche Constraints.

3. **Schema‑Fallback**  
   Wenn kein Overlay existiert, wird ein rein typbasierter Editor aus dem JSON Schema erzeugt.

---

## 3. Discovery-Modell

Overlays werden **nicht** im Frontend hardcodiert, sondern über einen **Catalog‑Endpoint** discoverable gemacht.

Pro API werden geliefert:

- OpenAPI Spec (URL + Version)
- optional: Overlay (URL + Version)

Das Overlay ist **optional**. Das UI muss auch ohne Overlay vollständig funktionieren.

---

## 4. Overlay-Datei – Überblick

### 4.1 Format

- JSON oder YAML (JSON empfohlen)
- validierbar gegen ein JSON Schema
- eigenständige Datei (z. B. `overlay.json`)

### 4.2 Top-Level Struktur

Pflichtfelder:

- `overlayVersion` – Version des Overlay-Formats (SemVer)
- `target` – Referenz auf die Ziel‑Spec
- `rules` – Liste von Overlay‑Regeln

Optionale Metadaten:

- `id`, `title`, `description`
- `generatedAt`

---

## 5. Target (Spec-Bindung)

Das Overlay muss eindeutig an eine OpenAPI Spec gebunden sein.

Mindestens eines der folgenden Felder ist erforderlich:

- `specVersion`
- `specSha256`

Optional:

- `specUrl`

Zweck:

- Verhindert Overlay/Spec‑Drift
- Ermöglicht CI‑Validierung
- UI kann warnen, wenn Overlay nicht zur Spec passt

---

## 6. Rules

Eine **Rule** beschreibt, **wo** etwas angewendet wird (Selector) und **was** angewendet wird (Apply).

```json
{
  "selector": { ... },
  "apply": { ... }
}
```

---

## 7. Selector (Adressierung)

Selectors sind **deterministisch** und basieren auf `operationId`.

### 7.1 Operation Selector

```json
{ "operationId": "getBars" }
```

Verwendung:
- Operation‑weite Defaults
- Gruppierung

---

### 7.2 Parameter Selector

Adressiert Query, Path, Header oder Cookie Parameter.

```json
{
  "operationId": "getBars",
  "parameter": { "in": "query", "name": "from" }
}
```

---

### 7.3 Request‑Body‑Feld Selector

Adressiert ein Feld im Request Body über **JSON Pointer** relativ zum *aufgelösten* Schema‑Root.

```json
{
  "operationId": "createAlert",
  "requestBodyField": {
    "contentType": "application/json",
    "schemaPointer": "/properties/filter/properties/from"
  }
}
```

---

### 7.4 Response‑Feld Selector (optional)

Für Viewer‑Hints oder Markierungen.

```json
{
  "operationId": "getBars",
  "responseField": {
    "status": 200,
    "contentType": "application/json",
    "schemaPointer": "/items/properties/price"
  }
}
```

---

## 8. Apply‑Block

Der `apply`‑Block definiert die Wirkung einer Rule.

Er besteht aus bis zu vier Bereichen:

- `ui`
- `wire`
- `resolver`
- `constraints`

Mindestens **einer** davon muss vorhanden sein.

---

## 9. UI Apply

### 9.1 Controls

Stabile, provider‑neutrale UI‑Controls:

- `text`
- `textarea`
- `number`
- `boolean`
- `enumSelect`
- `multiEnumSelect`
- `date`
- `dateTime`
- `dateRange`
- `symbolPicker`
- `jsonEditor`
- `arrayEditor`
- `objectEditor`

Controls liefern **typisierte Werte**, keine Strings.

### 9.2 UI‑Felder

- `control`
- `label`
- `help`
- `placeholder`
- `group`
- `order`
- `advanced`
- `hidden`
- `readonly`
- `defaultValue`
- `presets`

---

## 10. Wire Apply (Serialisierung)

Definiert, wie UI‑Werte in API‑Parameter umgewandelt werden.

### 10.1 Codecs

Zeitformate:

- `isoDate`
- `isoDateTime`
- `epochSeconds`
- `epochMillis`
- `yyyymmdd`

Arrays:

- `repeatedQueryParam`
- `commaSeparated`
- `spaceDelimited`
- `pipeDelimited`

Sonstiges:

- `jsonString`
- `passthrough`

### 10.2 Weitere Felder

- `timezone`: `UTC | local`
- `arrayStyle`: Override für Query‑Arrays

---

## 11. Resolver Apply (Autocomplete / Dynamic Data)

Resolver werden verwendet für z. B. Symbol‑Autocomplete.

Pflicht:

- `type`: `endpoint`
- `url`

Optional:

- `method`
- `debounceMs`
- `resultPointer`
- `map` (`labelPointer`, `valuePointer`, `metaPointers`)

---

## 12. Constraints Apply

Zusätzliche **verschärfende** Constraints.

Overlay‑Constraints dürfen die Spec **nicht lockern**.

Beispiele:

- `required`
- `minLength`, `maxLength`, `pattern`
- `minimum`, `maximum`, `multipleOf`
- `minItems`, `maxItems`
- `dateRangeMaxDays`
- `dateRangeAllowFuture`
- `numberStep`
- `allowedValues`

---

## 13. Fallback‑Verhalten (ohne Overlay)

Wenn **kein Overlay** vorhanden ist:

- `enum` → Select
- `boolean` → Toggle
- `number` → Number Input
- `string` → Text Input
- `object` → JSON/Object Editor
- `array` → Array Editor

Keine Presets, keine Resolver, keine Magie.

---

## 14. Precedence‑Regeln

1. OpenAPI Spec definiert Typen & Pflichtfelder
2. Overlay ergänzt UI/Wire/UX
3. Overlay darf nur **zusätzliche Einschränkungen** hinzufügen

Fehlerfälle:

- Control nicht kompatibel mit Schema → Fehler
- Overlay lockert Spec‑Constraint → Fehler
- Selector zeigt auf nicht existierendes Feld → Fehler

---

## 15. CI‑/Lint‑Anforderungen

Ein Overlay‑Lint MUSS prüfen:

- Existiert `operationId`?
- Existiert Parameter / Schema Pointer?
- Ist Control mit Schema‑Typ kompatibel?
- Werden Spec‑Constraints nicht verletzt?
- Passt Overlay zur Spec‑Version?

---

## 16. Implementierungs‑Hinweis für AI‑Agenten

Ein Agent soll:

1. OpenAPI 3.1 Spec laden
2. Overlay laden (falls vorhanden)
3. `$ref` auflösen → resolved schemas
4. Rules anwenden (Selector → Apply)
5. Typed UI Model erzeugen
6. Bei Request‑Build: UI‑Werte via Wire‑Codec serialisieren
7. Request‑Preview anzeigen (vollständig transparent)

---

## 17. Status

Diese Spezifikation definiert **Overlay v1.0**.

Erweiterungen sind explizit erlaubt, solange:

- bestehende Felder nicht umgedeutet werden
- neue Controls/Codecs additive sind

---

**Dateiname:** `overlay-specification-de.md`

