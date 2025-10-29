# 📱 Verificador de Números Telefónicos

Sistema web para verificación de números telefónicos mediante SMS, diseñado para instituciones gubernamentales.

## 🚀 Características

- ✅ Verificación de números mediante SMS
- 🔐 Sistema de autenticación con gestión de usuarios
- 👥 Panel de administración para gestionar usuarios
- ⏰ Timeout automático de sesión por inactividad
- 📊 Panel de resultados en tiempo real
- 📈 Exportación de resultados a CSV
- ☁️ Despliegue completamente en la nube
- 📱 Diseño responsive

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Netlify Functions (Serverless)
- **SMS Service:** Twilio API
- **Hosting:** GitHub Pages + Netlify
- **Almacenamiento:** localStorage para usuarios

## 👤 Usuario Super Admin por Defecto

- **Email:** mrodas@iom.int
- **Contraseña:** 130028
- **Rol:** Super Administrador

## 📋 Estructura de Archivos
verificador-numeros/
├── index.html
├── assets/
│ ├── css/
│ │ └── styles.css
│ └── js/
│ └── app.js
├── netlify/
│ └── functions/
│ ├── send-sms.js
│ └── sms-status.js
├── netlify.toml
├── package.json
└── README.md


## 🚀 Instalación y Despliegue

### 1. Configuración en GitHub
- Sube todos los archivos a tu repositorio
- Asegúrate de que la estructura de carpetas sea correcta

### 2. Configuración en Netlify
- Conecta tu repositorio de GitHub
- Configura las variables de entorno:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN` 
  - `TWILIO_PHONE_NUMBER`

### 3. Configuración en Twilio
- Compra un número telefónico de Guatemala
- Configura el webhook para estados de SMS

## ⚙️ Configuración de Variables de Entorno

En Netlify, configura estas variables:
TWILIO_ACCOUNT_SID = tu_account_sid_de_twilio
TWILIO_AUTH_TOKEN = tu_auth_token_de_twilio
TWILIO_PHONE_NUMBER = +502XXXXXXXXX (tu número Twilio Guatemala)


## 👥 Gestión de Usuarios

### Roles Disponibles:
- **Super Admin:** Acceso completo, no se puede eliminar
- **Admin:** Puede gestionar usuarios y usar la aplicación
- **Usuario:** Solo puede usar la aplicación principal

### Agregar Nuevos Usuarios:
1. Inicia sesión como Super Admin o Admin
2. Haz clic en "👥 Admin"
3. Completa el formulario de nuevo usuario
4. Los usuarios nuevos podrán iniciar sesión inmediatamente

## ⏰ Configuración de Sesión

- **Timeout por defecto:** 30 minutos
- **Configurable:** 5-120 minutos
- **Se resetea con:** Cualquier interacción del usuario

## 📞 Mensaje SMS Enviado

Los usuarios recibirán este mensaje:

¡Bienvenido a casa! 🌟

Si estás buscando oportunidades, apoyo o información para tu reintegración en Guatemala, estamos aquí para ayudarte.

💬 Escríbenos directamente:
https://wa.me/50239359960?text=Hola,%20quiero%20más%20información%20sobre%20los%20servicios%20disponibles


## 🐛 Solución de Problemas

### Si los estilos no cargan:
- Verifica que `assets/css/styles.css` exista
- Revisa las rutas en el HTML

### Si los SMS no se envían:
- Verifica las variables de entorno en Netlify
- Confirma que tu cuenta Twilio tenga crédito
- Revisa los logs en Netlify Functions

### Si el login falla:
- Verifica que el usuario exista en localStorage
- Revisa la consola del navegador para errores

## 🔒 Seguridad

- Las contraseñas se almacenan en localStorage (mejorable en futuras versiones)
- Sesiones automáticas con timeout
- Control de acceso por roles

## 📞 Soporte

Para problemas técnicos, contactar al administrador del sistema.
