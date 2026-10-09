CREATE DATABASE IF NOT EXISTS sistema_parqueo1;
USE sistema_parqueo1;

CREATE TABLE IF NOT EXISTS espacios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    estado ENUM('LIBRE', 'OCUPADO') DEFAULT 'LIBRE',
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bitacora (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_evento ENUM('INGRESO', 'SALIDA', 'CAMBIO_ESTADO') NOT NULL,
    espacio_id INT NULL,
    descripcion VARCHAR(255),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (espacio_id) REFERENCES espacios(id) ON DELETE SET NULL
);

INSERT INTO espacios (codigo, estado) VALUES 
('A1', 'LIBRE'),
('A2', 'LIBRE'),
('A3', 'LIBRE'),
('A4', 'LIBRE')
ON DUPLICATE KEY UPDATE codigo=codigo;

INSERT INTO bitacora (tipo_evento, espacio_id, descripcion) 
VALUES ('INGRESO', 1, 'Prueba de sistema');