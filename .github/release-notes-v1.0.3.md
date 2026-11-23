## skill-audit 1.0.3

The Action is now listed on the GitHub Marketplace as **Skill Audit for Agent
Files**. No scanner behaviour changes.

### Install

```shell
npx @mkfeuhrer/skill-audit ~/.claude/skills
```

Zero runtime dependencies. Runs offline. No API key.

### Why the Action has a different name

GitHub Marketplace reserves action names **globally**. `skill-audit` was already
claimed by [`ondrej-merkun/skill-audit`](https://github.com/ondrej-merkun/skill-audit),
so publishing under that name was rejected:

> Name must be unique. Cannot match an existing action, user or organization name.

**Nothing else moved.** The repository, the `uses:` path, the installed binary
and the npm package all keep their names:

| | Value |
|---|---|
| Marketplace listing | Skill Audit for Agent Files |
| Action in a workflow | `uses: mkfeuhrer/skill-audit@v1` |
| npm package | `@mkfeuhrer/skill-audit` |
| Installed binary | `skill-audit` |

`action.yml` is not part of the npm tarball, so this release does not change
what `npx` installs.

The name also does useful work. `skill-audit` is carried by six other
repositories, and it competes on a generic term. Naming the actual niche —
instruction files for agents — says what this tool is for and what it is not:
it does not run anything, it reads what your agent is about to read.

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

### Provenance

Published from CI via npm trusted publishing (OIDC), so the tarball carries a
verified attestation:

```console
$ npm audit signatures
1 package has a verified registry signature
1 package has a verified attestation
```

**Full changelog:** https://github.com/mkfeuhrer/skill-audit/blob/main/CHANGELOG.md
