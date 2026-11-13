/*
 * Lampa plugin: Russian trailers first.
 * If TMDB has no Russian trailer for the opened card, search YouTube for
 * "<title> <year> трейлер на русском" and put the best match first in the
 * card's "Trailers" list. Works without API keys: on Android, Lampa's native
 * request bypasses CORS. Uses only YouTube and TMDB, both reachable from Ukraine.
 */
(function () {
  'use strict';

  if (window.ru_trailers_plugin) return;
  window.ru_trailers_plugin = true;

  var RU = /трейлер|тизер|trailer|teaser/i;
  var CYRILLIC = /[а-яё]/i;
  var cache = {};

  function hasRussian(results) {
    for (var i = 0; i < results.length; i++) {
      if (results[i].iso_639_1 === 'ru') return true;
    }
    return false;
  }

  function normalize(s) {
    // Mobile YouTube pages escape the embedded JSON as \x22 \x7b ... ; make both variants look the same.
    return s.replace(/\\x22/g, '"').replace(/\\x7b/g, '{').replace(/\\x7d/g, '}')
      .replace(/\\x5b/g, '[').replace(/\\x5d/g, ']').replace(/\\x3d/g, '=').replace(/\\\//g, '/');
  }

  // Desktop pages put videoId first, mobile pages (what the TV gets) put the
  // headline first, so each renderer block is parsed on its own, field order aside.
  function parseResults(html) {
    var found = [];
    var seen = {};
    html = normalize(html);
    var re = /"(?:videoRenderer|videoWithContextRenderer|compactVideoRenderer)":\{/g;
    var starts = [];
    var m;
    while ((m = re.exec(html))) starts.push(m.index);
    for (var i = 0; i < starts.length && found.length < 10; i++) {
      var end = i + 1 < starts.length ? Math.min(starts[i + 1], starts[i] + 8000) : starts[i] + 8000;
      var chunk = html.slice(starts[i], end);
      var id = /"videoId":"([\w-]{11})"/.exec(chunk);
      var t = /"(?:title|headline)":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/.exec(chunk);
      if (!id || !t || seen[id[1]]) continue;
      seen[id[1]] = true;
      var title;
      try {
        title = JSON.parse('"' + t[1] + '"');
      } catch (e) {
        title = t[1];
      }
      found.push({ id: id[1], title: title });
    }
    return found;
  }

  function pick(found, name) {
    var word = (name || '').toLowerCase().split(/[\s:,.!?-]+/).filter(function (w) {
      return w.length > 2;
    })[0];
    for (var i = 0; i < found.length; i++) {
      var t = found[i].title;
      if (RU.test(t) && CYRILLIC.test(t) && (!word || t.toLowerCase().indexOf(word) !== -1)) return found[i];
    }
    for (var j = 0; j < found.length; j++) {
      if (RU.test(found[j].title) && CYRILLIC.test(found[j].title)) return found[j];
    }
    return null;
  }

  function addVideo(videos, video) {
    videos.results.unshift({
      key: video.id,
      name: video.title,
      iso_639_1: 'ru',
      official: false,
      site: 'YouTube',
      type: 'Trailer',
      published_at: new Date().toISOString()
    });
  }

  function search(movie, videos) {
    var name = movie.title || movie.name || '';
    var date = movie.release_date || movie.first_air_date || '';
    var year = date.slice(0, 4);
    var query = name + ' ' + year + ' трейлер на русском';
    var cacheKey = (movie.name ? 'tv' : 'movie') + movie.id;

    if (cache[cacheKey]) {
      addVideo(videos, cache[cacheKey]);
      return;
    }

    var url = 'https://www.youtube.com/results?hl=ru&gl=UA&search_query=' + encodeURIComponent(query);
    var network = new Lampa.Reguest();
    network.timeout(15000);
    network['native'](url, function (html) {
      var best = pick(parseResults(typeof html === 'string' ? html : ''), name);
      if (!best) return;
      cache[cacheKey] = best;
      addVideo(videos, best);
    }, function () {}, false, { dataType: 'text' });
  }

  function start() {
    Lampa.Listener.follow('full', function (e) {
      if (e.type !== 'complite' || !e.data || !e.data.movie) return;
      var videos = e.data.videos;
      if (!videos || !videos.results) return;
      if (hasRussian(videos.results)) return;
      search(e.data.movie, videos);
    });
  }

  window.ru_trailers_test = { parseResults: parseResults, pick: pick };

  if (window.appready) start();
  else Lampa.Listener.follow('app', function (e) {
    if (e.type === 'ready') start();
  });
})();
