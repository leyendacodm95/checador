// src/scripts/create_test_users.js
import { db } from "../lib/firebase.js";
import { collection, addDoc } from "firebase/firestore";

(async () => {
  const now = Date.now();
  const users = [
    {
      username: "director_user",
      password: "Admin123!",
      role: "Director",
      name: "Director Test",
      email: "director@example.com",
      updatedAt: now,
      isTemporary: false
    },
    {
      username: "subdirector_user",
      password: "SubDir123!",
      role: "Subdirector",
      name: "Subdirector Test",
      email: "subdirector@example.com",
      updatedAt: now,
      isTemporary: false
    },
    {
      username: "docente_user",
      password: "Docente123!",
      role: "Docente",
      name: "Docente Test",
      email: "docente@example.com",
      updatedAt: now,
      isTemporary: false
    }
  ];

  for (const u of users) {
    try {
      await addDoc(collection(db, "usuarios"), u);
      console.log(`Added ${u.role} user: ${u.username}`);
    } catch (e) {
      console.error(`Error adding ${u.role}:`, e);
    }
  }
})();
