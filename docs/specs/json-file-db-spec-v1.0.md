# Spezifikation — JSON-Datenhaltung (Todos & Reminders)

> **Zweck:** Diese Spezifikation definiert die Persistenzschicht der API mittels JSON-Dateien auf dem lokalen Dateisystem.
>
> **Grundprinzip:** Beim Start werden alle Daten aus JSON-Dateien geladen und anschließend **vollständig In-Memory** als „Source of Truth“ bearbeitet. Persistenz erfolgt als **Snapshot/Materialisierung** nach definierter Flush-Policy.

---

## 1. Begriffe

* **Entity**: Ein einzelnes Todo oder Reminder Objekt.
* **Collection**: Die Menge aller Todos bzw. aller Reminders.
* **Dirty**: In-Memory Daten weichen vom zuletzt auf die Platte geschriebenen Zustand ab.
* **Flush**: Persistieren des aktuellen In-Memory Zustands auf das Dateisystem.
* **Atomic Write**: Schreiben über temporäre Datei + Rename/Replace, sodass niemals ein halb geschriebenes JSON als finale Datei sichtbar wird.

---

## 2. Verzeichnisse

### 2.1 Basisverzeichnisse (Normativ)

* `data/managed/todos/`
* `data/managed/reminders/`
* `data/managed/meta/`

### 2.2 Meta-Konfiguration

* Datei: `data/managed/meta/persistence.json`

---

## 3. Persistenzmodelle (pro Domain separat)

Für **Todos** und **Reminders** können alle Persistenzparameter **separat** konfiguriert werden.

### 3.1 Granularität

Je Domain (`todos`, `reminders`) existieren zwei Modi:

#### A) Datei pro Entity (`mode: "per-entity"`)

* Pfad: `data/managed/<domain>/<id>.json`
* Jedes Entity liegt in einer eigenen Datei.

#### B) Datei pro Collection (`mode: "per-collection"`)

* Pfad: `data/managed/<domain>/<domain>.json`

  * Beispiele:

    * `data/managed/todos/todos.json`
    * `data/managed/reminders/reminders.json`
* Enthält ein JSON Array aller Entities der Domain.

### 3.2 Delete-Semantik

* **per-entity**: Löschen entfernt die Datei `<id>.json`.
* **per-collection**: Löschen führt dazu, dass `<domain>.json` beim nächsten Flush ohne den Eintrag neu geschrieben wird.

---

## 4. JSON-Formate (Datei-Inhalte)

> Diese Spezifikation beschreibt das Persistenzformat. Die inhaltliche API-Semantik (Felder, Typen) richtet sich nach der API-Spezifikation. Persistenz darf zusätzliche technische Metadaten nur hinzufügen, wenn diese eindeutig namespaced sind (z.B. `_persist`), wird hier aber **nicht** benötigt.

### 4.1 per-entity Datei

* Dateiinhalt: Ein einzelnes JSON Objekt (die Entity).

Beispiel (Todo):

```json
{
  "id": "todo_123",
  "title": "Buy milk",
  "completed": false,
  "createdAt": "2026-01-17T00:00:00.000Z",
  "updatedAt": "2026-01-17T00:00:00.000Z"
}
```

### 4.2 per-collection Datei

* Dateiinhalt: Ein JSON Array von Entities.

Beispiel:

```json
[
  { "id": "todo_1", "title": "…" },
  { "id": "todo_2", "title": "…" }
]
```

---

## 5. Laden beim Start (Boot-Phase)

### 5.1 Allgemein

Beim Start MUSS die Anwendung:

1. `persistence.json` laden.
2. Für jede Domain (`todos`, `reminders`) anhand des konfigurierten `mode` die Daten einlesen.
3. Ein In-Memory Modell erzeugen.

### 5.2 Leselogik pro Modus

#### per-entity

* Alle Dateien `*.json` im Domain-Verzeichnis einlesen.
* Jede Datei wird als einzelnes Entity interpretiert.
* Dateien, die nicht dem erwarteten Pattern entsprechen, dürfen ignoriert werden.

#### per-collection

* `<domain>.json` einlesen.
* Wenn Datei nicht existiert, wird die Collection als leer angenommen.

### 5.3 Fehler- und Recovery-Strategie

* **Ungültiges JSON** in einer Datei:

  * per-entity: Die Datei MUSS als fehlerhaft geloggt werden; das Entity DARF übersprungen werden.
  * per-collection: Der Ladevorgang der Domain SOLL fehlschlagen (weil gesamter Snapshot unbrauchbar). Alternativ darf ein Backup-Mechanismus implementiert werden, ist aber nicht Teil dieser Spezifikation.

---

## 6. Schreib- und Flush-Strategie

### 6.1 Atomic Writes (Normativ)

Alle Writes MÜSSEN atomar erfolgen:

* Schreibe in eine temporäre Datei im selben Verzeichnis (z.B. `.<name>.tmp`).
* `fsync` ist optional; falls implementiert, SOLL es vor dem Rename erfolgen.
* Ersetze die Ziel-Datei per Rename/Replace (plattformabhängig; Ziel ist: finaler Name zeigt immer auf vollständige Datei).

### 6.2 Dirty-Tracking (Normativ)

* Jede Mutation an In-Memory Daten markiert die betroffene Domain als **dirty**.
* Flush entfernt das Dirty-Flag nur, wenn der Schreibvorgang erfolgreich abgeschlossen wurde.

### 6.3 Flush-Result

Ein Flush liefert (intern) mindestens:

* `flushed: boolean`
* `writtenFiles: number`
* `at: string` (ISO-8601 Timestamp)
* optional: `errors: Array<{ path: string; message: string }>`

---

## 7. Flush Policies (pro Domain separat)

Die Policy steuert **wann** geschrieben wird. Sie ist unabhängig vom `mode` (per-entity vs per-collection).

### 7.1 Policy-Typen

* `immediate`: Nach **jeder** erfolgreichen Mutation sofort flushen.
* `interval`: Im Hintergrund flushen, **debounced**: spätestens alle `intervalMinutes`, **nur wenn dirty**.
* `manual`: Nie automatisch flushen; nur via explizitem API Call.

### 7.2 Interval-Policy Details (Normativ)

* Bei erster Mutation nach einem sauberen Zustand startet/plant die Anwendung einen Flush spätestens nach `intervalMinutes`.
* Weitere Mutationen innerhalb des Intervalls führen NICHT zu häufigeren Flushes als „spätestens alle N Minuten“, dürfen aber optional ein Debounce/Reschedule implementieren.
* Wenn bei Ausführung eines geplanten Flushes `dirty == false`, wird kein Write durchgeführt.

### 7.3 Flush bei Shutdown (Normativ)

* Bei sauberem Shutdown (z.B. SIGINT/SIGTERM) SOLL die Anwendung **best-effort** alle dirty Domains flushen.
* Fehler beim Shutdown-Flush dürfen den Shutdown nicht unendlich blockieren; ein Timeout ist implementierungsabhängig.

---

## 8. API für explizites Flush

### 8.1 Endpoint

* `POST /flush`

### 8.2 Semantik

* Der Request MUSS angeben, welche Domain geflusht wird:

  * `domain: "todos" | "reminders"`

Request Body (Beispiel):

```json
{ "domain": "todos" }
```

### 8.3 Response

Response Body (Normativ):

```json
{
  "flushed": true,
  "writtenFiles": 12,
  "at": "2026-01-17T00:00:00.000Z"
}
```

* `writtenFiles` bedeutet:

  * per-entity: Anzahl der geschriebenen Entity-Dateien (plus ggf. gelöschte Dateien nicht enthalten).
  * per-collection: `1` wenn geschrieben wurde, sonst `0`.

### 8.4 Fehlerfälle

* Wenn ein Flush fehlschlägt:

  * `flushed: false`
  * `writtenFiles: 0`
  * optional: Fehlerdetails

---

## 9. Meta-Konfiguration: `persistence.json`

### 9.1 Dateiort

* `data/managed/meta/persistence.json`

### 9.2 Struktur (Normativ)

```json
{
  "version": 1,
  "todos": {
    "mode": "per-entity",
    "policy": "interval",
    "intervalMinutes": 5,
    "atomicWrites": true,
    "flushOnShutdown": true
  },
  "reminders": {
    "mode": "per-collection",
    "policy": "manual",
    "atomicWrites": true,
    "flushOnShutdown": true
  }
}
```

### 9.3 Felddefinitionen

* `version` (number): Schema-Version der Konfiguration.

Pro Domain (`todos`, `reminders`):

* `mode`: `"per-entity" | "per-collection"`
* `policy`: `"immediate" | "interval" | "manual"`
* `intervalMinutes` (number, optional): Erforderlich wenn `policy == "interval"`.
* `atomicWrites` (boolean): MUSS `true` sein (die Implementierung darf es nur unterstützen, nicht deaktivieren).
* `flushOnShutdown` (boolean): Empfohlen `true`.

---

## 10. Schreiblogik pro Modus

### 10.1 per-entity flush

Beim Flush einer Domain im Modus `per-entity` MUSS die Anwendung:

* Für alle Entities im Speicher jeweils `<id>.json` atomar schreiben.
* Für gelöschte Entities (seit letztem Flush) die entsprechende Datei löschen.

**Hinweis:** Ob „alle Dateien immer neu schreiben“ oder nur geänderte Entities geschrieben werden, ist Implementierungsdetail. Diese Spezifikation erlaubt beides, solange das Ergebnis konsistent ist.

### 10.2 per-collection flush

Beim Flush einer Domain im Modus `per-collection` MUSS die Anwendung:

* Eine vollständige JSON Liste aller Entities erzeugen.
* `<domain>.json` atomar schreiben.

---

## 11. Konsistenzregeln & Anti-Patterns

* Die In-Memory Daten sind stets maßgeblich; das Dateisystem ist Persistenz, nicht „Live-Datenbank“.
* Niemals direkt in die finalen JSON-Dateien „in-place“ schreiben (sonst Risiko korrupter JSONs).
* Keine gemischten Modi innerhalb einer Domain (entweder per-entity oder per-collection).
* Kein globaler Flush für beide Domains über `/flush` in einem Call (bewusst getrennt).

---

## 12. Minimalbeispiele für Dateisystemzustände

### 12.1 per-entity (Todos)

```
data/
  managed/
    todos/
      todo_1.json
      todo_2.json
    reminders/
    meta/
      persistence.json
```

### 12.2 per-collection (Reminders)

```
data/
  managed/
    reminders/
      reminders.json
    meta/
      persistence.json
```
