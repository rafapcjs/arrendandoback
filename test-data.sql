-- Insertar datos de prueba para testing del módulo de pagos

-- Inquilino de prueba
INSERT INTO tenants (id, cedula, nombres, apellidos, telefono, correo, direccion, ciudad, "contactoEmergencia", "isActive", "createdAt", "updatedAt") 
VALUES ('11111111-1111-1111-1111-111111111111', '12345678', 'Juan Carlos', 'González Pérez', '555-1234', 'juan@example.com', 'Calle 123 #45-67', 'Bogotá', 'María González - 555-5678', true, NOW(), NOW());

-- Propiedad de prueba
INSERT INTO properties (id, direccion, ciudad, barrio, tipo, habitaciones, "banos", "areaTotal", "valorCanon", estado, descripcion, "isActive", "createdAt", "updatedAt") 
VALUES ('22222222-2222-2222-2222-222222222222', 'Carrera 45 #123-456', 'Bogotá', 'Chapinero', 'apartamento', 3, 2, 85.5, 1500000.00, 'disponible', 'Apartamento moderno en excelente ubicación', true, NOW(), NOW());

-- Contrato de prueba
INSERT INTO contratos (id, "fechaInicio", "fechaFin", "canonMensual", estado, "inquilinoId", "inmuebleId", "createdAt", "updatedAt") 
VALUES ('33333333-3333-3333-3333-333333333333', '2024-01-01', '2024-12-31', 1500000.00, 'ACTIVO', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NOW(), NOW());