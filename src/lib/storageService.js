// Service for persistent structured local storage (IndexedDB + LocalStorage in %LOCALAPPDATA%) + Firestore Cloud Sync
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, addDoc } from 'firebase/firestore';

const DB_NAME = 'ChecadorPrimaria_DB';
const DB_VERSION = 1;

// Open or initialize IndexedDB for non-volatile local storage on disk
const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const dbInstance = e.target.result;
      if (!dbInstance.objectStoreNames.contains('appData')) {
        dbInstance.createObjectStore('appData');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => resolve(null);
  });
};

// Save data to IndexedDB
export const saveLocalIndexedDB = async (key, data) => {
  try {
    const idb = await openIndexedDB();
    if (idb) {
      const tx = idb.transaction('appData', 'readwrite');
      const store = tx.objectStore('appData');
      store.put(data, key);
    }
    // Backup in LocalStorage as well
    localStorage.setItem(`checador_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error saving ${key} to IndexedDB:`, err);
  }
};

// Load data from IndexedDB or LocalStorage
export const getLocalIndexedDB = async (key, fallback) => {
  try {
    const idb = await openIndexedDB();
    if (idb) {
      const data = await new Promise((resolve) => {
        const tx = idb.transaction('appData', 'readonly');
        const store = tx.objectStore('appData');
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (data) return data;
    }
    const saved = localStorage.getItem(`checador_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch (err) {
    const saved = localStorage.getItem(`checador_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  }
};

// Sync collections to Firebase Firestore
export const syncFirestoreCollection = async (collectionName, itemsMapOrArray) => {
  try {
    if (Array.isArray(itemsMapOrArray)) {
      for (const item of itemsMapOrArray) {
        if (item.id) {
          await setDoc(doc(db, collectionName, String(item.id)), item, { merge: true });
        }
      }
    } else if (typeof itemsMapOrArray === 'object' && itemsMapOrArray !== null) {
      for (const [key, val] of Object.entries(itemsMapOrArray)) {
        const docData = typeof val === 'object' ? { ...val, groupKey: key } : { nombre: val, groupKey: key };
        await setDoc(doc(db, collectionName, key), docData, { merge: true });
      }
    }
  } catch (err) {
    console.warn(`Error syncing Firestore collection ${collectionName}:`, err);
  }
};

// Delete a document from Firebase Firestore
export const deleteFirestoreDoc = async (collectionName, docId) => {
  try {
    if (!docId) return;
    await deleteDoc(doc(db, collectionName, String(docId)));
  } catch (err) {
    console.warn(`Error deleting document ${docId} from Firestore collection ${collectionName}:`, err);
  }
};

// Save a single student to Firestore
export const saveStudentFirestore = async (student) => {
  try {
    if (!student || !student.id) return;
    await setDoc(doc(db, 'alumnos', String(student.id)), student, { merge: true });
  } catch (err) {
    console.warn(`Error saving student ${student.id} to Firestore:`, err);
  }
};

// Save a single teacher/group slot to Firestore
export const saveTeacherFirestore = async (groupKey, teacherData) => {
  try {
    if (!groupKey) return;
    
    // Normalize string vs object
    const docData = typeof teacherData === 'object' ? { ...teacherData, groupKey } : { nombre: teacherData, groupKey };
    
    // Si el nombre es "Sin docente asignado", eliminamos el documento de la base de datos para no dejar fantasmas
    if (docData.nombre === 'Sin docente asignado') {
      await deleteDoc(doc(db, 'docentes', groupKey));
      return;
    }

    await setDoc(doc(db, 'docentes', groupKey), docData, { merge: true });
  } catch (err) {
    console.warn(`Error saving teacher for group ${groupKey} to Firestore:`, err);
  }
};

// Add a single attendance log to Firestore
export const addLogFirestore = async (log) => {
  try {
    if (!log || !log.id) return;
    await setDoc(doc(db, 'asistencias', String(log.id)), log, { merge: true });
  } catch (err) {
    console.warn(`Error adding attendance log to Firestore:`, err);
  }
};

// Save a single deletion log to Firestore
export const saveDeletionFirestore = async (deletion) => {
  try {
    if (!deletion || !deletion.id) return;
    await setDoc(doc(db, 'eliminaciones', String(deletion.id)), deletion, { merge: true });
  } catch (err) {
    console.warn(`Error saving deletion log to Firestore:`, err);
  }
};


