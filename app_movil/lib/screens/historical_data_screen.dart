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
  final HistoricalDataService _service = HistoricalDataService();
  List<HistoricalData> _historicalData = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
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
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fichas históricas')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const AppLoadingState(message: 'Cargando fichas históricas...');
    }
    if (_error != null) {
      return AppErrorState(
        title: 'No pudimos cargar las fichas',
        message: _error!,
        onRetry: _loadHistoricalData,
      );
    }
    if (_historicalData.isEmpty) {
      return const AppEmptyState(
        title: 'Sin fichas históricas',
        message: 'Este monumento aún no tiene fichas disponibles.',
        icon: Icons.history_edu_outlined,
      );
    }

    return RefreshIndicator(
      onRefresh: _loadHistoricalData,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.monument.name,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  if ((widget.monument.culture ?? '').isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      widget.monument.culture!,
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  ..._historicalData.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _HistoricalDataCard(historicalData: item),
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
}

class _HistoricalDataCard extends StatelessWidget {
  final HistoricalData historicalData;

  const _HistoricalDataCard({required this.historicalData});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if ((historicalData.imageUrl ?? '').isNotEmpty)
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                historicalData.imageUrl!,
                fit: BoxFit.cover,
                semanticLabel: 'Imagen histórica de ${historicalData.title}',
                errorBuilder: (_, __, ___) => Container(
                  color: AppColors.surfaceSoft,
                  alignment: Alignment.center,
                  child: const Icon(Icons.image_not_supported_outlined),
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  historicalData.title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                if ((historicalData.description ?? '').isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(historicalData.description!),
                ],
                if ((historicalData.discoveryInfo ?? '').isNotEmpty) ...[
                  const SizedBox(height: 14),
                  _InfoPanel(
                    title: 'Descubrimiento',
                    text: historicalData.discoveryInfo!,
                  ),
                ],
                if (historicalData.activities.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Actividades',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: historicalData.activities
                        .map((activity) => Chip(label: Text(activity)))
                        .toList(),
                  ),
                ],
                if (historicalData.sources.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Fuentes',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  ...historicalData.sources.map(
                    (source) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('•'),
                          const SizedBox(width: 8),
                          Expanded(child: Text(source)),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPanel extends StatelessWidget {
  final String title;
  final String text;

  const _InfoPanel({required this.title, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.highlight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(text),
        ],
      ),
    );
  }
}
