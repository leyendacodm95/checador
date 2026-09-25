import os

def fix_file(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Login forms
    content = content.replace(
        '<span className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 block font-bold">CCT: 18DPR0087R</span>',
        '<span className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5 block font-bold">CCT: 18DPR0087R</span>'
    )
    
    # 1. Fix Student/Teacher Modals & Portal views
    target1 = "doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);"
    rep1 = """doc.text('Sor Juana Inés de la Cruz T.V', 26, 13);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 26, 17);"""
    if target1 in content and "doc.text('CCT: 18DPR0087R', 26, 17);" not in content:
        content = content.replace(target1, rep1)
    
    # 2. Fix ReportesView / AlumnoPortalView
    target2 = "doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);"
    rep2 = """doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 42, 16);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('CCT: 18DPR0087R', 42, 21);"""
    if target2 in content and "doc.text('CCT: 18DPR0087R', 42, 21);" not in content:
        content = content.replace(target2, rep2)
    
    # 3. Fix CalendarioSepView
    target3 = "doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 12, { align: 'center' });"
    rep3 = """doc.text('ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V', 115, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('CCT: 18DPR0087R', 115, 17, { align: 'center' });"""
    if target3 in content and "doc.text('CCT: 18DPR0087R', 115, 17" not in content:
        content = content.replace(target3, rep3)
        
    # Now fix the Excel JS cells. Since my previous script failed to match on some files, I will use regex.
    import re
    # Match: titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
    # or titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
    # Replace it with splitting into B3/B4
    # Wait, instead of complex regex, let's just do it directly.
    
    if "titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';" in content:
        content = content.replace(
            "titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';",
            "titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';"
        )

    # Some of them are already replaced by fix_excels.py but let's check
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    'src/components/alumnos/StudentQRModal.jsx',
    'src/components/director/TeacherQRModal.jsx',
    'src/components/director/DirectivoPortalView.jsx',
    'src/components/docente/DocentePortalView.jsx',
    'src/components/alumno/AlumnoPortalView.jsx',
    'src/components/reportes/ReportesView.jsx',
    'src/components/calendario/CalendarioSepView.jsx',
    'src/components/director/GroupedAttendanceView.jsx',
    'src/components/auth/LoginView.jsx',
    'src/components/auth/LoginViewPreview.jsx'
]

for f in files: fix_file(f)

# Also fix the ExcelJS structure forcefully
def fix_exceljs(filepath):
    if not os.path.exists(filepath): return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # In AlumnoPortalView.jsx
    if 'worksheet.mergeCells(\'B3:H3\');\n      const subtitleCell = worksheet.getCell(\'B3\');' in content:
        content = content.replace(
            'worksheet.mergeCells(\'B3:H3\');\n      const subtitleCell = worksheet.getCell(\'B3\');',
            """worksheet.mergeCells('B3:H3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:H4');
      const subtitleCell = worksheet.getCell('B4');"""
        )

    # In ReportesView.jsx
    if 'worksheet.mergeCells(\'B3:G3\');\n      const subtitleCell = worksheet.getCell(\'B3\');' in content:
        content = content.replace(
            'worksheet.mergeCells(\'B3:G3\');\n      const subtitleCell = worksheet.getCell(\'B3\');',
            """worksheet.mergeCells('B3:G3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:G4');
      const subtitleCell = worksheet.getCell('B4');"""
        )

    # In CalendarioSepView.jsx
    if 'worksheet.mergeCells(\'A3:F3\');\n    const subtitleCell = worksheet.getCell(\'A3\');' in content:
        content = content.replace(
            'worksheet.mergeCells(\'A3:F3\');\n    const subtitleCell = worksheet.getCell(\'A3\');',
            """worksheet.mergeCells('A3:F3');
    const cctCell = worksheet.getCell('A3');
    cctCell.value = 'CCT: 18DPR0087R';
    cctCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
    cctCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A4:F4');
    const subtitleCell = worksheet.getCell('A4');"""
        )

    # In GroupedAttendanceView.jsx
    if 'worksheet.mergeCells(\'B3:I3\');\n      const subtitleCell = worksheet.getCell(\'B3\');' in content:
        content = content.replace(
            'worksheet.mergeCells(\'B3:I3\');\n      const subtitleCell = worksheet.getCell(\'B3\');',
            """worksheet.mergeCells('B3:I3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:I4');
      const subtitleCell = worksheet.getCell('B4');"""
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for f in files: fix_exceljs(f)
print("Done fixing all files forcefully")
