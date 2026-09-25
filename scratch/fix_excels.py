import os
import re

excel_files = [
    'src/components/reportes/ReportesView.jsx',
    'src/components/calendario/CalendarioSepView.jsx',
    'src/components/director/GroupedAttendanceView.jsx',
    'src/components/alumno/AlumnoPortalView.jsx',
    'generate_excel_script.cjs',
    'generate_excel_script.js'
]

for filepath in excel_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Group 1: General components
        # Find block starting with titleCell.value = 'ESCUELA PRIMARIA...
        # and replace with the new structure.

        # ReportesView (lines 389, 581, 759)
        content = content.replace(
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:G3');
      const subtitleCell = worksheet.getCell('B3');""",
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:G3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:G4');
      const subtitleCell = worksheet.getCell('B4');""")

        # GroupedAttendanceView (line 421)
        content = content.replace(
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:I3');
      const subtitleCell = worksheet.getCell('B3');""",
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:I3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:I4');
      const subtitleCell = worksheet.getCell('B4');""")

        # AlumnoPortalView (line 382)
        content = content.replace(
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:H3');
      const subtitleCell = worksheet.getCell('B3');""",
"""      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:H3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:H4');
      const subtitleCell = worksheet.getCell('B4');""")

        # CalendarioSepView (line 722)
        content = content.replace(
"""    titleCell.value = '   ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A3:F3');
    const subtitleCell = worksheet.getCell('A3');""",
"""    titleCell.value = '   ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A3:F3');
    const cctCell = worksheet.getCell('A3');
    cctCell.value = 'CCT: 18DPR0087R';
    cctCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '1E3A8A' } };
    cctCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells('A4:F4');
    const subtitleCell = worksheet.getCell('A4');""")

        # generate_excel_script.js / cjs
        content = content.replace(
"""  titleCell.value = '        ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V (CCT: 18DPR0087R)';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('B3:H3');
  const subtitleCell = worksheet.getCell('B3');""",
"""  titleCell.value = '        ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('B3:H3');
  const cctCell = worksheet.getCell('B3');
  cctCell.value = '        CCT: 18DPR0087R';
  cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
  cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('B4:H4');
  const subtitleCell = worksheet.getCell('B4');""")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

# Fix LoginView issues that weren't captured properly
for filepath in ['src/components/auth/LoginView.jsx', 'src/components/auth/LoginViewPreview.jsx']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The issue might be leading spaces or exact match
    # Use regex to find Sor Juana Inés de la Cruz T.V and add CCT
    if "CCT: 18DPR0087R" not in content:
        content = re.sub(
            r'(<span className="font-outfit font-extrabold text-lg md:text-xl tracking-tight text-white leading-tight">\s*Sor Juana Inés de la Cruz T\.V\s*</span>)',
            r'\1\n            <span className="text-[11px] text-blue-200 mt-1 block">CCT: 18DPR0087R</span>',
            content
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done fixing excels and login")
