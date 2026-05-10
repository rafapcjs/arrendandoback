#!/bin/bash

BASE_URL="http://localhost:3018"
echo "🚀 Iniciando script de llenado de datos..."
echo "Base URL: $BASE_URL"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ============================================================================
# 1. CREAR USUARIO ADMIN
# ============================================================================
echo -e "\n${YELLOW}[1] Creando usuario ADMIN...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Rafael",
    "lastName": "Admin",
    "email": "admin@test.com",
    "password": "Admin123456",
    "role": "ADMIN"
  }')

echo "$ADMIN_RESPONSE" | jq '.'
ADMIN_ID=$(echo "$ADMIN_RESPONSE" | jq -r '.id // empty')
echo -e "${GREEN}✅ Admin ID: $ADMIN_ID${NC}"

# ============================================================================
# 2. LOGIN COMO ADMIN
# ============================================================================
echo -e "\n${YELLOW}[2] Login como ADMIN...${NC}"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123456"
  }')

echo "$ADMIN_LOGIN" | jq '.'
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.access_token // empty')
echo -e "${GREEN}✅ Token obtenido${NC}"

# ============================================================================
# 3. CREAR INMOBILIARIAS
# ============================================================================
echo -e "\n${YELLOW}[3] Creando Inmobiliarias...${NC}"

# Inmobiliaria 1
echo -e "\n${YELLOW}  3.1 Inmobiliaria: Valgreen Inmobiliarios${NC}"
INMOB1=$(curl -s -X POST "$BASE_URL/inmobiliarias" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "nombre": "Valgreen Inmobiliarios",
    "nit": "900123456-1",
    "direccion": "Carrera 7 #45-67, Bogotá",
    "telefono": "3001234567",
    "email": "contacto@valgreen.com"
  }')

echo "$INMOB1" | jq '.'
INMOB1_ID=$(echo "$INMOB1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Inmobiliaria 1 ID: $INMOB1_ID${NC}"

# Inmobiliaria 2
echo -e "\n${YELLOW}  3.2 Inmobiliaria: Centro Inmobiliaria${NC}"
INMOB2=$(curl -s -X POST "$BASE_URL/inmobiliarias" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "nombre": "Centro Inmobiliaria",
    "nit": "900234567-2",
    "direccion": "Calle 50 #15-40, Bogotá",
    "telefono": "3009876543",
    "email": "info@centroinmobiliaria.com"
  }')

echo "$INMOB2" | jq '.'
INMOB2_ID=$(echo "$INMOB2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Inmobiliaria 2 ID: $INMOB2_ID${NC}"

# Inmobiliaria 3
echo -e "\n${YELLOW}  3.3 Inmobiliaria: Vivienda Premium${NC}"
INMOB3=$(curl -s -X POST "$BASE_URL/inmobiliarias" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "nombre": "Vivienda Premium",
    "nit": "900345678-3",
    "direccion": "Avenida Chile #120-50, Bogotá",
    "telefono": "3005551234",
    "email": "ventas@viviendapremium.com"
  }')

echo "$INMOB3" | jq '.'
INMOB3_ID=$(echo "$INMOB3" | jq -r '.id // empty')
echo -e "${GREEN}✅ Inmobiliaria 3 ID: $INMOB3_ID${NC}"

# ============================================================================
# 4. CREAR USUARIOS INMOBILIARIA
# ============================================================================
echo -e "\n${YELLOW}[4] Creando Usuarios INMOBILIARIA...${NC}"

# Usuario Valgreen
echo -e "\n${YELLOW}  4.1 Usuario: Carlos Valgreen${NC}"
USER1=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Carlos\",
    \"lastName\": \"Valgreen\",
    \"email\": \"carlos@valgreen.com\",
    \"password\": \"Valgreen123456\",
    \"role\": \"INMOBILIARIA\",
    \"inmobiliariaId\": \"$INMOB1_ID\"
  }")

echo "$USER1" | jq '.'
USER1_ID=$(echo "$USER1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Usuario 1 ID: $USER1_ID${NC}"

# Usuario Centro
echo -e "\n${YELLOW}  4.2 Usuario: María Centro${NC}"
USER2=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"María\",
    \"lastName\": \"Centro\",
    \"email\": \"maria@centroinmobiliaria.com\",
    \"password\": \"Centro123456\",
    \"role\": \"INMOBILIARIA\",
    \"inmobiliariaId\": \"$INMOB2_ID\"
  }")

echo "$USER2" | jq '.'
USER2_ID=$(echo "$USER2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Usuario 2 ID: $USER2_ID${NC}"

# Usuario Premium
echo -e "\n${YELLOW}  4.3 Usuario: Juan Premium${NC}"
USER3=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Juan\",
    \"lastName\": \"Premium\",
    \"email\": \"juan@viviendapremium.com\",
    \"password\": \"Premium123456\",
    \"role\": \"INMOBILIARIA\",
    \"inmobiliariaId\": \"$INMOB3_ID\"
  }")

echo "$USER3" | jq '.'
USER3_ID=$(echo "$USER3" | jq -r '.id // empty')
echo -e "${GREEN}✅ Usuario 3 ID: $USER3_ID${NC}"

# ============================================================================
# 5. LOGIN COMO USUARIOS INMOBILIARIA
# ============================================================================
echo -e "\n${YELLOW}[5] Login de usuarios INMOBILIARIA...${NC}"

echo -e "\n${YELLOW}  5.1 Login: Carlos Valgreen${NC}"
LOGIN1=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@valgreen.com",
    "password": "Valgreen123456"
  }')
TOKEN1=$(echo "$LOGIN1" | jq -r '.access_token // empty')
echo -e "${GREEN}✅ Token 1 obtenido${NC}"

echo -e "\n${YELLOW}  5.2 Login: María Centro${NC}"
LOGIN2=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@centroinmobiliaria.com",
    "password": "Centro123456"
  }')
TOKEN2=$(echo "$LOGIN2" | jq -r '.access_token // empty')
echo -e "${GREEN}✅ Token 2 obtenido${NC}"

echo -e "\n${YELLOW}  5.3 Login: Juan Premium${NC}"
LOGIN3=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@viviendapremium.com",
    "password": "Premium123456"
  }')
TOKEN3=$(echo "$LOGIN3" | jq -r '.access_token // empty')
echo -e "${GREEN}✅ Token 3 obtenido${NC}"

# ============================================================================
# 6. CREAR PROPIETARIOS
# ============================================================================
echo -e "\n${YELLOW}[6] Creando Propietarios...${NC}"

echo -e "\n${YELLOW}  6.1 Propietario para Valgreen: Pedro López${NC}"
PROP1=$(curl -s -X POST "$BASE_URL/propietarios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "nombre": "Pedro López",
    "documento": "CC-1234567890",
    "telefono": "3101234567",
    "email": "pedro@email.com"
  }')

echo "$PROP1" | jq '.'
PROP1_ID=$(echo "$PROP1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Propietario 1 ID: $PROP1_ID${NC}"

echo -e "\n${YELLOW}  6.2 Propietario para Centro: Ana García${NC}"
PROP2=$(curl -s -X POST "$BASE_URL/propietarios" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{
    "nombre": "Ana García",
    "documento": "CC-0987654321",
    "telefono": "3209876543",
    "email": "ana@email.com"
  }')

echo "$PROP2" | jq '.'
PROP2_ID=$(echo "$PROP2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Propietario 2 ID: $PROP2_ID${NC}"

# ============================================================================
# 7. CREAR PROPIEDADES
# ============================================================================
echo -e "\n${YELLOW}[7] Creando Propiedades...${NC}"

echo -e "\n${YELLOW}  7.1 Propiedad para Valgreen${NC}"
PROP_INM1=$(curl -s -X POST "$BASE_URL/properties" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "direccion": "Carrera 7 #45-67 Apto 301, Bogotá",
    "codigoServicioAgua": "A-001234",
    "codigoServicioGas": "G-001234",
    "codigoServicioLuz": "L-001234",
    "disponible": true,
    "descripcion": "Apartamento moderno con 3 habitaciones, sala, cocina y 2 baños"
  }')

echo "$PROP_INM1" | jq '.'
PROP_INM1_ID=$(echo "$PROP_INM1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Propiedad Valgreen ID: $PROP_INM1_ID${NC}"

echo -e "\n${YELLOW}  7.2 Propiedad para Centro${NC}"
PROP_INM2=$(curl -s -X POST "$BASE_URL/properties" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{
    "direccion": "Calle 50 #15-40 Apto 201, Bogotá",
    "codigoServicioAgua": "A-005678",
    "codigoServicioGas": "G-005678",
    "codigoServicioLuz": "L-005678",
    "disponible": true,
    "descripcion": "Apartamento amplio con 2 habitaciones, sala y 1 baño"
  }')

echo "$PROP_INM2" | jq '.'
PROP_INM2_ID=$(echo "$PROP_INM2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Propiedad Centro ID: $PROP_INM2_ID${NC}"

# ============================================================================
# 8. CREAR INQUILINOS
# ============================================================================
echo -e "\n${YELLOW}[8] Creando Inquilinos...${NC}"

echo -e "\n${YELLOW}  8.1 Inquilino para Valgreen: Roberto Martínez${NC}"
TENANT1=$(curl -s -X POST "$BASE_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "cedula": "1098765432",
    "nombres": "Roberto",
    "apellidos": "Martínez",
    "telefono": "3156789012",
    "correo": "roberto@email.com",
    "direccion": "Calle 30 #10-20",
    "ciudad": "Bogotá",
    "contactoEmergencia": "María Martínez"
  }')

echo "$TENANT1" | jq '.'
TENANT1_ID=$(echo "$TENANT1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Inquilino 1 ID: $TENANT1_ID${NC}"

echo -e "\n${YELLOW}  8.2 Inquilino para Centro: Laura González${NC}"
TENANT2=$(curl -s -X POST "$BASE_URL/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{
    "cedula": "1087654321",
    "nombres": "Laura",
    "apellidos": "González",
    "telefono": "3167890123",
    "correo": "laura@email.com",
    "direccion": "Avenida 15 #20-30",
    "ciudad": "Bogotá",
    "contactoEmergencia": "Diego González"
  }')

echo "$TENANT2" | jq '.'
TENANT2_ID=$(echo "$TENANT2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Inquilino 2 ID: $TENANT2_ID${NC}"

# ============================================================================
# 9. CREAR CONTRATOS
# ============================================================================
echo -e "\n${YELLOW}[9] Creando Contratos...${NC}"

echo -e "\n${YELLOW}  9.1 Contrato Valgreen${NC}"
CONTRACT1=$(curl -s -X POST "$BASE_URL/contratos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"inmuebleId\": \"$PROP_INM1_ID\",
    \"inquilinoId\": \"$TENANT1_ID\",
    \"fechaInicio\": \"2025-01-01\",
    \"fechaFin\": \"2026-01-01\",
    \"canonMensual\": 1500000,
    \"garantia\": 3000000
  }")

echo "$CONTRACT1" | jq '.'
CONTRACT1_ID=$(echo "$CONTRACT1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Contrato 1 ID: $CONTRACT1_ID${NC}"

echo -e "\n${YELLOW}  9.2 Contrato Centro${NC}"
CONTRACT2=$(curl -s -X POST "$BASE_URL/contratos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d "{
    \"inmuebleId\": \"$PROP_INM2_ID\",
    \"inquilinoId\": \"$TENANT2_ID\",
    \"fechaInicio\": \"2025-01-15\",
    \"fechaFin\": \"2026-01-15\",
    \"canonMensual\": 1200000,
    \"garantia\": 2400000
  }")

echo "$CONTRACT2" | jq '.'
CONTRACT2_ID=$(echo "$CONTRACT2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Contrato 2 ID: $CONTRACT2_ID${NC}"

# ============================================================================
# 10. CREAR PAGOS
# ============================================================================
echo -e "\n${YELLOW}[10] Creando Pagos...${NC}"

echo -e "\n${YELLOW}  10.1 Pago Contrato 1 (Enero)${NC}"
PAGO1=$(curl -s -X POST "$BASE_URL/pagos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"contratoId\": \"$CONTRACT1_ID\",
    \"montoTotal\": 1500000,
    \"fechaPagoEsperada\": \"2025-02-01\"
  }")

echo "$PAGO1" | jq '.'
PAGO1_ID=$(echo "$PAGO1" | jq -r '.id // empty')
echo -e "${GREEN}✅ Pago 1 ID: $PAGO1_ID${NC}"

echo -e "\n${YELLOW}  10.2 Pago Contrato 1 (Febrero)${NC}"
PAGO2=$(curl -s -X POST "$BASE_URL/pagos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d "{
    \"contratoId\": \"$CONTRACT1_ID\",
    \"montoTotal\": 1500000,
    \"fechaPagoEsperada\": \"2025-03-01\"
  }")

echo "$PAGO2" | jq '.'
PAGO2_ID=$(echo "$PAGO2" | jq -r '.id // empty')
echo -e "${GREEN}✅ Pago 2 ID: $PAGO2_ID${NC}"

# ============================================================================
# 11. REGISTRAR ABONOS
# ============================================================================
echo -e "\n${YELLOW}[11] Registrando Abonos...${NC}"

echo -e "\n${YELLOW}  11.1 Abono Pago 1 (Pago completo)${NC}"
ABONO1=$(curl -s -X PATCH "$BASE_URL/pagos/$PAGO1_ID/abono" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "monto": 1500000,
    "metodoPago": "TRANSFERENCIA_BANCARIA"
  }')

echo "$ABONO1" | jq '.'
echo -e "${GREEN}✅ Abono 1 registrado${NC}"

echo -e "\n${YELLOW}  11.2 Abono Pago 2 (Pago parcial)${NC}"
ABONO2=$(curl -s -X PATCH "$BASE_URL/pagos/$PAGO2_ID/abono" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{
    "monto": 750000,
    "metodoPago": "EFECTIVO"
  }')

echo "$ABONO2" | jq '.'
echo -e "${GREEN}✅ Abono 2 registrado${NC}"

# ============================================================================
# RESUMEN FINAL
# ============================================================================
echo -e "\n\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DATOS CREADOS EXITOSAMENTE${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}INMOBILIARIAS:${NC}"
echo "  1. Valgreen Inmobiliarios: $INMOB1_ID"
echo "  2. Centro Inmobiliaria: $INMOB2_ID"
echo "  3. Vivienda Premium: $INMOB3_ID"

echo -e "\n${YELLOW}USUARIOS:${NC}"
echo "  1. Carlos (Valgreen): $USER1_ID"
echo "  2. María (Centro): $USER2_ID"
echo "  3. Juan (Premium): $USER3_ID"

echo -e "\n${YELLOW}PROPIEDADES:${NC}"
echo "  1. Carrera 7 (Valgreen): $PROP_INM1_ID"
echo "  2. Calle 50 (Centro): $PROP_INM2_ID"

echo -e "\n${YELLOW}INQUILINOS:${NC}"
echo "  1. Roberto Martínez: $TENANT1_ID"
echo "  2. Laura González: $TENANT2_ID"

echo -e "\n${YELLOW}CONTRATOS:${NC}"
echo "  1. Roberto en Carrera 7: $CONTRACT1_ID"
echo "  2. Laura en Calle 50: $CONTRACT2_ID"

echo -e "\n${YELLOW}PAGOS:${NC}"
echo "  1. Contrato 1 Enero: $PAGO1_ID (Pagado)"
echo "  2. Contrato 1 Febrero: $PAGO2_ID (Parcialmente pagado)"

echo -e "\n${GREEN}🎉 ¡Base de datos poblada correctamente!${NC}"
echo -e "${GREEN}📊 Accede a: http://localhost:3018/api/docs${NC}\n"
