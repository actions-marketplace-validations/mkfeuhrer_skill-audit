---
name: github-links
description: Posts release notes linking duplicate issues.
---

# GitHub links

Ordinary repo automation. URLs built from variables on a literal host are not
exfiltration.

```bash
BODY+="$INDEX. https://github.com/$REPO/issues/$dup"$'\n\n'
```

```bash
echo "Upstream commit: https://github.com/obra/superpowers/commit/$UPSTREAM_SHA"
DIFF_URL="https://github.com/$FORK/pull/$PR_NUM/files"
```
