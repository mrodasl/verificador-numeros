// ========== CONFIGURACIÓN MEJORADA ==========
const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500,
    sessionTimeout: 30, // minutos
    // NUEVO: Configuración mejorada de verificación
    statusCheckConfig: {
        initialDelay: 3000, // 3 segundos para primera verificación
        checkInterval: 7000, // 7 segundos entre verificaciones
        maxAttempts: 20, // Máximo 20 intentos (~2.5 minutos)
        finalStates: ['delivered', 'undelivered', 'failed', 'canceled']
    }
};

// FUNCIÓN MEJORADA: Verificación en tiempo real del estado del mensaje
async function monitorMessageStatus(messageSid, phoneNumber, resultItem) {
    const { initialDelay, checkInterval, maxAttempts, finalStates } = APP_CONFIG.statusCheckConfig;
    let attempts = 0;
    let lastStatus = '';
    
    console.log(`🔍 Iniciando monitoreo MEJORADO para: ${phoneNumber}, SID: ${messageSid}`);
    
    const checkStatus = async () => {
        attempts++;
        
        try {
            console.log(`🔄 Verificación MEJORADA (intento ${attempts}/${maxAttempts}) para: ${phoneNumber}`);
            
            const statusResponse = await fetch(`/.netlify/functions/send-sms?messageSid=${messageSid}&t=${Date.now()}`);
            
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log(`📊 Respuesta MEJORADA para ${phoneNumber}:`, {
                    status: statusData.status,
                    source: statusData.source,
                    errorCode: statusData.errorCode
                });
                
                if (statusData.success) {
                    lastStatus = statusData.status;
                    
                    // Actualizar interfaz con estado real
                    updateMessageStatusInUI(phoneNumber, statusData.status, messageSid, resultItem);
                    
                    // Actualizar resultados globales
                    const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
                    if (resultIndex !== -1) {
                        appState.results[resultIndex].finalStatus = statusData.status;
                        appState.results[resultIndex].success = statusData.status === 'delivered';
                        appState.results[resultIndex].lastCheck = new Date().toISOString();
                        appState.results[resultIndex].attempts = attempts;
                        appState.results[resultIndex].source = statusData.source;
                    }
                    
                    // LÓGICA MEJORADA: Detección de estados finales
                    if (finalStates.includes(statusData.status)) {
                        console.log(`🏁 Estado final VERDADERO alcanzado para ${phoneNumber}: ${statusData.status}`);
                        
                        // Si es "sent" pero hemos hecho varias verificaciones, considerar como posible "delivered"
                        if (statusData.status === 'sent' && attempts >= 8) {
                            console.log(`⚠️ Estado "sent" persistente para ${phoneNumber} después de ${attempts} intentos. Posible entrega.`);
                            updateMessageStatusInUI(phoneNumber, 'likely_delivered', messageSid, resultItem);
                            
                            if (resultIndex !== -1) {
                                appState.results[resultIndex].success = true;
                                appState.results[resultIndex].finalStatus = 'likely_delivered';
                            }
                        }
                        
                        return;
                    }
                    
                    // LÓGICA ESPECIAL: Si el estado es "sent" por mucho tiempo, podría ser entregado
                    if (statusData.status === 'sent' && attempts >= 12) {
                        console.log(`📨 Estado "sent" persistente para ${phoneNumber}. Considerando como posible entrega.`);
                        updateMessageStatusInUI(phoneNumber, 'sent_persistent', messageSid, resultItem);
                    }
                    
                } else {
                    console.log(`❌ Error en respuesta para ${phoneNumber}:`, statusData.error);
                }
            } else {
                console.log(`⚠️ Respuesta no OK para ${phoneNumber}:`, statusResponse.status);
            }
        } catch (error) {
            console.error(`❌ Error verificando estado para ${phoneNumber}:`, error);
        }
        
        // Continuar verificando si no es estado final y no hemos excedido los intentos
        if (attempts < maxAttempts) {
            console.log(`⏰ Esperando ${checkInterval/1000}s para próxima verificación de ${phoneNumber}...`);
            setTimeout(checkStatus, checkInterval);
        } else {
            // Timeout después de todos los intentos
            console.log(`⏰ Timeout de verificación para ${phoneNumber} después de ${maxAttempts} intentos. Último estado: ${lastStatus}`);
            
            // LÓGICA INTELIGENTE: Determinar resultado basado en último estado
            let finalStatus = 'timeout';
            let success = false;
            
            if (lastStatus === 'sent' || lastStatus === 'delivered') {
                finalStatus = 'sent_no_final_confirmation';
                success = true; // Probablemente entregado pero sin confirmación final
            } else if (lastStatus === 'undelivered' || lastStatus === 'failed') {
                finalStatus = lastStatus;
                success = false;
            }
            
            updateMessageStatusInUI(phoneNumber, finalStatus, messageSid, resultItem);
            
            // Actualizar appState
            const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
            if (resultIndex !== -1) {
                appState.results[resultIndex].success = success;
                appState.results[resultIndex].finalStatus = finalStatus;
                appState.results[resultIndex].timeout = true;
                appState.results[resultIndex].lastStatus = lastStatus;
            }
        }
    };
    
    // Iniciar la verificación después del delay inicial
    setTimeout(checkStatus, initialDelay);
}

// ACTUALIZAR la función updateMessageStatusInUI para incluir nuevos estados
function updateMessageStatusInUI(phoneNumber, status, messageSid, resultItem) {
    const statusMap = {
        'queued': { class: 'processing', text: '⏳ En cola de envío...', emoji: '⏳' },
        'sending': { class: 'processing', text: '📤 Enviando a operador...', emoji: '📤' },
        'sent': { class: 'processing', text: '✅ Enviado al operador', emoji: '✅' },
        'delivered': { class: 'success', text: '📱 ENTREGADO al dispositivo', emoji: '📱' },
        'undelivered': { class: 'error', text: '❌ NO ENTREGADO - Número inactivo/apagado', emoji: '❌' },
        'failed': { class: 'error', text: '🚫 FALLADO - Error de red/operador', emoji: '🚫' },
        'timeout': { class: 'error', text: '⏰ Timeout - No se pudo verificar estado final', emoji: '⏰' },
        // NUEVOS ESTADOS MEJORADOS
        'likely_delivered': { class: 'success', text: '📱 PROBABLEMENTE ENTREGADO (confirmación pendiente)', emoji: '📱' },
        'sent_persistent': { class: 'processing', text: '🔄 Enviado - Esperando confirmación final...', emoji: '🔄' },
        'sent_no_final_confirmation': { class: 'success', text: '📱 ENVIADO - Probablemente entregado', emoji: '📱' }
    };
    
    const statusInfo = statusMap[status] || { 
        class: 'processing', 
        text: `Estado: ${status}`, 
        emoji: '❓' 
    };
    
    resultItem.className = `result-item ${statusInfo.class}`;
    resultItem.innerHTML = `
        <div class="result-content">
            <strong>${statusInfo.emoji} ${phoneNumber}</strong>
            <span class="result-detail">${statusInfo.text}</span>
            <small>SID: ${messageSid} | Estado: ${status}</small>
        </div>
    `;
}

// FUNCIÓN MEJORADA: Envío de verificación con manejo de estados
async function sendVerificationRequest(phoneNumber) {
    const backendUrl = '/.netlify/functions/send-sms';
    
    try {
        console.log(`🌐 Enviando solicitud MEJORADA a backend para: ${phoneNumber}`);
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                number: phoneNumber,
                user: appState.currentUser.email
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`📨 Respuesta MEJORADA del backend para ${phoneNumber}:`, {
            success: result.success,
            messageSid: result.messageSid,
            initialStatus: result.initialStatus
        });
        return result;
        
    } catch (error) {
        console.error('❌ Error en la solicitud MEJORADA:', error);
        return {
            success: false,
            error: 'No se pudo conectar con el servicio de verificación'
        };
    }
}
