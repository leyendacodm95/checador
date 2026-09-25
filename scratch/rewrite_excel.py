import os

file_path = "src/components/reportes/ReportesView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "  // 2. Generate Attendance Excel"
end_marker = "  // 3. Generate Justifications PDF"

if start_marker in content and end_marker in content:
    before = content.split(start_marker)[0]
    after = content.split(end_marker)[1]
    
    new_func = """  // 2. Generate Attendance Excel (Trimestral) using ExcelJS
  const generateAttendanceExcel = async (reportType) => {
    setGenerating(`excel-${reportType}`);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Trimestral');

      worksheet.columns = [
        { key: 'nombre', width: 40 },
        { key: 'grupo', width: 15 },
        { key: 'diasTotales', width: 15 },
        { key: 'asistencias', width: 22 },
        { key: 'faltas', width: 15 },
        { key: 'porcentaje', width: 15 }
      ];

      const logoBase64 = await getBase64ImageFromUrl(schoolLogo);
      if (logoBase64) {
        const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
        worksheet.addImage(imageId, { tl: { col: 0.1, row: 0.2 }, ext: { width: 55, height: 55 } });
      }

      worksheet.mergeCells('B2:F2');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'ESCUELA PRIMARIA Sor Juana Inés de la Cruz T.V';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B3:F3');
      const cctCell = worksheet.getCell('B3');
      cctCell.value = 'CCT: 18DPR0087R';
      cctCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
      cctCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('B4:F4');
      const subtitleCell = worksheet.getCell('B4');
      subtitleCell.value = `Reporte Trimestral de Asistencia por Excepción`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.addRow([]);
      worksheet.addRow([]);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90);

      let schoolDays = 0;
      let d = new Date(startDate);
      while (d <= endDate) {
        if (d.getDay() !== 0 && d.getDay() !== 6) schoolDays++;
        d.setDate(d.getDate() + 1);
      }

      const isTeacherReport = reportType === 'docentes_grupo';
      const targetGroupText = isTeacherReport ? 'Plantilla Docente' : (isDocente ? `Grupo ${docenteGroup}` : 'Todos los Grupos');

      const infoRow1 = worksheet.addRow(['Alcance:', targetGroupText, '', '', '']);
      infoRow1.getCell(1).font = { bold: true };

      const infoRow2 = worksheet.addRow(['Periodo:', `${startDate.toLocaleDateString('es-MX')} al ${endDate.toLocaleDateString('es-MX')}`, '', 'Días Hábiles:', schoolDays]);
      infoRow2.getCell(1).font = { bold: true };
      infoRow2.getCell(4).font = { bold: true };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Nombre Completo', isTeacherReport ? 'Asignación' : 'Grupo', 'Días Totales', 'Asistencias (Excepción)', 'Faltas', 'Porcentaje']);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: 'thin', color: { argb: 'CBD5E1' } }, left: { style: 'thin', color: { argb: 'CBD5E1' } }, bottom: { style: 'thin', color: { argb: 'CBD5E1' } }, right: { style: 'thin', color: { argb: 'CBD5E1' } } };
      });

      const addDataRow = (nombre, grupo, dias, asistencias, faltas, porcentaje) => {
        const row = worksheet.addRow([nombre, grupo, dias, asistencias, faltas, porcentaje]);
        row.height = 20;
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        
        row.getCell(4).font = { bold: true, color: { argb: '047857' } }; // green
        row.getCell(5).font = { bold: true, color: { argb: 'B91C1C' } }; // red
        row.getCell(6).font = { bold: true };

        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin', color: { argb: 'E2E8F0' } }, left: { style: 'thin', color: { argb: 'E2E8F0' } }, bottom: { style: 'thin', color: { argb: 'E2E8F0' } }, right: { style: 'thin', color: { argb: 'E2E8F0' } } };
        });
      };

      if (isTeacherReport) {
         const teacherList = Object.values(teachers || {});
         teacherList.forEach(t => {
           let absences = 0;
           logs.forEach(log => {
             if (log.tipoPersona !== 'Alumno' && (String(log.person?.id) === String(t.id) || String(log.person?.qrCode) === String(t.matricula))) {
               const logDate = new Date(log.fecha.includes('-') ? log.fecha + 'T12:00:00' : log.fecha.split('/').reverse().join('-') + 'T12:00:00');
               if (logDate >= startDate && logDate <= endDate && (log.estado === 'AUSENTE' || !log.estado)) {
                 absences++;
               }
             }
           });
           const asistencias = Math.max(0, schoolDays - absences);
           const percentage = ((asistencias / schoolDays) * 100).toFixed(1) + '%';
           addDataRow(t.nombre || t.username || 'Docente', t.grupo || 'N/A', schoolDays, asistencias, absences, percentage);
         });
      } else {
         filteredStudents.forEach(s => {
           let absences = 0;
           logs.forEach(log => {
             if ((log.tipoPersona === 'Alumno' || log.student) && String(log.student?.id || log.person?.id) === String(s.id)) {
               const logDate = new Date(log.fecha.includes('-') ? log.fecha + 'T12:00:00' : log.fecha.split('/').reverse().join('-') + 'T12:00:00');
               if (logDate >= startDate && logDate <= endDate && (log.estado === 'AUSENTE' || !log.estado)) {
                 absences++;
               }
             }
           });
           const asistencias = Math.max(0, schoolDays - absences);
           const percentage = ((asistencias / schoolDays) * 100).toFixed(1) + '%';
           addDataRow(s.nombre, `${s.grado}-${s.grupo}`, schoolDays, asistencias, absences, percentage);
         });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Trimestral_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
    } catch (e) {
      console.error('Error generando Excel:', e);
      alert('Error al generar archivo Excel.');
    } finally {
      setGenerating(null);
    }
  };

"""
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(before + new_func + "  // 3. Generate Justifications PDF" + after)
    print("Done rewriting")
else:
    print("Markers not found")
