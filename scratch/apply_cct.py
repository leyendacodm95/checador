import os
import re

files_to_check = [
    'src/components/auth/LoginView.jsx',
    'src/components/auth/LoginViewPreview.jsx',
    'src/components/qr/QRScannerView.jsx',
]

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Login view header
    content = content.replace(
        '<span className="font-outfit font-extrabold text-lg md:text-xl tracking-tight text-white leading-tight">\n              Sor Juana Inés de la Cruz T.V\n            </span>',
        '<span className="font-outfit font-extrabold text-lg md:text-xl tracking-tight text-white leading-tight">\n              Sor Juana Inés de la Cruz T.V\n            </span>\n            <span className="text-[11px] text-blue-200 mt-1 block">CCT: 18DPR0087R</span>'
    )
    
    # QR scanner header
    content = content.replace(
        '⚡ Pase de lista automático para alumnos y docentes de la Primaria Sor Juana Inés de la Cruz.',
        '⚡ Pase de lista automático para alumnos y docentes de la Primaria Sor Juana Inés de la Cruz (CCT: 18DPR0087R).'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

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
        
        # Add CCT to standard doc.text calls
        content = content.replace("doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);", "doc.text('Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 26, 13);")
        content = content.replace("doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);", "doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 42, 16);")
        content = content.replace("doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 12, { align: 'center' });", "doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)', 115, 12, { align: 'center' });")
        
        # Update excel generation strings
        content = content.replace("titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';", "titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';")
        content = content.replace("titleCell.value = '   ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';", "titleCell.value = '   ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';")
        
        # Update text strings
        content = content.replace("Escuela Primaria Sor Juana Inés de la Cruz T.V", "Escuela Primaria Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)")
        content = content.replace("Escuela Primaria Sor Juana Inés de la Cruz.", "Escuela Primaria Sor Juana Inés de la Cruz (CCT: 18DPR0087R).")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# Update the bat and js excel generators
other_files = [
    'generate_excel_script.cjs',
    'generate_excel_script.js',
]

for filepath in other_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace("titleCell.value = '        ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';", "titleCell.value = '        ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Done")
