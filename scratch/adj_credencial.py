import os

pdf_files = [
    'src/components/alumnos/StudentQRModal.jsx',
    'src/components/director/TeacherQRModal.jsx',
    'src/components/director/DirectivoPortalView.jsx',
    'src/components/docente/DocentePortalView.jsx',
    'src/components/alumno/AlumnoPortalView.jsx'
]

# We need to shift CREDENCIAL down.
# Let's just do a blanket regex search for:
# doc.text('CREDENCIAL ESTUDIANTIL DIGITAL', 26, 18) -> 26, 21
# doc.text('CREDENCIAL DOCENTE DIGITAL', 26, 18) -> 26, 21
# doc.text('CREDENCIAL OFICIAL DIRECTIVA', 26, 18) -> 26, 21

for filepath in pdf_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content = content.replace("doc.text('CREDENCIAL ESTUDIANTIL DIGITAL', 26, 18);", "doc.text('CREDENCIAL ESTUDIANTIL DIGITAL', 26, 21);")
        content = content.replace("doc.text('CREDENCIAL DOCENTE DIGITAL', 26, 18);", "doc.text('CREDENCIAL DOCENTE DIGITAL', 26, 21);")
        content = content.replace("doc.text('CREDENCIAL OFICIAL DIRECTIVA', 26, 18);", "doc.text('CREDENCIAL OFICIAL DIRECTIVA', 26, 21);")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Done adjusting credentials position")
