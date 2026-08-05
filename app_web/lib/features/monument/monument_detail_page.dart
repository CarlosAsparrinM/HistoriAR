import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

import '../../models/historical_entry.dart';
import '../../models/monument.dart';
import '../../services/public_api.dart';

class MonumentDetailPage extends StatefulWidget {
  const MonumentDetailPage({super.key, required this.monument, required this.api});

  final Monument monument;
  final PublicApi api;

  @override
  State<MonumentDetailPage> createState() => _MonumentDetailPageState();
}

class _MonumentDetailPageState extends State<MonumentDetailPage> {
  late final Future<Monument> _monument = widget.api.getMonument(widget.monument.id);
  late final Future<List<HistoricalEntry>> _history =
      widget.api.getHistoricalData(widget.monument.id);

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(widget.monument.name)),
        body: FutureBuilder<Monument>(
          future: _monument,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return const _DetailUnavailable();
            }
            return _MonumentContent(monument: snapshot.data!, history: _history);
          },
        ),
      );
}

class _MonumentContent extends StatelessWidget {
  const _MonumentContent({required this.monument, required this.history});

  final Monument monument;
  final Future<List<HistoricalEntry>> history;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (monument.imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(monument.imageUrl!, height: 260, fit: BoxFit.cover),
            ),
          const SizedBox(height: 16),
          Text(monument.name, style: Theme.of(context).textTheme.headlineMedium),
          if (monument.district != null)
            Text(monument.district!, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Text(
            monument.description.isEmpty
                ? 'Información histórica en preparación.'
                : monument.description,
          ),
          const SizedBox(height: 24),
          Text('Modelo 3D', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          if (monument.model3dUrl == null)
            const _ModelFallback(
              message: 'Este monumento aún no tiene un modelo 3D público disponible.',
            )
          else
            SizedBox(
              height: 460,
              child: ModelViewer(
                src: monument.model3dUrl!,
                alt: 'Modelo 3D de ${monument.name}',
                autoRotate: true,
                cameraControls: true,
                disableZoom: false,
                ar: false,
              ),
            ),
          const SizedBox(height: 12),
          const Text(
            'Para visualizarlo en realidad aumentada, usa la aplicación móvil de HistoriAR.',
          ),
          const SizedBox(height: 24),
          Text('Información histórica', style: Theme.of(context).textTheme.titleLarge),
          _HistorySection(history: history),
        ],
      );
}

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.history});

  final Future<List<HistoricalEntry>> history;

  @override
  Widget build(BuildContext context) => FutureBuilder<List<HistoricalEntry>>(
        future: history,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            );
          }
          if (snapshot.hasError) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('La información histórica no está disponible por el momento.'),
            );
          }
          final entries = snapshot.data ?? const [];
          if (entries.isEmpty) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text('No hay fichas históricas publicadas todavía.'),
            );
          }
          return Column(
            children: entries
                .map(
                  (entry) => Card(
                    child: ListTile(
                      title: Text(entry.title),
                      subtitle: Text(entry.description),
                    ),
                  ),
                )
                .toList(growable: false),
          );
        },
      );
}

class _ModelFallback extends StatelessWidget {
  const _ModelFallback({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const Icon(Icons.view_in_ar_outlined),
              const SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
        ),
      );
}

class _DetailUnavailable extends StatelessWidget {
  const _DetailUnavailable();

  @override
  Widget build(BuildContext context) => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Este monumento no está disponible o no pudo cargarse.'),
        ),
      );
}
