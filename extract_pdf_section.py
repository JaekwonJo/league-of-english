# -*- coding: utf-8 -*-
from pathlib import Path
from pdfminer.high_level import extract_text
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = next(p for p in Path(r"C:\Users\jaekw\Documents").glob('**/*.pdf') if 'LOE_고1_2025_09월(인천시)-읽기영역(18~45번).pdf' in p.name)
text = extract_text(str(path))
start = text.find('16. p7-no.37')
print(text[start:start+500])
