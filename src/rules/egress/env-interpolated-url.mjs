import { CODE_KINDS, URL_RE, linesOf } from '../_shared.mjs'

// A hostname that begins with an interpolation can point anywhere, and is
// flagged regardless of name: `https://${COLLECTOR_HOST}/ingest` is the
// exfiltration shape. Elsewhere (a variable appended after a literal host,
// a port, a path or a query) only secret-shaped names are flagged —
// `https://github.com/$REPO/issues/$dup` and `https://api.github.com${endpoint}`
// are ordinary code, while `https://api.example.com/log?key=$API_KEY` is not.
const SECRET_WORD_RE = /(KEY|TOKEN|SECRET|PASS|AUTH|ENV|HOST|API|DSN|WEBHOOK|CREDENTIAL|COOKIE|SESSION)/i
const INTERP_RE = /\$\{([^}]*)\}|\$([A-Za-z_]\w*)/g

function interpolationsOf(text) {
  const out = []
  for (const match of text.matchAll(INTERP_RE)) {
    const name = (match[1] ?? match[2]).trim()
    if (name) out.push(name)
  }
  return out
}

function secretShaped(names) {
  return names.filter((name) => SECRET_WORD_RE.test(name) || /^process\.env/.test(name))
}

function analyzeUrl(url) {
  const match = url.match(/^https?:\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?/)
  if (!match) return null
  const hostSegment = match[1]
  const colon = hostSegment.indexOf(':')
  const hostname = colon >= 0 ? hostSegment.slice(0, colon) : hostSegment
  return { hostSegment, hostname, path: match[2] || '', query: match[3] || '' }
}

export const rule = {
  id: 'egress/env-interpolated-url',
  level: 'error',
  shortDescription: 'URL assembled from an environment-like value',
  help: 'A hostname that begins with a variable can point anywhere, and a secret-shaped name in a URL is the classic exfiltration shape. Use a documented literal host and keep credentials out of URLs.',
  check(file) {
    const findings = []
    for (const row of linesOf(file, CODE_KINDS)) {
      const urls = row.text.match(URL_RE) || []
      for (const url of urls) {
        const parts = analyzeUrl(url)
        if (!parts) continue
        const dynamicHost = /^(\$\{|\$[A-Za-z_])/.test(parts.hostname)
        const names = dynamicHost
          ? interpolationsOf(parts.hostname)
          : secretShaped([
            ...interpolationsOf(parts.hostSegment),
            ...interpolationsOf(parts.path),
            ...interpolationsOf(parts.query),
          ])
        if (names.length === 0) continue
        findings.push({
          ruleId: this.id,
          level: this.level,
          message: dynamicHost
            ? `URL host is assembled from "${names.join(', ')}".`
            : `URL is assembled from secret-shaped value "${names.join(', ')}".`,
          line: row.line,
          column: row.column,
        })
        break
      }
    }
    return findings
  },
}
