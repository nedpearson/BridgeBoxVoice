/**
 * SuperAgent v1 - Pre-deployment validation engine
 * Catches all common errors before they reach Vercel.
 * Runs after all agents complete but before upload.
 */

export interface SuperAgentResult {
  passed: boolean
  filesChecked: number
  errors: { file: string; issue: string; fixed: boolean }[]
  warnings: { file: string; issue: string }[]
  summary: string
}

interface GeneratedFile {
  path: string
  content: string
}

// ── Validation rules ──────────────────────────────────────────────────────────
function checkBalance(src: string): { opens: number; closes: number } {
  let opens = 0, closes = 0
  for (const ch of src) {
    if (ch === '(') opens++
    else if (ch === ')') closes++
  }
  return { opens, closes }
}

function countBrackets(src: string): { opens: number; closes: number } {
  let opens = 0, closes = 0
  for (const ch of src) {
    if (ch === '{') opens++
    else if (ch === '}') closes++
  }
  return { opens, closes }
}

function hasAnsiLeakage(src: string): boolean {
  return /\x1b\[[\d;]*m/.test(src) || /\\u001b/.test(src)
}

function hasDuplicateDefaultExport(src: string): boolean {
  const matches = src.match(/^export\s+default\s+/gm)
  return (matches?.length ?? 0) > 1
}

function hasOddBackticks(src: string): boolean {
  // Count unescaped backticks
  let count = 0
  let i = 0
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue }
    if (src[i] === '`') count++
    i++
  }
  return count % 2 !== 0
}

function hasNonAsciiCharacters(src: string): boolean {
  // Detect garbled multi-byte sequences that indicate encoding corruption
  return /[\x80-\x9F]/.test(src) || /\xc3[\x82-\xbf]/.test(src)
}

function hasMissingReactImport(src: string): boolean {
  const hasJsx = /<[A-Z][a-zA-Z]*[\s/>]/.test(src) || /<[a-z]+[\s>]/.test(src)
  const hasImport = /import React/.test(src) || /from ['"]react['"]/.test(src)
  return hasJsx && !hasImport
}

// ── Auto-fixers ───────────────────────────────────────────────────────────────
function fixAnsiLeakage(src: string): string {
  return src.replace(/\x1b\[[\d;]*m/g, '').replace(/\\u001b\[[\d;]*m/g, '')
}

function fixNonAscii(src: string): string {
  // Remove byte sequences that indicate Windows-1252 decoded as UTF-8
  return src.replace(/[\x80-\x9F]/g, '').replace(/\xc3[\x82-\xbf]/g, '')
}

function fixMissingReactImport(src: string): string {
  if (hasMissingReactImport(src) && !src.includes("import React")) {
    return "import React from 'react';\n" + src
  }
  return src
}

// ── Safe stub for unrecoverable files ─────────────────────────────────────────
function makeSafeStub(path: string): string {
  const name = path.split('/').pop()?.replace(/\.tsx?$/, '') ?? 'Page'
  const safe = name.replace(/[^a-zA-Z0-9]/g, '')
  return `import React from 'react';\nexport default function ${safe}(){\n  return <div style={{padding:'32px',color:'#e2e8f0',fontFamily:'system-ui'}}><h2 style={{margin:0}}>${name}</h2><p style={{color:'#64748b',marginTop:'8px'}}>Content loading...</p></div>;\n}`
}

// ── Main SuperAgent ──────────────────────────────────────────────────────────
export async function runSuperAgent(
  files: GeneratedFile[],
  onStatus: (msg: string) => void
): Promise<{ files: GeneratedFile[]; result: SuperAgentResult }> {
  onStatus('SuperAgent: Running pre-flight validation...')

  const errors: SuperAgentResult['errors'] = []
  const warnings: SuperAgentResult['warnings'] = []
  const outputFiles: GeneratedFile[] = []

  for (const file of files) {
    if (!file.path.match(/\.(tsx?|jsx?)$/)) {
      outputFiles.push(file)
      continue
    }

    let src = file.content
    let changed = false

    // 1. ANSI leakage
    if (hasAnsiLeakage(src)) {
      src = fixAnsiLeakage(src)
      errors.push({ file: file.path, issue: 'ANSI escape codes leaked into source', fixed: true })
      changed = true
    }

    // 2. Non-ASCII encoding corruption
    if (hasNonAsciiCharacters(src)) {
      src = fixNonAscii(src)
      errors.push({ file: file.path, issue: 'Non-ASCII encoding corruption detected', fixed: true })
      changed = true
    }

    // 3. Missing React import (JSX without import)
    if (hasMissingReactImport(src)) {
      src = fixMissingReactImport(src)
      errors.push({ file: file.path, issue: 'Missing React import for JSX', fixed: true })
      changed = true
    }

    // 4. Duplicate default exports
    if (hasDuplicateDefaultExport(src)) {
      // Replace all but the last export default
      let count = 0
      const matches = (src.match(/^export\s+default\s+/gm) || []).length
      src = src.replace(/^export\s+default\s+/gm, (m) => {
        count++
        return count < matches ? '// [SuperAgent removed duplicate] ' : m
      })
      errors.push({ file: file.path, issue: 'Duplicate export default statements', fixed: true })
      changed = true
    }

    // 5. Unbalanced parentheses (critical - use stub)
    const parens = checkBalance(src)
    if (Math.abs(parens.opens - parens.closes) > 3) {
      errors.push({ file: file.path, issue: `Unbalanced parens: ${parens.opens} open vs ${parens.closes} close`, fixed: false })
      outputFiles.push({ path: file.path, content: makeSafeStub(file.path) })
      onStatus(`SuperAgent: Stubbed ${file.path.split('/').pop()} (unbalanced parens)`)
      continue
    }

    // 6. Unbalanced braces (critical - use stub)
    const braces = countBrackets(src)
    if (Math.abs(braces.opens - braces.closes) > 4) {
      errors.push({ file: file.path, issue: `Unbalanced braces: ${braces.opens} open vs ${braces.closes} close`, fixed: false })
      outputFiles.push({ path: file.path, content: makeSafeStub(file.path) })
      onStatus(`SuperAgent: Stubbed ${file.path.split('/').pop()} (unbalanced braces)`)
      continue
    }

    // 7. Odd backtick count (unclosed template literal)
    if (hasOddBackticks(src)) {
      warnings.push({ file: file.path, issue: 'Odd number of backticks (possible unclosed template literal)' })
    }

    // 8. Empty file
    if (src.trim().length < 20) {
      errors.push({ file: file.path, issue: 'File is effectively empty', fixed: false })
      outputFiles.push({ path: file.path, content: makeSafeStub(file.path) })
      continue
    }

    outputFiles.push({ path: file.path, content: changed ? src : file.content })
  }

  const errorCount = errors.filter(e => !e.fixed).length
  const fixedCount = errors.filter(e => e.fixed).length

  const summary = errors.length === 0 && warnings.length === 0
    ? `All ${files.length} files passed validation.`
    : `Checked ${files.length} files: ${fixedCount} auto-fixed, ${errorCount} stubbed, ${warnings.length} warnings.`

  onStatus(`SuperAgent: ${summary}`)

  return {
    files: outputFiles,
    result: {
      passed: errorCount === 0,
      filesChecked: files.length,
      errors,
      warnings,
      summary,
    }
  }
}
