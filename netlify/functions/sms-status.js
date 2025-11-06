// netlify/functions/sms-status.js - Webhook para Twilio (VERSIÓN MEJORADA)

// Cache global compartido entre funciones
if (typeof global.messageStatusCache === 'undefined') {
    global.messageStatusCache = {};
}

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'text/xml'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: '<Response><Message>Método no permitido</Message></Response>' 
        };
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
                headers,
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
        console.log(`   Error: ${errorCode} - ${errorMessage}`);
        console.log(`   Cache size: ${Object.keys(global.messageStatusCache).length}`);
        
        // Log de todos los mensajes en cache para debugging
        console.log('📊 Todos los mensajes en cache:');
        Object.keys(global.messageStatusCache).forEach(sid => {
            const msg = global.messageStatusCache[sid];
            console.log(`   - ${sid}: ${msg.status} -> ${msg.number}`);
        });

        return {
            statusCode: 200,
            headers,
            body: '<Response></Response>'
        };

    } catch (error) {
        console.error('❌ Error procesando webhook de Twilio:', error);
        return {
            statusCode: 500,
            headers,
            body: '<Response><Message>Error processing webhook</Message></Response>'
        };
    }
};
