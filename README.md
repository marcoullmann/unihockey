# Familien-Unihockey-Turnier · St. Margarethen TG

One-Pager für ein Plausch-Unihockey-Turnier auf dem Outdoor-Spielfeld beim Schulhaus
Kastanienhof in St. Margarethen TG. Statisch (HTML/CSS/JS), kostenlos auf Vercel
gehostet, Daten live aus einem **öffentlichen Google-Sheet** – ohne Backend, ohne API-Key.

**Live:** https://popup-unihockey.vercel.app

## Wie die Daten reinkommen

Die Seite liest das Google-Sheet über den öffentlichen `gviz`-Endpoint. Drei Tabellen
werden angezeigt (siehe `SECTIONS` in [`config.js`](./config.js)):

| Sektion          | Tab im Sheet | Anzeige |
|------------------|--------------|---------|
| **Spielplan**    | `Spielplan`  | alle Spalten |
| **Angemeldete Teams** | erstes Tab (Formular-Antworten) | nur `Teamname`, `Ort` |
| **Resultate & Rangliste** | `Resultate` | alle Spalten |

Die Logik (Spielplan berechnen, Rangliste etc.) machst du **im Google-Sheet**; die
Website zeigt die Tabs nur an. Tabs, die noch nicht existieren, zeigen eine freundliche
„kommt noch"-Meldung statt eines Fehlers.

> ⚠️ **Datenschutz:** Die Seite ist öffentlich. Bei den Teams werden bewusst nur
> `Teamname` und `Ort` gezeigt – **keine** Namen, Telefonnummern oder E-Mails.
> Ändere die `columns`-Liste nur, wenn du das wirklich öffentlich machen willst.

## Anpassen

- **Texte/Regeln/Infos:** direkt in [`index.html`](./index.html).
- **Sheet, Formular, Tabellen, Bilder:** in [`config.js`](./config.js).
- **Fotos:** in [`images/`](./images) ablegen und in `config.js` verlinken.

## Lokal testen

```bash
npx serve .
```

## Deployen

Mit Vercel + GitHub verbunden: jeder `git push` auf `main` deployt automatisch.
