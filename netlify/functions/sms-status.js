// netlify/functions/sms-status.js - Webhook para Twilio (VERSIÓN MEJORADA)

// Cache global compartido entre funciones
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

        console.log(`📱 ACTUALIZACIÓN ESTADO SMS RECIBIDA:`, {
            messageSid,
            messageStatus,
            to,
            from,
            errorCode,
            errorMessage,
            timestamp: new Date().toISOString()
        });

        // Validar que tenemos los datos necesarios
        if (!messageSid) {
            console.error('❌ Webhook recibido sin MessageSid');
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'text/xml' },
                body: '<Response><Message>Missing MessageSid</Message></Response>'
            };
        }

        // Actualizar cache GLOBAL con estado real
        global.messageStatusCache[messageSid] = {
            status: messageStatus,
            number: to,
            timestamp: new Date().toISOString(),
            errorCode: errorCode || null,
            errorMessage: errorMessage || null,
            from: from,
            lastUpdated: new Date().toISOString()
        };

        // Log detallado para debugging
        console.log('💾 Cache actualizado correctamente:');
        console.log(`   SID: ${messageSid}`);
        console.log(`   Estado: ${messageStatus}`);
        console.log(`   Número: ${to}`);
        console.log(`   Cache size: ${Object.keys(global.messageStatusCache).length}`);
        console.log('📊 Todos los mensajes en cache:', Object.keys(global.messageStatusCache));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/xml' },
            body: '<Response></Response>'
        };

    } catch (error) {
        console.error('❌ Error procesando webhook de Twilio:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/xml' },
            body: '<Response><Message>Error processing webhook</Message></Response>'
        };
    }
};
