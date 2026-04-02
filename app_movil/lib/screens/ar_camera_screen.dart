import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:ar_flutter_plugin_plus/ar_flutter_plugin_plus.dart';
import 'package:ar_flutter_plugin_plus/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin_plus/datatypes/node_types.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin_plus/models/ar_node.dart';
import 'package:vector_math/vector_math_64.dart' as vmath;

import '../models/monument.dart';
import '../services/api_config.dart';

class ArCameraScreen extends StatefulWidget {
  final Monument monument;
	final String token;

  const ArCameraScreen({super.key, required this.monument, required this.token});

  @override
  State<ArCameraScreen> createState() => _ArCameraScreenState();
}

class _ArCameraScreenState extends State<ArCameraScreen> {
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARNode? webObjectNode;

  double _scaleFactor = 0.2;
  double _rotationY = 0.0; // en radianes
  double _baseScale = 0.2;
  double _baseRotationY = 0.0;
  // Offset inicial: un poco más abajo del centro de la cámara
  vmath.Vector2 _offset = vmath.Vector2(0.0, -0.3);
  vmath.Vector2 _baseOffset = vmath.Vector2(0.0, 0.0);

  bool _isLoadingModel = false;
  String? _loadError;
  String? _lastPressedButtonId;

  @override
  void dispose() {
    arSessionManager?.dispose();
    super.dispose();
  }

  void onARViewCreated(
    ARSessionManager arSessionManager,
    ARObjectManager arObjectManager,
    ARAnchorManager arAnchorManager,
    ARLocationManager arLocationManager,
  ) {
    this.arSessionManager = arSessionManager;
    this.arObjectManager = arObjectManager;

    this.arSessionManager!.onInitialize(
      showFeaturePoints: true,
      showPlanes: true,
      customPlaneTexturePath: "Images/triangle.png",
      showWorldOrigin: false,
      handleTaps: false,
    );
    this.arObjectManager!.onInitialize();

    _addWebObjectForMonument();
  }

  Future<void> _addWebObjectForMonument() async {
    final url = await _resolveModelUrl();
    if (url == null || url.isEmpty) {
      stdout.writeln('Monumento sin model3DUrl');
      setState(() {
        _loadError = 'No se encontró modelo 3D para este monumento.';
      });
      return;
    }

    setState(() {
      _isLoadingModel = true;
      _loadError = null;
    });

    if (webObjectNode != null) {
      await arObjectManager?.removeNode(webObjectNode!);
      webObjectNode = null;
    }

    // Colocamos el modelo al frente y un poco más abajo de la cámara
    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(0.0, -0.4, -0.8)
      ..rotateY(_rotationY)
      ..scale(_scaleFactor);

    final newNode = ARNode(
      type: NodeType.webGLB,
      uri: url,
      transformation: transform,
    );

    try {
      final didAdd = await arObjectManager?.addNode(newNode);
      if (didAdd == true) {
        setState(() {
          webObjectNode = newNode;
        });
      } else {
        setState(() {
          _loadError = 'No se pudo cargar el modelo 3D.';
        });
      }
    } catch (e) {
      setState(() {
        _loadError = 'Error al cargar el modelo: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingModel = false;
        });
        // Ocultar el mensaje de error automáticamente después de unos segundos
        if (_loadError != null) {
          Future.delayed(const Duration(seconds: 4), () {
            if (!mounted) return;
            if (_loadError != null) {
              setState(() {
                _loadError = null;
              });
            }
          });
        }
      }
    }
  }

  Future<String?> _resolveModelUrl() async {
    final directUrl = widget.monument.model3DUrl;
    if (directUrl != null && directUrl.isNotEmpty) {
      return directUrl;
    }

    final key = widget.monument.s3ModelKey;
    if (key == null || key.isEmpty) {
      return null;
    }

    final uri = Uri.parse('$apiBaseUrl/api/uploads/signed-get?key=${Uri.encodeComponent(key)}&expiresIn=3600');
    final response = await http.get(
      uri,
      headers: {
        'Authorization': 'Bearer ${widget.token}',
      },
    );

    if (response.statusCode != 200) {
      return null;
    }

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;
    return decoded['url'] as String?;
  }

  void _updateNodeTransform() {
    if (webObjectNode == null) return;

    final transform = vmath.Matrix4.identity()
      ..setTranslationRaw(_offset.x, _offset.y, -0.8)
      ..rotateY(_rotationY)
      ..scale(_scaleFactor);

    webObjectNode!.transform = transform;
  }

  void _zoomIn() {
    if (webObjectNode == null) return;
    setState(() {
      _scaleFactor = (_scaleFactor + 0.05).clamp(0.1, 0.8);
    });
    _updateNodeTransform();
  }

  void _zoomOut() {
    if (webObjectNode == null) return;
    setState(() {
      _scaleFactor = (_scaleFactor - 0.05).clamp(0.1, 0.8);
    });
    _updateNodeTransform();
  }

  void _rotateRight() {
    if (webObjectNode == null) return;
    setState(() {
      _rotationY += 0.2;
    });
    _updateNodeTransform();
  }

  void _flashButton(String id) {
    setState(() => _lastPressedButtonId = id);
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      if (_lastPressedButtonId == id) {
        setState(() => _lastPressedButtonId = null);
      }
    });
  }

  void _resetTransform() {
    if (webObjectNode == null) return;
    setState(() {
      _scaleFactor = 0.2;
      _rotationY = 0.0;
      // Reseteamos el offset manteniendo el modelo al frente y un poco más abajo
      _offset = vmath.Vector2(0.0, -0.3);
    });
    _updateNodeTransform();
  }

  @override
  Widget build(BuildContext context) {
    final monument = widget.monument;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          GestureDetector(
            onScaleStart: (details) {
              _baseScale = _scaleFactor;
              _baseRotationY = _rotationY;
              _baseOffset = _offset;
            },
            onScaleUpdate: (details) {
              if (webObjectNode == null) return;
              setState(() {
                final newScale = _baseScale * details.scale;
                _scaleFactor = newScale.clamp(0.1, 0.8);
                _rotationY = _baseRotationY + details.rotation;
                _offset = vmath.Vector2(
                  (_baseOffset.x + details.focalPointDelta.dx / 300)
                      .clamp(-1.0, 1.0),
                  (_baseOffset.y - details.focalPointDelta.dy / 300)
                      .clamp(-1.0, 1.0),
                );
              });
              _updateNodeTransform();
            },
            child: ARView(
              onARViewCreated: onARViewCreated,
              // Habilitamos la detección de planos horizontales
              planeDetectionConfig: PlaneDetectionConfig.horizontal,
            ),
          ),
          if (_isLoadingModel)
            Align(
              alignment: Alignment.topCenter,
              child: SafeArea(
                child: Container(
                  // Lo bajamos un poco para no tapar el nombre del monumento
                  margin: const EdgeInsets.only(top: 72),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      ),
                      SizedBox(height: 10),
                      Text(
                        'Preparando experiencia AR...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Mueve el dispositivo lentamente hasta que desaparezca la guía.',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_loadError != null && !_isLoadingModel)
            Align(
              alignment: Alignment.topCenter,
              child: SafeArea(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _loadError = null;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(top: 16),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.redAccent.withOpacity(0.95),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.4),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Colors.white,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _loadError!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _onBackPressed,
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          monument.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (monument.district != null &&
                            monument.district!.isNotEmpty)
                          Text(
                            monument.district!,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _ArControlButton(
                    icon: Icons.info_outline,
                    onPressed: () => _showMonumentInfo(context),
                  ),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.8),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      monument.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(26),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _ArControlButton(
                              icon: Icons.rotate_left,
                              onPressed: () {
                                _flashButton('rotate_left');
                                _rotateRight();
                              },
                              isHighlighted: _lastPressedButtonId == 'rotate_left',
                            ),
                            const SizedBox(width: 12),
                            _ArControlButton(
                              icon: Icons.zoom_out,
                              onPressed: () {
                                _flashButton('zoom_out');
                                _zoomOut();
                              },
                              isHighlighted: _lastPressedButtonId == 'zoom_out',
                            ),
                            const SizedBox(width: 12),
                            _ArControlButton(
                              icon: Icons.restart_alt,
                              // Centra el modelo nuevamente frente a la cámara
                              onPressed: webObjectNode != null
                                  ? () {
                                      _flashButton('reset');
                                      _resetTransform();
                                    }
                                  : null,
                              isPrimary: true,
                              isHighlighted: _lastPressedButtonId == 'reset',
                            ),
                            const SizedBox(width: 12),
                            _ArControlButton(
                              icon: Icons.zoom_in,
                              onPressed: () {
                                _flashButton('zoom_in');
                                _zoomIn();
                              },
                              isHighlighted: _lastPressedButtonId == 'zoom_in',
                            ),
                            const SizedBox(width: 12),
                            _ArControlButton(
                              icon: Icons.rotate_right,
                              onPressed: () {
                                _flashButton('rotate_right');
                                _rotateRight();
                              },
                              isHighlighted: _lastPressedButtonId == 'rotate_right',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _onBackPressed() async {
    Navigator.of(context).pop();
  }

  void _showMonumentInfo(BuildContext context) {
    final monument = widget.monument;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.black,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding
(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      monument.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Colors.white70),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _InfoItem(
                      label: 'Estado',
                      value: monument.status,
                    ),
                  ),
                  Expanded(
                    child: _InfoItem(
                      label: 'Distrito',
                      value: (monument.district ?? '').isNotEmpty
                          ? monument.district!
                          : '—',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _InfoItem(
                      label: 'Latitud',
                      value: monument.position.latitude.toStringAsFixed(5),
                    ),
                  ),
                  Expanded(
                    child: _InfoItem(
                      label: 'Longitud',
                      value: monument.position.longitude.toStringAsFixed(5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                monument.description,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ArControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final bool isPrimary;
  final bool isHighlighted;

  const _ArControlButton({
    required this.icon,
    required this.onPressed,
    this.isPrimary = false,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    final bool enabled = onPressed != null;
    final Color baseBg = isPrimary
        ? (enabled ? Colors.white : Colors.white.withOpacity(0.4))
        : (enabled
            ? const Color(0xFFFF6600)
            : const Color(0xFFFF6600).withOpacity(0.4));

    final Color bg = isHighlighted
        ? Colors.white.withOpacity(0.9)
        : baseBg;

    final Color fg = isPrimary || isHighlighted ? Colors.black : Colors.white;

    return InkWell(
      onTap: enabled ? onPressed : null,
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        width: 52,
        height: 52,
        decoration: BoxDecoration(
          color: bg,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: fg, size: 24),
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final String label;
  final String value;

  const _InfoItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}