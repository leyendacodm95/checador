import os
import re

def fix_reportes():
    path = "src/components/reportes/ReportesView.jsx"
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()

    # We want to change the Y positions in ReportesView.jsx
    # Original:
    # doc.rect(0, 0, 210, 36, 'F');
    # doc.addImage(logoBase64, 'PNG', 12, 5, 26, 26);
    # doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);
    # doc.text('CCT: 18DPR0087R', 42, 21);
    # doc.text('...', 42, 26);
    
    # Let's adjust using regex substitution for all matching occurrences.
    # We will decrease logo size to 18x18, increase header to 28, shift Ys.
    
    # 1. Update rect height from 36 to 28 (wait, 36 is larger, maybe we keep it 36 but adjust text)
    # The user says: "reduce el tamaño del logo y ajusta su posición" and "acomoda en líneas limpias".
    # Let's just adjust the text Y coordinates and logo size in the pattern block.

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
    
    c = re.sub(
        r"doc\.text\('([^']+)',\s*42,\s*26\);",
        r"doc.text('\1', 42, 26);",
        c
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

def fix_calendario():
    path = "src/components/calendario/CalendarioSepView.jsx"
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()

    c = c.replace("doc.rect(0, 0, 210, 26, 'F');", "doc.rect(0, 0, 210, 28, 'F');")
    c = c.replace("doc.addImage(logoBase64, 'PNG', 12, 3, 20, 20);", "doc.addImage(logoBase64, 'PNG', 12, 4, 18, 18);")
    c = c.replace("doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 12", "doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 10")
    c = c.replace("doc.text('CCT: 18DPR0087R', 115, 17", "doc.text('CCT: 18DPR0087R', 115, 16")
    c = c.replace("doc.text('CALENDARIO ESCOLAR OFICIAL SEP DE EDUCACIÓN BÁSICA — 2026-2027', 115, 18", "doc.text('CALENDARIO ESCOLAR OFICIAL SEP DE EDUCACIÓN BÁSICA — 2026-2027', 115, 22")
    c = c.replace("doc.text(`Ciclo Escolar:", "doc.text(`Ciclo Escolar:") # just to be safe

    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

def fix_credenciales_alumno():
    path = "src/components/alumno/AlumnoPortalView.jsx"
    if not os.path.exists(path): return
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()

    # Add CCT to the credencial PDF if it generates it here
    if "doc.text('ESCUELA PRIMARIA', 42.5, 16" in c:
        c = c.replace("doc.text('ESCUELA PRIMARIA', 42.5, 16", "doc.text('ESCUELA PRIMARIA', 42.5, 14")
        c = c.replace("doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 20", "doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 18")
        # Insert CCT
        c = re.sub(
            r"doc\.text\('Sor Juana Inés de la Cruz T\.V', 42\.5, 18, \{ align: 'center' \}\);",
            r"doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 18, { align: 'center' });\n      doc.setFontSize(8);\n      doc.text('CCT: 18DPR0087R', 42.5, 22, { align: 'center' });",
            c
        )
        c = c.replace("doc.addImage(logoBase64, 'PNG', 32.5, 25, 20, 20);", "doc.addImage(logoBase64, 'PNG', 32.5, 26, 18, 18);")

    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

def fix_credenciales_docente():
    paths = [
        "src/components/docente/DocentePortalView.jsx",
        "src/components/director/DirectivoPortalView.jsx"
    ]
    for path in paths:
        if not os.path.exists(path): continue
        with open(path, "r", encoding="utf-8") as f:
            c = f.read()
        
        c = c.replace("doc.text('ESCUELA PRIMARIA', 42.5, 16", "doc.text('ESCUELA PRIMARIA', 42.5, 14")
        c = c.replace("doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 20", "doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 18")
        if "CCT:" not in c:
            c = re.sub(
                r"doc\.text\('Sor Juana Inés de la Cruz T\.V', 42\.5, 18, \{ align: 'center' \}\);",
                r"doc.text('Sor Juana Inés de la Cruz T.V', 42.5, 18, { align: 'center' });\n      doc.setFontSize(8);\n      doc.text('CCT: 18DPR0087R', 42.5, 22, { align: 'center' });",
                c
            )
        c = c.replace("doc.addImage(logoBase64, 'PNG', 32.5, 25, 20, 20);", "doc.addImage(logoBase64, 'PNG', 32.5, 26, 18, 18);")
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(c)

fix_reportes()
fix_calendario()
fix_credenciales_alumno()
fix_credenciales_docente()

print("PDFs fixed")
