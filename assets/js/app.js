// Configuración de la aplicación
const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500 // ms
};

// Estado de la aplicación
let appState = {
    currentUser: null,
    results: [],
    isProcessing: false
};

// Usuarios autorizados (en producción, esto vendría de una base de datos)
const AUTHORIZED_USERS = [
    { 
        email: 'admin@institucion.gt', 
        password: 'admin123', 
        name: 'Administrador Principal',
        role: 'admin',
        department: 'TI'
    },
    { 
        email: 'usuario@institucion.gt', 
        password: 'user123', 
        name: 'Usuario General',
        role: 'user',
        department: 'Operaciones'
    }
];

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Verificar si hay una sesión activa
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        showApp();
    }
    
    // Configurar event listeners
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

// ========== FUNCIONES DE AUTENTICACIÓN ==========

function login() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    // Validaciones básicas
    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }
    
    // Buscar usuario
    const user = AUTHORIZED_USERS.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Login exitoso
        appState.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showApp();
        clearError();
    } else {
        showError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
    }
}

function logout() {
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    location.reload(); // Recargar para mostrar login
}

function showApp() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('currentUser').textContent = appState.currentUser.name;
    
    // Limpiar campos del login
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
}

// ========== FUNCIONES DE PROCESAMIENTO ==========

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
        
        csv += `"${result.number}",${estado},${messageSid},${error},${result.timestamp},"${appState.currentUser.email}"\n`;
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

// ========== FUNCIONES DE UTILIDAD ==========

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

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
});

// Exportar para uso global (si es necesario)
window.appState = appState;
window.processNumbers = processNumbers;
window.exportResults = exportResults;
window.login = login;
window.logout = logout;
