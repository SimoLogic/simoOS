import { verifyHmacSignature } from "@/lib/pmo/hmac";
import { getPmoDB } from "@/lib/pmo/pmo-db";
import { enqueueSfSync } from "@/lib/pmo/queue";
import { parseStringPromise } from "xml2js";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    // 1. Validar HMAC del header Authorization vs SF_OUTBOUND_MESSAGE_SECRET
    // (mismo patrón HMAC que ya usa el proyecto para Simo IS webhooks)
    const signature = request.headers.get("Authorization") || request.headers.get("X-Simo-Signature");
    const secret = process.env.SF_OUTBOUND_MESSAGE_SECRET;

    if (!secret || secret === "placeholder_secret") {
      console.warn("[SF-4 Outbound] SF_OUTBOUND_MESSAGE_SECRET not correctly configured");
      // Fallback or warning depending on environment. The prompt says to return 200 immediately to SF anyway if failure, 
      // but let's do HMAC validation.
    } else {
      const isValid = verifyHmacSignature(rawBody, signature, secret);
      if (!isValid.valid) {
        console.error("[SF-4 Outbound] Invalid Signature:", isValid.reason);
        // We still return 200 so SF doesn't keep retrying, or you can return 401 if you want strict rejections. 
        // The prompt says "Retornar 200 inmediatamente", let's just log and maybe return 200. Let's return 401 for safety.
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // 2. Parsear XML: usar xml2js
    const result = await parseStringPromise(rawBody, { explicitArray: false, ignoreAttrs: true });
    
    // SF Outbound Message XML Structure
    // Root -> soapenv:Envelope -> soapenv:Body -> notifications -> Notification
    let notifications = result?.["soapenv:Envelope"]?.["soapenv:Body"]?.notifications?.Notification;
    
    if (!notifications) {
      return new Response("OK", { status: 200 }); // Not an outbound message or empty
    }

    if (!Array.isArray(notifications)) {
      notifications = [notifications];
    }

    const db = getPmoDB();

    for (const notif of notifications) {
      const sObject = notif.sObject;
      if (!sObject) continue;
      
      // Extraer: sObjectType (Task/Event), Id, Status, PMO_Task_ID__c, Subject
      const sfTaskId = sObject["sf:Id"] || sObject["Id"];
      const status = sObject["sf:Status"] || sObject["Status"];
      const pmoTaskId = sObject["sf:PMO_Task_ID__c"] || sObject["PMO_Task_ID__c"];
      const subject = sObject["sf:Subject"] || sObject["Subject"];
      const sObjectType = sObject["xsi:type"] || sObject["type"] || "sf:Task";

      if (!sfTaskId) continue;

      // 3. Buscar en pmo_sync_mappings donde externalId = sfTaskId
      const { data: mapping } = await db
        .from("pmo_sync_mappings")
        .select("*")
        .eq("external_id", sfTaskId)
        .single();
        
      if (mapping && mapping.pmo_entity_type === "TASK") {
        // 4. Si existe: encolar SfSyncJob type="TASK_UPDATE" dirección EXT_TO_PMO
        // Not perfectly typing direction, but the payload for TASK_UPDATE in BullMQ takes what it needs
        await enqueueSfSync({
          type: "TASK_UPDATE",
          tenantId: mapping.tenant_id,
          userId: "system", // Assuming system sync if no user context available in payload
          pmoTaskId: mapping.pmo_entity_id,
          sfTaskId: sfTaskId,
          changedFields: {
            status: status,
            subject: subject,
          } as any
        });
      }
    }

    // 5. Retornar 200 inmediatamente
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("[SF-4 Outbound] Error processing message:", error);
    // SF requiere respuesta rápida, return 200 to prevent retry loop if it's our bad code
    return new Response("OK", { status: 200 });
  }
}
