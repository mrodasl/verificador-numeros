// ========== SISTEMA MEJORADO DE USUARIOS ==========

// Configuración
const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500,
    sessionTimeout: 30, // minutos
    // CONFIGURACIÓN MEJORADA: Más tiempo para verificación
    statusCheckConfig: {
        initialDelay: 5000, // 5 segundos para primera verificación
        checkInterval: 10000, // 10 segundos entre verificaciones (antes 7s)
        maxAttempts: 30, // Máximo 30 intentos (~5 minutos) - ANTES: 20
        finalStates: ['delivered', 'undelivered', 'failed', 'canceled']
    }
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
    console.log('🚀 DOM cargado, inicializando aplicación...');
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
            showLogin();
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
    
    // Asegurarnos de que todos los elementos existan antes de manipularlos
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const adminPanel = document.getElementById('adminPanel');
    
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    
    // Limpiar campos
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    clearError();
    
    console.log('✅ Pantalla de login mostrada');
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
    
    // Asegurarnos de que todos los elementos existan antes de manipularlos
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const adminPanel = document.getElementById('adminPanel');
    const currentUserSpan = document.getElementById('currentUser');
    const adminBtn = document.getElementById('adminBtn');
    
    if (loginContainer) loginContainer.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
    
    if (currentUserSpan && appState.currentUser) {
        currentUserSpan.textContent = appState.currentUser.name;
    }
    
    // Mostrar botón de admin si es admin o superadmin
    if (adminBtn && appState.currentUser && (appState.currentUser.role === 'admin' || appState.currentUser.role === 'superadmin')) {
        adminBtn.classList.remove('hidden');
        console.log('👥 Botón de admin mostrado');
    }
    
    // Limpiar campos del login
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
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
    
    // Inicializar contadores a CERO
    updateResultsCount(0, 0, numbers.length);
    
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
                
                appState.results.push({
                    number: number,
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                    user: appState.currentUser.email
                });
                
                // ACTUALIZAR CONTADORES INMEDIATAMENTE
                updateLiveCounters();
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
            
            appState.results.push({
                number: number,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                user: appState.currentUser.email
            });
            
            // ACTUALIZAR CONTADORES INMEDIATAMENTE
            updateLiveCounters();
        }
        
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
    
    // MOSTRAR RESUMEN FINAL MEJORADO - Esperar 5 segundos adicionales
    setTimeout(() => {
        showFinalSummary();
    }, 5000);
}

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
            
            // CONSULTA DIRECTA A TWILIO - FORZAR ACTUALIZACIÓN
            const statusResponse = await fetch(`/.netlify/functions/send-sms?messageSid=${messageSid}&force=true&t=${Date.now()}`);
            
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log(`📊 Respuesta MEJORADA para ${phoneNumber}:`, {
                    status: statusData.status,
                    source: statusData.source,
                    errorCode: statusData.errorCode,
                    errorMessage: statusData.errorMessage
                });
                
                if (statusData.success) {
                    lastStatus = statusData.status;
                    
                    // ACTUALIZACIÓN CRÍTICA: Respetar SIEMPRE el estado de Twilio
                    updateMessageStatusInUI(phoneNumber, statusData.status, messageSid, resultItem);
                    
                    // Actualizar resultados globales con estado REAL de Twilio
                    const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
                    if (resultIndex !== -1) {
                        appState.results[resultIndex].finalStatus = statusData.status;
                        appState.results[resultIndex].success = (statusData.status === 'delivered');
                        appState.results[resultIndex].lastCheck = new Date().toISOString();
                        appState.results[resultIndex].attempts = attempts;
                        appState.results[resultIndex].source = statusData.source;
                        appState.results[resultIndex].errorCode = statusData.errorCode;
                        appState.results[resultIndex].errorMessage = statusData.errorMessage;
                        
                        // ACTUALIZAR CONTADORES EN TIEMPO REAL
                        updateLiveCounters();
                    }
                    
                    // LÓGICA CORREGIDA: Solo detener si es estado FINAL real
                    if (isFinalStatus(statusData.status)) {
                        console.log(`🏁 Estado FINAL REAL de Twilio para ${phoneNumber}: ${statusData.status}`);
                        return; // Detener verificaciones
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
        if (attempts < maxAttempts && !isFinalStatus(lastStatus)) {
            console.log(`⏰ Esperando ${checkInterval/1000}s para próxima verificación de ${phoneNumber}...`);
            setTimeout(checkStatus, checkInterval);
        } else {
            // Timeout después de todos los intentos - LÓGICA MEJORADA
            console.log(`⏰ Timeout de verificación para ${phoneNumber}. Último estado REAL: ${lastStatus}`);
            
            // DETERMINAR ESTADO FINAL INTELIGENTEMENTE
            let finalStatus = lastStatus;
            let finalSuccess = (lastStatus === 'delivered');
            
            // Si después de 30 intentos sigue como "sent", probablemente no se entregó
            if (lastStatus === 'sent' && attempts >= maxAttempts) {
                finalStatus = 'sent_timeout';
                finalSuccess = false; // Considerar como no entregado después de timeout extendido
                console.log(`⚠️ Estado "sent" persistente después de ${maxAttempts} intentos. Marcando como no entregado.`);
            }
            
            // USAR ESTADO FINAL DETERMINADO
            updateMessageStatusInUI(phoneNumber, finalStatus, messageSid, resultItem);
            
            // Actualizar appState con estado real
            const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
            if (resultIndex !== -1) {
                appState.results[resultIndex].success = finalSuccess;
                appState.results[resultIndex].finalStatus = finalStatus;
                appState.results[resultIndex].timeout = true;
                appState.results[resultIndex].lastStatus = lastStatus;
            }
            
            updateLiveCounters();
        }
    };
    
    // Iniciar la verificación después del delay inicial
    setTimeout(checkStatus, initialDelay);
}

// NUEVA FUNCIÓN: Mostrar resumen final preciso
function showFinalSummary() {
    const finalResults = calculateFinalResults();
    
    console.log(`📊 RESUMEN FINAL PRECISO:`, finalResults);
    
    showCompletionMessage(
        finalResults.success, 
        finalResults.error, 
        finalResults.pending
    );
}

// NUEVA FUNCIÓN: Calcular resultados finales precisos
function calculateFinalResults() {
    const success = appState.results.filter(r => r.success === true).length;
    const error = appState.results.filter(r => r.success === false).length;
    const pending = appState.results.filter(r => r.success === null).length;
    
    return { success, error, pending };
}

// NUEVA FUNCIÓN: Actualizar contadores en tiempo real
function updateLiveCounters() {
    const results = calculateFinalResults();
    
    document.getElementById('successCount').textContent = results.success;
    document.getElementById('errorCount').textContent = results.error;
    document.getElementById('totalCount').textContent = appState.results.length;
}

// Determinar si un estado es final (no cambiará) - VERSIÓN MEJORADA
function isFinalStatus(status) {
    const finalStatuses = [
        'delivered',      // Entregado ✓
        'undelivered',    // No entregado ✓ (ESTE ES EL QUE FALTA)
        'failed',         // Fallado
        'canceled'        // Cancelado
    ];
    return finalStatuses.includes(status);
}

// Actualizar la interfaz con el estado real - VERSIÓN CORREGIDA
function updateMessageStatusInUI(phoneNumber, status, messageSid, resultItem) {
    const statusMap = {
        'queued': { class: 'processing', text: '⏳ En cola de envío...', emoji: '⏳' },
        'sending': { class: 'processing', text: '📤 Enviando a operador...', emoji: '📤' },
        'sent': { class: 'processing', text: '✅ Enviado al operador', emoji: '✅' },
        'delivered': { class: 'success', text: '📱 ENTREGADO al dispositivo', emoji: '📱' },
        'undelivered': { class: 'error', text: '❌ NO ENTREGADO - Número inactivo/apagado', emoji: '❌' }, // ESTADO CRÍTICO
        'failed': { class: 'error', text: '🚫 FALLADO - Error de red/operador', emoji: '🚫' },
        'timeout': { class: 'error', text: '⏰ Timeout - No se pudo verificar estado final', emoji: '⏰' },
        'sent_timeout': { class: 'error', text: '❌ NO ENTREGADO - Timeout después de múltiples intentos', emoji: '❌' }, // NUEVO ESTADO
        'sent_no_final_confirmation': { class: 'processing', text: '🔄 Enviado - Verificando estado final...', emoji: '🔄' }
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

function updateResultsCount(success, error, total) {
    document.getElementById('totalCount').textContent = total;
    document.getElementById('successCount').textContent = success;
    document.getElementById('errorCount').textContent = error;
}

function showCompletionMessage(success, error, pending = 0) {
    const resultsList = document.getElementById('resultsList');
    
    // Eliminar mensaje de completado anterior si existe
    const existingCompletionMsg = document.querySelector('.completion-message');
    if (existingCompletionMsg) {
        existingCompletionMsg.remove();
    }
    
    const completionMsg = document.createElement('div');
    completionMsg.className = 'result-item success completion-message';
    
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
