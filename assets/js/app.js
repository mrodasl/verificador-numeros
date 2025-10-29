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
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// El resto del código (processNumbers, sendVerificationRequest, etc.) permanece igual
// ... [mantén todas las funciones de procesamiento de números que ya tenías]

