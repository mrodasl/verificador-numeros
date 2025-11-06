// netlify/functions/sms-status.js - Webhook para Twilio (VERSIÓN MEJORADA)

// Cache global (mismo que en send-sms)
if (typeof global.messageStatusCache === 'undefined') {
    global.messageStatusCache = {};
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const formData = new URLSearchParams(event.body);
        const messageSid = formData.get('MessageSid');
        const messageStatus = formData.get('MessageStatus');
        const to = formData.get('To');
        const from = formData.get('From');
        const errorCode = formData.get('ErrorCode');
        const errorMessage = formData.get('ErrorMessage');

        console.log(`📱 ACTUALIZACIÓN ESTADO SMS:`, {
            messageSid,
            messageStatus,
            to,
            from,
            errorCode,
            errorMessage,
            timestamp: new Date().toISOString()
        });

        // Actualizar cache con estado real
        if (messageSid) {
            global.messageStatusCache[messageSid] = {
                status: messageStatus,
                number: to,
                timestamp: new Date().toISOString(),
                errorCode: errorCode,
                errorMessage: errorMessage
            };
        }

        // Log para debugging
        console.log('💾 Cache de estados actualizado. Total de mensajes:', Object.keys(global.messageStatusCache).length);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/xml' },
            body: '<Response></Response>'
        };

    } catch (error) {
        console.error('Error procesando webhook de Twilio:', error);
        return {
            statusCode: 500,
            body: 'Error interno del servidor'
        };
    }
};
