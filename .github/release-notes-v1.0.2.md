## skill-audit 1.0.2

No scanner changes. This release fixes documentation that had already gone
stale, and is the first build published from CI — so the tarball now carries
**npm provenance**.

### Install

```shell
npx @mkfeuhrer/skill-audit ~/.claude/skills
```

Zero runtime dependencies. Runs offline. No API key.

### Provenance

```shell
$ npm audit signatures
1 package has a verified registry signature
1 package has a verified attestation
```

1.0.0 and 1.0.1 were published from a local CLI and have no attestation. From
1.0.2 on, releases are built and published by
`.github/workflows/release.yml` using npm trusted publishing (OIDC) — no
long-lived token exists, and the attestation records the exact commit and
workflow that produced the tarball.

### Changed

- **Documentation version pins no longer rot.** The README told readers to pin
  `@1.0.0` in CI and `v1.0.0` in pre-commit — both predate the Action fixes in
  1.0.1. They now recommend the major range `@1` and `v1.0.1`, which matches
  what the Action's own `version` input already defaults to.

### Use it

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
```

```shell
npx @mkfeuhrer/skill-audit .                        # audit this repo
npx @mkfeuhrer/skill-audit ~/.claude/skills         # everything installed
npx @mkfeuhrer/skill-audit ./skills --fail-on warning
```

16 rules across egress, execution, filesystem, instruction text, MCP config and
permission grants. Output as text, JSON, SARIF 2.1.0, Markdown, or GitHub
annotations. Every rule documented in `docs/rules/`.

**Full changelog:** https://github.com/mkfeuhrer/skill-audit/blob/main/CHANGELOG.md
