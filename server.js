const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); 

// Variable global para rastrear el estado de la talanquera en tiempo real
let estadoTalanquera = 'Cerrada';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Umg$2023',
  database: 'sistema_parqueo1'
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

app.post('/api/evento', async (req, res) => {
  // Extraemos las posibles propiedades enviadas por la ESP32
  const { accion, tipo, evento, disponibles } = req.body;
  
  // Normalizamos el tipo de evento recibido (INGRESO, ENTRADA, SALIDA)
  const eventoRecibido = String(accion || tipo || evento || '').toUpperCase();
  
  console.log(`[ESP32] Evento: ${eventoRecibido} | Disponibles: ${disponibles}`);

  try {
    // Evaluamos si es un ingreso (soporta 'INGRESO' y 'ENTRADA')
    const esIngreso = (eventoRecibido === 'INGRESO' || eventoRecibido === 'ENTRADA');
    
    const tipoEventoBD = esIngreso ? 'INGRESO' : 'SALIDA';
    const descripcionTexto = `Vehículo ${esIngreso ? 'ingresó al' : 'salió del'} parqueo. Quedan ${disponibles} espacios.`;

    // 1. Registrar el evento en la bitácora
    await db.query(
      'INSERT INTO bitacora (tipo_evento, descripcion) VALUES (?, ?)',
      [tipoEventoBD, descripcionTexto]
    );

    // 2. Marcar todos los espacios como LIBRE primero
    await db.query('UPDATE espacios SET estado = "LIBRE"');

    // 3. Ocupar secuencialmente según la cantidad de vehículos dentro
    const ocupados = 4 - disponibles;

    for (let i = 1; i <= ocupados; i++) {
      await db.query(
        'UPDATE espacios SET estado = "OCUPADO" WHERE id = ?', 
        [i]
      );
    }

    // 4. Cambiar temporalmente la talanquera a "Abierta" durante 3 segundos
    estadoTalanquera = 'Abierta';
    setTimeout(() => {
      estadoTalanquera = 'Cerrada';
    }, 3000);

    res.status(200).json({ 
      status: 'OK', 
      mensaje: 'Base de datos actualizada correctamente' 
    });

  } catch (error) {
    console.error('Error al procesar el evento en MySQL:', error);
    res.status(500).json({ status: 'ERROR', mensaje: error.message });
  }
});

app.get('/api/espacios', async (req, res) => {
  try {
    const [filas] = await db.query('SELECT * FROM espacios ORDER BY id ASC');
    res.json(filas);
  } catch (error) {
    console.error('Error al obtener espacios:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bitacora', async (req, res) => {
  try {
    const [historial] = await db.query('SELECT * FROM bitacora ORDER BY fecha_hora DESC LIMIT 10');
    res.json(historial);
  } catch (error) {
    console.error('Error al consultar bitácora:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar el estado actual de la talanquera (Abierta/Cerrada)
app.get('/api/talanquera', (req, res) => {
  res.json({ estado: estadoTalanquera });
});

const PUERTO = 3000;
app.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
  console.log(`Escuchando a la ESP32 en http://192.168.1.153:${PUERTO}/api/evento`);
});