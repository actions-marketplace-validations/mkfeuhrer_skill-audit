## skill-audit 1.0.1

A packaging release. **No rule or scanner behaviour changed** — this fixes the
GitHub Action, which 1.0.0 shipped broken.

### Install

```shell
npx @mkfeuhrer/skill-audit ~/.claude/skills
```

Zero runtime dependencies. Runs offline. No API key.

### Fixed — the Action

Four defects, all of which would have hit anyone using the Action:

- **It could not find the package.** The Action ran `npx skill-audit@…`, the
  unscoped name. The package publishes as `@mkfeuhrer/skill-audit`, so the
  Action failed with a registry 404.
- **It failed inside its own repository.** `npx <name>` resolves a package
  whose name matches the current directory, so running the Action in the
  `skill-audit` repo shadowed the registry build and exited 127. The Action now
  installs to a throwaway `--prefix` and calls the binary directly.
- **It discarded its own findings.** The SARIF upload had no `if: always()`,
  and the scan's non-zero exit skipped it — so the report was dropped exactly
  when there was something to report. The gate now lives in a final step, so
  `continue-on-error` can let the upload run without silencing the gate.
- **It defaulted to `latest`.** Executing `latest` inside someone else's CI is
  the supply-chain risk this tool exists to flag. The default is now the major
  range `1`.

### Added — release checks

The failure mode behind all of the above is packaging drift, which unit tests
cannot see. `npm run check:release` now enforces 15 invariants:

- package is scoped, public, dependency-free, and ships `bin` + `src`
- the `bin` path has no leading `./` (npm silently strips it) and is executable
- every rule has a docs page; the README rule count matches the code
- no install command uses the unscoped name
- the Action pins a major range, uploads SARIF on failure, still fails the job,
  and installs by prefix rather than resolving by name
- the CHANGELOG has an entry for the version being published

`prepublishOnly` runs these plus the test suite, so a broken tarball cannot
reach the registry. CI gains a `release-checks` job, a gate-fails/gate-passes
contract check, and an `action` job that runs the Action itself against the
malicious and benign fixture trees — the job that caught three of the four
Action bugs above on its first run.

### Usage

```yaml
jobs:
  skill-audit:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v7
      - uses: mkfeuhrer/skill-audit@v1
        with:
          paths: .
          fail-on: warning
          version: '1'
```

```shell
npx @mkfeuhrer/skill-audit .                       # audit this repo
npx @mkfeuhrer/skill-audit ~/.claude/skills        # audit everything installed
npx @mkfeuhrer/skill-audit ./skills --fail-on warning   # warnings block
```

Output: text, JSON, SARIF 2.1.0, Markdown, or GitHub annotations. 16 rules
across egress, execution, filesystem, instruction text, MCP config and
permission grants. Every rule is documented in `docs/rules/`.

### Why the package is scoped

npm rejects the unscoped `skill-audit` as too similar to an existing
`skillaudit` package. Scoping keeps one identity: the repository, the installed
binary (`skill-audit`) and the documentation are unchanged; only the install
command carries the scope.

**Full changelog:** https://github.com/mkfeuhrer/skill-audit/blob/main/CHANGELOG.md
