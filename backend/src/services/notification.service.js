// Guarda avisos internos por usuario y los distribuye a sus tokens web de FCM.

import { createHash } from "node:crypto";
import { AppError } from "../utils/app-error.js";

const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function tokenId(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function createNotificationService({ supabase, firestore, messaging }) {
  function userCollection(uid, collection) {
    return firestore.collection("usuarios").doc(uid).collection(collection);
  }

  function validateToken(token) {
    if (typeof token !== "string" || token.length < 20 || token.length > 4096 || /\s/.test(token)) {
      throw new AppError(400, "El token de notificaciones no es válido.");
    }
  }

  return {
    async registerToken(uid, token) {
      if (typeof uid !== "string" || !uid) {
        throw new AppError(400, "El token de notificaciones no es válido.");
      }
      validateToken(token);
      await userCollection(uid, "dispositivos").doc(tokenId(token)).set({
        token,
        actualizado_en: new Date().toISOString(),
      });
      return { registered: true };
    },

    async removeToken(uid, token) {
      if (typeof uid !== "string" || !uid) {
        throw new AppError(400, "El token de notificaciones no es válido.");
      }
      validateToken(token);
      await userCollection(uid, "dispositivos").doc(tokenId(token)).delete();
      return { removed: true };
    },

    async list(uid) {
      if (typeof uid !== "string" || !uid) throw new AppError(401, "No se encontró la cuenta de Firebase.");
      const snapshot = await userCollection(uid, "notificaciones")
        .orderBy("creado_en", "desc")
        .limit(50)
        .get();
      return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    },

    async notifyUser(userId, { title, body, url = "/" }) {
      const { data: user, error } = await supabase
        .from("usuario")
        .select("uid_firebase")
        .eq("id_usuario", userId)
        .maybeSingle();
      if (error) throw new Error(`Supabase: ${error.message}`);
      if (!user?.uid_firebase) throw new Error("No se encontró el destinatario de la notificación.");

      const uid = user.uid_firebase;
      const notification = {
        title,
        body,
        url,
        leida: false,
        creado_en: new Date().toISOString(),
      };
      await userCollection(uid, "notificaciones").add(notification);

      const devices = await userCollection(uid, "dispositivos").get();
      const tokens = devices.docs.map((document) => document.data().token).filter(Boolean);
      if (!tokens.length) return { stored: true, sent: 0 };

      let sent = 0;
      for (let index = 0; index < tokens.length; index += 500) {
        const batch = tokens.slice(index, index + 500);
        try {
          const result = await messaging.sendEachForMulticast({
            tokens: batch,
            notification: { title, body },
            data: { url },
            webpush: process.env.FRONTEND_ORIGIN
              ? { fcmOptions: { link: new URL(url, process.env.FRONTEND_ORIGIN).href } }
              : undefined,
          });
          sent += result.successCount;
          await Promise.all(result.responses.map(async (response, tokenIndex) => {
            if (response.success || !INVALID_TOKEN_CODES.has(response.error?.code)) return;
            await userCollection(uid, "dispositivos").doc(tokenId(batch[tokenIndex])).delete();
          }));
          if (result.failureCount) {
            console.error(`FCM no entregó ${result.failureCount} aviso(s) a ${uid}.`);
          }
        } catch (error) {
          console.error(`No se pudo enviar el push de FCM a ${uid}:`, error);
        }
      }
      return { stored: true, sent };
    },
  };
}
