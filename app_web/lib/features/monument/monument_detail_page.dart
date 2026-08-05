import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';

import '../../models/historical_entry.dart';
import '../../models/monument.dart';
import '../../services/public_api.dart';
import '../quiz/quiz_screen.dart';

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
  late final Future<Map<String, dynamic>?> _quiz =
      widget.api.getQuizByMonument(widget.monument.id);

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
            return _MonumentContent(
              monument: snapshot.data!,
              history: _history,
              quiz: _quiz,
              api: widget.api,
            );
          },
        ),
      );
}

class _MonumentContent extends StatelessWidget {
  const _MonumentContent({
    required this.monument,
    required this.history,
    required this.quiz,
    required this.api,
  });

  final Monument monument;
  final Future<List<HistoricalEntry>> history;
  final Future<Map<String, dynamic>?> quiz;
  final PublicApi api;

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
          const SizedBox(height: 24),
          _QuizSection(quiz: quiz, api: api, monumentName: monument.name),
        ],
      );
}

class _QuizSection extends StatelessWidget {
  const _QuizSection({
    required this.quiz,
    required this.api,
    required this.monumentName,
  });

  final Future<Map<String, dynamic>?> quiz;
  final PublicApi api;
  final String monumentName;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: quiz,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SizedBox.shrink();
        }
        final quizData = snapshot.data;
        if (quizData == null) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xff8c3b1f).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xff8c3b1f).withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.quiz_outlined, color: Color(0xff8c3b1f), size: 28),
                  const SizedBox(width: 12),
                  Text(
                    'Quiz Educativo Disponible',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xff8c3b1f),
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Pon a prueba tus conocimientos sobre $monumentName respondiendo este quiz.',
                style: TextStyle(color: Colors.grey[800]),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => QuizScreen(
                        quizData: quizData,
                        api: api,
                        monumentName: monumentName,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.play_arrow),
                label: const Text('Realizar Quiz'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xff8c3b1f),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
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
