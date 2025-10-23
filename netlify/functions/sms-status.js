// netlify/functions/sms-status.js - Webhook para Twilio
exports.handler = async function(event, context) {
    // Este endpoint recibe actualizaciones de estado de Twilio
    
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            body: 'Método no permitido' 
        };
    }

    try {
        // Twilio envía datos como application/x-www-form-urlencoded
        const formData = new URLSearchParams(event.body);
        const messageSid = formData.get('MessageSid');
        const messageStatus = formData.get('MessageStatus');
        const to = formData.get('To');
        const from = formData.get('From');
        const errorCode = formData.get('ErrorCode');

        console.log(`📱 Estado SMS actualizado:`, {
            messageSid,
            messageStatus,
            to,
            from,
            errorCode,
            timestamp: new Date().toISOString()
        });

        // Aquí puedes guardar el estado en una base de datos
        // Por ahora solo logueamos, pero puedes integrar con Airtable, Google Sheets, etc.
        
        // Ejemplo de cómo podrías guardar en un futuro:
        // await saveSMSStatus(messageSid, messageStatus, to, errorCode);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/xml' },
            body: '<Response></Response>' // Twilio espera TwiML
        };

    } catch (error) {
        console.error('Error procesando webhook de Twilio:', error);
        return {
            statusCode: 500,
            body: 'Error interno del servidor'
        };
    }
};

// Función de ejemplo para guardar estados (para implementación futura)
async function saveSMSStatus(messageSid, status, to, errorCode) {
    // Integrar con tu base de datos preferida:
    // - Airtable
    // - Google Sheets
    // - JSONBin
    // - PostgreSQL, etc.
    
    console.log(`💾 Guardando estado: ${messageSid} -> ${status}`);
}
