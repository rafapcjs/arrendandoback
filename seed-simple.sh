#!/bin/bash

# Script simplificado para poblar la base de datos
BASE_URL="http://localhost:3001"

echo "🌱 Iniciando proceso de seeding..."

# Función para hacer login y obtener token
echo "🔐 Creando usuario admin y obteniendo token..."

# Crear usuario admin
curl -X POST "${BASE_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "firstName": "Admin",
        "lastName": "Sistema", 
        "email": "admin@arrendando.com",
        "password": "admin123",
        "role": "ADMIN"
    }'

echo ""
echo "🔑 Haciendo login..."

# Login y obtener token (guardar respuesta completa)
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "admin@arrendando.com",
        "password": "admin123"
    }')

echo "Login response: $LOGIN_RESPONSE"

# Extraer token manualmente (asumiendo formato {"access_token":"token_value"})
TOKEN=$(echo "$LOGIN_RESPONSE" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')

echo "Token extraído: $TOKEN"

if [ -z "$TOKEN" ]; then
    echo "❌ No se pudo obtener el token"
    exit 1
fi

echo ""
echo "👥 Creando usuarios..."

# Array de usuarios
curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Carlos", "lastName": "García", "email": "carlos.garcia@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 1 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "María", "lastName": "López", "email": "maria.lopez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 2 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Juan", "lastName": "Rodríguez", "email": "juan.rodriguez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 3 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Ana", "lastName": "Martínez", "email": "ana.martinez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 4 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Pedro", "lastName": "Sánchez", "email": "pedro.sanchez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 5 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Laura", "lastName": "Hernández", "email": "laura.hernandez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 6 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Diego", "lastName": "Jiménez", "email": "diego.jimenez@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 7 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Carmen", "lastName": "Ruiz", "email": "carmen.ruiz@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 8 creado"

curl -X POST "${BASE_URL}/auth/register" -H "Content-Type: application/json" -d '{"firstName": "Roberto", "lastName": "Morales", "email": "roberto.morales@email.com", "password": "password123", "role": "ADMIN"}'
echo "✅ Usuario 9 creado"

echo ""
echo "🏠 Creando inquilinos..."

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "12345678", "nombres": "Andrea", "apellidos": "González", "telefono": "3001234567", "correo": "andrea.gonzalez@email.com", "direccion": "Calle 45 #12-34, Barrio Centro", "ciudad": "Bogotá", "contactoEmergencia": "Luis González - 3007654321"}'
echo "✅ Inquilino 1 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "23456789", "nombres": "Miguel", "apellidos": "Vargas", "telefono": "3012345678", "correo": "miguel.vargas@email.com", "direccion": "Carrera 15 #23-45, Barrio Norte", "ciudad": "Medellín", "contactoEmergencia": "Carmen Vargas - 3018765432"}'
echo "✅ Inquilino 2 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "34567890", "nombres": "Sofia", "apellidos": "Pérez", "telefono": "3023456789", "correo": "sofia.perez@email.com", "direccion": "Avenida 68 #34-56, Barrio Sur", "ciudad": "Cali", "contactoEmergencia": "Fernando Pérez - 3029876543"}'
echo "✅ Inquilino 3 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "45678901", "nombres": "Andrés", "apellidos": "Castro", "telefono": "3034567890", "correo": "andres.castro@email.com", "direccion": "Calle 80 #45-67, Barrio Oeste", "ciudad": "Barranquilla", "contactoEmergencia": "María Castro - 3030987654"}'
echo "✅ Inquilino 4 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "56789012", "nombres": "Valentina", "apellidos": "Ramírez", "telefono": "3045678901", "correo": "valentina.ramirez@email.com", "direccion": "Carrera 50 #56-78, Barrio Este", "ciudad": "Cartagena", "contactoEmergencia": "Jorge Ramírez - 3041098765"}'
echo "✅ Inquilino 5 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "67890123", "nombres": "Sebastián", "apellidos": "Torres", "telefono": "3056789012", "correo": "sebastian.torres@email.com", "direccion": "Calle 120 #67-89, Barrio Chapinero", "ciudad": "Bogotá", "contactoEmergencia": "Elena Torres - 3052109876"}'
echo "✅ Inquilino 6 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "78901234", "nombres": "Camila", "apellidos": "Mendoza", "telefono": "3067890123", "correo": "camila.mendoza@email.com", "direccion": "Avenida Poblado #78-90, El Poblado", "ciudad": "Medellín", "contactoEmergencia": "Ricardo Mendoza - 3063210987"}'
echo "✅ Inquilino 7 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "89012345", "nombres": "Daniel", "apellidos": "Ospina", "telefono": "3078901234", "correo": "daniel.ospina@email.com", "direccion": "Calle 70 #89-01, Ciudad Jardín", "ciudad": "Cali", "contactoEmergencia": "Patricia Ospina - 3074321098"}'
echo "✅ Inquilino 8 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "90123456", "nombres": "Isabella", "apellidos": "Ríos", "telefono": "3089012345", "correo": "isabella.rios@email.com", "direccion": "Carrera 84 #90-12, El Prado", "ciudad": "Barranquilla", "contactoEmergencia": "Alejandro Ríos - 3085432109"}'
echo "✅ Inquilino 9 creado"

curl -X POST "${BASE_URL}/tenants" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"cedula": "01234567", "nombres": "Nicolás", "apellidos": "Aguilar", "telefono": "3090123456", "correo": "nicolas.aguilar@email.com", "direccion": "Avenida San Martín #01-23, Bocagrande", "ciudad": "Cartagena", "contactoEmergencia": "Gloria Aguilar - 3096543210"}'
echo "✅ Inquilino 10 creado"

echo ""
echo "🏢 Creando inmuebles..."

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Calle 85 #15-30, Apartamento 501", "codigoServicioAgua": "AG001234567", "codigoServicioGas": "GS001234567", "codigoServicioLuz": "LZ001234567", "disponible": true, "descripcion": "Apartamento de 2 habitaciones, 2 baños, sala-comedor, cocina integral, balcón."}'
echo "✅ Inmueble 1 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Carrera 11 #93-15, Casa 25", "codigoServicioAgua": "AG002345678", "codigoServicioGas": "GS002345678", "codigoServicioLuz": "LZ002345678", "disponible": true, "descripcion": "Casa de 3 habitaciones, 3 baños, sala-comedor, cocina, patio trasero, garaje."}'
echo "✅ Inmueble 2 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Avenida 19 #104-50, Torre B, Piso 12", "codigoServicioAgua": "AG003456789", "codigoServicioGas": "GS003456789", "codigoServicioLuz": "LZ003456789", "disponible": true, "descripcion": "Apartamento estudio con hermosa vista a la ciudad."}'
echo "✅ Inmueble 3 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Calle 63 #7-45, Apartamento 302", "codigoServicioAgua": "AG004567890", "codigoServicioGas": "GS004567890", "codigoServicioLuz": "LZ004567890", "disponible": true, "descripcion": "Apartamento de 1 habitación, 1 baño, sala-comedor, cocina."}'
echo "✅ Inmueble 4 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Carrera 68 #45-78, Casa 15", "codigoServicioAgua": "AG005678901", "codigoServicioGas": "GS005678901", "codigoServicioLuz": "LZ005678901", "disponible": true, "descripcion": "Casa de 4 habitaciones, 3 baños, jardín amplio, garaje."}'
echo "✅ Inmueble 5 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Avenida 30 #25-40, Apartamento 804", "codigoServicioAgua": "AG006789012", "codigoServicioGas": "GS006789012", "codigoServicioLuz": "LZ006789012", "disponible": false, "descripcion": "Penthouse de lujo con 3 habitaciones, vista panorámica."}'
echo "✅ Inmueble 6 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Calle 127 #9-85, Duplex 201", "codigoServicioAgua": "AG007890123", "codigoServicioGas": "GS007890123", "codigoServicioLuz": "LZ007890123", "disponible": true, "descripcion": "Duplex moderno de 2 niveles, terraza."}'
echo "✅ Inmueble 7 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Carrera 15 #76-32, Local 105", "codigoServicioAgua": "AG008901234", "codigoServicioGas": "GS008901234", "codigoServicioLuz": "LZ008901234", "disponible": true, "descripcion": "Local comercial en primer piso, 80 m²."}'
echo "✅ Inmueble 8 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Avenida 68 #134-25, Apartamento 603", "codigoServicioAgua": "AG009012345", "codigoServicioGas": "GS009012345", "codigoServicioLuz": "LZ009012345", "disponible": true, "descripcion": "Apartamento de 2 habitaciones, balcón con vista al parque."}'
echo "✅ Inmueble 9 creado"

curl -X POST "${BASE_URL}/properties" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"direccion": "Calle 170 #54-12, Casa 8", "codigoServicioAgua": "AG010123456", "codigoServicioGas": "GS010123456", "codigoServicioLuz": "LZ010123456", "disponible": true, "descripcion": "Casa unifamiliar de 3 habitaciones, barrio tranquilo."}'
echo "✅ Inmueble 10 creado"

echo ""
echo "🎉 Seeding completado!"
echo "📊 Resumen:"
echo "   - 10 Usuarios creados"
echo "   - 10 Inquilinos creados"
echo "   - 10 Inmuebles creados"
echo ""
echo "💡 Para verificar los datos:"
echo "   curl -H \"Authorization: Bearer $TOKEN\" ${BASE_URL}/tenants"
echo "   curl -H \"Authorization: Bearer $TOKEN\" ${BASE_URL}/properties"