import 'package:flutter/material.dart';

import '../models/historical_data.dart';
import '../models/monument.dart';
import '../services/historical_data_service.dart';
import '../styles/app_colors.dart';
import '../widgets/app_states.dart';

class HistoricalDataScreen extends StatefulWidget {
  final Monument monument;
  final String? token;

  const HistoricalDataScreen({super.key, required this.monument, this.token});

  @override
  State<HistoricalDataScreen> createState() => _HistoricalDataScreenState();
}

class _HistoricalDataScreenState extends State<HistoricalDataScreen> {
  late final HistoricalDataService _service;
  List<HistoricalData> _historicalData = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _service = HistoricalDataService();
    _loadHistoricalData();
  }

  Future<void> _loadHistoricalData() async {
    try {
      final data = await _service.fetchHistoricalDataByMonument(
        widget.monument.id,
        token: widget.token,
      );
      if (!mounted) return;
      setState(() {
        _historicalData = data;
        _isLoading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Fichas Históricas',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
      ),
      body: _isLoading
          ? const AppLoadingState(message: 'Cargando fichas históricas...')
          : _error != null
          ? AppErrorState(
              title: 'Error',
              message: _error!,
              onRetry: _loadHistoricalData,
            )
          : _historicalData.isEmpty
          ? const AppEmptyState(
              title: 'Sin fichas históricas',
              message:
                  'Este monumento aún no tiene fichas históricas disponibles.',
            )
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Información del monumento
                    Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.monument.name,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if ((widget.monument.culture ?? '').isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                widget.monument.culture!,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                    // Lista de fichas
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _historicalData.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final ficha = _historicalData[index];
                        return _HistoricalDataCard(historicalData: ficha);
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _HistoricalDataCard extends StatelessWidget {
  final HistoricalData historicalData;

  const _HistoricalDataCard({required this.historicalData});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen
            if ((historicalData.imageUrl ?? '').isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    historicalData.imageUrl!,
                    width: double.infinity,
                    height: 200,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: double.infinity,
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.image_not_supported),
                      );
                    },
                  ),
                ),
              ),

            // Título
            Text(
              historicalData.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),

            // Descripción
            if ((historicalData.description ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                historicalData.description!,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  height: 1.6,
                ),
              ),
            ],

            // Información de descubrimiento
            if ((historicalData.discoveryInfo ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Descubrimiento',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      historicalData.discoveryInfo!,
                      style: const TextStyle(fontSize: 13, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],

            // Actividades
            if (historicalData.activities.isNotEmpty) ...[
              const SizedBox(height: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Actividades',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: historicalData.activities
                        .map(
                          (activity) => Chip(
                            label: Text(activity),
                            backgroundColor: Colors.blue.shade50,
                            labelStyle: TextStyle(
                              fontSize: 12,
                              color: Colors.blue.shade700,
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ],
              ),
            ],

            // Fuentes
            if (historicalData.sources.isNotEmpty) ...[
              const SizedBox(height: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Fuentes',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...historicalData.sources.map((source) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• ', style: TextStyle(fontSize: 14)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              source,
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
