import 'package:flutter/material.dart';

import '../services/tts_service.dart';
import '../styles/app_colors.dart';

class TtsPlayButton extends StatefulWidget {
  final String text;
  final Color? color;
  final double size;

  const TtsPlayButton({
    super.key,
    required this.text,
    this.color,
    this.size = 24.0,
  });

  @override
  State<TtsPlayButton> createState() => _TtsPlayButtonState();
}

class _TtsPlayButtonState extends State<TtsPlayButton> {
  final TtsService _ttsService = TtsService();
  bool _isPlaying = false;

  @override
  void dispose() {
    if (_isPlaying) {
      _ttsService.stop();
    }
    super.dispose();
  }

  void _togglePlay() {
    if (_isPlaying) {
      _ttsService.stop();
      if (mounted) {
        setState(() {
          _isPlaying = false;
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _isPlaying = true;
        });
      }
      _ttsService.speak(
        widget.text,
        onCompletion: () {
          if (mounted) {
            setState(() {
              _isPlaying = false;
            });
          }
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      iconSize: widget.size,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
      icon: Icon(
        _isPlaying ? Icons.stop_circle_outlined : Icons.volume_up_outlined,
        color: widget.color ?? AppColors.primary,
      ),
      onPressed: _togglePlay,
      tooltip: _isPlaying ? 'Detener lectura' : 'Leer en voz alta',
    );
  }
}
