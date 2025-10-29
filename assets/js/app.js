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
    // Cargar usuarios desde localStorage o crear estructura inicial
    initializeUsers();
    
    // Verificar si hay una sesión activa
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        startInactivityTimer();
        showApp();
    }
    
    // Configurar event listeners
    setupEventListeners();
}

function initializeUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    if (!storedUsers) {
        // Primera vez - crear estructura con super admin
        const initialUsers = [SUPER_ADMIN];
        localStorage.setItem('platformUsers', JSON.stringify(initialUsers));
    }
}

function getUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    return storedUsers ? JSON.parse(storedUsers) : [SUPER_ADMIN];
}

function saveUsers(users) {
    localStorage.setItem('platformUsers', JSON.stringify(users));
}

function setupEventListeners() {
    // Enter en los campos de login
    document.getElementById('emailInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') login();
    });
    
    // Contador de números en tiempo real
    document.getElementById('numbersInput').addEventListener('input', updateNumberCount);
}

// ========== FUNCIONES DE AUTENTICACIÓN MEJORADAS ==========

function login() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    // Validaciones básicas
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }

    // Buscar usuario en la base de datos
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Login exitoso
        appState.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        startInactivityTimer();
        showApp();
        clearError();
    } else {
        showError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
    }
}

function logout() {
    clearInactivityTimer();
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Sesión cerrada correctamente', 'success');
    setTimeout(() => location.reload(), 1000);
}

// ========== SISTEMA DE INACTIVIDAD ==========

function startInactivityTimer() {
    // Limpiar timer existente
    clearInactivityTimer();
    
    // Obtener timeout configurado
    const timeoutMinutes = parseInt(localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout);
    const timeoutMs = timeoutMinutes * 60 * 1000; // Convertir a milisegundos
    
    // Configurar eventos que resetearán el timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    // Iniciar timer
    appState.inactivityTimer = setTimeout(() => {
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
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function loadUsersList() {
    const users = getUsers();
    const usersList = document.getElementById('usersList');
    
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
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('currentUser').textContent = appState.currentUser.name;
    
    // Mostrar botón de admin si es admin o superadmin
    if (appState.currentUser.role === 'admin' || appState.currentUser.role === 'superadmin') {
        document.getElementById('adminBtn').classList.remove('hidden');
    }
    
    // Limpiar campos del login
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
}

function showNotification(message, type = 'info') {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearError() {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
}

// ========== FUNCIONES DE PROCESAMIENTO DE NÚMEROS ==========

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
            // Enviar solicitud al backend
            const response = await sendVerificationRequest(number);
            
            if (response.success) {
                resultItem.className = 'result-item success';
                resultItem.innerHTML = `
                    <div class="result-content">
                        <strong>✅ ${number}</strong>
                        <span class="result-detail">SMS enviado correctamente</span>
                        <small>SID: ${response.messageSid}</small>
                    </div>
                `;
                successCount++;
            } else {
                resultItem.className = 'result-item error';
                resultItem.innerHTML = `
                    <div class="result-content">
                        <strong>❌ ${number}</strong>
                        <span class="result-detail">Error: ${response.error}</span>
                    </div>
                `;
                errorCount++;
            }
            
            // Guardar resultado
            appState.results.push({
                number: number,
                success: response.success,
                messageSid: response.messageSid,
                error: response.error,
                timestamp: new Date().toISOString(),
                user: appState.currentUser.email
            });
            
        } catch (error) {
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
    
    // Mostrar resumen
    showCompletionMessage(successCount, errorCount);
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

async function sendVerificationRequest(phoneNumber) {
    // IMPORTANTE: Esta URL se configurará cuando despliegues en Netlify
    const backendUrl = '/.netlify/functions/send-sms';
    
    try {
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
        
        return await response.json();
        
    } catch (error) {
        console.error('Error en la solicitud:', error);
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

function showCompletionMessage(success, error) {
    const resultsList = document.getElementById('resultsList');
    const completionMsg = document.createElement('div');
    completionMsg.className = 'result-item success';
    completionMsg.innerHTML = `
        <div class="result-content">
            <strong>🎉 Proceso completado</strong>
            <span class="result-detail">
                Exitosos: ${success} | Fallidos: ${error} | 
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
    let csv = 'Número,Estado,MessageSID,Error,Timestamp,Usuario\n';
    
    appState.results.forEach(result => {
        const estado = result.success ? 'EXITOSO' : 'FALLIDO';
        const messageSid = result.messageSid || 'N/A';
        const error = result.error ? `"${result.error.replace(/"/g, '""')}"` : 'N/A';
        
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
