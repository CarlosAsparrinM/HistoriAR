# AWS Health Check Endpoint

## Descripción

El endpoint `/health` es un health check simple diseñado específicamente para AWS Application Load Balancer (ALB) y Target Groups.

## Endpoint

```
GET /health
```

## Respuesta

- **Status Code**: `200 OK`
- **Body**: `OK` (texto plano)

## Uso en AWS

### Application Load Balancer (ALB)

Configura el health check en tu Target Group con los siguientes parámetros:

```
Health check protocol: HTTP
Health check path: /health
Health check port: traffic-port
Healthy threshold: 2
Unhealthy threshold: 2
Timeout: 5 seconds
Interval: 30 seconds
Success codes: 200
```

### Elastic Beanstalk

Si usas Elastic Beanstalk, configura en `.ebextensions/healthcheck.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health
```

## Endpoints Adicionales

### `/health` - Health Check Simple
- **Propósito**: Health check básico para ALB/Target Group
- **Respuesta**: `200 OK` con texto "OK"
- **Uso**: AWS Load Balancer health checks

### `/api/health` - Health Check Detallado
- **Propósito**: Health check con información de servicios
- **Respuesta**: JSON con estado de MongoDB y S3
- **Uso**: Monitoreo y debugging

Ejemplo de respuesta:
```json
{
  "status": "OK",
  "timestamp": "2024-12-10T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "storage": "s3"
  }
}
```

### `/api/health/s3` - Health Check de S3
- **Propósito**: Verificar configuración de AWS S3
- **Respuesta**: JSON con información de S3
- **Uso**: Verificar conectividad con S3

Ejemplo de respuesta:
```json
{
  "status": "OK",
  "message": "Using AWS S3 for storage",
  "bucket": "historiar-storage",
  "region": "us-east-1"
}
```

## Testing Local

### Opción 1: curl
```bash
curl http://localhost:4000/health
```

### Opción 2: npm script
```bash
npm run test:health
```

### Opción 3: navegador
Abre en tu navegador:
```
http://localhost:4000/health
```

## Respuestas Esperadas

### ✅ Servidor Saludable
```
Status: 200 OK
Body: OK
```

### ❌ Servidor No Disponible
```
Status: 503 Service Unavailable
o
Connection refused
```

## Configuración en AWS Console

### 1. Target Group Health Check

1. Ve a **EC2 > Target Groups**
2. Selecciona tu Target Group
3. Ve a la pestaña **Health checks**
4. Click en **Edit**
5. Configura:
   - **Health check protocol**: HTTP
   - **Health check path**: `/health`
   - **Health check port**: `traffic-port`
   - **Healthy threshold**: `2`
   - **Unhealthy threshold**: `2`
   - **Timeout**: `5 seconds`
   - **Interval**: `30 seconds`
   - **Success codes**: `200`

### 2. Application Load Balancer

El ALB usará automáticamente la configuración del Target Group.

### 3. Verificar Estado

1. Ve a **EC2 > Target Groups**
2. Selecciona tu Target Group
3. Ve a la pestaña **Targets**
4. Verifica que el estado sea **healthy**

## Troubleshooting

### El health check falla

1. **Verifica que el servidor esté corriendo**:
   ```bash
   curl http://localhost:4000/health
   ```

2. **Verifica los Security Groups**:
   - El Security Group del ALB debe permitir tráfico HTTP/HTTPS entrante
   - El Security Group de las instancias EC2 debe permitir tráfico desde el ALB

3. **Verifica los logs**:
   ```bash
   # En la instancia EC2
   pm2 logs
   # o
   journalctl -u your-app-service -f
   ```

4. **Verifica el puerto**:
   - Asegúrate de que la aplicación esté escuchando en el puerto correcto
   - El puerto debe coincidir con el configurado en el Target Group

### El health check es intermitente

1. **Aumenta el timeout**: De 5 a 10 segundos
2. **Aumenta el intervalo**: De 30 a 60 segundos
3. **Verifica recursos**: CPU y memoria de las instancias

## Mejores Prácticas

1. **Mantén el endpoint simple**: No agregues lógica compleja que pueda fallar
2. **Responde rápido**: El endpoint debe responder en menos de 1 segundo
3. **No requieras autenticación**: El health check debe ser público
4. **Usa un path dedicado**: `/health` es estándar y fácil de recordar
5. **Monitorea los logs**: Revisa regularmente los health check logs en CloudWatch

## Monitoreo

### CloudWatch Metrics

AWS automáticamente crea métricas de CloudWatch:
- `HealthyHostCount`: Número de targets saludables
- `UnHealthyHostCount`: Número de targets no saludables
- `TargetResponseTime`: Tiempo de respuesta del health check

### Alarmas Recomendadas

Crea alarmas en CloudWatch para:
- `UnHealthyHostCount > 0` por más de 5 minutos
- `HealthyHostCount < 1` (sin targets saludables)

## Referencias

- [AWS ALB Health Checks](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)
- [AWS Elastic Beanstalk Health Checks](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.healthstatus.html)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Última actualización**: Diciembre 10, 2024  
**Versión**: 1.0  
**Autor**: Carlos Asparrín
