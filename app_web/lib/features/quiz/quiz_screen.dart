import 'package:flutter/material.dart';
import '../../services/public_api.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({
    super.key,
    required this.quizData,
    required this.api,
    required this.monumentName,
  });

  final Map<String, dynamic> quizData;
  final PublicApi api;
  final String monumentName;

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  final Map<int, int> _selectedAnswers = {};
  bool _isSubmitting = false;
  String? _errorMessage;
  Map<String, dynamic>? _result;
  late final DateTime _startTime;

  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
  }

  List<dynamic> get _questions {
    return widget.quizData['questions'] as List<dynamic>? ?? [];
  }

  Future<void> _submitQuiz() async {
    if (_selectedAnswers.length < _questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Por favor responde todas las preguntas antes de enviar.'),
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final formattedAnswers = _selectedAnswers.entries
        .map((e) => {'questionIndex': e.key, 'selectedOptionIndex': e.value})
        .toList();

    final timeSpent = DateTime.now().difference(_startTime).inSeconds;
    final quizId = widget.quizData['_id'] as String;

    try {
      final res = await widget.api.submitQuizAttempt(
        quizId: quizId,
        answers: formattedAnswers,
        timeSpent: timeSpent,
      );
      if (mounted) {
        setState(() {
          _result = res;
        });
      }
    } on PublicApiException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.message;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Error inesperado al evaluar el quiz.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final quizTitle = widget.quizData['title'] as String? ?? 'Quiz Evaluativo';
    final quizDescription = widget.quizData['description'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text('Quiz: ${widget.monumentName}'),
        backgroundColor: const Color(0xff8c3b1f),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: _result != null
                ? _buildResultView()
                : Card(
                    elevation: 3,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(28.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            quizTitle,
                            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xff8c3b1f),
                                ),
                          ),
                          if (quizDescription.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              quizDescription,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Colors.grey[700],
                                  ),
                            ),
                          ],
                          const Divider(height: 32),
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(bottom: 16),
                              decoration: BoxDecoration(
                                color: Colors.red[50],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: Colors.red[200]!),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline, color: Colors.red),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: Colors.red),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _questions.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 24),
                            itemBuilder: (context, qIndex) {
                              final q = _questions[qIndex] as Map<String, dynamic>;
                              final questionText = q['questionText'] as String? ?? '';
                              final options = q['options'] as List<dynamic>? ?? [];

                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${qIndex + 1}. $questionText',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 12),
                                  Column(
                                    children: List.generate(options.length, (oIndex) {
                                      final option = options[oIndex] as Map<String, dynamic>;
                                      final optionText = option['text'] as String? ?? '';
                                      final isSelected = _selectedAnswers[qIndex] == oIndex;

                                      return InkWell(
                                        onTap: () {
                                          setState(() {
                                            _selectedAnswers[qIndex] = oIndex;
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          margin: const EdgeInsets.only(bottom: 8),
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 12,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isSelected
                                                ? const Color(0xff8c3b1f).withValues(alpha: 0.1)
                                                : Colors.grey[100],
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: isSelected
                                                  ? const Color(0xff8c3b1f)
                                                  : Colors.grey[300]!,
                                              width: isSelected ? 2 : 1,
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(
                                                isSelected
                                                    ? Icons.radio_button_checked
                                                    : Icons.radio_button_off,
                                                color: isSelected
                                                    ? const Color(0xff8c3b1f)
                                                    : Colors.grey[600],
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Text(
                                                  optionText,
                                                  style: TextStyle(
                                                    fontWeight: isSelected
                                                        ? FontWeight.bold
                                                        : FontWeight.normal,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    }),
                                  ),
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isSubmitting ? null : _submitQuiz,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xff8c3b1f),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              child: _isSubmitting
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Text(
                                      'Enviar Respuestas',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildResultView() {
    final score = _result!['score'] ?? _result!['correctAnswers'] ?? 0;
    final maxScore = _result!['maxScore'] ?? _result!['totalQuestions'] ?? 0;
    final percentage = _result!['percentage'] ?? _result!['percentageScore'] ?? 0;
    final review = _result!['review'] as List<dynamic>? ?? [];

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          children: [
            Icon(
              percentage >= 70 ? Icons.stars_rounded : Icons.psychology_outlined,
              size: 64,
              color: percentage >= 70 ? Colors.amber[700] : const Color(0xff8c3b1f),
            ),
            const SizedBox(height: 16),
            Text(
              '¡Quiz Completado!',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: const Color(0xff8c3b1f),
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'Puntaje obtenido: $score de $maxScore ($percentage%)',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const Divider(height: 32),
            if (review.isNotEmpty) ...[
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Retroalimentación:',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              const SizedBox(height: 16),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: review.length,
                separatorBuilder: (_, _) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final item = review[index] as Map<String, dynamic>;
                  final isCorrect = item['isCorrect'] == true;
                  final explanation = item['explanation'] as String? ?? '';

                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isCorrect ? Colors.green[50] : Colors.amber[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isCorrect ? Colors.green[300]! : Colors.amber[300]!,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              isCorrect ? Icons.check_circle : Icons.cancel,
                              color: isCorrect ? Colors.green : Colors.amber[800],
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Pregunta ${index + 1}: ${isCorrect ? 'Correcta' : 'Incorrecta'}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: isCorrect ? Colors.green[900] : Colors.amber[900],
                              ),
                            ),
                          ],
                        ),
                        if (explanation.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            explanation,
                            style: TextStyle(color: Colors.grey[800]),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
            ElevatedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Volver al Monumento'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xff8c3b1f),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
