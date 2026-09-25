import os

pdf_files = [
    'src/components/reportes/ReportesView.jsx',
    'src/components/director/GroupedAttendanceView.jsx',
    'src/components/alumno/AlumnoPortalView.jsx'
]

# ReportesView lines
for filepath in pdf_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # In ReportesView: `Sistema Checador - Reporte de Asistencia ${type.toUpperCase()}`, 42, 24
        # Change to 42, 26
        content = content.replace(", 42, 24);", ", 42, 26);")
        
        # In CalendarioSepView: doc.text('Calendario Escolar Oficial', 115, 17, { align: 'center' });
        # But we added CCT at 17, so push 'Calendario Escolar Oficial' to 22.
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# CalendarioSepView.jsx
cal_file = 'src/components/calendario/CalendarioSepView.jsx'
if os.path.exists(cal_file):
    with open(cal_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # In CalendarioSepView.jsx
    # doc.setFontSize(9);
    # doc.setFont('helvetica', 'normal');
    # doc.text('Calendario Escolar Oficial', 115, 17, { align: 'center' });
    # 17 -> 22
    content = content.replace("doc.text('Calendario Escolar Oficial', 115, 17", "doc.text('Calendario Escolar Oficial', 115, 22")
    
    with open(cal_file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done adjusting layout in other PDFs")
