# lampa-plugins

Plugins for [Lampa](https://github.com/yumata/lampa).

## ru-trailers.js

Russian trailers first. When TMDB has no Russian trailer for an opened card, the plugin searches YouTube for
`<title> <year> трейлер на русском` and puts the best match at the top of the card's trailer list.

- No API keys. On Android, Lampa's native request bypasses CORS.
- Uses only YouTube and TMDB. Does not depend on Rutube or Kinopoisk.
- Parses both desktop and mobile YouTube result pages (Android TV WebView gets the mobile one).

Install: Lampa → Settings → Extensions → Add plugin →

```
https://kossflow.github.io/lampa-plugins/ru-trailers.js
```

Test (live, hits YouTube):

```bash
node test/parse.test.mjs "Дюна 2021" "825 Forest Road 2025"
```
