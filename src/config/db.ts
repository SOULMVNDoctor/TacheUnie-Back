// src/config/db.ts
import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI non défini dans .env. Utilise une DB locale si nécessaire.");
    return;
  }

  // options minimales; Mongoose 9+ n'a pas besoin de useNewUrlParser/UnifiedTopology explicitement
  const baseOpts: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
  };

  try {
    console.log("Connexion à MongoDB…");
    await mongoose.connect(uri, baseOpts);
    console.log("MongoDB connecté ✔");
  } catch (err: any) {
    console.error("Erreur MongoDB ❌", err?.message || err);

    // si erreur TLS / certificat, on essaye une connexion de secours (dev only)
    const msg = String(err?.message || "").toLowerCase();
    const looksLikeTLS = msg.includes("certificate") || msg.includes("tls") || msg.includes("checkserveridentity") || msg.includes("subject");

    if (looksLikeTLS) {
      console.warn("Erreur liée au TLS détectée — tentative de reconnexion en mode permissif (tlsAllowInvalidCertificates).");
      try {
        await mongoose.connect(uri, {
          ...baseOpts,
          // options permissives (utile en dev si certificat self-signed ou incompatibilité)
          tlsAllowInvalidCertificates: true,
          tlsAllowInvalidHostnames: true
        });
        console.log("MongoDB connecté (TLS permissif) ✔ — ceci est uniquement pour debug/dev.");
        return;
      } catch (err2: any) {
        console.error("Nouvel échec de connexion (TLS permissif) :", err2?.message || err2);
      }
    }

    // si on arrive là, on arrête l'app (optionnel)
    console.error("Impossible de se connecter à MongoDB — vérifie MONGODB_URI, le mot de passe (encodage), et l'accès réseau (IP whitelist).");
    // process.exit(1); // décommente si tu veux que le serveur s'arrête quand DB indispo
  }
}
