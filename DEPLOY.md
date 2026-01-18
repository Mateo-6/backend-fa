# Guía de Despliegue - Ami Financial App

Esta guía te ayudará a desplegar tanto el backend (API) como el frontend (PWA) de tu aplicación.

## Prerrequisitos

1. **AWS CLI** instalado y configurado con tus credenciales
2. **SAM CLI** instalado (`sam --version`)
3. **Node.js** y **npm** instalados
4. **Expo CLI** instalado (`npm install -g expo-cli` o usar `npx expo`)
5. Tu **MongoDB Atlas connection string** listo

## Paso 1: Desplegar el Backend (API) con SAM

### 1.1. Compilar el código TypeScript

```bash
cd /Users/kulljam/Documents/Financial-app/api
npm run build
```

### 1.2. Construir con SAM

```bash
npm run aws:build
# O directamente:
sam build
```

### 1.3. Desplegar a AWS

**Primera vez (despliegue guiado):**
```bash
npm run aws:deploy
# O directamente:
sam deploy --guided
```

Durante el despliegue guiado, te pedirá:
- **Stack Name**: `ami-api` (o el que prefieras)
- **AWS Region**: `us-east-1` (o tu región preferida)
- **Parameter MongoUri**: Tu connection string de MongoDB Atlas
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`
- **Disable rollback**: `Y` (opcional)

**Despliegues subsecuentes:**
```bash
sam deploy
```

### 1.4. Obtener las URLs del despliegue

Después del despliegue, SAM mostrará los **Outputs**. Anota estos valores:

- **AmiApi**: URL de tu API Gateway
- **AmiWebBucketName**: Nombre del bucket S3
- **AmiWebCloudFrontURL**: URL de CloudFront (ej: `d1234567890.cloudfront.net`)

También puedes obtenerlos después con:
```bash
aws cloudformation describe-stacks \
  --stack-name ami-api \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Paso 2: Desplegar el Frontend (PWA)

### 2.1. Configurar la URL de la API en el frontend

Antes de desplegar, asegúrate de que tu frontend apunte a la URL correcta de la API. Revisa el archivo de configuración de servicios en `mobile-app/services/api.ts`.

### 2.2. Exportar la aplicación web

```bash
cd /Users/kulljam/Documents/Financial-app/mobile-app
npm run build:web
# O directamente:
npx expo export --platform web
```

Esto generará los archivos estáticos en la carpeta `dist/`.

### 2.3. Sincronizar con S3

**Opción A: Usando el script del package.json (desde el directorio api)**

Primero, exporta la variable de entorno con el nombre de tu stack:
```bash
export AWS_STACK_NAME=ami-api
```

Luego, desde el directorio `mobile-app`:
```bash
cd /Users/kulljam/Documents/Financial-app/mobile-app
npx expo export --platform web

# Obtener el nombre del bucket
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${AWS_STACK_NAME:-ami-api} \
  --query 'Stacks[0].Outputs[?OutputKey==`AmiWebBucketName`].OutputValue' \
  --output text)

# Sincronizar archivos
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

**Opción B: Manualmente**

```bash
# Obtener el nombre del bucket
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ami-api \
  --query 'Stacks[0].Outputs[?OutputKey==`AmiWebBucketName`].OutputValue' \
  --output text)

# Sincronizar
cd /Users/kulljam/Documents/Financial-app/mobile-app
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

El flag `--delete` elimina archivos del bucket que ya no existen en `dist/`.

### 2.4. Invalidar caché de CloudFront (opcional pero recomendado)

Después de subir nuevos archivos, invalida la caché de CloudFront para que los cambios se reflejen inmediatamente:

```bash
# Obtener el Distribution ID
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name ami-api \
  --query 'Stacks[0].Outputs[?OutputKey==`AmiWebCloudFrontDistributionId`].OutputValue' \
  --output text)

# Crear invalidación
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*"
```

## Paso 3: Verificar el Despliegue

1. **Verificar la API**: Visita la URL de `AmiApi` en tu navegador o usa curl:
   ```bash
   curl https://TU_API_ID.execute-api.us-east-1.amazonaws.com/
   ```

2. **Verificar el Frontend**: Visita la URL de CloudFront:
   ```bash
   # La URL será algo como:
   https://d1234567890.cloudfront.net
   ```

## Comandos Útiles

### Ver logs de Lambda
```bash
cd /Users/kulljam/Documents/Financial-app/api
npm run aws:logs
# O:
sam logs -n AmiFunction --tail
```

### Actualizar solo el backend
```bash
cd /Users/kulljam/Documents/Financial-app/api
npm run build
sam build
sam deploy
```

### Actualizar solo el frontend
```bash
cd /Users/kulljam/Documents/Financial-app/mobile-app
npm run build:web
# Luego sincronizar con S3 (ver Paso 2.3)
```

### Eliminar el stack completo
```bash
aws cloudformation delete-stack --stack-name ami-api
```

## Troubleshooting

### Error: "Bucket policy not found"
- Asegúrate de que el stack se desplegó correctamente
- Verifica que el recurso `AmiWebBucketPolicy` existe en CloudFormation

### Error: "Access Denied" al sincronizar con S3
- Verifica que tu usuario de AWS tiene permisos para `s3:PutObject` y `s3:DeleteObject`
- Verifica que el bucket existe y tiene el nombre correcto

### CloudFront muestra contenido antiguo
- Crea una invalidación de caché (ver Paso 2.4)
- Espera 5-10 minutos para que la distribución se propague

### La API no responde
- Revisa los logs de CloudWatch: `sam logs -n AmiFunction --tail`
- Verifica que la variable de entorno `MONGO_URI` está configurada correctamente

## Notas Importantes

- El bucket S3 **NO es público**. Solo CloudFront puede acceder a él gracias a OAC.
- La primera vez que despliegues CloudFront, puede tardar 15-20 minutos en estar completamente activo.
- Los cambios en el frontend pueden tardar unos minutos en reflejarse debido a la caché de CloudFront.
- Asegúrate de actualizar la configuración de CORS en la API si cambias el origen del frontend.
