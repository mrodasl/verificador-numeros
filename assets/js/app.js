// ========== SISTEMA MEJORADO DE USUARIOS ==========

// Configuración
const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500,
    sessionTimeout: 30 // minutos
};

// Estado de la aplicación
let appState = {
    currentUser: null,
    results: [],
    isProcessing: false,
    inactivityTimer: null
};

// Usuario SUPER ADMIN por defecto (tú)
const SUPER_ADMIN = {
    email: 'mrodas@iom.int',
    password: '130028',
    name: 'Administrador Principal',
    role: 'superadmin',
    department: 'TI',
    createdAt: new Date().toISOString()
};

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🔧 Inicializando aplicación...');
    
    // Cargar usuarios desde localStorage o crear estructura inicial
    initializeUsers();
    
    // Verificar si hay una sesión activa
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            appState.currentUser = JSON.parse(savedUser);
            console.log('👤 Usuario en sesión:', appState.currentUser.email);
            startInactivityTimer();
            showApp();
        } catch (error) {
            console.error('Error parseando usuario guardado:', error);
            localStorage.removeItem('currentUser');
        }
    } else {
        console.log('🔐 No hay sesión activa');
        showLogin();
    }
    
    // Configurar event listeners
    setupEventListeners();
}

function initializeUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    console.log('📋 Inicializando usuarios...');
    
    if (!storedUsers) {
        // Primera vez - crear estructura con super admin
        console.log('👥 Creando usuario super admin por primera vez');
        const initialUsers = [SUPER_ADMIN];
        localStorage.setItem('platformUsers', JSON.stringify(initialUsers));
        console.log('✅ Usuarios iniciales creados:', initialUsers);
    } else {
        console.log('✅ Usuarios ya existen en localStorage');
    }
}

function getUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    if (!storedUsers) {
        console.log('⚠️ No hay usuarios en localStorage, retornando super admin');
        return [SUPER_ADMIN];
    }
    
    try {
        const users = JSON.parse(storedUsers);
        console.log(`📊 ${users.length} usuarios cargados`);
        return users;
    } catch (error) {
        console.error('❌ Error parseando usuarios:', error);
        return [SUPER_ADMIN];
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem('platformUsers', JSON.stringify(users));
        console.log('💾 Usuarios guardados:', users.length);
    } catch (error) {
        console.error('❌ Error guardando usuarios:', error);
    }
}

function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // Enter en los campos de login
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    
    if (emailInput && passwordInput) {
        emailInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
        
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
        console.log('✅ Event listeners de login configurados');
    }
    
    // Contador de números en tiempo real
    const numbersInput = document.getElementById('numbersInput');
    if (numbersInput) {
        numbersInput.addEventListener('input', updateNumberCount);
        console.log('✅ Event listener de números configurado');
    }
}

// ========== FUNCIONES DE AUTENTICACIÓN MEJORADAS ==========

function login() {
    console.log('🔐 Intentando login...');
    
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    console.log('📧 Email ingresado:', email);
    console.log('🔑 Contraseña ingresada:', password ? '***' : 'vacía');

    // Validaciones básicas
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }

    // Buscar usuario en la base de datos
    const users = getUsers();
    console.log('👥 Buscando en usuarios:', users.map(u => u.email));
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Login exitoso
        console.log('✅ Login exitoso para:', user.email);
        appState.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        startInactivityTimer();
        showApp();
        clearError();
    } else {
        console.log('❌ Credenciales incorrectas');
        showError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
    }
}

function logout() {
    console.log('🚪 Cerrando sesión...');
    clearInactivityTimer();
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Sesión cerrada correctamente', 'success');
    setTimeout(() => {
        showLogin();
    }, 1000);
}

function showLogin() {
    console.log('🔄 Mostrando pantalla de login...');
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    // Limpiar campos
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    clearError();
}

// ========== SISTEMA DE INACTIVIDAD ==========

function startInactivityTimer() {
    // Limpiar timer existente
    clearInactivityTimer();
    
    // Obtener timeout configurado
    const timeoutMinutes = parseInt(localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout);
    const timeoutMs = timeoutMinutes * 60 * 1000; // Convertir a milisegundos
    
    console.log(`⏰ Timer de inactividad configurado: ${timeoutMinutes} minutos`);
    
    // Configurar eventos que resetearán el timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Iniciar timer
    appState.inactivityTimer = setTimeout(() => {
        console.log('⏰ Timer de inactividad expirado');
        showNotification(`Sesión cerrada por inactividad (${timeoutMinutes} minutos)`, 'warning');
        logout();
    }, timeoutMs);
}

function resetInactivityTimer() {
    if (appState.currentUser) {
        startInactivityTimer();
    }
}

function clearInactivityTimer() {
    if (appState.inactivityTimer) {
        clearTimeout(appState.inactivityTimer);
        appState.inactivityTimer = null;
        console.log('⏰ Timer de inactividad limpiado');
    }
}

function updateSessionTimeout() {
    const timeoutInput = document.getElementById('sessionTimeout');
    const newTimeout = parseInt(timeoutInput.value);
    
    if (newTimeout >= 5 && newTimeout <= 120) {
        localStorage.setItem('sessionTimeout', newTimeout.toString());
        startInactivityTimer(); // Reiniciar con nuevo tiempo
        showNotification(`Timeout de sesión actualizado a ${newTimeout} minutos`, 'success');
    } else {
        showError('El tiempo debe estar entre 5 y 120 minutos');
    }
}

// ========== PANEL DE ADMINISTRACIÓN ==========

function showAdminPanel() {
    console.log('👥 Mostrando panel de administración...');
    // Ocultar aplicación principal
    document.getElementById('appContainer').classList.add('hidden');
    // Mostrar panel de admin
    document.getElementById('adminPanel').classList.remove('hidden');
    // Actualizar nombre de usuario en el header del admin
    document.getElementById('adminCurrentUser').textContent = appState.currentUser.name;
    // Cargar lista de usuarios
    loadUsersList();
    
    // Cargar configuración actual
    const currentTimeout = localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout;
    document.getElementById('sessionTimeout').value = currentTimeout;
}

function hideAdminPanel() {
    console.log('🔙 Volviendo a la aplicación principal...');
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function loadUsersList() {
    const users = getUsers();
    const usersList = document.getElementById('usersList');
    
    if (!usersList) {
        console.error('❌ Elemento usersList no encontrado');
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item ${user.role === 'superadmin' ? 'superadmin' : ''}">
            <div class="user-info">
                <strong>${user.name}</strong>
                <span class="user-email">${user.email}</span>
                <span class="user-role">${getRoleBadge(user.role)}</span>
                <span class="user-created">Creado: ${new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="user-actions">
                ${user.role !== 'superadmin' ? `
                    <button onclick="deleteUser('${user.email}')" class="btn-danger">Eliminar</button>
                ` : '<em>Super Admin</em>'}
            </div>
        </div>
    `).join('');
    
    console.log(`📋 Lista de usuarios cargada: ${users.length} usuarios`);
}

function getRoleBadge(role) {
    const badges = {
        'superadmin': '<span class="badge superadmin-badge">Super Admin</span>',
        'admin': '<span class="badge admin-badge">Admin</span>',
        'user': '<span class="badge user-badge">Usuario</span>'
    };
    return badges[role] || badges.user;
}

function addNewUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;

    console.log('👤 Intentando agregar usuario:', { email, name, role });

    // Validaciones
    if (!email || !password || !name) {
        showError('Todos los campos son requeridos');
        return;
    }

    if (!email.includes('@')) {
        showError('Por favor ingresa un correo válido');
        return;
    }

    // Verificar que el usuario no exista
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        showError('Este correo ya está registrado');
        return;
    }

    // Crear nuevo usuario
    const newUser = {
        email: email,
        password: password,
        name: name,
        role: role,
        department: 'Institución',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    
    // Limpiar formulario y actualizar lista
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserName').value = '';
    
    showNotification('Usuario agregado correctamente', 'success');
    loadUsersList();
}

function deleteUser(email) {
    if (email === 'mrodas@iom.int') {
        showError('No se puede eliminar al Super Administrador');
        return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${email}?`)) {
        const users = getUsers();
        const filteredUsers = users.filter(u => u.email !== email);
        saveUsers(filteredUsers);
        showNotification('Usuario eliminado correctamente', 'success');
        loadUsersList();
    }
}

// ========== FUNCIONES DE INTERFAZ MEJORADAS ==========

function showApp() {
    console.log('🖥️ Mostrando aplicación principal...');
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    document.getElementById('currentUser').textContent = appState.currentUser.name;
    
    // Mostrar botón de admin si es admin o superadmin
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn && (appState.currentUser.role === 'admin' || appState.currentUser.role === 'superadmin')) {
        adminBtn.classList.remove('hidden');
        console.log('👥 Botón de admin mostrado');
    }
    
    // Limpiar campos del login
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    
    console.log('✅ Aplicación principal mostrada correctamente');
}

function showNotification(message, type = 'info') {
    console.log(`💬 Notificación [${type}]:`, message);
    
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function showError(message) {
    console.error('❌ Error mostrado:', message);
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

// ========== FUNCIONES DE PROCESAMIENTO DE NÚMEROS MEJORADAS ==========

function updateNumberCount() {
    const input = document.getElementById('numbersInput').value;
    const numbers = parsePhoneNumbers(input);
    const count = numbers.length;
    
    document.getElementById('numberCount').textContent = `${count} números listos`;
    
    // Validar límite
    if (count > APP_CONFIG.maxNumbersPerBatch) {
        document.getElementById('numberCount').style.color = '#dc3545';
        document.getElementById('numberCount').textContent += ` (Máximo: ${APP_CONFIG.maxNumbersPerBatch})`;
    } else {
        document.getElementById('numberCount').style.color = '#28a745';
    }
}

function parsePhoneNumbers(input) {
    return input.split('\n')
        .map(num => num.trim())
        .filter(num => {
            // Validación básica de número guatemalteco
            return num.length > 0 && num.replace(/\s+/g, '').startsWith('+502');
        })
        .slice(0, APP_CONFIG.maxNumbersPerBatch); // Limitar por lote
}

async function processNumbers() {
    if (appState.isProcessing) {
        alert('Ya hay un proceso en ejecución. Por favor espera.');
        return;
    }
    
    const input = document.getElementById('numbersInput').value;
    const numbers = parsePhoneNumbers(input);
    
    if (numbers.length === 0) {
        alert('Por favor ingresa al menos un número telefónico válido de Guatemala (+502).');
        return;
    }
    
    if (numbers.length > APP_CONFIG.maxNumbersPerBatch) {
        alert(`Máximo ${APP_CONFIG.maxNumbersPerBatch} números por lote. Por favor reduce la cantidad.`);
        return;
    }
    
    // Iniciar procesamiento
    appState.isProcessing = true;
    appState.results = [];
    
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;
    processBtn.textContent = `Procesando ${numbers.length} números...`;
    
    // Preparar interfaz de resultados
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    // Contadores
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`🔨 Iniciando procesamiento de ${numbers.length} números`);
    
    // Procesar cada número
    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        
        // Mostrar progreso
        const progress = Math.round(((i + 1) / numbers.length) * 100);
        processBtn.textContent = `Procesando... ${progress}% (${i + 1}/${numbers.length})`;
        
        // Crear elemento de resultado
        const resultItem = createResultItem(number, 'processing', 'Enviando verificación...');
        resultsList.appendChild(resultItem);
        
        try {
            console.log(`📤 Enviando verificación para: ${number}`);
            
            // Enviar solicitud al backend
            const result = await sendVerificationRequest(number);
            
            if (result.success && result.messageSid) {
                console.log(`✅ SMS creado para ${number}, SID: ${result.messageSid}, Estado inicial: ${result.initialStatus}`);
                
                // INICIAR VERIFICACIÓN CONTINUA DEL ESTADO
                monitorMessageStatus(result.messageSid, number, resultItem);
                
                // Contar como "en proceso" inicialmente
                appState.results.push({
                    number: number,
                    success: null, // Se determinará después
                    messageSid: result.messageSid,
                    initialStatus: result.initialStatus,
                    timestamp: new Date().toISOString(),
                    user: appState.currentUser.email
                });
            } else {
                // Error inmediato
                console.log(`❌ Error inmediato para ${number}:`, result.error);
                resultItem.className = 'result-item error';
                resultItem.innerHTML = `
                    <div class="result-content">
                        <strong>❌ ${number}</strong>
                        <span class="result-detail">Error: ${result.error}</span>
                    </div>
                `;
                errorCount++;
                
                appState.results.push({
                    number: number,
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                    user: appState.currentUser.email
                });
            }
            
        } catch (error) {
            console.error(`❌ Error de conexión para ${number}:`, error);
            resultItem.className = 'result-item error';
            resultItem.innerHTML = `
                <div class="result-content">
                    <strong>❌ ${number}</strong>
                    <span class="result-detail">Error de conexión: ${error.message}</span>
                </div>
            `;
            errorCount++;
            
            appState.results.push({
                number: number,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                user: appState.currentUser.email
            });
        }
        
        // Actualizar contadores
        updateResultsCount(successCount, errorCount, numbers.length);
        
        // Pequeña pausa entre requests
        if (i < numbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, APP_CONFIG.delayBetweenRequests));
        }
    }
    
    // Finalizar procesamiento
    processBtn.disabled = false;
    processBtn.textContent = 'Iniciar Verificación';
    appState.isProcessing = false;
    
    console.log(`🏁 Procesamiento completado. Total resultados: ${appState.results.length}`);
    
    // Mostrar resumen después de 2 segundos (para dar tiempo a las actualizaciones)
    setTimeout(() => {
        const finalSuccessCount = appState.results.filter(r => r.success === true).length;
        const finalErrorCount = appState.results.filter(r => r.success === false).length;
        const pendingCount = appState.results.filter(r => r.success === null).length;
        
        console.log(`📊 Resumen final - Entregados: ${finalSuccessCount}, Fallidos: ${finalErrorCount}, Pendientes: ${pendingCount}`);
        showCompletionMessage(finalSuccessCount, finalErrorCount, pendingCount);
    }, 2000);
}

// FUNCIÓN MEJORADA: Verificación en tiempo real del estado del mensaje
async function monitorMessageStatus(messageSid, phoneNumber, resultItem) {
    const maxAttempts = 30; // 150 segundos total (30 * 5s)
    let attempts = 0;
    
    console.log(`🔍 Iniciando monitoreo para: ${phoneNumber}, SID: ${messageSid}`);
    
    const checkStatus = async () => {
        attempts++;
        
        try {
            console.log(`🔄 Verificando estado (intento ${attempts}/${maxAttempts}) para: ${phoneNumber}`);
            
            const statusResponse = await fetch(`/.netlify/functions/send-sms?messageSid=${messageSid}`);
            
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log(`📊 Respuesta estado para ${phoneNumber}:`, statusData);
                
                if (statusData.success) {
                    // Actualizar interfaz con estado real
                    updateMessageStatusInUI(phoneNumber, statusData.status, messageSid, resultItem);
                    
                    // Actualizar resultados globales
                    const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
                    if (resultIndex !== -1) {
                        appState.results[resultIndex].finalStatus = statusData.status;
                        appState.results[resultIndex].success = statusData.status === 'delivered';
                        console.log(`✅ Estado actualizado en appState: ${statusData.status}`);
                    }
                    
                    // Si es estado final, detener verificación
                    if (isFinalStatus(statusData.status)) {
                        console.log(`🏁 Estado final alcanzado para ${phoneNumber}: ${statusData.status}`);
                        return;
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
            console.log(`⏰ Esperando 5s para próxima verificación de ${phoneNumber}...`);
            setTimeout(checkStatus, 5000); // Verificar cada 5 segundos
        } else {
            // Timeout después de 150 segundos
            console.log(`⏰ Timeout de verificación para ${phoneNumber} después de ${maxAttempts} intentos`);
            updateMessageStatusInUI(phoneNumber, 'timeout', messageSid, resultItem);
            
            // Marcar como fallido en appState
            const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
            if (resultIndex !== -1) {
                appState.results[resultIndex].success = false;
                appState.results[resultIndex].finalStatus = 'timeout';
            }
        }
    };
    
    // Iniciar la verificación después de un pequeño delay
    setTimeout(checkStatus, 2000);
}

// Determinar si un estado es final (no cambiará)
function isFinalStatus(status) {
    const finalStatuses = ['delivered', 'undelivered', 'failed', 'canceled'];
    return finalStatuses.includes(status);
}

// Actualizar la interfaz con el estado real
function updateMessageStatusInUI(phoneNumber, status, messageSid, resultItem) {
    const statusMap = {
        'queued': { class: 'processing', text: '⏳ En cola de envío...', emoji: '⏳' },
        'sending': { class: 'processing', text: '📤 Enviando a operador...', emoji: '📤' },
        'sent': { class: 'processing', text: '✅ Enviado al operador', emoji: '✅' },
        'delivered': { class: 'success', text: '📱 ENTREGADO al dispositivo', emoji: '📱' },
        'undelivered': { class: 'error', text: '❌ NO ENTREGADO - Número inactivo/apagado', emoji: '❌' },
        'failed': { class: 'error', text: '🚫 FALLADO - Error de red/operador', emoji: '🚫' },
        'timeout': { class: 'error', text: '⏰ Timeout - No se pudo verificar estado final', emoji: '⏰' }
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

function createResultItem(number, status, message) {
    const item = document.createElement('div');
    item.className = `result-item ${status}`;
    item.innerHTML = `
        <div class="result-content">
            <strong>${status === 'processing' ? '⏳' : ''} ${number}</strong>
            <span class="result-detail">${message}</span>
        </div>
    `;
    return item;
}

// FUNCIÓN MEJORADA: Envío de verificación con manejo de estados
async function sendVerificationRequest(phoneNumber) {
    const backendUrl = '/.netlify/functions/send-sms';
    
    try {
        console.log(`🌐 Enviando solicitud a backend para: ${phoneNumber}`);
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
        console.log(`📨 Respuesta del backend para ${phoneNumber}:`, result);
        return result;
        
    } catch (error) {
        console.error('❌ Error en la solicitud:', error);
        return {
            success: false,
            error: 'No se pudo conectar con el servicio de verificación'
        };
    }
}

function updateResultsCount(success, error, total) {
    document.getElementById('totalCount').textContent = total;
    document.getElementById('successCount').textContent = success;
    document.getElementById('errorCount').textContent = error;
}

function showCompletionMessage(success, error, pending = 0) {
    const resultsList = document.getElementById('resultsList');
    const completionMsg = document.createElement('div');
    completionMsg.className = 'result-item success';
    
    let message = `Entregados: ${success} | Fallidos: ${error}`;
    if (pending > 0) {
        message += ` | Pendientes: ${pending}`;
    }
    
    completionMsg.innerHTML = `
        <div class="result-content">
            <strong>🎉 Proceso completado</strong>
            <span class="result-detail">
                ${message} | 
                <button onclick="exportResults()" style="background: none; border: none; color: #007bff; text-decoration: underline; cursor: pointer;">
                    Exportar resultados
                </button>
            </span>
        </div>
    `;
    resultsList.appendChild(completionMsg);
}

// ========== FUNCIONES DE EXPORTACIÓN ==========

function exportResults() {
    if (appState.results.length === 0) {
        alert('No hay resultados para exportar.');
        return;
    }
    
    // Crear CSV
    let csv = 'Número,Estado Final,MessageSID,Error,Timestamp,Usuario\n';
    
    appState.results.forEach(result => {
        const estado = result.success === true ? 'ENTREGADO' : 
                      result.success === false ? 'FALLADO' : 'PENDIENTE';
        const messageSid = result.messageSid || 'N/A';
        const error = result.error ? `"${result.error.replace(/"/g, '""')}"` : 'N/A';
        const estadoFinal = result.finalStatus || result.initialStatus || 'Desconocido';
        
        csv += `"${result.number}",${estado},${messageSid},${error},${result.timestamp},"${result.user}"\n`;
    });
    
    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `verificacion_numeros_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
});

// Exportar para uso global
window.appState = appState;
window.processNumbers = processNumbers;
window.exportResults = exportResults;
window.login = login;
window.logout = logout;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.addNewUser = addNewUser;
window.deleteUser = deleteUser;
window.updateSessionTimeout = updateSessionTimeout;
