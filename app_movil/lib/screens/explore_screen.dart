import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../contexts/auth_state.dart';
import '../models/monument.dart';
import '../models/tour.dart';
import '../screens/ar_camera_screen.dart';
import '../screens/quiz_screen.dart'; // Importing QuizScreen for navigation to quiz
import '../services/location_service.dart';
import '../services/monuments_service.dart';
import '../styles/app_colors.dart';

class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final MapController _mapController = MapController();

  final MonumentsService _monumentsService = MonumentsService();
  final LocationService _locationService = const LocationService();

  static const LatLng _initialCenter = LatLng(-12.046374, -77.042793);
  double _zoom = 14;
  LatLng _mapCenter = _initialCenter;
  LatLng? _currentLatLng;
  StreamSubscription<Position>? _positionSub;
  Timer? _mapAnimationTimer;
  bool _followUser = true;
  LatLng? _lastContextLatLng;
  DateTime? _lastContextFetch;

  // Estado relacionado a monumentos
  List<Monument> _monuments = [];
  bool _isLoadingMonuments = false;
  String? _error;
  Monument? _selectedMonument;
  TourContextResponse? _locationContext;
  List<Monument> _nearbyMonuments = [];
  bool _isLoadingLocationContext = false;
  String? _locationContextError;

  @override
  void initState() {
    super.initState();
    _loadMonuments();
    // Pedir ubicación y comenzar a seguir al usuario al cargar la pantalla
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startLocationUpdates();
    });
  }

  Future<void> _loadMonuments() async {
    setState(() {
      _isLoadingMonuments = true;
      _error = null;
    });

    try {
      final monuments = await _monumentsService.fetchMonuments();
      setState(() {
        _monuments = monuments;
      });
    } catch (e) {
      setState(() {
        _error = 'No se pudieron cargar los monumentos: $e';
      });
    } finally {
      setState(() {
        _isLoadingMonuments = false;
      });
    }
  }

  Future<void> _startLocationUpdates() async {
    final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    await _positionSub?.cancel();

    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 1,
    );

    _positionSub =
        Geolocator.getPositionStream(locationSettings: locationSettings).listen(
          (Position pos) {
            final LatLng latLng = LatLng(pos.latitude, pos.longitude);

            setState(() {
              _currentLatLng = latLng;
              if (_followUser) {
                _zoom = _zoom < 16 ? 16 : _zoom;
                _mapCenter = latLng;
                _mapController.move(latLng, _zoom);
              }
            });

            _refreshLocationContext(latLng);
          },
        );
  }

  bool _shouldRefreshLocationContext(LatLng position) {
    if (_lastContextLatLng == null || _lastContextFetch == null) {
      return true;
    }

    final elapsed = DateTime.now().difference(_lastContextFetch!);
    final distance = const Distance().as(
      LengthUnit.Meter,
      _lastContextLatLng!,
      position,
    );

    return elapsed.inSeconds > 45 || distance > 100;
  }

  Future<void> _refreshLocationContext(LatLng position) async {
    if (!_shouldRefreshLocationContext(position)) return;

    _lastContextLatLng = position;
    _lastContextFetch = DateTime.now();

    if (!mounted) return;
    setState(() {
      _isLoadingLocationContext = true;
      _locationContextError = null;
    });

    try {
      final context = await _locationService.getContextForLocation(
        latitude: position.latitude,
        longitude: position.longitude,
      );
      final nearby = await _locationService.getNearbyMonuments(
        latitude: position.latitude,
        longitude: position.longitude,
        maxDistance: 1000,
      );

      if (!mounted) return;
      setState(() {
        _locationContext = context;
        _nearbyMonuments = nearby;
        _isLoadingLocationContext = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _locationContextError = e.toString();
        _isLoadingLocationContext = false;
      });
    }
  }

  void _animateMapTo({
    required LatLng target,
    required double targetZoom,
    Duration duration = const Duration(milliseconds: 450),
  }) {
    _mapAnimationTimer?.cancel();

    final LatLng startCenter = _mapCenter;
    final double startZoom = _zoom;
    const int steps = 24;
    final int msPerStep = (duration.inMilliseconds / steps).round().clamp(
      1,
      1000,
    );
    int currentStep = 0;

    _mapAnimationTimer = Timer.periodic(Duration(milliseconds: msPerStep), (
      timer,
    ) {
      if (!mounted) {
        timer.cancel();
        return;
      }

      currentStep++;
      final double t = (currentStep / steps).clamp(0.0, 1.0);
      final double eased = Curves.easeInOut.transform(t);

      final LatLng center = LatLng(
        startCenter.latitude + (target.latitude - startCenter.latitude) * eased,
        startCenter.longitude +
            (target.longitude - startCenter.longitude) * eased,
      );
      final double zoom = startZoom + (targetZoom - startZoom) * eased;

      _mapCenter = center;
      _zoom = zoom;
      _mapController.move(center, zoom);

      if (currentStep >= steps) {
        timer.cancel();
      }
    });
  }

  Future<void> _centerMapOnUser() async {
    await _startLocationUpdates();

    LatLng? target = _currentLatLng;
    if (target == null) {
      try {
        final pos = await Geolocator.getCurrentPosition();
        target = LatLng(pos.latitude, pos.longitude);
      } catch (_) {
        return;
      }
    }

    if (!mounted) return;
    final LatLng center = target;
    final double targetZoom = _zoom < 16 ? 16 : _zoom;

    setState(() {
      _followUser = true;
      _zoom = targetZoom;
    });

    _animateMapTo(target: center, targetZoom: targetZoom);
  }

  @override
  void dispose() {
    _positionSub?.cancel();
    _mapAnimationTimer?.cancel();
    super.dispose();
  }

  double _distanceInMeters(LatLng a, LatLng b) {
    const distance = Distance();
    return distance(a, b);
  }

  // Clasificación del estado visual según status + distancia
  _MarkerVisualState _computeVisualState(Monument m) {
    // Umbral de "muy lejos" (ejemplo: > 1000m)
    const farThreshold = 1000.0;

    double? distance;
    if (_currentLatLng != null) {
      distance = _distanceInMeters(_currentLatLng!, m.position);
    }

    final isFar = distance != null && distance > farThreshold;

    // Estados desde API: "Disponible", "Visitado", "Oculto", etc.
    if (m.status.toLowerCase() == 'oculto') {
      return _MarkerVisualState.oculto(distance);
    }
    if (m.status.toLowerCase() == 'visitado') {
      return _MarkerVisualState.visitado(distance);
    }
    if (isFar) {
      return _MarkerVisualState.muyLejos(distance);
    }
    // default: disponible
    return _MarkerVisualState.disponible(distance);
  }

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>[];

    // Marcador de ubicación actual
    if (_currentLatLng != null) {
      markers.add(
        Marker(
          point: _currentLatLng!,
          width: 50,
          height: 50,
          alignment: Alignment.center,
          child: const _UserLocationMarker(),
        ),
      );
    }

    // Marcadores de monumentos
    for (final m in _monuments) {
      final visual = _computeVisualState(m);

      markers.add(
        Marker(
          point: m.position,
          width: 68,
          height: 68,
          alignment: Alignment.center,
          rotate: false,
          child: GestureDetector(
            onTap: () {
              setState(() {
                _selectedMonument = m;
              });
            },
            child: _MonumentMarker(
              name: m.name,
              distanceText: visual.distanceMeters != null
                  ? '${visual.distanceMeters!.round()}m'
                  : '--',
              imageUrl: m.imageUrl,
              statusIcon: visual.statusIcon,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Barra superior
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Explorar',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Monumentos de Lima',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            ),

            if (_locationContext != null ||
                _isLoadingLocationContext ||
                _locationContextError != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12.0),
                child: _LocationContextCard(
                  contextData: _locationContext,
                  nearbyMonumentsCount: _nearbyMonuments.length,
                  isLoading: _isLoadingLocationContext,
                  errorMessage: _locationContextError,
                ),
              ),

            // Leyenda de estados
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    _LegendDot(color: Colors.green, label: 'Disponible'),
                    SizedBox(width: 12),
                    _LegendDot(color: Colors.blue, label: 'Visitado'),
                    SizedBox(width: 12),
                    _LegendDot(color: Colors.red, label: 'Muy lejos'),
                    SizedBox(width: 12),
                    _LegendDot(color: Colors.grey, label: 'Oculto'),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),
            Expanded(
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _initialCenter,
                      initialZoom: _zoom,
                      minZoom: 3,
                      maxZoom: 19,
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.all,
                      ),
                      onPositionChanged: (position, hasGesture) {
                        _mapCenter = position.center;
                        _zoom = position.zoom;

                        if (hasGesture && _followUser) {
                          setState(() {
                            _followUser = false;
                          });
                        }
                      },
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.example.historiar',
                      ),
                      if (markers.isNotEmpty) MarkerLayer(markers: markers),
                    ],
                  ),

                  // Indicadores de carga / error
                  if (_isLoadingMonuments)
                    const Positioned(
                      top: 16,
                      left: 16,
                      child: Chip(label: Text('Cargando monumentos...')),
                    ),
                  if (_error != null)
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: Card(
                        color: Colors.red.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            _error!,
                            style: TextStyle(
                              color: Colors.red.shade700,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Botones + / -
                  Positioned(
                    top: 80,
                    right: 20,
                    child: Column(
                      children: [
                        _SquareIconButton(
                          icon: Icons.add,
                          onTap: () {
                            setState(() {
                              _followUser = false;
                              _zoom += 1;
                              final center = _mapCenter;
                              _mapController.move(center, _zoom);
                            });
                          },
                        ),
                        const SizedBox(height: 8),
                        _SquareIconButton(
                          icon: Icons.remove,
                          onTap: () {
                            setState(() {
                              _followUser = false;
                              _zoom -= 1;
                              final center = _mapCenter;
                              _mapController.move(center, _zoom);
                            });
                          },
                        ),
                      ],
                    ),
                  ),

                  // Botones buscar / capas (sin lógica todavía)
                  Positioned(
                    top: 20,
                    right: 20,
                    child: Row(
                      children: [
                        _SquareIconButton(icon: Icons.search, onTap: () {}),
                        const SizedBox(width: 8),
                        _SquareIconButton(
                          icon: Icons.layers_outlined,
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),

                  // Botón mi ubicación
                  Positioned(
                    right: 20,
                    bottom: 24,
                    child: FloatingActionButton(
                      backgroundColor: Colors.white,
                      elevation: 4,
                      onPressed: () {
                        _centerMapOnUser();
                      },
                      child: const Icon(
                        Icons.navigation_rounded,
                        color: Colors.orange,
                      ),
                    ),
                  ),

                  // Tarjeta de monumento seleccionado
                  if (_selectedMonument != null)
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 90,
                      child: _SelectedMonumentCard(
                        monument: _selectedMonument!,
                        distanceText: _currentLatLng != null
                            ? '${_distanceInMeters(_currentLatLng!, _selectedMonument!.position).round()}m'
                            : '--',
                        onClose: () {
                          setState(() {
                            _selectedMonument = null;
                          });
                        },
                        onViewAr: () async {
                          if (_selectedMonument == null) return;

                          // Verificamos que haya un token válido antes de ir a RA
                          final token = authState.token;
                          if (token.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Sesión inválida o expirada. Vuelve a iniciar sesión.',
                                ),
                              ),
                            );
                            return;
                          }

                          // Obtener userId y preferencias de SharedPreferences
                          final prefs = await SharedPreferences.getInstance();
                          final userId = prefs.getString('userId');
                          if (userId == null || userId.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'No se pudo obtener el ID del usuario.',
                                ),
                              ),
                            );
                            return;
                          }

                          // 1) Ir a la cámara AR y esperar a que el usuario salga
                          await Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ArCameraScreen(
                                monument: _selectedMonument!,
                                token: token,
                                userId: userId,
                              ),
                            ),
                          );

                          if (!mounted) return;

                          final shouldAskForQuizzes =
                              prefs.getBool('pref_askForQuizzes') ?? true;

                          if (!mounted) return;

                          if (!shouldAskForQuizzes) {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => QuizScreen(
                                  monument: _selectedMonument!,
                                  token: token,
                                ),
                              ),
                            );
                            return;
                          }

                          // 2) Al volver, mostrar el modal para invitar al quiz
                          final shouldGoToQuiz = await showModalBottomSheet<bool>(
                            context: context,
                            backgroundColor: Colors.white,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(
                                top: Radius.circular(24),
                              ),
                            ),
                            builder: (context) {
                              final monument = _selectedMonument!;
                              return Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  24,
                                  24,
                                  24,
                                  32,
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Center(
                                      child: Container(
                                        width: 40,
                                        height: 4,
                                        decoration: BoxDecoration(
                                          color: Colors.grey.shade300,
                                          borderRadius: BorderRadius.circular(
                                            999,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      '¿Listo para poner a prueba lo que aprendiste?',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Responde un quiz sobre ${monument.name} y gana puntos.',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: OutlinedButton(
                                            onPressed: () => Navigator.of(
                                              context,
                                            ).pop(false),
                                            style: OutlinedButton.styleFrom(
                                              side: BorderSide(
                                                color: Colors.grey.shade300,
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                            ),
                                            child: const Text('Ahora no'),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: ElevatedButton(
                                            onPressed: () =>
                                                Navigator.of(context).pop(true),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  AppColors.primary,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    vertical: 12,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                            ),
                                            child: const Text(
                                              'Realizar Quiz',
                                              style: TextStyle(
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              );
                            },
                          );

                          // 3) Si acepta, ir al Quiz
                          if (shouldGoToQuiz == true && mounted) {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => QuizScreen(
                                  monument: _selectedMonument!,
                                  token: token,
                                ),
                              ),
                            );
                          }
                        },
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocationContextCard extends StatelessWidget {
  final TourContextResponse? contextData;
  final int nearbyMonumentsCount;
  final bool isLoading;
  final String? errorMessage;

  const _LocationContextCard({
    required this.contextData,
    required this.nearbyMonumentsCount,
    required this.isLoading,
    required this.errorMessage,
  });

  @override
  Widget build(BuildContext context) {
    final institutionName =
        contextData?.institution?.name ?? 'Buscando institución';
    final toursCount = contextData?.tours.length ?? 0;

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: isLoading
            ? const Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('Actualizando contexto de ubicación...'),
                  ),
                ],
              )
            : errorMessage != null
            ? Text(
                'No se pudo cargar el contexto de ubicación: $errorMessage',
                style: const TextStyle(color: Colors.red),
              )
            : Row(
                children: [
                  const Icon(Icons.location_on, color: AppColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          institutionName,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$toursCount tours disponibles · $nearbyMonumentsCount monumentos cercanos',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

// Modelo de cómo se ve cada marcador (color, icono, etc.)
class _MarkerVisualState {
  final Color backgroundColor;
  final IconData icon;
  final bool locked;
  final bool showCheck;
  final double? distanceMeters;
  final IconData statusIcon;

  _MarkerVisualState({
    required this.backgroundColor,
    required this.icon,
    required this.locked,
    required this.showCheck,
    required this.distanceMeters,
    required this.statusIcon,
  });

  factory _MarkerVisualState.disponible(double? distanceMeters) {
    return _MarkerVisualState(
      backgroundColor: Colors.green,
      icon: Icons.location_city,
      locked: false,
      showCheck: true,
      distanceMeters: distanceMeters,
      statusIcon: Icons.play_circle_fill,
    );
    // se muestra como la burbuja verde con check
  }

  factory _MarkerVisualState.muyLejos(double? distanceMeters) {
    return _MarkerVisualState(
      backgroundColor: Colors.red,
      icon: Icons.lock,
      locked: true,
      showCheck: false,
      distanceMeters: distanceMeters,
      statusIcon: Icons.location_off,
    );
  }

  factory _MarkerVisualState.visitado(double? distanceMeters) {
    return _MarkerVisualState(
      backgroundColor: Colors.blue,
      icon: Icons.check_circle,
      locked: false,
      showCheck: false,
      distanceMeters: distanceMeters,
      statusIcon: Icons.verified,
    );
  }

  factory _MarkerVisualState.oculto(double? distanceMeters) {
    return _MarkerVisualState(
      backgroundColor: Colors.grey,
      icon: Icons.help_outline,
      locked: true,
      showCheck: false,
      distanceMeters: distanceMeters,
      statusIcon: Icons.visibility_off,
    );
  }
}

class _MonumentMarker extends StatelessWidget {
  final String name;
  final String distanceText;
  final String? imageUrl;
  final IconData statusIcon;

  const _MonumentMarker({
    required this.name,
    required this.distanceText,
    required this.imageUrl,
    required this.statusIcon,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.center,
      children: [
        // Círculo principal con imagen del monumento
        Container(
          width: 40,
          height: 40,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.grey,
          ),
          clipBehavior: Clip.antiAlias,
          child: imageUrl != null && imageUrl!.isNotEmpty
              ? Image.network(imageUrl!, fit: BoxFit.cover)
              : const Icon(Icons.location_city, color: Colors.white, size: 24),
        ),
        // Nombre arriba
        Positioned(
          top: -20,
          left: -20,
          right: -20,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Text(
              name,
              textAlign: TextAlign.center,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        // Distancia abajo
        Positioned(
          bottom: -18,
          left: -18,
          right: -18,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(999),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Text(
              distanceText,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        // Círculo pequeño con símbolo de estado
        Positioned(
          bottom: -4,
          right: -4,
          child: Container(
            width: 18,
            height: 18,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(statusIcon, size: 14, color: Colors.black87),
          ),
        ),
      ],
    );
  }
}

class _UserLocationMarker extends StatefulWidget {
  const _UserLocationMarker();

  @override
  State<_UserLocationMarker> createState() => _UserLocationMarkerState();
}

class _UserLocationMarkerState extends State<_UserLocationMarker>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _pulseAnimation = Tween<double>(
      begin: 0.7,
      end: 1.3,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final scale = _pulseAnimation.value;
        return Stack(
          alignment: Alignment.center,
          children: [
            Transform.scale(
              scale: scale,
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.blue.withOpacity(0.18),
                ),
              ),
            ),
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E88E5), Color(0xFF42A5F5)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.45),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(
                Icons.navigation_rounded,
                color: Colors.white,
                size: 16,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}

class _SquareIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _SquareIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      elevation: 3,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: SizedBox(width: 40, height: 40, child: Icon(icon, size: 22)),
      ),
    );
  }
}

class _SelectedMonumentCard extends StatelessWidget {
  final Monument monument;
  final String distanceText;
  final VoidCallback onClose;
  final VoidCallback onViewAr;

  const _SelectedMonumentCard({
    required this.monument,
    required this.distanceText,
    required this.onClose,
    required this.onViewAr,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        monument.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        monument.district?.isNotEmpty == true
                            ? monument.district!
                            : 'Sitio histórico',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: onClose,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              monument.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 16,
                  color: Colors.grey,
                ),
                const SizedBox(width: 4),
                Text(distanceText, style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: monument.status.toLowerCase() == 'visitado'
                        ? Colors.green.shade100
                        : Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    monument.status,
                    style: TextStyle(
                      fontSize: 11,
                      color: monument.status.toLowerCase() == 'visitado'
                          ? Colors.green.shade800
                          : Colors.orange.shade800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    onPressed: onViewAr,
                    icon: const Icon(
                      Icons.remove_red_eye_outlined,
                      color: Colors.white,
                    ),
                    label: const Text(
                      'Ver en RA',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: const Icon(Icons.arrow_forward_ios_rounded, size: 18),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
