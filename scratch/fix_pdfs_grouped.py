import os
import re

def fix_grouped():
    path = "src/components/director/GroupedAttendanceView.jsx"
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()

    c = re.sub(
        r"doc\.addImage\(logoBase64,\s*'PNG',\s*12,\s*5,\s*26,\s*26\);",
        r"doc.addImage(logoBase64, 'PNG', 12, 5, 20, 20);",
        c
    )
    
    c = re.sub(
        r"doc\.text\('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T\.V',\s*42,\s*16\);",
        r"doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 14);",
        c
    )
    
    c = re.sub(
        r"doc\.text\('CCT: 18DPR0087R',\s*42,\s*21\);",
        r"doc.text('CCT: 18DPR0087R', 42, 20);",
        c
    )
    
    # The subtitle line in GroupedAttendanceView has a template literal
    # \`Sistema Checador - Registros del Día / Historial (${getPeriodText()})\`, 42, 26
    c = re.sub(
        r"doc\.text\(`Sistema Checador - Registros del Día / Historial \(\$\{getPeriodText\(\)\}\)`,\s*42,\s*26\);",
        r"doc.text(`Sistema Checador - Registros del Día / Historial (${getPeriodText()})`, 42, 26);",
        c
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

fix_grouped()
print("Done")
