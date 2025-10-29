// netlify/functions/send-sms.js
const Twilio = require('twilio');

exports.handler = async function(event, context) {
    // Configuración - IMPORTANTE: Configurar estas variables en Netlify
    const TWILIO_CONFIG = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+502XXXXXXX' // Tu número Twilio Guatemala
    };

    // Habilitar CORS para el frontend
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Validar método HTTP
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Método no permitido. Use POST.' 
            })
        };
    }

    try {
        // Parsear el cuerpo de la solicitud
        let parsedBody;
        try {
            parsedBody = JSON.parse(event.body);
        } catch (parseError) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Cuerpo de solicitud JSON inválido' 
                })
            };
        }

        const { number, user } = parsedBody;
        
        console.log(`Solicitud de verificación: ${number} por usuario ${user}`);

        // Validaciones
        if (!number) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Número telefónico es requerido' 
                })
            };
        }

        // Validar formato de número guatemalteco
        const cleanedNumber = number.replace(/\s+/g, '');
        if (!cleanedNumber.startsWith('+502')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'El número debe ser de Guatemala (formato: +502 XXXXXXXX)' 
                })
            };
        }

        // Validar longitud del número
        if (cleanedNumber.length < 12 || cleanedNumber.length > 13) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Número inválido. Formato esperado: +502 XXXXXXXX' 
                })
            };
        }

        // Verificar configuración de Twilio
        if (!TWILIO_CONFIG.accountSid || !TWILIO_CONFIG.authToken) {
            console.error('Twilio no configurado. Verifica las variables de entorno.');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Servicio de SMS no configurado' 
                })
            };
        }

        // Inicializar cliente Twilio
        const client = new Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);

        // Mensaje de verificación MEJORADO
        const verificationMessage = `¡Bienvenido a casa! 🌟 

Si estás buscando oportunidades, apoyo o información para tu reintegración en Guatemala, estamos aquí para ayudarte.

💬 Escríbenos directamente: 
https://wa.me/50239359960?text=Hola,%20quiero%20más%20información%20sobre%20los%20servicios%20disponibles`;

        // Enviar SMS
        const message = await client.messages.create({
            body: verificationMessage,
            from: TWILIO_CONFIG.phoneNumber,
            to: cleanedNumber,
            // Webhook para tracking de estado (opcional)
            statusCallback: process.env.URL ? `${process.env.URL}/.netlify/functions/sms-status` : undefined
        });

        // Log exitoso
        console.log(`✅ SMS enviado a ${cleanedNumber}. SID: ${message.sid}, Estado: ${message.status}`);

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageSid: message.sid,
                status: message.status,
                number: cleanedNumber,
                user: user,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        // Manejo de errores específicos de Twilio
        console.error('❌ Error enviando SMS:', error);
        
        let errorMessage = 'Error interno del servidor';
        let statusCode = 500;

        if (error.code === 21211) {
            errorMessage = 'Número telefónico inválido';
            statusCode = 400;
        } else if (error.code === 21408) {
            errorMessage = 'No tien permisos para enviar SMS a este número';
            statusCode = 403;
        } else if (error.code === 21610) {
            errorMessage = 'El número ha bloqueado los mensajes SMS';
            statusCode = 400;
        } else if (error.code === 21612) {
            errorMessage = 'No se puede enviar SMS a números landline (fijos)';
            statusCode = 400;
        } else if (error.message.includes('Authentication Error')) {
            errorMessage = 'Error de autenticación con el servicio de SMS';
            statusCode = 500;
        }

        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
