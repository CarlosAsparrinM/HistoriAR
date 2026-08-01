import { validationResult } from 'express-validator';

/**
 * Detiene la petición cuando alguna cadena de express-validator falla.
 * Debe colocarse después de los validadores de la ruta.
 */
export function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    code: 'VALIDATION_ERROR',
    message: 'Datos de entrada inválidos',
    details: errors.array({ onlyFirstError: true }).map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
}

export default validateRequest;
