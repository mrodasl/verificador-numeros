const Twilio = require('twilio');

// Usar cache global compartido entre funciones
if (typeof global.messageStatusCache === 'undefined') {
    global.messageStatusCache = {};
}

exports.handler = async function(event, context) {
    const TWILIO_CONFIG = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    };

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Endpoint para verificar estado de mensajes
    if (event.httpMethod === 'GET' && event.queryStringParameters) {
        const { messageSid } = event.queryStringParameters;
        console.log('🔍 Buscando estado para SID:', messageSid);
        console.log('📊 Cache actual:', Object.keys(global.messageStatusCache));
        
        if (messageSid && global.messageStatusCache[messageSid]) {
            const messageData = global.messageStatusCache[messageSid];
            console.log(`✅ Estado encontrado para ${messageSid}: ${messageData.status}`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: messageData.status,
                    messageSid: messageSid,
                    number: messageData.number,
                    timestamp: messageData.timestamp,
                    errorCode: messageData.errorCode,
                    errorMessage: messageData.errorMessage
                })
            };
        }
        
        console.log(`❌ Message SID no encontrado en cache: ${messageSid}`);
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
                success: false,
                error: 'Message not found in cache',
                availableSIDs: Object.keys(global.messageStatusCache)
            })
        };
    }

    // Envío de SMS (POST original)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Método no permitido' })
        };
    }

    try {
        const { number, user } = JSON.parse(event.body);
        const cleanedNumber = number.replace(/\s+/g, '');
        
        console.log(`📤 Solicitud de verificación: ${cleanedNumber} por ${user}`);

        // Validaciones
        if (!cleanedNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Número requerido' })
            };
        }

        if (!cleanedNumber.startsWith('+502')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'El número debe ser de Guatemala (+502)' })
            };
        }

        // Inicializar Twilio
        const client = new Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);

        // Mensaje de verificación
        const verificationMessage = `¡Bienvenido a casa!
¿Buscas oportunidades, apoyo o información para reintegrarte en Guatemala? Estamos para ayudarte.

Escríbenos a: 
https://wa.me/50239359960?text=Hola,%20quiero%20mas%20informacion%20`;

        // Construir URL del webhook dinámicamente
        const webhookUrl = process.env.URL 
            ? `${process.env.URL}/.netlify/functions/sms-status`
            : 'https://your-app.netlify.app/.netlify/functions/sms-status';

        console.log('🔄 Webhook URL configurada:', webhookUrl);

        // Enviar SMS con webhook para tracking
        const message = await client.messages.create({
            body: verificationMessage,
            from: TWILIO_CONFIG.phoneNumber,
            to: cleanedNumber,
            statusCallback: webhookUrl
        });

        // Guardar en cache GLOBAL (compartido)
        global.messageStatusCache[message.sid] = {
            status: message.status, // Estado inicial: 'queued', 'sent', etc.
            number: cleanedNumber,
            user: user,
            timestamp: new Date().toISOString(),
            initialStatus: message.status,
            from: TWILIO_CONFIG.phoneNumber
        };

        // Limpiar cache antiguo
        cleanupOldCache();

        console.log(`✅ SMS creado: ${cleanedNumber}`);
        console.log(`📝 SID: ${message.sid}, Estado inicial: ${message.status}`);
        console.log(`📊 Tamaño del cache: ${Object.keys(global.messageStatusCache).length}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageSid: message.sid,
                initialStatus: message.status,
                number: cleanedNumber,
                user: user,
                timestamp: new Date().toISOString(),
                note:
