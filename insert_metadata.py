from pathlib import Path
path = Path('server/services/aiProblemService.js')
text = path.read_text(encoding='utf-8')

def ensure_metadata_block(text, func_name):
    start = text.find(f'async {func_name}')
    if start == -1:
        raise SystemExit(f'{func_name} function not found')
    next_func = text.find('async ', start + 10)
    if next_func == -1:
        next_func = len(text)
    target = text.find('if (results.length < count)', start, next_func)
    if target == -1:
        raise SystemExit(f'if block not found in {func_name}')
    segment = text[start:target]
    if 'documentTitle: docTitle' in segment:
        return text
    metadata_block = "    const passageCount = passages.length || 1;\n    results.forEach((problem, index) => {\n      problem.metadata = {\n        ...(problem.metadata || {}),\n        documentTitle: docTitle,\n        generator: problem.metadata?.generator || 'openai',\n        passageIndex: (index % passageCount) + 1\n      };\n      problem.sourceLabel = ensureSourceLabel(problem.sourceLabel, { docTitle });\n    });\n\n"
    return text[:target] + metadata_block + text[target:]

for func in ['generateBlank', 'generateVocab', 'generateTitle', 'generateTheme']:
    text = ensure_metadata_block(text, func)

path.write_text(text, encoding='utf-8')
