from pathlib import Path
text = Path('server/services/aiProblemService.js').read_text(encoding='utf-8')
needle = 'const passageCount = passages.length || 1;'
indices = []
start = 0
while True:
    pos = text.find(needle, start)
    if pos == -1:
        break
    indices.append(pos)
    start = pos + 1
print(indices)
