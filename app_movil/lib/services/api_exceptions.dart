class SessionExpiredException implements Exception {
  final String message;

  const SessionExpiredException([
    this.message = 'La sesion expiro. Vuelve a iniciar sesion.',
  ]);

  @override
  String toString() => message;
}
