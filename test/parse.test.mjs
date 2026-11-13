// Live check of ru-trailers.js parsing against real YouTube search pages.
// Usage: node test/parse.test.mjs "<query>" ...   (exit 1 if any UA finds nothing)
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync(new URL('../ru-trailers.js', import.meta.url), 'utf8')
const ctx = { window: { appready: false }, Lampa: { Listener: { follow() {} } } }
vm.runInNewContext(src, ctx)
const { parseResults, pick } = ctx.window.ru_trailers_test

const UAS = {
  mobile: 'Mozilla/5.0 (Linux; Android 14; MiTV-AFMU0 Build/UTT3.240625.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
}

let failed = false
for (const q of process.argv.slice(2)) {
  for (const [name, ua] of Object.entries(UAS)) {
    const url = 'https://www.youtube.com/results?hl=ru&gl=UA&search_query=' + encodeURIComponent(q + ' трейлер на русском')
    const html = await (await fetch(url, { headers: { 'User-Agent': ua } })).text()
    const found = parseResults(html)
    const best = pick(found, q.replace(/\s\d{4}$/, ''))
    console.log(`${name.padEnd(7)} ${q}: ${found.length} found, best = ${best ? best.id + ' ' + best.title : 'none'}`)
    if (!found.length) failed = true
  }
}
process.exit(failed ? 1 : 0)
