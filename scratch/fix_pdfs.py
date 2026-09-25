import os

pdf_files = [
    'src/components/alumnos/StudentQRModal.jsx',
    'src/components/director/TeacherQRModal.jsx',
    'src/components/director/DirectivoPortalView.jsx',
    'src/components/docente/DocentePortalView.jsx',
    'src/components/alumno/AlumnoPortalView.jsx',
    'src/components/reportes/ReportesView.jsx',
    'src/components/calendario/CalendarioSepView.jsx',
    'src/components/director/GroupedAttendanceView.jsx'
]

for filepath in pdf_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Student / Teacher / Directivo / Docente / Alumno Modals
        content = content.replace("doc.text('Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 26, 13);", 
"""doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 26, 17);""")

        # ReportesView / GroupedAttendanceView
        content = content.replace("doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 42, 16);",
"""doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 42, 21);""")
        
        # CalendarioSepView
        content = content.replace("doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 115, 12, { align: 'center' });",
"""doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CCT: 18DPR0087R', 115, 17, { align: 'center' });""")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Done fixing PDFs")
