#!/bin/bash

# Test script for arrendando API
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwN2EzZDg0YS1jNzQ3LTRmYTItYThjZS1jYzI4ODY4ZGZjZTYiLCJlbWFpbCI6ImFkbWluQHNpc3RlbWEuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzYxMzk5ODY1LCJleHAiOjE3NjE0MDM0NjV9.HpQlJE7UlxALm_lqLdyvTiNw9wlDkXPyyAE4lz3G2YE"
BASE_URL="http://localhost:3011"

echo "=== Testing Arrendando API ==="

# Create 10 tenants
echo "Creating 10 tenants..."
declare -a tenant_ids=()

tenants=(
  '{"cedula": "1234567890", "nombres": "Lionel", "apellidos": "Messi", "telefono": "+57 300 123 4567", "correo": "messi@email.com", "direccion": "Calle 10 #15-20", "ciudad": "Barcelona", "contactoEmergencia": "+57 310 987 6543", "isActive": true}'
  '{"cedula": "2345678901", "nombres": "Cristiano", "apellidos": "Ronaldo", "telefono": "+57 301 234 5678", "correo": "cr7@email.com", "direccion": "Carrera 5 #25-30", "ciudad": "Lisboa", "contactoEmergencia": "+57 311 876 5432", "isActive": true}'
  '{"cedula": "3456789012", "nombres": "Neymar", "apellidos": "Junior", "telefono": "+57 302 345 6789", "correo": "neymar@email.com", "direccion": "Avenida 20 #35-40", "ciudad": "Sao Paulo", "contactoEmergencia": "+57 312 765 4321", "isActive": true}'
  '{"cedula": "4567890123", "nombres": "Kylian", "apellidos": "Mbappe", "telefono": "+57 303 456 7890", "correo": "mbappe@email.com", "direccion": "Calle 15 #45-50", "ciudad": "Paris", "contactoEmergencia": "+57 313 654 3210", "isActive": true}'
  '{"cedula": "5678901234", "nombres": "Robert", "apellidos": "Lewandowski", "telefono": "+57 304 567 8901", "correo": "lewa@email.com", "direccion": "Carrera 12 #55-60", "ciudad": "Munich", "contactoEmergencia": "+57 314 543 2109", "isActive": true}'
  '{"cedula": "6789012345", "nombres": "Kevin", "apellidos": "De Bruyne", "telefono": "+57 305 678 9012", "correo": "kdb@email.com", "direccion": "Avenida 25 #65-70", "ciudad": "Manchester", "contactoEmergencia": "+57 315 432 1098", "isActive": true}'
  '{"cedula": "7890123456", "nombres": "Virgil", "apellidos": "Van Dijk", "telefono": "+57 306 789 0123", "correo": "vvd@email.com", "direccion": "Calle 18 #75-80", "ciudad": "Liverpool", "contactoEmergencia": "+57 316 321 0987", "isActive": true}'
  '{"cedula": "8901234567", "nombres": "Sadio", "apellidos": "Mane", "telefono": "+57 307 890 1234", "correo": "mane@email.com", "direccion": "Carrera 8 #85-90", "ciudad": "Dakar", "contactoEmergencia": "+57 317 210 9876", "isActive": true}'
  '{"cedula": "9012345678", "nombres": "Mohamed", "apellidos": "Salah", "telefono": "+57 308 901 2345", "correo": "salah@email.com", "direccion": "Avenida 30 #95-100", "ciudad": "Cairo", "contactoEmergencia": "+57 318 109 8765", "isActive": true}'
  '{"cedula": "0123456789", "nombres": "Erling", "apellidos": "Haaland", "telefono": "+57 309 012 3456", "correo": "haaland@email.com", "direccion": "Calle 22 #105-110", "ciudad": "Dortmund", "contactoEmergencia": "+57 319 098 7654", "isActive": true}'
)

for i in "${!tenants[@]}"; do
  echo "Creating tenant $((i+1)): ${tenants[i]}"
  response=$(curl -s -X POST "$BASE_URL/tenants" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "${tenants[i]}")
  
  tenant_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$tenant_id" ]; then
    tenant_ids+=("$tenant_id")
    echo "✓ Created tenant with ID: $tenant_id"
  else
    echo "✗ Failed to create tenant: $response"
  fi
  sleep 1
done

echo "Created ${#tenant_ids[@]} tenants"
echo ""

# List all tenants
echo "=== Listing all tenants ==="
curl -s -X GET "$BASE_URL/tenants" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "=== Testing complete ==="