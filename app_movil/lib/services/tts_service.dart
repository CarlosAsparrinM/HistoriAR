import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  static final TtsService _instance = TtsService._internal();
  factory TtsService() => _instance;
  TtsService._internal() {
    _init();
  }

  final FlutterTts _flutterTts = FlutterTts();

  Future<void> _init() async {
    // Configurar idioma español
    await _flutterTts.setLanguage("es-ES");
    await _flutterTts.setSpeechRate(0.5); // Velocidad normal
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);
  }

  Future<void> speak(
    String text, {
    void Function()? onStart,
    void Function()? onCompletion,
  }) async {
    _flutterTts.setStartHandler(() {
      if (onStart != null) onStart();
    });

    _flutterTts.setCompletionHandler(() {
      if (onCompletion != null) onCompletion();
    });

    _flutterTts.setCancelHandler(() {
      if (onCompletion != null) onCompletion();
    });
    
    _flutterTts.setErrorHandler((msg) {
      if (onCompletion != null) onCompletion();
    });

    await _flutterTts.speak(text);
  }

  Future<void> stop() async {
    await _flutterTts.stop();
  }
}
