import os

filepath = 'src/components/director/DocentesView.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleRemoveTeacher
old_handle = """  const handleRemoveTeacher = async (item) => {
    if (!item) return;
    if (window.confirm(`¿Quitar al docente ${item.nombre} de este salón? Pasará a la lista de docentes sin asignar.`)) {
      // If it is titular, reset group roster slot
      if (item.tipoDocente === 'Titular') {
        onUpdateTeacher(item.key, {
          nombre: 'Sin docente asignado',
          observaciones: '—'
        });
      }
      // If it is a user account, clear group and type in Firestore
      if (item.username) {
        await updateUserGroupAndType(item.username, '', '');
      }
    }
  };"""

new_handle = """  const handleRemoveTeacher = async (item) => {
    if (!item) return;
    setPendingAction({
      message: `¿Quitar al docente ${item.nombre} de este salón? Pasará a la lista de docentes sin asignar.`,
      action: async () => {
        if (item.tipoDocente === 'Titular') {
          onUpdateTeacher(item.key, { nombre: 'Sin docente asignado', observaciones: '—' });
        }
        if (item.username) {
          await updateUserGroupAndType(item.username, '', '');
        }
      }
    });
  };"""
content = content.replace(old_handle, new_handle)

# Replace Modal "Quitar del Salon Actual"
old_quitar_salon = """onClick={async () => {
                      if (window.confirm(`¿Estás seguro de quitar la asignación de ${selectedTeacherToMove.nombre}?`)) {
                        try {
                          if (selectedTeacherToMove.tipoDocente === 'Titular') {
                            onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                          }
                          if (selectedTeacherToMove.username) {
                            await updateUserGroupAndType(selectedTeacherToMove.username, '', '');
                          }
                          setShowReassignModal(false);
                          setSelectedTeacherToMove(null);
                        } catch (err) {
                          alert('Error al quitar asignación: ' + err.message);
                        }
                      }
                    }}"""

new_quitar_salon = """onClick={() => {
                      setPendingAction({
                        message: `¿Estás seguro de quitar la asignación de ${selectedTeacherToMove.nombre}?`,
                        action: async () => {
                          try {
                            if (selectedTeacherToMove.tipoDocente === 'Titular') {
                              onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                            }
                            if (selectedTeacherToMove.username) {
                              await updateUserGroupAndType(selectedTeacherToMove.username, '', '');
                            }
                            setShowReassignModal(false);
                            setSelectedTeacherToMove(null);
                          } catch (err) {
                            alert('Error al quitar asignación: ' + err.message);
                          }
                        }
                      });
                    }}"""
content = content.replace(old_quitar_salon, new_quitar_salon)

# Replace "Asignar Titular"
old_asignar_titular = """onClick={async () => {
                            if (!selectedTeacherToMove) return;
                            if (window.confirm(`¿Asignar a ${selectedTeacherToMove.nombre} como Titular en el salón ${targetGrpKey}?`)) {
                              try {
                                // 1. Remove the target's current titular (if any) to avoid ghost assignments
                                const currentTitularUser = (users || []).find(u => 
                                  u.assignedGroup === targetGrpKey && u.tipoDocente === 'Titular' &&
                                  ['docente', 'docenta', 'usaer'].includes((u.role || u.baseRole || '').toLowerCase().trim())
                                );
                                if (currentTitularUser && currentTitularUser.username !== selectedTeacherToMove.username) {
                                  await updateUserGroupAndType(currentTitularUser.username, '', '');
                                }

                                // 2. If the moving teacher is currently a Titular somewhere else, clear that classroom's display
                                if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                  onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                }

                                // 3. Set the new Titular in the target classroom display
                                onUpdateTeacher(targetGrpKey, {
                                  nombre: selectedTeacherToMove.nombre,
                                  email: selectedTeacherToMove.email || '',
                                  matricula: selectedTeacherToMove.qrCode || '',
                                  observaciones: `Docente Titular de ${targetGrpKey}`,
                                  retardosAcumulados: selectedTeacherToMove.retardosAcumulados || 0
                                });

                                // 4. Update the user account in Firebase
                                if (selectedTeacherToMove.username) {
                                  await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, 'Titular');
                                }

                                setShowReassignModal(false);
                                setSelectedTeacherToMove(null);
                              } catch (err) {
                                console.error('Error in Asignar Titular:', err);
                                alert('Error al asignar docente: ' + err.message);
                              }
                            }
                          }}"""

new_asignar_titular = """onClick={() => {
                            if (!selectedTeacherToMove) return;
                            setPendingAction({
                              message: `¿Asignar a ${selectedTeacherToMove.nombre} como Titular en el salón ${targetGrpKey}?`,
                              action: async () => {
                                try {
                                  const currentTitularUser = (users || []).find(u => 
                                    u.assignedGroup === targetGrpKey && u.tipoDocente === 'Titular' &&
                                    ['docente', 'docenta', 'usaer'].includes((u.role || u.baseRole || '').toLowerCase().trim())
                                  );
                                  if (currentTitularUser && currentTitularUser.username !== selectedTeacherToMove.username) {
                                    await updateUserGroupAndType(currentTitularUser.username, '', '');
                                  }

                                  if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                    onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                  }

                                  onUpdateTeacher(targetGrpKey, {
                                    nombre: selectedTeacherToMove.nombre,
                                    email: selectedTeacherToMove.email || '',
                                    matricula: selectedTeacherToMove.qrCode || '',
                                    observaciones: `Docente Titular de ${targetGrpKey}`,
                                    retardosAcumulados: selectedTeacherToMove.retardosAcumulados || 0
                                  });

                                  if (selectedTeacherToMove.username) {
                                    await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, 'Titular');
                                  }

                                  setShowReassignModal(false);
                                  setSelectedTeacherToMove(null);
                                } catch (err) {
                                  console.error('Error in Asignar Titular:', err);
                                  alert('Error al asignar docente: ' + err.message);
                                }
                              }
                            });
                          }}"""
content = content.replace(old_asignar_titular, new_asignar_titular)

# Replace "Asignar Auxiliar"
old_asignar_auxiliar = """onClick={async () => {
                                  if (!selectedTeacherToMove) return;
                                  if (window.confirm(`¿Asignar a ${selectedTeacherToMove.nombre} como ${targetType} en el salón ${targetGrpKey}?`)) {
                                    try {
                                      // If the moving teacher is currently a Titular somewhere else, clear that classroom's display
                                      if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                        onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                      }

                                      // Assign them as Auxiliar in the target group via Firebase
                                      if (selectedTeacherToMove.username) {
                                        await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, targetType);
                                      }

                                      setShowReassignModal(false);
                                      setSelectedTeacherToMove(null);
                                    } catch (err) {
                                      alert('Error al asignar auxiliar: ' + err.message);
                                    }
                                  }
                                }}"""

new_asignar_auxiliar = """onClick={() => {
                                  if (!selectedTeacherToMove) return;
                                  setPendingAction({
                                    message: `¿Asignar a ${selectedTeacherToMove.nombre} como ${targetType} en el salón ${targetGrpKey}?`,
                                    action: async () => {
                                      try {
                                        if (selectedTeacherToMove.tipoDocente === 'Titular' && selectedTeacherToMove.key && selectedTeacherToMove.key !== 'Sin asignar') {
                                          onUpdateTeacher(selectedTeacherToMove.key, { nombre: 'Sin docente asignado', observaciones: '—' });
                                        }

                                        if (selectedTeacherToMove.username) {
                                          await updateUserGroupAndType(selectedTeacherToMove.username, targetGrpKey, targetType);
                                        }

                                        setShowReassignModal(false);
                                        setSelectedTeacherToMove(null);
                                      } catch (err) {
                                        alert('Error al asignar auxiliar: ' + err.message);
                                      }
                                    }
                                  });
                                }}"""
content = content.replace(old_asignar_auxiliar, new_asignar_auxiliar)

# Add ConfirmActionModal near ConfirmDeleteModal
add_modal = """
      <ConfirmActionModal
        isOpen={!!pendingAction}
        title="Confirmar asignación"
        message={pendingAction?.message}
        onConfirm={() => {
          if (pendingAction?.action) pendingAction.action();
        }}
        onClose={() => setPendingAction(null)}
      />
"""
content = content.replace('      <ConfirmDeleteModal', add_modal + '\n      <ConfirmDeleteModal')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done replacing window.confirm")
