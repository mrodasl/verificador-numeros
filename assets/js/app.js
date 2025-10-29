// ========== CONFIGURACIÓN Y ESTADO ==========

const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500,
    sessionTimeout: 30 // minutos
};

let appState = {
    currentUser: null,
    results: [],
    isProcessing: false,
    inactivityTimer: null
};

// ========== INICIALIZACIÓN ==========

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Verificar si hay una sesión activa
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        startInactivityTimer();
        showApp();
    }
    
    setupEventListeners();
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

// ========== SISTEMA DE AUTENTICACIÓN (RAILWAY API) ==========

async function login() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        
        if (result.success) {
            // Login exitoso
            appState.currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            startInactivityTimer();
            showApp();
            clearError();
        } else {
            showError(result.error || 'Credenciales incorrectas');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showError('Error de conexión con el servidor. Por favor intenta nuevamente.');
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
    clearInactivityTimer();
    
    const timeoutMinutes = parseInt(localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
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

async function updateSessionTimeout() {
    const timeoutInput = document.getElementById('sessionTimeout');
    const newTimeout = parseInt(timeoutInput.value);
    
    if (newTimeout >= 5 && newTimeout <= 120) {
        try {
            const response = await fetch('/api/settings/session_timeout', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: newTimeout.toString() })
            });

            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('sessionTimeout', newTimeout.toString());
                startInactivityTimer();
                showNotification(`Timeout de sesión actualizado a ${newTimeout} minutos`, 'success');
            } else {
                showError('Error al actualizar la configuración');
            }
        } catch (error) {
            showError('Error de conexión con el servidor');
        }
    } else {
        showError('El tiempo debe estar entre 5 y 120 minutos');
    }
}

// ========== PANEL DE ADMINISTRACIÓN (RAILWAY API) ==========

async function showAdminPanel() {
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    document.getElementById('adminCurrentUser').textContent = appState.currentUser.name;
    
    await loadUsersList();
    await loadSessionSettings();
}

function hideAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

async function loadUsersList() {
    try {
        const response = await fetch('/api/users');
        const result = await response.json();
        
        if (result.success) {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = result.users.map(user => `
                <div class="user-item ${user.role === 'superadmin' ? 'superadmin' : ''}">
                    <div class="user-info">
                        <strong>${user.name}</strong>
                        <span class="user-email">${user.email}</span>
                        <span class="user-role">${getRoleBadge(user.role)}</span>
                        <span class="user-created">Creado: ${new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="user-actions">
                        ${user.role !== 'superadmin' ? `
                            <button onclick="deleteUser('${user.email}')" class="btn-danger">Eliminar</button>
                        ` : '<em>Super Admin</em>'}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        showError('Error al cargar la lista de usuarios');
    }
}

async function loadSessionSettings() {
    try {
        const response = await fetch('/api/settings');
        const result = await response.json();
        
        if (result.success) {
            const currentTimeout = result.settings.session_timeout || APP_CONFIG.sessionTimeout;
            document.getElementById('sessionTimeout').value = currentTimeout;
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function getRoleBadge(role) {
    const badges = {
        'superadmin': '<span class="badge superadmin-badge">Super Admin</span>',
        'admin': '<span class="badge admin-badge">Admin</span>',
        'user': '<span class="badge user-badge">Usuario</span>'
    };
    return badges[role] || badges.user;
}

async function addNewUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!email || !password || !name) {
        showError('Todos los campos son requeridos');
        return;
    }

    if (!email.includes('@')) {
        showError('Por favor ingresa un correo válido');
        return;
    }

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, name, role })
        });

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('newUserEmail').value = '';
            document.getElementById('newUserPassword').value = '';
            document.getElementById('newUserName').value = '';
            showNotification('Usuario agregado correctamente', 'success');
            await loadUsersList();
        } else {
            showError(result.error);
        }
    } catch (error) {
        console.error('Error agregando usuario:', error);
        showError('Error de conexión con el servidor');
    }
}

async function deleteUser(email) {
    if (email === 'mrodas@iom.int') {
        showError('No se puede eliminar al Super Administrador');
        return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${email}?`)) {
        try {
            const response = await fetch(`/api/users/${email}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.success) {
                showNotification('Usuario eliminado correctamente', 'success');
                await loadUsersList();
            } else {
                showError(result.error);
            }
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            showError('Error de conexión con el servidor');
        }
    }
}

// ========== INTERFAZ DE USUARIO ==========

function showApp() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('currentUser').textContent = appState.currentUser.name;
    
    if (appState.currentUser.role === 'admin' || appState.currentUser.role === 'superadmin') {
        document.getElementById('adminBtn').classList.remove('hidden');
    }
    
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#fff3cd'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#856404'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#ffeaa7'};
        border-radius: 5px;
        z-index: 10000;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
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

// ========== VERIFICACIÓN DE NÚMEROS (RAILWAY API) ==========

function updateNumberCount() {
    const input = document.getElementById('numbersInput').value;
    const numbers = parsePhoneNumbers(input);
    const count = numbers.length;
    
    document.getElementById('numberCount').textContent = `${count} números listos`;
    
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
            return num.length > 0 && num.replace(/\s+/g, '').startsWith('+502');
        })
        .slice(0, APP_CONFIG.maxNumbersPerBatch);
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
    
    appState.isProcessing = true;
    appState.results = [];
    
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;
    processBtn.textContent = `Procesando ${numbers.length} números...`;
    
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        
        const progress = Math.round(((i + 1) / numbers.length) * 100);
        processBtn.textContent = `Procesando... ${progress}% (${i + 1}/${numbers.length})`;
        
        const resultItem = createResultItem(number, 'processing', 'Enviando verificación...');
        resultsList.appendChild(resultItem);
        
        try {
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
            
            appState.results.push({
                number: number,
                success: response.success,
                messageSid: response.messageSid,
                error: response.error,
                timestamp: new Date().toISOString()
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
                timestamp: new Date().toISOString()
            });
        }
        
        updateResultsCount(successCount, errorCount, numbers.length);
        
        if (i < numbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, APP_CONFIG.delayBetweenRequests));
        }
    }
    
    processBtn.disabled = false;
    processBtn.textContent = 'Iniciar Verificación';
    appState.isProcessing = false;
    
    showCompletionMessage(successCount, errorCount);
}

async function sendVerificationRequest(phoneNumber) {
    // NUEVA URL para Railway
    const backendUrl = '/api/send-sms';
    
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

// ========== EXPORTACIÓN DE RESULTADOS ==========

function exportResults() {
    if (appState.results.length === 0) {
        alert('No hay resultados para exportar.');
        return;
    }
    
    let csv = 'Número,Estado,MessageSID,Error,Timestamp,Usuario\n';
    
    appState.results.forEach(result => {
        const estado = result.success ? 'EXITOSO' : 'FALLIDO';
        const messageSid = result.messageSid || 'N/A';
        const error = result.error ? `"${result.error.replace(/"/g, '""')}"` : 'N/A';
        
        csv += `"${result.number}",${estado},${messageSid},${error},${result.timestamp},"${appState.currentUser.email}"\n`;
    });
    
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

// Exportar funciones para uso global
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
