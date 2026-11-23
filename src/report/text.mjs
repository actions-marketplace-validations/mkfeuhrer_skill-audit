import { displayPath } from '../parse.mjs'

export function formatText({ findings, summary, root, filesScanned }) {
  const lines = []
  for (const finding of findings) {
    const location = `${displayPath(finding.path, root)}:${finding.line}:${finding.column || 1}`
    lines.push(`${finding.level.padEnd(7)} ${location}  ${finding.ruleId}`)
    lines.push(`        ${finding.message}`)
  }
  if (findings.length) lines.push('')
  // Count the files that were read, not the files that happened to have a
  // finding. A clean scan must still report what it covered, otherwise
  // "0 file(s)" reads as "I did nothing" and the gate looks broken.
  const scanned = filesScanned ?? new Set(findings.map((f) => f.path)).size
  lines.push(
    `${summary.error} error(s), ${summary.warning} warning(s), ${summary.note} note(s) across ${scanned} file(s)`,
  )
  return `${lines.join('\n')}\n`
}
