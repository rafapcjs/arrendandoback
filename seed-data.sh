#!/bin/bash

# Script para poblar la base de datos con 10 registros de cada entidad usando curl
# Asegúrate de que el servidor esté corriendo en http://localhost:3001

BASE_URL="http://localhost:3001"

echo "🌱 Iniciando proceso de seeding con curl..."

# Función para hacer login y obtener token
login_and_get_token() {
    echo "🔐 Obteniendo token de autenticación..."
    
    # Primero crear un usuario admin si no existe
    curl -s -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "firstName": "Admin",
            "lastName": "Sistema",
            "email": "admin@arrendando.com",
            "password": "admin123",
            "role": "ADMIN"
        }' > /dev/null
    
    # Hacer login para obtener token
    TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@arrendando.com",
            "password": "admin123"
        }' | jq -r '.access_token')
    
    echo "✅ Token obtenido: ${TOKEN:0:20}..."
}

# Función para crear usuarios
create_users() {
    echo "👥 Creando usuarios..."
    
    users=(
        '{"firstName": "Carlos", "lastName": "García", "email": "carlos.garcia@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "María", "lastName": "López", "email": "maria.lopez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Juan", "lastName": "Rodríguez", "email": "juan.rodriguez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Ana", "lastName": "Martínez", "email": "ana.martinez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Pedro", "lastName": "Sánchez", "email": "pedro.sanchez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Laura", "lastName": "Hernández", "email": "laura.hernandez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Diego", "lastName": "Jiménez", "email": "diego.jimenez@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Carmen", "lastName": "Ruiz", "email": "carmen.ruiz@email.com", "password": "password123", "role": "ADMIN"}'
        '{"firstName": "Roberto", "lastName": "Morales", "email": "roberto.morales@email.com", "password": "password123", "role": "ADMIN"}'
    )
    
    for user_data in "${users[@]}"; do
        response=$(curl -s -X POST "${BASE_URL}/auth/register" \
            -H "Content-Type: application/json" \
            -d "$user_data")
        
        email=$(echo "$user_data" | jq -r '.email')
        echo "✅ Usuario creado: $email"
    done
}

# Función para crear inquilinos
create_tenants() {
    echo "🏠 Creando inquilinos..."
    
    tenants=(
        '{"cedula": "12345678", "nombres": "Andrea", "apellidos": "González", "telefono": "3001234567", "correo": "andrea.gonzalez@email.com", "direccion": "Calle 45 #12-34, Barrio Centro", "ciudad": "Bogotá", "contactoEmergencia": "Luis González - 3007654321"}'
        '{"cedula": "23456789", "nombres": "Miguel", "apellidos": "Vargas", "telefono": "3012345678", "correo": "miguel.vargas@email.com", "direccion": "Carrera 15 #23-45, Barrio Norte", "ciudad": "Medellín", "contactoEmergencia": "Carmen Vargas - 3018765432"}'
        '{"cedula": "34567890", "nombres": "Sofia", "apellidos": "Pérez", "telefono": "3023456789", "correo": "sofia.perez@email.com", "direccion": "Avenida 68 #34-56, Barrio Sur", "ciudad": "Cali", "contactoEmergencia": "Fernando Pérez - 3029876543"}'
        '{"cedula": "45678901", "nombres": "Andrés", "apellidos": "Castro", "telefono": "3034567890", "correo": "andres.castro@email.com", "direccion": "Calle 80 #45-67, Barrio Oeste", "ciudad": "Barranquilla", "contactoEmergencia": "María Castro - 3030987654"}'
        '{"cedula": "56789012", "nombres": "Valentina", "apellidos": "Ramírez", "telefono": "3045678901", "correo": "valentina.ramirez@email.com", "direccion": "Carrera 50 #56-78, Barrio Este", "ciudad": "Cartagena", "contactoEmergencia": "Jorge Ramírez - 3041098765"}'
        '{"cedula": "67890123", "nombres": "Sebastián", "apellidos": "Torres", "telefono": "3056789012", "correo": "sebastian.torres@email.com", "direccion": "Calle 120 #67-89, Barrio Chapinero", "ciudad": "Bogotá", "contactoEmergencia": "Elena Torres - 3052109876"}'
        '{"cedula": "78901234", "nombres": "Camila", "apellidos": "Mendoza", "telefono": "3067890123", "correo": "camila.mendoza@email.com", "direccion": "Avenida Poblado #78-90, El Poblado", "ciudad": "Medellín", "contactoEmergencia": "Ricardo Mendoza - 3063210987"}'
        '{"cedula": "89012345", "nombres": "Daniel", "apellidos": "Ospina", "telefono": "3078901234", "correo": "daniel.ospina@email.com", "direccion": "Calle 70 #89-01, Ciudad Jardín", "ciudad": "Cali", "contactoEmergencia": "Patricia Ospina - 3074321098"}'
        '{"cedula": "90123456", "nombres": "Isabella", "apellidos": "Ríos", "telefono": "3089012345", "correo": "isabella.rios@email.com", "direccion": "Carrera 84 #90-12, El Prado", "ciudad": "Barranquilla", "contactoEmergencia": "Alejandro Ríos - 3085432109"}'
        '{"cedula": "01234567", "nombres": "Nicolás", "apellidos": "Aguilar", "telefono": "3090123456", "correo": "nicolas.aguilar@email.com", "direccion": "Avenida San Martín #01-23, Bocagrande", "ciudad": "Cartagena", "contactoEmergencia": "Gloria Aguilar - 3096543210"}'
    )
    
    for tenant_data in "${tenants[@]}"; do
        response=$(curl -s -X POST "${BASE_URL}/tenants" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$tenant_data")
        
        nombres=$(echo "$tenant_data" | jq -r '.nombres')
        apellidos=$(echo "$tenant_data" | jq -r '.apellidos')
        echo "✅ Inquilino creado: $nombres $apellidos"
    done
}

# Función para crear inmuebles
create_properties() {
    echo "🏢 Creando inmuebles..."
    
    properties=(
        '{"direccion": "Calle 85 #15-30, Apartamento 501", "codigoServicioAgua": "AG001234567", "codigoServicioGas": "GS001234567", "codigoServicioLuz": "LZ001234567", "disponible": true, "descripcion": "Apartamento de 2 habitaciones, 2 baños, sala-comedor, cocina integral, balcón. Edificio con portería 24 horas, gimnasio y zona social."}'
        '{"direccion": "Carrera 11 #93-15, Casa 25", "codigoServicioAgua": "AG002345678", "codigoServicioGas": "GS002345678", "codigoServicioLuz": "LZ002345678", "disponible": true, "descripcion": "Casa de 3 habitaciones, 3 baños, sala-comedor, cocina, patio trasero, garaje para 2 carros. Conjunto cerrado con vigilancia."}'
        '{"direccion": "Avenida 19 #104-50, Torre B, Piso 12", "codigoServicioAgua": "AG003456789", "codigoServicioGas": "GS003456789", "codigoServicioLuz": "LZ003456789", "disponible": true, "descripcion": "Apartamento estudio con hermosa vista a la ciudad, cocina americana, baño completo, closet empotrado. Edificio nuevo con todas las comodidades."}'
        '{"direccion": "Calle 63 #7-45, Apartamento 302", "codigoServicioAgua": "AG004567890", "codigoServicioGas": "GS004567890", "codigoServicioLuz": "LZ004567890", "disponible": true, "descripcion": "Apartamento de 1 habitación, 1 baño, sala-comedor, cocina. Ubicado en zona central con fácil acceso al transporte público."}'
        '{"direccion": "Carrera 68 #45-78, Casa 15", "codigoServicioAgua": "AG005678901", "codigoServicioGas": "GS005678901", "codigoServicioLuz": "LZ005678901", "disponible": true, "descripcion": "Casa de 4 habitaciones, 3 baños, sala, comedor, cocina, zona de lavandería, jardín amplio, garaje. Ideal para familias grandes."}'
        '{"direccion": "Avenida 30 #25-40, Apartamento 804", "codigoServicioAgua": "AG006789012", "codigoServicioGas": "GS006789012", "codigoServicioLuz": "LZ006789012", "disponible": false, "descripcion": "Penthouse de lujo con 3 habitaciones, 3 baños, sala-comedor amplios, cocina gourmet, terraza privada. Vista panorámica de la ciudad."}'
        '{"direccion": "Calle 127 #9-85, Duplex 201", "codigoServicioAgua": "AG007890123", "codigoServicioGas": "GS007890123", "codigoServicioLuz": "LZ007890123", "disponible": true, "descripcion": "Duplex moderno de 2 niveles, 2 habitaciones, 2 baños y medio, sala-comedor, cocina, terraza. Conjunto residencial con piscina."}'
        '{"direccion": "Carrera 15 #76-32, Local 105", "codigoServicioAgua": "AG008901234", "codigoServicioGas": "GS008901234", "codigoServicioLuz": "LZ008901234", "disponible": true, "descripcion": "Local comercial en primer piso, 80 m², ideal para oficina o consultorio. Zona comercial muy transitada."}'
        '{"direccion": "Avenida 68 #134-25, Apartamento 603", "codigoServicioAgua": "AG009012345", "codigoServicioGas": "GS009012345", "codigoServicioLuz": "LZ009012345", "disponible": true, "descripcion": "Apartamento de 2 habitaciones, 2 baños, sala-comedor, cocina, balcón con vista al parque. Edificio con zonas verdes."}'
        '{"direccion": "Calle 170 #54-12, Casa 8", "codigoServicioAgua": "AG010123456", "codigoServicioGas": "GS010123456", "codigoServicioLuz": "LZ010123456", "disponible": true, "descripcion": "Casa unifamiliar de 3 habitaciones, 2 baños, sala-comedor, cocina, patio, garaje cubierto. Barrio residencial tranquilo."}'
    )
    
    for property_data in "${properties[@]}"; do
        response=$(curl -s -X POST "${BASE_URL}/properties" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$property_data")
        
        direccion=$(echo "$property_data" | jq -r '.direccion')
        echo "✅ Inmueble creado: $direccion"
    done
}

# Función para obtener IDs de inquilinos y propiedades
get_tenant_and_property_ids() {
    echo "🔍 Obteniendo IDs de inquilinos y propiedades..."
    
    # Obtener inquilinos
    TENANTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/tenants" \
        -H "Authorization: Bearer $TOKEN")
    
    # Obtener propiedades
    PROPERTIES_RESPONSE=$(curl -s -X GET "${BASE_URL}/properties" \
        -H "Authorization: Bearer $TOKEN")
    
    # Extraer los primeros 10 IDs
    TENANT_IDS=($(echo "$TENANTS_RESPONSE" | jq -r '.data[0:10][].id'))
    PROPERTY_IDS=($(echo "$PROPERTIES_RESPONSE" | jq -r '.data[0:10][].id'))
    
    echo "✅ Obtenidos ${#TENANT_IDS[@]} inquilinos y ${#PROPERTY_IDS[@]} propiedades"
}

# Función para crear contratos
create_contratos() {
    echo "📄 Creando contratos..."
    
    if [ ${#TENANT_IDS[@]} -eq 0 ] || [ ${#PROPERTY_IDS[@]} -eq 0 ]; then
        echo "❌ No se pueden crear contratos sin inquilinos y propiedades"
        return
    fi
    
    # Datos de contratos
    fechas_inicio=("2024-01-15" "2024-02-01" "2024-03-10" "2024-04-05" "2024-05-20" "2024-06-01" "2024-07-15" "2024-08-01" "2024-09-10" "2024-10-01")
    fechas_fin=("2025-01-14" "2025-01-31" "2025-03-09" "2025-04-04" "2025-05-19" "2024-12-31" "2025-07-14" "2025-07-31" "2025-09-09" "2025-09-30")
    canones=(1200000 1800000 900000 1000000 2200000 3500000 1600000 1400000 1300000 1500000)
    estados=("ACTIVO" "ACTIVO" "ACTIVO" "ACTIVO" "ACTIVO" "PROXIMO_VENCER" "ACTIVO" "ACTIVO" "ACTIVO" "BORRADOR")
    
    for i in {0..9}; do
        if [ -n "${TENANT_IDS[$i]}" ] && [ -n "${PROPERTY_IDS[$i]}" ]; then
            contrato_data="{
                \"fechaInicio\": \"${fechas_inicio[$i]}\",
                \"fechaFin\": \"${fechas_fin[$i]}\",
                \"canonMensual\": ${canones[$i]},
                \"estado\": \"${estados[$i]}\",
                \"inquilinoId\": \"${TENANT_IDS[$i]}\",
                \"inmuebleId\": \"${PROPERTY_IDS[$i]}\"
            }"
            
            response=$(curl -s -X POST "${BASE_URL}/contratos" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$contrato_data")
            
            echo "✅ Contrato creado para inquilino ${TENANT_IDS[$i]:0:8}... y propiedad ${PROPERTY_IDS[$i]:0:8}..."
        fi
    done
}

# Ejecutar funciones en orden
login_and_get_token
create_users
create_tenants
create_properties
get_tenant_and_property_ids
create_contratos

echo ""
echo "🎉 Seeding completado exitosamente!"
echo "📊 Resumen:"
echo "   - 10 Usuarios creados"
echo "   - 10 Inquilinos creados"
echo "   - 10 Inmuebles creados"
echo "   - 10 Contratos creados"
echo ""
echo "💡 Para verificar los datos creados, puedes usar:"
echo "   curl -H \"Authorization: Bearer $TOKEN\" ${BASE_URL}/tenants"
echo "   curl -H \"Authorization: Bearer $TOKEN\" ${BASE_URL}/properties"
echo "   curl -H \"Authorization: Bearer $TOKEN\" ${BASE_URL}/contratos"