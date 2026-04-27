import re

with open('src/pages/ProjectDetailPage.tsx', encoding='utf-8') as f:
    c = f.read()

# Fix any remaining garbled toast strings by replacing non-ASCII chars in toast calls
# with clean text equivalents
fixes = [
    # Live preview deploy toast
    (r"toast\.success\(`[^\x00-\x7F]+\s*Live:\s*\$\{vercelRes\.url\}`", 
     "toast.success(`Live: ${vercelRes.url}`"),
    # Build full app success toast  
    (r"toast\.success\(`[^\x00-\x7F]+\s*App deployed!\$\{repairMsg\}`\)",
     "toast.success(`Deployed successfully!${repairMsg}`)"),
    # Build full app success toast variant (already partially fixed)
    (r"toast\.success\(`Deployed successfully!\$\{repairMsg\}`\)",
     "toast.success(`Deployed successfully!${repairMsg}`)"),
]

for pattern, replacement in fixes:
    c, n = re.subn(pattern, replacement, c)
    if n:
        print(f"Fixed {n} match(es) for pattern: {pattern[:50]}")

# Generic fallback: strip non-ASCII from ALL toast string arguments
def strip_nonascii_from_toast(m):
    s = m.group(0)
    # Replace runs of non-ASCII chars with empty string
    s = re.sub(r'[\x80-\xff]+', '', s)
    return s

c, n = re.subn(r"toast\.(success|error|loading)\([^)]{1,400}\)", strip_nonascii_from_toast, c)
print(f"Generic pass fixed {n} toast calls")

# Fix buildAgent and orchestrator too
for fname in ['src/lib/agents/buildAgent.ts', 'src/lib/agents/orchestrator.ts']:
    try:
        with open(fname, encoding='utf-8') as f:
            fc = f.read()
        fc_fixed = re.sub(r'[\x80-\xff]+', '', fc)
        if fc_fixed != fc:
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(fc_fixed)
            print(f"Fixed non-ASCII in {fname}")
    except Exception as e:
        print(f"Skipped {fname}: {e}")

with open('src/pages/ProjectDetailPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('All done.')
