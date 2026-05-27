import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

class Fallback3dViewer extends StatelessWidget {
  final String modelUrl;

  const Fallback3dViewer({
    super.key,
    required this.modelUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF1A1A2E), // Dark blue/purple shade
            Color(0xFF16213E),
            Color(0xFF0F3460),
          ],
        ),
      ),
      child: SafeArea(
        child: ModelViewer(
          src: modelUrl,
          alt: "Un modelo 3D interactivo",
          ar: false,
          autoRotate: true,
          cameraControls: true,
          backgroundColor: Colors.transparent,
          interactionPrompt: InteractionPrompt.auto,
        ),
      ),
    );
  }
}
