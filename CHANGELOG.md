# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] — 2026-11-23

### Fixed

- **`egress/env-interpolated-url` no longer fires on ordinary URL-building
  code.** Validating against seven public corpora showed every error-level
  finding on anthropics/claude-code, modelcontextprotocol/servers and
  obra/superpowers was a variable interpolated into the *path* of a literal
  host — `https://github.com/$REPO/issues/$dup`. A `--fail-on error` gate
  failed on the most trusted repos in the ecosystem. The rule now fires only
  when the hostname itself begins with an interpolation (a dynamic
  destination, any name) or when a secret-shaped name (KEY/TOKEN/SECRET/...)
  appears anywhere in the URL. Messages now name only the flagged values.
- **Cursor `.mdc` rule files are collected from any directory**, not just
  `.cursor/`. The 41k-star PatrickJS/awesome-cursorrules catalog — 257 rule
  files — previously scanned as "no instruction files found".

### Changed

- Scanner behaviour: repos that were clean but noisy at error level now scan
  clean (obra/superpowers 4→0 errors; modelcontextprotocol/servers 7→0;
  anthropics/claude-code 1→0). The malicious exfiltration fixture
  (`https://${COLLECTOR_HOST}/ingest?key=${API_KEY}`) still fires.

## [1.0.3] — 2026-11-23

### Changed

- **The Action's display name is now "Skill Audit for Agent Files".** GitHub
  Marketplace reserves action names globally, and `skill-audit` was already
  claimed by `ondrej-merkun/skill-audit`, so publishing under it was rejected.
  Nothing else moves: the repo, the `uses: mkfeuhrer/skill-audit@v1` path, the
  installed binary and the npm package all keep their names. Only the
  Marketplace listing and the `name:` field in `action.yml` change.
- A release check now guards against setting the Marketplace-taken name again.

## [1.0.2] — 2026-11-23

### Changed

- Documentation version pins no longer rot. The README told readers to pin
  `@1.0.0` in CI and `v1.0.0` in pre-commit, both of which predate the Action
  fixes. It now recommends the major range `@1` / `v1.0.1`, which is also what
  the Action's own `version` input defaults to.
- Builds published from CI now carry npm provenance. 1.0.0 and 1.0.1 were
  published from a local CLI, so neither has an attestation.

## [1.0.1] — 2026-11-23

### Fixed

- **The GitHub Action could not run.** It invoked `npx skill-audit@…`, the
  unscoped name, which does not exist on the registry (the package publishes
  as `@mkfeuhrer/skill-audit`). It also resolved by name, which inside a repo
  of the same name shadowed the registry build and failed with exit 127. The
  Action now installs to a throwaway `--prefix` and invokes the bin directly.
- **The Action lost its own findings.** The SARIF upload step had no
  `if: always()`, and the scan step's non-zero exit skipped it — so the report
  was dropped exactly when it mattered. The gate now lives in a final step, so
  `continue-on-error` can let the upload run without silencing the gate.
- Prepared `.sarif` files are read with `readFileSync` + `JSON.parse`;
  `require()` rejects a non-`.json` extension.
- The Action's `version` input defaulted to `latest`. It now defaults to the
  major range `1`; running `latest` inside someone else's CI is the
  supply-chain risk this tool exists to flag.

### Added

- `npm run check:release` (`scripts/check-release.mjs`): 15 invariants covering
  package scope and visibility, bin path and exec bit, shipped files, zero
  runtime dependencies, rule documentation, README rule count, unscoped install
  commands, Action wiring, and a CHANGELOG entry for the current version.
- `prepublishOnly` runs the release checks and the test suite, so a broken
  tarball cannot reach the registry.
- CI gains a `release-checks` job, a gate-fails/gate-passes contract check, and
  an `action` job that runs the Action itself against the malicious and benign
  fixture trees.

## [1.0.0] — 2026-11-01

### Added

- Six governance rules: `exec/sudo-escalation`, `exec/persistence`,
  `fs/wide-write`, `instr/self-modify`, `instr/consent-bypass`,
  `mcp/unsafe-config`.
- Suppression system: `.skill-audit-ignore` (working-directory only) with
  rule ids, `rule@path` scoping and pinned fingerprints; opt-in inline
  `skill-audit:allow` markers (`--inline-allows`).
- Stable 40-character finding fingerprints in JSON output.
- Output formats: `markdown` (shareable report tables) and `github`
  (workflow annotations), alongside text, json and SARIF.
- Instruction formats: `.windsurfrules`, `.windsurf/rules/*.md`,
  `.clinerules`, `.github/copilot-instructions.md`.
- MCP configs (`mcp.json`, `.mcp.json`, `claude_desktop_config.json`) are
  now scanned as code, so exec/egress/fs rules apply to them.
- `--ignore-file` and `--inline-allows` flags; `inlineAllows` config key.
- Per-rule documentation under `docs/rules/`.
- Type-checking gate (`npm run typecheck`) via `tsc --checkJs`; runtime
  dependencies remain zero.

### Changed

- `instr/override-language` also catches persona-hijack phrasing
  ("you are now a …", "from now on you must …").
- `fs/credential-read` also covers `~/.kube`, `~/.docker/config.json`,
  `.git-credentials` and `credential.helper`.
- `egress/undeclared-host` no longer double-reports hosts already flagged
  as environment-interpolated URLs.

## [0.1.0] — 2026-10-31

- Initial scanner: 10 rules, text/json/SARIF output, malicious + benign
  fixture corpus, exit-code gating.
