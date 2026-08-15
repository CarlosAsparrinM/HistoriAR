/**
 * Formulario de Inicio de Sesión (LoginForm)
 * 
 * Maneja las credenciales del usuario administrador y el flujo de autenticación
 * contra el contexto de auth. Muestra estados de carga y errores.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, MapPin, Smartphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const { login, isLoading } = useAuth();

  // Rate limiting: máximo 5 intentos, bloqueo de 5 minutos
  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 5 * 60 * 1000; // 5 minutos en ms

  // Verificar si está bloqueado al cargar
  useState(() => {
    const blockData = localStorage.getItem('loginBlock');
    if (blockData) {
      const { timestamp, attempts } = JSON.parse(blockData);
      const timeElapsed = Date.now() - timestamp;
      
      if (timeElapsed < BLOCK_DURATION && attempts >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setAttemptCount(attempts);
        setBlockTimeLeft(Math.ceil((BLOCK_DURATION - timeElapsed) / 1000));
        
        // Countdown timer
        const timer = setInterval(() => {
          const newTimeLeft = Math.ceil((BLOCK_DURATION - (Date.now() - timestamp)) / 1000);
          if (newTimeLeft <= 0) {
            setIsBlocked(false);
            setAttemptCount(0);
            localStorage.removeItem('loginBlock');
            clearInterval(timer);
          } else {
            setBlockTimeLeft(newTimeLeft);
          }
        }, 1000);
        
        return () => clearInterval(timer);
      } else if (timeElapsed >= BLOCK_DURATION) {
        // Bloqueo expirado, limpiar
        localStorage.removeItem('loginBlock');
      } else {
        setAttemptCount(attempts);
      }
    }
  }, []);

  /**
   * Envía el formulario y ejecuta el login del contexto
   * - Previene el submit por defecto
   * - Limpia errores anteriores
   * - Implementa rate limiting
   * - Muestra errores provenientes del contexto
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isBlocked) {
      setError(`Demasiados intentos fallidos. Intenta nuevamente en ${Math.ceil(blockTimeLeft / 60)} minutos.`);
      return;
    }
    
    try {
      await login(email, password);
      // Login exitoso, limpiar intentos
      localStorage.removeItem('loginBlock');
      setAttemptCount(0);
    } catch (err) {
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      // Guardar intentos en localStorage
      localStorage.setItem('loginBlock', JSON.stringify({
        timestamp: Date.now(),
        attempts: newAttemptCount
      }));
      
      if (newAttemptCount >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setBlockTimeLeft(BLOCK_DURATION / 1000);
        setError(`Demasiados intentos fallidos. Cuenta bloqueada por 5 minutos.`);
        
        // Iniciar countdown
        const timer = setInterval(() => {
          setBlockTimeLeft(prev => {
            if (prev <= 1) {
              setIsBlocked(false);
              setAttemptCount(0);
              localStorage.removeItem('loginBlock');
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
        setError(`${err instanceof Error ? err.message : 'Error al iniciar sesión'}. Te quedan ${remainingAttempts} intentos.`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">HistoriAR</h1>
          <p className="text-gray-600 mt-2">Panel de Administración</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Accede al panel de administración de HistoriAR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo: correo electrónico */}
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="administrador@ejemplo.com"
                  required
                />
              </div>
              
              {/* Campo: contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Estado de error de autenticación */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botón de envío con indicador de carga */}
              <Button type="submit" className="w-full" disabled={isLoading || isBlocked}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : isBlocked ? (
                  `Bloqueado (${Math.ceil(blockTimeLeft / 60)}m ${blockTimeLeft % 60}s)`
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              {/* Mostrar intentos restantes */}
              {attemptCount > 0 && attemptCount < MAX_ATTEMPTS && !isBlocked && (
                <p className="text-sm text-amber-600 text-center">
                  Intentos restantes: {MAX_ATTEMPTS - attemptCount}
                </p>
              )}
            </form>


          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Smartphone className="w-4 h-4" />
            <span>Potenciando el turismo cultural en Lima</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
