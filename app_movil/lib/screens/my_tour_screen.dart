import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../contexts/auth_state.dart';
import '../models/monument.dart';
import '../models/tour.dart';
import '../screens/ar_camera_screen.dart';
import '../screens/quiz_screen.dart';
import '../services/tours_service.dart';
import '../styles/app_colors.dart';

class MyTourScreen extends StatefulWidget {
  const MyTourScreen({super.key});

  @override
  State<MyTourScreen> createState() => _MyTourScreenState();
}

class _MyTourScreenState extends State<MyTourScreen> {
  final ToursService _toursService = const ToursService();

  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';

  TourInstitution? _currentInstitution;
  List<TourItem> _tours = [];
  TourItem? _selectedTour;
  Position? _currentPosition;

  @override
  void initState() {
    super.initState();
    _loadTours();
  }

  Future<void> _loadTours() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final position = await _resolveCurrentPosition();
      final context = await _toursService.getContextForLocation(
        latitude: position.latitude,
        longitude: position.longitude,
      );

      var tours = context.tours;
      var institution = context.institution;

      if (tours.isEmpty) {
        tours = await _toursService.getAllTours(activeOnly: true);
        institution ??= tours.isNotEmpty ? tours.first.institution : null;
      }

      if (!mounted) return;

      setState(() {
        _currentPosition = position;
        _currentInstitution = institution;
        _tours = tours;
        _selectedTour = _resolveSelectedTour(tours, _selectedTour);
        _isLoading = false;
        _searchQuery = '';
      });
    } catch (error) {
      try {
        final tours = await _toursService.getAllTours(activeOnly: true);
        if (!mounted) return;

        setState(() {
          _tours = tours;
          _selectedTour = _resolveSelectedTour(tours, _selectedTour);
          _currentInstitution = tours.isNotEmpty
              ? tours.first.institution
              : null;
          _currentPosition = null;
          _isLoading = false;
          _error = tours.isEmpty ? error.toString() : null;
          _searchQuery = '';
        });
      } catch (fallbackError) {
        if (!mounted) return;
        setState(() {
          _tours = [];
          _selectedTour = null;
          _currentInstitution = null;
          _currentPosition = null;
          _isLoading = false;
          _error = fallbackError.toString();
          _searchQuery = '';
        });
      }
    }
  }

  Future<Position> _resolveCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Activa la ubicacion para ver tours cercanos.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw Exception('Permiso de ubicacion denegado.');
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Permiso de ubicacion bloqueado en el dispositivo.');
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  TourItem? _resolveSelectedTour(List<TourItem> tours, TourItem? current) {
    if (tours.isEmpty) return null;

    if (current != null) {
      for (final tour in tours) {
        if (tour.id == current.id) {
          return tour;
        }
      }
    }

    return tours.first;
  }

  List<TourStop> _filteredStops() {
    final tour = _selectedTour;
    if (tour == null) return const [];

    final query = _searchQuery.trim().toLowerCase();
    final stops = tour.orderedStops;

    if (query.isEmpty) return stops;

    return stops.where((stop) {
      final monument = stop.monument;
      return monument.name.toLowerCase().contains(query) ||
          monument.description.toLowerCase().contains(query) ||
          (stop.description ?? '').toLowerCase().contains(query) ||
          monument.status.toLowerCase().contains(query);
    }).toList();
  }

  Future<void> _openArExperience(Monument monument) async {
    final token = authState.token;
    if (token.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sesion invalida o expirada. Vuelve a iniciar sesion.'),
        ),
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ArCameraScreen(monument: monument, token: token),
      ),
    );

    if (!mounted) return;

    final prefs = await SharedPreferences.getInstance();
    final shouldAskForQuizzes = prefs.getBool('pref_askForQuizzes') ?? true;

    if (!mounted) return;

    if (!shouldAskForQuizzes) {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => QuizScreen(monument: monument, token: token),
        ),
      );
      return;
    }

    final shouldGoToQuiz = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
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
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                '¿Listo para poner a prueba lo que aprendiste?',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Responde un quiz sobre ${monument.name} y gana puntos.',
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(sheetContext).pop(false),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.grey.shade300),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Ahora no'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(sheetContext).pop(true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Realizar Quiz',
                        style: TextStyle(color: Colors.white),
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

    if (shouldGoToQuiz == true && mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => QuizScreen(monument: monument, token: token),
        ),
      );
    }
  }

  Future<void> _openQuiz(Monument monument) async {
    final token = authState.token;
    if (token.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sesion invalida o expirada. Vuelve a iniciar sesion.'),
        ),
      );
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => QuizScreen(monument: monument, token: token),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selectedTour = _selectedTour;
    final stops = _filteredStops();
    final institution = _currentInstitution;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Tour'),
        actions: [
          IconButton(
            onPressed: _isLoading ? null : _loadTours,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadTours,
        child: _isLoading
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: const [
                  SizedBox(height: 160),
                  Center(child: CircularProgressIndicator()),
                ],
              )
            : ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) ...[
                    _ErrorCard(message: _error!, onRetry: _loadTours),
                    const SizedBox(height: 16),
                  ],
                  _buildHeaderCard(theme, institution),
                  const SizedBox(height: 16),
                  if (_tours.isEmpty)
                    _EmptyTourState(onRetry: _loadTours)
                  else ...[
                    _buildTourSelector(),
                    const SizedBox(height: 16),
                    if (selectedTour != null) ...[
                      _buildTourSummary(theme, selectedTour),
                      const SizedBox(height: 16),
                      _buildSearchBox(),
                      const SizedBox(height: 16),
                      if (stops.isEmpty)
                        _buildEmptyStopsState(theme)
                      else
                        ...stops.map(
                          (stop) => Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: _TourStopCard(
                              stop: stop,
                              onOpenAr: () => _openArExperience(stop.monument),
                              onOpenQuiz: () => _openQuiz(stop.monument),
                            ),
                          ),
                        ),
                    ],
                  ],
                  const SizedBox(height: 24),
                ],
              ),
      ),
    );
  }

  Widget _buildHeaderCard(ThemeData theme, TourInstitution? institution) {
    final institutionName = institution?.name ?? 'Tours disponibles';
    final subtitle = institution != null
        ? institution.distanceMeters != null
              ? 'Estas a ${institution.distanceMeters!.round()} m de esta institucion'
              : 'Institucion detectada por ubicacion'
        : 'Mostrando tours activos disponibles';

    return Card(
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.emoji_events_outlined,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        institutionName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _InfoPill(label: '${_tours.length} tours', icon: Icons.route),
                const SizedBox(width: 8),
                _InfoPill(
                  label: _currentPosition != null
                      ? 'Ubicacion activa'
                      : 'Modo general',
                  icon: _currentPosition != null
                      ? Icons.location_on
                      : Icons.map,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTourSelector() {
    final selectedTour = _selectedTour;

    return DropdownButtonFormField<String>(
      initialValue: selectedTour?.id,
      items: _tours
          .map(
            (tour) => DropdownMenuItem<String>(
              value: tour.id,
              child: Text(tour.name, overflow: TextOverflow.ellipsis),
            ),
          )
          .toList(),
      onChanged: (value) {
        if (value == null) return;
        final tour = _tours.firstWhere((candidate) => candidate.id == value);
        setState(() {
          _selectedTour = tour;
          _searchQuery = '';
        });
      },
      decoration: InputDecoration(
        labelText: 'Elegir tour',
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Widget _buildTourSummary(ThemeData theme, TourItem tour) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    tour.name,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                _InfoPill(label: tour.type, icon: Icons.category_outlined),
              ],
            ),
            const SizedBox(height: 8),
            Text(tour.description, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _InfoPill(
                  label: '${tour.orderedStops.length} paradas',
                  icon: Icons.place_outlined,
                ),
                _InfoPill(
                  label: '${tour.estimatedDuration} min',
                  icon: Icons.schedule,
                ),
                _InfoPill(
                  label: tour.isActive ? 'Activo' : 'Inactivo',
                  icon: tour.isActive ? Icons.check_circle : Icons.pause_circle,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBox() {
    return TextField(
      decoration: InputDecoration(
        labelText: 'Buscar en el tour',
        hintText: 'Nombre, descripcion o estado',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.grey.shade100,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
      onChanged: (value) {
        setState(() {
          _searchQuery = value;
        });
      },
    );
  }

  Widget _buildEmptyStopsState(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
          const SizedBox(height: 12),
          Text(
            'No hay paradas que coincidan con tu busqueda.',
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _TourStopCard extends StatelessWidget {
  final TourStop stop;
  final VoidCallback onOpenAr;
  final VoidCallback onOpenQuiz;

  const _TourStopCard({
    required this.stop,
    required this.onOpenAr,
    required this.onOpenQuiz,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final monument = stop.monument;

    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (monument.imageUrl != null && monument.imageUrl!.isNotEmpty)
                  Image.network(
                    monument.imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: Colors.grey.shade300,
                      child: const Icon(Icons.image_not_supported),
                    ),
                  )
                else
                  Container(
                    color: Colors.grey.shade300,
                    child: const Icon(Icons.location_city, size: 44),
                  ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.62),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'Paso ${stop.order}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.52),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      monument.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stop.description?.trim().isNotEmpty == true
                      ? stop.description!.trim()
                      : monument.description,
                  style: theme.textTheme.bodyMedium,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _Tag(text: monument.status),
                    if ((monument.culture ?? '').isNotEmpty)
                      _Tag(text: monument.culture!),
                    if ((monument.district ?? '').isNotEmpty)
                      _Tag(text: monument.district!),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onOpenAr,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(Icons.view_in_ar),
                        label: const Text('Ver en RA'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onOpenQuiz,
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(
                          Icons.quiz_outlined,
                          color: AppColors.primary,
                        ),
                        label: const Text(
                          'Quiz',
                          style: TextStyle(color: AppColors.primary),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  final String label;
  final IconData icon;

  const _InfoPill({required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey[700]),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[800],
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;

  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: Colors.grey[800],
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.red.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'No pudimos cargar los tours',
              style: TextStyle(
                color: Colors.red.shade800,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(message),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onRetry,
                child: const Text('Reintentar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyTourState extends StatelessWidget {
  final VoidCallback onRetry;

  const _EmptyTourState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(
        children: [
          Icon(Icons.route, size: 56, color: Colors.grey[400]),
          const SizedBox(height: 12),
          const Text(
            'No hay tours activos disponibles en este momento.',
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: onRetry,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Volver a intentar'),
          ),
        ],
      ),
    );
  }
}
