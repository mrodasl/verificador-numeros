const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir archivos estáticos

// Configuración de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicializar base de datos
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        department VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS verification_results (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        message_sid VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      );
      
      -- Insertar super admin si no existe
      INSERT INTO users (email, password, name, role, department) 
      VALUES ('mrodas@iom.int', '130028', 'Administrador Principal', 'superadmin', 'TI')
      ON CONFLICT (email) DO NOTHING;
      
      -- Insertar configuración por defecto
      INSERT INTO app_settings (key, value) 
      VALUES ('session_timeout', '30')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// ========== RUTAS DE LA API ==========

// Servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (result.rows.length > 0) {
      const user = { ...result.rows[0] };
      delete user.password; // No enviar password al frontend
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// Gestión de usuarios
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, department, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { email, password, name, role } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
      [email, password, name, role]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Este correo ya está registrado' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

app.delete('/api/users/:email', async (req, res) => {
  const { email } = req.params;
  
  if (email === 'mrodas@iom.int') {
    return res.status(400).json({ success: false, error: 'No se puede eliminar al Super Admin' });
  }
  
  try {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Envío de SMS
app.post('/api/send-sms', async (req, res) => {
  const { number, user } = req.body;
  const twilio = require('twilio');
  
  // Configuración Twilio desde variables de entorno
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  try {
    // Validar número
    const cleanedNumber = number.replace(/\s+/g, '');
    if (!cleanedNumber.startsWith('+502')) {
      return res.status(400).json({ 
        success: false, 
        error: 'El número debe ser de Guatemala (formato: +502 XXXXXXXX)' 
      });
    }
    
    // Enviar SMS
    const message = await client.messages.create({
      body: 'Hola. Mensaje de verificación institucional. Por favor ignore este mensaje.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: cleanedNumber
    });
    
    // Guardar en base de datos
    await pool.query(
      'INSERT INTO verification_results (user_email, phone_number, message_sid, status) VALUES ($1, $2, $3, $4)',
      [user, cleanedNumber, message.sid, message.status]
    );
    
    res.json({
      success: true,
      messageSid: message.sid,
      status: message.status,
      number: cleanedNumber
    });
    
  } catch (error) {
    console.error('Error enviando SMS:', error);
    
    // Guardar error en base de datos
    await pool.query(
      'INSERT INTO verification_results (user_email, phone_number, status, error_message) VALUES ($1, $2, $3, $4)',
      [user, number, 'failed', error.message]
    );
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener resultados
app.get('/api/results', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM verification_results ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, results: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configuración
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM app_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  
  try {
    await pool.query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Iniciar servidor
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📧 Super Admin: mrodas@iom.int / 130028`);
  });
});
