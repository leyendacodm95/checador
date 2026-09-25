import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

const AuthContext = createContext();

// Simple sanitize utility to prevent SQL & NoSQL injection in strings
export const sanitizeInput = (val) => {
  if (typeof val !== 'string') return '';
  return val.replace(/[\{\}\$\"\'\`\=\:\;]/g, '').trim();
};

// Password strength validation helper (Arlette's strict checks)
export const validatePasswordStrength = (pass) => {
  if (!pass || typeof pass !== 'string' || pass.trim() === '') {
    return { valid: false, error: 'La contraseña es requerida.' };
  }
  if (pass.length < 4 || pass.length > 64) {
    return { valid: false, error: 'La contraseña/PIN debe tener entre 4 y 64 caracteres de longitud.' };
  }
  // Only letters, numbers and special characters !"#$%&/()?¡@
  const regex = /^[a-zA-Z0-9áéíóúñüÁÉÍÓÚÑÜ!\"#\$%&/\(\)\?\¡\@]+$/;
  if (!regex.test(pass)) {
    return {
      valid: false,
      error: 'La contraseña contiene caracteres no válidos. Solo se permiten letras, números y los caracteres especiales: !"#$%&/()?¡@'
    };
  }
  return { valid: true };
};


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Authenticated user
  const [activeTab, setActiveTab] = useState('Panel de control');
  const [users, setUsers] = useState([]);



  // Load users from localStorage (or defaults) and then sync with Firestore
  useEffect(() => {
    const getDeletedUsernames = () => {
      try {
        const saved = localStorage.getItem('checador_usuarios_eliminados');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    };

    const deletedUsernames = getDeletedUsernames();

    // Load from localStorage
    const storedUsers = localStorage.getItem('checador_usuarios');
    let loadedUsers = [];
    if (storedUsers) {
      try { loadedUsers = JSON.parse(storedUsers); } catch (e) { loadedUsers = []; }
    }
    // Helper to unabbreviate teacher title prefixes
    const cleanPrefix = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/^Profra\.\s*/gi, 'Profesora ')
        .replace(/^Profra\s*/gi, 'Profesora ')
        .replace(/^Prof\.\s*/gi, 'Profesor ')
        .replace(/^Prof\s+(?![a-z]*esora)/gi, 'Profesor ');
    };

    // Clean storedUsers in localStorage if present
    if (loadedUsers.length > 0) {
      loadedUsers = loadedUsers.map(u => ({
        ...u,
        name: cleanPrefix(u.name)
      }));
    }

    // Default admin / student users
    const defaultUsers = [
      { username: 'alumno', password: '123', role: 'Alumno', baseRole: 'Alumno', name: 'Portal Alumnos', email: 'alumno@escuela.edu.mx' }
    ];
    const merged = [...loadedUsers];
    defaultUsers.forEach(def => {
      const idx = merged.findIndex(u => u.username.toLowerCase() === def.username.toLowerCase());
      if (idx >= 0) {
        merged[idx].name = cleanPrefix(merged[idx].name);
      } else {
        merged.push(def);
      }
    });

    const cleanedInitial = merged;

    // Persist locally and set state
    localStorage.setItem('checador_usuarios', JSON.stringify(cleanedInitial));
    setUsers(cleanedInitial);

    // Subscribe to Firestore for real‑time sync
    const unsub = onSnapshot(collection(db, 'usuarios'), snap => {
      const remoteUsers = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data) {
          const usernameVal = (data.username || docSnap.id || '').toLowerCase().trim();
          if (usernameVal) {
            remoteUsers.push({ ...data, username: usernameVal, id: docSnap.id });
          }
        }
      });

      const userMap = new Map();
      
      // 1. Add remote users from Firestore
      remoteUsers.forEach(u => {
        userMap.set((u.username || '').toLowerCase().trim(), u);
      });

      // 2. Add defaultUsers only if not provided by Firestore
      defaultUsers.forEach(def => {
        const defKey = def.username.toLowerCase().trim();
        if (!userMap.has(defKey)) {
          userMap.set(defKey, def);
        }
      });

      // Convert map to array
      const finalUsers = Array.from(userMap.values());

      localStorage.setItem('checador_usuarios', JSON.stringify(finalUsers));
      setUsers(finalUsers);
    }, err => console.error('Firestore users snapshot error:', err));
    return () => unsub();
  }, []);

  // Save users to localStorage when state changes
  const saveUsersList = (newUsers) => {
    setUsers(newUsers);
    localStorage.setItem('checador_usuarios', JSON.stringify(newUsers));
  };

  const login = (inputUser, inputPass) => {
    const cleanUser = sanitizeInput(inputUser);
    const cleanPass = typeof inputPass === 'string' ? inputPass : '';
    if (!cleanUser || !cleanPass) return { success: false, error: 'Por favor, llene todos los campos.' };
    const matched = users.find(u => 
      (u.username || '').toLowerCase().trim() === cleanUser.toLowerCase().trim() ||
      (u.email || '').toLowerCase().trim() === cleanUser.toLowerCase().trim()
    );

    if (matched) {
      let isPasswordValid = false;
      // Retrocompatibility with hashed passwords
      if (matched.password && (matched.password.startsWith('$2a$') || matched.password.startsWith('$2b$'))) {
        isPasswordValid = bcrypt.compareSync(cleanPass, matched.password);
      } else {
        isPasswordValid = matched.password === cleanPass; // Fallback for plain text
      }

      if (isPasswordValid) {
        let baseRole = matched.baseRole || matched.role || (matched.username.toLowerCase().includes('director') ? 'Director' : 'Docente');
        let role = matched.role || matched.baseRole || baseRole;

        const userObj = { ...matched, role, baseRole };
        setUser(userObj);

        const rLower = (baseRole || '').toLowerCase().trim();
        if (['director','directora','subdirector','subdirectora'].includes(rLower)) {
          setActiveTab('Panel de control');
        } else if (['alumno', 'alumna'].includes(rLower)) {
          setActiveTab('Portal Alumno');
        } else {
          setActiveTab('Portal Docente');
        }
        return { success: true };
      }
    }
    return { success: false, error: 'Usuario o contraseña incorrectos. Intente nuevamente.' };
  };

  const logout = () => {
    setUser(null);
    setActiveTab('Panel de control');
  };

  const updateDisplayRoleTitle = (newTitle) => {
    if (!user) return;
    const updatedUser = { ...user, role: newTitle };
    setUser(updatedUser);
  };

  const registerUser = async (newUser) => {
    const cleanUser = sanitizeInput(newUser.username);
    const cleanPass = typeof newUser.password === 'string' ? newUser.password : '';
    const cleanName = sanitizeInput(newUser.name);
    const cleanEmail = sanitizeInput(newUser.email);
    const cleanMatricula = sanitizeInput(newUser.matricula || '');
    const role = newUser.role;
    if (!cleanUser || !cleanPass || !cleanName || !cleanEmail || !cleanMatricula) return { success: false, error: 'Todos los campos (incluyendo Matrícula/QR ID) son requeridos y no deben contener caracteres especiales.' };
    const passCheck = validatePasswordStrength(cleanPass);
    if (!passCheck.valid) return { success: false, error: passCheck.error };
    const userKey = cleanUser.toLowerCase().trim();
    const rLower = (role || '').toLowerCase().trim();
    const isDirector = rLower === 'director' || rLower === 'directora';
    const isSub = rLower === 'subdirector' || rLower === 'subdirectora';

    // Prevent duplicate usernames
    if (users.some(u => (u.username || '').toLowerCase().trim() === userKey)) {
      return { success: false, error: 'El nombre de usuario ya está registrado en el sistema.' };
    }

    // Strictly enforce maximum 1 Director and 1 Subdirector in the system
    if (isDirector && users.some(u => ['director','directora'].includes((u.role || u.baseRole || '').toLowerCase().trim()))) {
      return { success: false, error: 'Ya existe un usuario Director / Directora registrado en el sistema.' };
    }
    if (isSub && users.some(u => ['subdirector','subdirectora'].includes((u.role || u.baseRole || '').toLowerCase().trim()))) {
      return { success: false, error: 'Ya existe un usuario Subdirector / Subdirectora registrado en el sistema.' };
    }

    // Clean deletedUsernames list in localStorage if re-registering
    try {
      const storedDeleted = localStorage.getItem('checador_usuarios_eliminados');
      if (storedDeleted) {
        let deletedList = JSON.parse(storedDeleted);
        deletedList = deletedList.filter(d => d !== userKey && !(isDirector && (d === 'director' || d === 'director_user')));
        localStorage.setItem('checador_usuarios_eliminados', JSON.stringify(deletedList));
      }
    } catch (e) {
      console.warn('Error updating deleted list:', e);
    }

    const assignedGroup = newUser.assignedGroup || (role === 'Docente' ? '1°-A' : null);
    const now = Date.now();

    // Hash the password with bcrypt
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(cleanPass, salt);

    const createdUser = { 
      username: cleanUser, 
      password: hashedPassword, 
      role: role, 
      baseRole: role,
      name: cleanName, 
      email: cleanEmail, 
      telefono: newUser.telefono || '—',
      cedula: newUser.cedula || '—',
      matricula: cleanMatricula,
      assignedGroup,
      tipoDocente: newUser.tipoDocente || newUser.role || 'Auxiliar',
      rama: newUser.rama || '',
      isTemporary: (isDirector || isSub) ? true : (newUser.isTemporary || false), 
      updatedAt: now 
    };

    // If Docente, sync with teacher roster in localStorage and Firestore ONLY if they are Titular
    if (role === 'Docente' && assignedGroup && createdUser.tipoDocente === 'Titular') {
      try {
        const savedTeachers = localStorage.getItem('checador_teachers');
        const teachersObj = savedTeachers ? JSON.parse(savedTeachers) : {};
        teachersObj[assignedGroup] = {
          ...(typeof teachersObj[assignedGroup] === 'object' ? teachersObj[assignedGroup] : {}),
          nombre: cleanName,
          email: cleanEmail,
          matricula: cleanMatricula, // Save custom matrícula to teacher profile
          observaciones: `Docente Titular de ${assignedGroup}`
        };
        localStorage.setItem('checador_teachers', JSON.stringify(teachersObj));

        // Sync to Firestore 'docentes' collection surgically
        const teacherDocData = {
          nombre: cleanName,
          email: cleanEmail,
          matricula: cleanMatricula,
          observaciones: `Docente Titular de ${assignedGroup}`,
          groupKey: assignedGroup
        };
        try {
          await setDoc(doc(db, 'docentes', assignedGroup), teacherDocData, { merge: true });
        } catch (err) {
          console.warn('Error saving teacher profile to Firestore:', err);
        }
      } catch (e) {
        console.warn('Could not sync teacher roster locally:', e);
      }
    }

    // Save locally first to guarantee user persistence and instant login
    const updatedList = [...users, createdUser];
    saveUsersList(updatedList);

    // Sync to Firestore and wait to ensure the network request completes
    try {
      await setDoc(doc(db, 'usuarios', userKey), createdUser, { merge: true });
    } catch (err) {
      console.warn('Error saving user to Firestore (saved locally):', err);
    }

    // Auto-login newly registered user immediately ONLY if no session is active
    const baseRole = createdUser.baseRole || createdUser.role;
    const userObj = { ...createdUser, baseRole };
    
    if (!user) {
      setUser(userObj);

      const targetRoleLower = (baseRole || '').toLowerCase().trim();
      if (['director','directora','subdirector','subdirectora'].includes(targetRoleLower)) {
        setActiveTab('Panel de control');
      } else if (['alumno', 'alumna'].includes(targetRoleLower)) {
        setActiveTab('Portal Alumno');
      } else {
        setActiveTab('Portal Docente');
      }
    }

    return { success: true, user: userObj };
  };

  const updateCredentials = async (newUsername, newPassword, newEmail) => {
    const cleanUser = sanitizeInput(newUsername);
    const cleanPass = typeof newPassword === 'string' ? newPassword : '';
    const cleanEmail = sanitizeInput(newEmail);
    if (!cleanUser || !cleanPass || !cleanEmail) return { success: false, error: 'Los datos de credenciales son requeridos.' };
    if (!user) return { success: false, error: 'No hay una sesión activa.' };
    const passCheck = validatePasswordStrength(cleanPass);
    if (!passCheck.valid) return { success: false, error: passCheck.error };
    if (cleanUser.toLowerCase().trim() !== (user.username || '').toLowerCase().trim() && users.some(u => (u.username || '').toLowerCase().trim() === cleanUser.toLowerCase().trim())) return { success: false, error: 'El nombre de usuario ya está en uso.' };
    
    const now = Date.now();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(cleanPass, salt);

    const updatedMe = { 
      ...user, 
      username: cleanUser, 
      password: hashedPassword, 
      email: cleanEmail, 
      updatedAt: now, 
      isTemporary: false 
    };

    const updatedUsers = users.map(u => {
      if ((u.username || '').toLowerCase().trim() === (user.username || '').toLowerCase().trim()) {
        return updatedMe;
      }
      return u;
    });
    saveUsersList(updatedUsers);

    // Update in Firestore preserving all user metadata (role, baseRole, name, etc.)
    // Fire-and-forget to prevent UI freezing if network is blocked
    const syncToFirestore = async () => {
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        let docIdToUpdate = null;
        snap.forEach(d => {
          if ((d.data()?.username || '').toLowerCase().trim() === user.username.toLowerCase().trim()) {
            docIdToUpdate = d.id;
          }
        });

        if (docIdToUpdate) {
          const userDocRef = doc(db, 'usuarios', docIdToUpdate);
          await setDoc(userDocRef, updatedMe, { merge: true });
        } else {
          const userDocRef = doc(db, 'usuarios', cleanUser);
          await setDoc(userDocRef, updatedMe, { merge: true });
        }
      } catch (err) {
        console.error('Error updating user in Firestore:', err);
      }
    };
    await syncToFirestore();

    setUser(updatedMe);
    return { success: true };
  };

  const recoverPassword = async (email) => {
    const cleanEmail = sanitizeInput(email).toLowerCase().trim();
    if (!cleanEmail) return { success: false, error: 'Por favor, ingrese un correo.' };
    const matched = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
    if (!matched) return { success: false, error: 'El correo electrónico no se encuentra registrado en el sistema.' };
    return { success: true };
  };

  const verifyRecoveryIdentity = async (email, identityValue) => {
    const cleanEmail = sanitizeInput(email).toLowerCase().trim();
    const cleanIdentity = (identityValue || '').toString().replace(/\s+/g, '').trim().toLowerCase();

    if (!cleanEmail || !cleanIdentity) return { success: false, error: 'Por favor ingrese su Matrícula o QR ID.' };

    const userDoc = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
    if (!userDoc) return { success: false, error: 'Usuario no encontrado.' };

    const storedMatricula = (userDoc.matricula || '').toString().replace(/\s+/g, '').trim().toLowerCase();
    const storedQrId = (userDoc.qrId || userDoc.QRID || userDoc.qrCode || '').toString().replace(/\s+/g, '').trim().toLowerCase();

    let impliedQrDocente = '';
    let impliedQrTeacher = '';
    if (userDoc.role === 'Docente' && userDoc.assignedGroup) {
      const groupKey = userDoc.assignedGroup.replace('°-', '').replace('-', '');
      impliedQrDocente = `docente-${groupKey}`.toLowerCase();
      impliedQrTeacher = `teacher-${groupKey}`.toLowerCase();
    }

    if (!storedMatricula && !storedQrId && !impliedQrDocente) {
      return { success: false, error: 'Este usuario no tiene Matrícula ni QR ID configurado para validación.' };
    }

    if (
      cleanIdentity === storedMatricula || 
      cleanIdentity === storedQrId ||
      (impliedQrDocente && cleanIdentity === impliedQrDocente) ||
      (impliedQrTeacher && cleanIdentity === impliedQrTeacher)
    ) {
      return { success: true };
    } else {
      return { success: false, error: 'La Matrícula o QR ID no coincide con nuestros registros.' };
    }
  };

  const resetPassword = async (email, newPassword) => {
    const cleanEmail = sanitizeInput(email).toLowerCase().trim();
    const cleanPass = typeof newPassword === 'string' ? newPassword : '';
    const passCheck = validatePasswordStrength(cleanPass);
    if (!passCheck.valid) return { success: false, error: passCheck.error };

    const userIndex = users.findIndex(u => (u.email || '').toLowerCase().trim() === cleanEmail);
    if (userIndex === -1) return { success: false, error: 'Usuario no encontrado.' };

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(cleanPass, salt);
    const now = Date.now();

    const updatedUsers = [...users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: hashedPassword, updatedAt: now, isTemporary: false };
    saveUsersList(updatedUsers);

    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        await setDoc(doc(db, 'usuarios', userDoc.id), { 
          password: hashedPassword, 
          updatedAt: now,
          isTemporary: false 
        }, { merge: true });
      } else {
        const userDocRef = doc(db, 'usuarios', updatedUsers[userIndex].username.toLowerCase().trim());
        await setDoc(userDocRef, { password: hashedPassword, updatedAt: now, isTemporary: false }, { merge: true });
      }
    } catch (err) {
      console.error('Error al guardar nueva contraseña en Firestore:', err);
    }

    return { success: true };
  };

  const deleteUserAccount = async (targetUsername) => {
    if (!targetUsername) return { success: false, error: 'Usuario no especificado' };
    const cleanTarget = targetUsername.toLowerCase().trim();

    // Track deleted user in localStorage to avoid restoring via defaultUsers
    try {
      const storedDeleted = localStorage.getItem('checador_usuarios_eliminados');
      let deletedList = storedDeleted ? JSON.parse(storedDeleted) : [];
      if (!deletedList.includes(cleanTarget)) {
        deletedList.push(cleanTarget);
        localStorage.setItem('checador_usuarios_eliminados', JSON.stringify(deletedList));
      }
    } catch (e) {
      console.warn('Error saving deleted user locally:', e);
    }

    // Remove from state & localStorage
    const updatedUsers = users.filter(u => (u.username || '').toLowerCase().trim() !== cleanTarget);
    saveUsersList(updatedUsers);

    // Delete document in Firestore in the background
    const syncDeleteToFirestore = async () => {
      try {
        await deleteDoc(doc(db, 'usuarios', cleanTarget));
        const snap = await getDocs(collection(db, 'usuarios'));
        snap.forEach(async (d) => {
          const uName = (d.data()?.username || '').toLowerCase().trim();
          if (uName === cleanTarget || d.id.toLowerCase().trim() === cleanTarget) {
            await deleteDoc(doc(db, 'usuarios', d.id));
          }
        });
      } catch (err) {
        console.warn('Error deleting user in Firestore:', err);
      }
    };
    syncDeleteToFirestore();

    // If currently logged in as deleted user, log out
    if (user && (user.username || '').toLowerCase().trim() === cleanTarget) {
      setUser(null);
      setActiveTab('Panel de control');
    }

    return { success: true };
  };

  const updateUserGroupAndType = async (targetUsername, assignedGroup, tipoDocente) => {
    const cleanTarget = targetUsername.toLowerCase().trim();
    const now = Date.now();
    
    const updatedUsers = users.map(u => {
      if ((u.username || '').toLowerCase().trim() === cleanTarget) {
        return { ...u, assignedGroup, tipoDocente, updatedAt: now };
      }
      return u;
    });
    saveUsersList(updatedUsers);

    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      let docIdToUpdate = null;
      snap.forEach(d => {
        if ((d.data()?.username || '').toLowerCase().trim() === cleanTarget) {
          docIdToUpdate = d.id;
        }
      });

      if (docIdToUpdate) {
        const userDocRef = doc(db, 'usuarios', docIdToUpdate);
        await setDoc(userDocRef, { assignedGroup, tipoDocente, updatedAt: now }, { merge: true });
      } else {
        const userDocRef = doc(db, 'usuarios', cleanTarget);
        await setDoc(userDocRef, { assignedGroup, tipoDocente, updatedAt: now }, { merge: true });
      }
    } catch (err) {
      console.warn('Error updating user group and type in Firestore:', err);
    }
  };

  const updateUserLocally = (username, newData) => {
    setUsers(prev => {
      const updated = prev.map(u => 
        (u.username || '').toLowerCase() === (username || '').toLowerCase() ? { ...u, ...newData } : u
      );
      localStorage.setItem('checador_usuarios', JSON.stringify(updated));
      return updated;
    });
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'Alumno',
        activeTab,
        setActiveTab,
        users,
        login,
        logout,
        updateDisplayRoleTitle,
        registerUser,
        updateCredentials,
        deleteUserAccount,
        updateUserGroupAndType,
        updateUserLocally,
        recoverPassword,
        verifyRecoveryIdentity,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
