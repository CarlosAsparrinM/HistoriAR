import 'dart:convert';
import 'dart:io';

import 'package:app_movil/config/environment.dart';
import 'package:ar_flutter_plugin_plus/ar_flutter_plugin_plus.dart';
import 'package:ar_flutter_plugin_plus/datatypes/config_planedetection.dart';
import 'package:ar_flutter_plugin_plus/datatypes/node_types.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_anchor_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_location_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_object_manager.dart';
import 'package:ar_flutter_plugin_plus/managers/ar_session_manager.dart';
import 'package:ar_flutter_plugin_plus/models/ar_anchor.dart';
import 'package:ar_flutter_plugin_plus/models/ar_hittest_result.dart';
import 'package:ar_flutter_plugin_plus/models/ar_node.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:vector_math/vector_math_64.dart' as vmath;

import '../models/monument.dart';
import '../styles/app_colors.dart';

class ArCameraScreen extends StatefulWidget {
  final Monument monument;
  final String token;

  const ArCameraScreen({
    super.key,
    required this.monument,
    required this.token,
  });

  @override
  State<ArCameraScreen> createState() => _ArCameraScreenState();
}

class _ArCameraScreenState extends State<ArCameraScreen> {
  ARSessionManager? arSessionManager;
  ARObjectManager? arObjectManager;
  ARAnchorManager? arAnchorManager;
  ARNode? webObjectNode;

  double _scaleFactor = 0.2;
  double _rotationY = 0.0; // en radianes
  double _rotationX = 0.0;
  double _baseScale = 0.2;
  double _baseRotationY = 0.0;
  double _baseRotationX = 0.0;
  Offset _baseFocalPoint = Offset.zero;
  // Offset inicial: un poco más abajo del centro de la cámara
  vmath.Vector2 _offset = vmath.Vector2(0.0, -0.3);
  vmath.Vector2 _baseOffset = vmath.Vector2(0.0, 0.0);

  bool _isLoadingModel = false;
  String? _loadError;

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
    this.arAnchorManager = arAnchorManager;

    this.arSessionManager!.onInitialize(
      showFeaturePoints: true,
      showPlanes: true,
      customPlaneTexturePath: "Images/triangle.png",
      showWorldOrigin: false,
      handleTaps: true,
    );
    this.arObjectManager!.onInitialize();

    this.arSessionManager!.onPlaneOrPointTap = _handlePlaneOrPointTap;

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
      ..rotateX(_rotationX)
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

    final uri = Uri.parse(
      '${Environment.apiBaseUrl}/api/uploads/signed-get?key=${Uri.encodeComponent(key)}&expiresIn=3600',
    );
    final response = await http.get(
      uri,
      headers: {'Authorization': 'Bearer ${widget.token}'},
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
      ..rotateX(_rotationX)
      ..rotateY(_rotationY)
      ..scale(_scaleFactor);

    webObjectNode!.transform = transform;
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
              _baseRotationX = _rotationX;
              _baseRotationY = _rotationY;
              _baseOffset = _offset;
              _baseFocalPoint = details.focalPoint;
            },
            onScaleUpdate: (details) {
              if (webObjectNode == null) return;
              // Distinguimos pan de un dedo vs gesto de varios dedos
              final bool isSingleFingerPan =
                  (details.scale - 1.0).abs() < 0.02 &&
                  details.rotation.abs() < 0.02;

              if (isSingleFingerPan) {
                final double deltaX =
                    (details.focalPoint.dx - _baseFocalPoint.dx) / 150;
                final double deltaY =
                    (details.focalPoint.dy - _baseFocalPoint.dy) / 300;

                // Interpretar como giro: horizontal = yaw, vertical = pitch
                setState(() {
                  _rotationY = _baseRotationY + deltaX;
                  _rotationX = (_baseRotationX - deltaY).clamp(-1.4, 1.4);
                });
              } else {
                // Gesto multitáctil: zoom, rotación y pequeño desplazamiento focal
                setState(() {
                  final newScale = _baseScale * details.scale;
                  _scaleFactor = newScale.clamp(0.1, 0.8);
                  _rotationX = _baseRotationX;
                  _rotationY = _baseRotationY + details.rotation;
                  _offset = vmath.Vector2(
                    (_baseOffset.x + details.focalPointDelta.dx / 300).clamp(
                      -1.0,
                      1.0,
                    ),
                    (_baseOffset.y - details.focalPointDelta.dy / 300).clamp(
                      -1.0,
                      1.0,
                    ),
                  );
                });
              }
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
                        style: TextStyle(color: Colors.white70, fontSize: 11),
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
          // Botón de regresar flotante en la esquina superior izquierda (estilizado)
          Align(
            alignment: Alignment.topLeft,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.only(left: 12, top: 12),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.45),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: IconButton(
                    onPressed: _onBackPressed,
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    padding: const EdgeInsets.all(10),
                    constraints: const BoxConstraints(
                      minWidth: 44,
                      minHeight: 44,
                    ),
                    splashRadius: 22,
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
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          monument.name,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.2,
                          ),
                        ),
                        if (monument.district != null &&
                            monument.district!.isNotEmpty)
                          Text(
                            monument.district!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                  ),
                  // Botón de información con fondo circular
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.35),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: IconButton(
                      onPressed: () => _showMonumentInfo(context),
                      icon: const Icon(Icons.info_outline, color: Colors.white),
                      padding: const EdgeInsets.all(10),
                      constraints: const BoxConstraints(
                        minWidth: 44,
                        minHeight: 44,
                      ),
                      splashRadius: 22,
                    ),
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

  Future<void> _handlePlaneOrPointTap(List<ARHitTestResult> hits) async {
    if (hits.isEmpty) return;
    final hit = hits.first;

    if (webObjectNode != null) {
      await arObjectManager?.removeNode(webObjectNode!);
      webObjectNode = null;
    }

    final url = await _resolveModelUrl();
    if (url == null || url.isEmpty) return;

    final planeAnchor = ARPlaneAnchor(transformation: hit.worldTransform);
    final transform = vmath.Matrix4.identity()
      ..rotateX(_rotationX)
      ..rotateY(_rotationY)
      ..scale(_scaleFactor);

    final newNode = ARNode(
      type: NodeType.webGLB,
      uri: url,
      transformation: transform,
    );

    final addedToAnchor = await arAnchorManager?.addAnchor(planeAnchor);
    if (addedToAnchor != true) return;

    final didAdd = await arObjectManager?.addNode(
      newNode,
      planeAnchor: planeAnchor,
    );

    if (didAdd == true && mounted) {
      setState(() {
        webObjectNode = newNode;
      });
    }
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
        return Padding(
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
              const SizedBox(height: 16),
              if ((monument.culture ?? '').isNotEmpty)
                _InfoItem(label: 'Cultura', value: monument.culture!),
              _InfoItem(label: 'Periodo', value: _buildPeriodText(monument)),
              _InfoItem(
                label: 'Descubrimiento',
                value: _buildDiscoveryText(monument),
              ),
              const SizedBox(height: 12),
              Text(
                monument.description,
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 12),
              _PeriodTimelineCard(
                periodLabel: monument.periodName,
                periodIsIdentified: monument.periodIsIdentified,
                startYear: monument.periodStartYear,
                endYear: monument.periodEndYear,
                discoveryYear: monument.discoveryDiscoveredAt?.year,
                discoveryIsKnown: monument.discoveryIsDateKnown,
              ),
            ],
          ),
        );
      },
    );
  }

  String _buildPeriodText(Monument monument) {
    if (!monument.periodIsIdentified) {
      return 'No identificado';
    }

    final periodName = (monument.periodName ?? '').trim();
    final start = monument.periodStartYear;
    final end = monument.periodEndYear;

    if (start == null && end == null) {
      return periodName.isNotEmpty ? periodName : 'Sin datos';
    }

    final rangeText = (start != null && end != null)
        ? '$start - $end'
        : '${start ?? end}';

    if (periodName.isEmpty) return rangeText;
    return '$periodName ($rangeText)';
  }

  String _buildDiscoveryText(Monument monument) {
    final dateText = monument.discoveryIsDateKnown
        ? _formatDate(monument.discoveryDiscoveredAt)
        : 'Fecha desconocida';

    final discovererText = monument.discoveryIsDiscovererKnown
        ? ((monument.discoveryDiscovererName ?? '').trim().isNotEmpty
              ? monument.discoveryDiscovererName!.trim()
              : 'Descubridor no especificado')
        : 'Descubridor desconocido';

    return '$dateText • $discovererText';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Fecha desconocida';
    final day = date.day.toString().padLeft(2, '0');
    final month = date.month.toString().padLeft(2, '0');
    final year = date.year.toString();
    return '$day/$month/$year';
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
            style: const TextStyle(color: Colors.white54, fontSize: 11),
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

class _PeriodTimelineCard extends StatelessWidget {
  final String? periodLabel;
  final bool periodIsIdentified;
  final int? startYear;
  final int? endYear;
  final int? discoveryYear;
  final bool discoveryIsKnown;

  const _PeriodTimelineCard({
    this.periodLabel,
    required this.periodIsIdentified,
    this.startYear,
    this.endYear,
    this.discoveryYear,
    required this.discoveryIsKnown,
  });

  @override
  Widget build(BuildContext context) {
    final hasRange = startYear != null && endYear != null;
    final label = (periodLabel ?? '').trim();
    final periodText = !periodIsIdentified
        ? 'Periodo no identificado'
        : (label.isNotEmpty ? label : 'Periodo historico');

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.86),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.timeline, color: Colors.white, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  periodText,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (hasRange)
            _TimelineBar(
              startYear: startYear!,
              endYear: endYear!,
              discoveryYear: discoveryIsKnown ? discoveryYear : null,
            )
          else
            Text(
              'Sin rango cronologico completo',
              style: TextStyle(
                color: Colors.white.withOpacity(0.78),
                fontSize: 11,
              ),
            ),
        ],
      ),
    );
  }
}

class _TimelineBar extends StatelessWidget {
  final int startYear;
  final int endYear;
  final int? discoveryYear;

  const _TimelineBar({
    required this.startYear,
    required this.endYear,
    this.discoveryYear,
  });

  @override
  Widget build(BuildContext context) {
    const int timelineStart = -3300;
    final int timelineEnd = DateTime.now().year;

    final int safeMin = startYear <= endYear ? startYear : endYear;
    final int safeMax = startYear <= endYear ? endYear : startYear;
    final totalSpan = (timelineEnd - timelineStart).abs();

    final double periodStartRatio =
        ((safeMin - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );
    final double periodEndRatio =
        ((safeMax - timelineStart) / (totalSpan == 0 ? 1 : totalSpan)).clamp(
          0.0,
          1.0,
        );

    final bool showDiscovery = discoveryYear != null;
    final double ratio = showDiscovery
        ? ((discoveryYear! - timelineStart) / (totalSpan == 0 ? 1 : totalSpan))
              .clamp(0.0, 1.0)
        : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 24,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final double markerLeft = (ratio * constraints.maxWidth) - 5;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: constraints.maxWidth * periodStartRatio,
                    child: Container(
                      width:
                          constraints.maxWidth *
                          (periodEndRatio - periodStartRatio),
                      height: 8,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppColors.primaryVariant, AppColors.primary],
                        ),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  if (showDiscovery)
                    Positioned(
                      left: markerLeft,
                      top: 2,
                      child: const _DiscoveryPin(),
                    ),
                ],
              );
            },
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              _formatYear(timelineStart),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
            if (showDiscovery)
              Text(
                'Desc.: ${_formatYear(discoveryYear!)}',
                style: const TextStyle(color: Colors.white, fontSize: 11),
              ),
            Text(
              _formatYear(timelineEnd),
              style: const TextStyle(color: Colors.white70, fontSize: 11),
            ),
          ],
        ),
      ],
    );
  }

  String _formatYear(int year) {
    if (year < 0) {
      return '${year.abs()} a. C.';
    }
    return '$year d. C.';
  }
}

class _DiscoveryPin extends StatelessWidget {
  const _DiscoveryPin();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 10,
      height: 20,
      alignment: Alignment.topCenter,
      child: Column(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primary, width: 2),
            ),
          ),
          Container(width: 2, height: 10, color: Colors.white),
        ],
      ),
    );
  }
}
