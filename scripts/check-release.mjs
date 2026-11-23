#!/usr/bin/env node
// Release invariants. These are the mistakes that have actually reached a
// release or nearly did: a bin path npm silently strips, a scope rename that
// left an install command behind, a rule with no documentation. Run locally
// with `npm run check:release`; CI runs the same file before any publish.

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rules } from '../src/rules/index.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const checks = []

function check(name, fn) {
  try {
    const note = fn()
    checks.push({ name, ok: true, note })
  } catch (error) {
    checks.push({ name, ok: false, note: error.message })
    failures.push(`${name}: ${error.message}`)
  }
}

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

const pkg = JSON.parse(read('package.json'))

check('package name is scoped', () => {
  // Unscoped `skill-audit` is rejected by npm as confusable with `skillaudit`.
  if (!pkg.name.startsWith('@')) {
    throw new Error(`"${pkg.name}" is unscoped; npm rejects it as too similar to skillaudit`)
  }
  return pkg.name
})

check('scope is the publishing account', () => {
  const scope = pkg.name.split('/')[0]
  if (scope !== '@mkfeuhrer') throw new Error(`unexpected scope ${scope}`)
  return scope
})

check('bin path has no leading ./ and is executable', () => {
  const bins = Object.entries(pkg.bin || {})
  if (bins.length === 0) throw new Error('package.json has no bin entry')
  for (const [name, path] of bins) {
    // npm silently DROPS a bin whose path starts with "./", so `npx` would
    // publish fine and then fail to resolve for every user.
    if (path.startsWith('./')) throw new Error(`bin "${name}" starts with "./" (npm strips it)`)
    if (!existsSync(join(root, path))) throw new Error(`bin "${name}" -> ${path} does not exist`)
    const mode = statSync(join(root, path)).mode
    if ((mode & 0o111) === 0) throw new Error(`bin "${name}" -> ${path} is not executable`)
  }
  return bins.map(([n]) => n).join(', ')
})

check('publishConfig marks the scoped package public', () => {
  if (pkg.publishConfig?.access !== 'public') {
    throw new Error('publishConfig.access must be "public" for a scoped package')
  }
  return 'public'
})

check('files list ships bin and src', () => {
  const files = pkg.files || []
  for (const entry of ['bin', 'src']) {
    if (!files.includes(entry)) throw new Error(`files[] is missing "${entry}"`)
  }
  return files.join(', ')
})

check('no runtime dependencies', () => {
  const deps = Object.keys(pkg.dependencies || {})
  if (deps.length) throw new Error(`runtime dependencies present: ${deps.join(', ')}`)
  return '0'
})

check('every rule ships documentation', () => {
  const missing = []
  for (const rule of rules) {
    const doc = join(root, 'docs', 'rules', `${rule.id.replaceAll('/', '-')}.md`)
    if (!existsSync(doc)) missing.push(rule.id)
  }
  if (missing.length) throw new Error(`missing docs for ${missing.join(', ')}`)
  return `${rules.length} rules documented`
})

check('README states the real rule count', () => {
  const readme = read('README.md')
  const claimed = readme.match(/(\d+)\s+(?:static\s+)?rules/i)
  if (!claimed) throw new Error('README does not state a rule count')
  const n = Number(claimed[1])
  if (n !== rules.length) throw new Error(`README says ${n} rules, code has ${rules.length}`)
  return `${n} rules`
})

check('every install command uses the scoped name', () => {
  // The scope rename must reach docs, the Action and the examples at once.
  const targets = ['README.md', 'action.yml', 'examples/install-gate.sh', 'CONTRIBUTING.md']
  const offenders = []
  for (const file of targets) {
    if (!existsSync(join(root, file))) continue
    const body = read(file)
    for (const [i, line] of body.split('\n').entries()) {
      // An unscoped install of this package, not a mention of the binary name.
      if (/npx\s+(--yes\s+)?skill-audit/.test(line) || /npm\s+(i|install)\s+(-g\s+)?skill-audit\b/.test(line)) {
        offenders.push(`${file}:${i + 1}`)
      }
    }
  }
  if (offenders.length) throw new Error(`unscoped install command at ${offenders.join(', ')}`)
  return `${targets.length} files`
})

check('Action pins a major version, not latest', () => {
  const action = read('action.yml')
  const match = action.match(/version:[\s\S]*?default:\s*'([^']+)'/)
  if (!match) throw new Error('action.yml has no version default')
  if (match[1] === 'latest') {
    // Executing "latest" in someone's CI is the exact supply-chain risk this
    // tool warns about; a major range still picks up fixes.
    throw new Error("version default is 'latest' (use a major range like '1')")
  }
  return match[1]
})

check('Action uploads SARIF even when the scan fails', () => {
  const action = read('action.yml')
  const upload = action.slice(action.indexOf('Upload SARIF'))
  if (!/if:\s*.*always\(\)/.test(upload)) {
    throw new Error('SARIF upload step lacks `if: always()`; findings would never upload on a failing scan')
  }
  return 'always()'
})

check('Action still fails the job when the gate trips', () => {
  // continue-on-error on the scan step lets SARIF upload, so a later step must
  // re-assert the exit code or the gate silently never fails a pull request.
  const action = read('action.yml')
  if (!/continue-on-error:\s*true/.test(action)) {
    throw new Error('scan step should continue-on-error so SARIF uploads; enforce the gate in a later step')
  }
  if (!/Enforce the gate/.test(action)) {
    throw new Error('no final step re-asserts the scan exit code (the gate would never fail the job)')
  }
  return 'enforced in final step'
})

check('Action does not parse .sarif with require()', () => {
  const action = read('action.yml')
  // require() only parses .json as JSON and throws on a .sarif extension.
  if (/require\(['"]\.\/?skill-audit\.sarif['"]\)/.test(action)) {
    throw new Error('require() cannot load a .sarif file; use readFileSync + JSON.parse')
  }
  return 'readFileSync'
})

check('Action installs by prefix, not npx by name', () => {
  const action = read('action.yml')
  // `npx <pkg>` resolves a package whose name matches the current repo, which
  // shadowed the registry build and produced exit 127 when the Action ran in
  // its own repository. Installing to a throwaway prefix is deterministic.
  if (/npx\s+--yes\s+"?@mkfeuhrer\/skill-audit/.test(action)) {
    throw new Error('Action uses npx by package name; install to --prefix and call the bin directly')
  }
  if (!/npm install --prefix/.test(action)) {
    throw new Error('Action should install with `npm install --prefix <dir>`')
  }
  return 'prefix install'
})

check('Action name is set and not the bare package name', () => {
  const action = read('action.yml')
  const match = action.match(/^name:\s*'([^']+)'/m)
  if (!match) throw new Error('action.yml has no quoted name')
  const name = match[1]
  // GitHub Marketplace reserves action names globally. `skill-audit` is held
  // by ondrej-merkun/skill-audit, so publishing under that name is rejected.
  if (name === 'skill-audit') {
    throw new Error("action name 'skill-audit' is taken on the Marketplace; use 'Skill Audit for Agent Files'")
  }
  return name
})

check('CHANGELOG has an entry for this version', () => {
  const changelog = read('CHANGELOG.md')
  if (!changelog.includes(`## [${pkg.version}]`)) {
    throw new Error(`CHANGELOG.md has no "## [${pkg.version}]" section`)
  }
  return pkg.version
})

const pad = Math.max(...checks.map((c) => c.name.length))
for (const { name, ok, note } of checks) {
  process.stdout.write(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(pad)}  ${note}\n`)
}

if (failures.length) {
  process.stderr.write(`\n${failures.length} release check(s) failed\n`)
  process.exit(1)
}
process.stdout.write(`\nall ${checks.length} release checks passed\n`)
