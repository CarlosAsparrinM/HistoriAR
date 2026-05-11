import 'package:flutter/material.dart';

import '../models/monument.dart';
import '../services/quiz_service.dart';
import '../styles/app_colors.dart';

class QuizScreen extends StatefulWidget {
	final Monument monument;
	final String token;

	const QuizScreen({super.key, required this.monument, required this.token});

	@override
	State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
	final QuizService _quizService = const QuizService();
	Map<String, dynamic>? _quiz;
	int _currentQuestionIndex = 0;
	int? _selectedOptionIndex;
	int _score = 0;
	bool _isLoading = true;
	bool _isSubmitting = false;
	bool _showFeedback = false;
	final List<Map<String, dynamic>> _answers = [];
	Map<String, dynamic>? _finalResult; // datos de resultado general
	late final DateTime _startTime;

	@override
	void initState() {
		super.initState();
		_startTime = DateTime.now();
		_loadQuiz();
	}

	Future<void> _loadQuiz() async {
		try {
			final quiz = await _quizService.getQuizForMonument(
				monumentId: widget.monument.id,
				token: widget.token,
			);
			setState(() {
				_quiz = quiz;
				_isLoading = false;
			});
		} catch (e) {
			if (!mounted) return;
			setState(() {
				_isLoading = false;
			});
			ScaffoldMessenger.of(context).showSnackBar(
				SnackBar(content: Text('No se pudo cargar el quiz: $e')),
			);
		}
	}

	List<dynamic> get _questions =>
		(_quiz?['questions'] as List<dynamic>? ?? const []);

	Map<String, dynamic>? get _currentQuestion {
		if (_questions.isEmpty ||
				_currentQuestionIndex < 0 ||
				_currentQuestionIndex >= _questions.length) {
			return null;
		}
		final q = _questions[_currentQuestionIndex];
		return q is Map<String, dynamic> ? q : null;
	}

	int get _maxScore {
		if (_questions.isEmpty) return 0;
		int total = 0;
		for (final q in _questions) {
			if (q is Map<String, dynamic>) {
				final pts = q['points'] as int?;
				if (pts != null) {
					total += pts;
				} else {
					// Si no hay "points", asumimos 1 punto por pregunta
					total += 1;
				}
			}
		}
		return total;
	}

	void _onSelectOption(int index) {
		if (_showFeedback || _isSubmitting) return;
		setState(() {
			_selectedOptionIndex = index;
		});
	}

	Future<void> _onNext() async {
		if (_currentQuestion == null || _selectedOptionIndex == null || _showFeedback) {
			return;
		}

		// Registrar respuesta seleccionada
		_answers.add({
			'questionIndex': _currentQuestionIndex,
			'selectedOptionIndex': _selectedOptionIndex,
		});

		// Calcular si es correcta y actualizar score local
		final options = _currentQuestion?['options'] as List<dynamic>? ?? const [];
		int? correctIndex;
		for (int i = 0; i < options.length; i++) {
			final opt = options[i];
			if (opt is Map<String, dynamic> && (opt['isCorrect'] == true)) {
				correctIndex = i;
				break;
			}
		}
		if (correctIndex != null && correctIndex == _selectedOptionIndex) {
			final pts = _currentQuestion?['points'] as int? ?? 1;
			_score += pts;
		}

		// Mostrar feedback y ocultar botón durante 3 segundos
		setState(() {
			_showFeedback = true;
		});

		await Future.delayed(const Duration(seconds: 3));
		if (!mounted) return;

		if (_currentQuestionIndex < _questions.length - 1) {
			setState(() {
				_currentQuestionIndex++;
				_selectedOptionIndex = null;
				_showFeedback = false;
			});
		} else {
			await _submitQuiz();
		}
	}

	Future<void> _submitQuiz() async {
		if (_quiz == null) return;
		setState(() {
			_isSubmitting = true;
		});
		final elapsed = DateTime.now().difference(_startTime);
		try {
			final result = await _quizService.submitQuizAttempt(
				quizId: _quiz!['_id'] as String,
				answers: _answers,
				timeSpent: elapsed,
				token: widget.token,
			);
			if (!mounted) return;
			setState(() {
				_isSubmitting = false;
				_finalResult = result;
			});
		} catch (e) {
			if (!mounted) return;
			setState(() {
				_isSubmitting = false;
			});
			ScaffoldMessenger.of(context).showSnackBar(
				SnackBar(content: Text('Error al enviar quiz: $e')),
			);
		}
	}

	@override
	Widget build(BuildContext context) {
		// Si ya tenemos resultado final, mostramos la pantalla de resumen
		if (_finalResult != null) {
			final int score = (_finalResult!['score'] as int?) ?? _score;
			final int maxScore = (_finalResult!['maxScore'] as int?) ?? _maxScore;
			final double percentage = (_finalResult!['percentage'] as num?)?.toDouble() ??
				(maxScore > 0 ? (score * 100 / maxScore) : 0);
			String gradeText = 'Necesita Mejorar';
			Color gradeColor = Colors.red.shade600;
			IconData gradeIcon = Icons.close;
			if (percentage >= 90) {
				gradeText = 'Excelente';
				gradeColor = Colors.green.shade600;
				gradeIcon = Icons.emoji_events;
			} else if (percentage >= 70) {
				gradeText = 'Muy Bien';
				gradeColor = Colors.blue.shade600;
				gradeIcon = Icons.emoji_events;
			} else if (percentage >= 50) {
				gradeText = 'Bien';
				gradeColor = Colors.orange.shade600;
				gradeIcon = Icons.check_circle;
			}

			return Scaffold(
				backgroundColor: Colors.white,
				appBar: AppBar(
					elevation: 0,
					backgroundColor: Colors.white,
					foregroundColor: Colors.black,
					centerTitle: true,
					title: Column(
						children: [
							const Text(
								'Quiz Completado',
								style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
							),
							Text(
								widget.monument.name,
								style: const TextStyle(fontSize: 12, color: Colors.grey),
							),
						],
					),
				),
				body: Padding(
					padding: const EdgeInsets.all(16.0),
					child: Column(
						crossAxisAlignment: CrossAxisAlignment.stretch,
						children: [
							const SizedBox(height: 16),
							Center(
								child: Container(
									width: 96,
									height: 96,
									decoration: const BoxDecoration(
										color: AppColors.primary,
										shape: BoxShape.circle,
									),
									child: Icon(
										gradeIcon,
										color: Colors.white,
										size: 48,
									),
								),
							),
							const SizedBox(height: 16),
							Center(
								child: Text(
									gradeText,
									style: TextStyle(
										fontSize: 20,
										fontWeight: FontWeight.bold,
										color: gradeColor,
									),
								),
							),
							const SizedBox(height: 12),
							Center(
									child: Text(
										'$score / $maxScore puntos',
										style: const TextStyle(
											fontSize: 22,
											fontWeight: FontWeight.bold,
											color: AppColors.primary,
										),
									),
							),
							const SizedBox(height: 16),
							Expanded(
								child: ListView.builder(
									itemCount: _questions.length,
									itemBuilder: (context, index) {
										final qRaw = _questions[index];
										if (qRaw is! Map<String, dynamic>) return const SizedBox.shrink();
										final question = qRaw;
										final options =
											(question['options'] as List<dynamic>? ?? const []);
										int? correctIndex;
										for (int i = 0; i < options.length; i++) {
											final opt = options[i];
											if (opt is Map<String, dynamic> && opt['isCorrect'] == true) {
												correctIndex = i;
												break;
											}
										}
										final userAnswer = _answers.firstWhere(
											(ans) => ans['questionIndex'] == index,
											orElse: () => {'selectedOptionIndex': -1},
										);
										final int selectedIndex =
											(userAnswer['selectedOptionIndex'] as int?) ?? -1;
										final bool isCorrectAnswer =
											correctIndex != null && selectedIndex == correctIndex;
										final int pts = question['points'] as int? ?? 1;

										return Container(
											margin: const EdgeInsets.only(bottom: 12),
											padding: const EdgeInsets.all(12),
											decoration: BoxDecoration(
												color: Colors.white,
												borderRadius: BorderRadius.circular(16),
												border: Border.all(
													color: isCorrectAnswer ? Colors.green : Colors.red,
													width: 1.5,
												),
											),
											child: Column(
												crossAxisAlignment: CrossAxisAlignment.start,
												children: [
													Row(
														mainAxisAlignment: MainAxisAlignment.spaceBetween,
														children: [
															Expanded(
																child: Text(
																	(question['questionText'] as String?) ??
																		(question['text'] as String? ?? ''),
																	style: const TextStyle(
																		fontWeight: FontWeight.w600,
																	),
																),
															),
															Row(
																children: [
																	Icon(
																		isCorrectAnswer ? Icons.check_circle : Icons.cancel,
																		color: isCorrectAnswer ? Colors.green : Colors.red,
																		size: 18,
																	),
																	const SizedBox(width: 4),
																	Container(
																		padding: const EdgeInsets.symmetric(
																			horizontal: 8,
																			vertical: 2,
																		),
																		decoration: BoxDecoration(
																			color: AppColors.highlight,
																			borderRadius: BorderRadius.circular(999),
																		),
																		child: Text(
																			isCorrectAnswer ? '+$pts pts' : '0 pts',
																			style: const TextStyle(
																				fontSize: 11,
																				color: AppColors.primary,
																				fontWeight: FontWeight.bold,
																			),
																		),
																	),
																],
															),
														],
													),
													const SizedBox(height: 8),
													...List.generate(options.length, (optIndex) {
														final opt = options[optIndex];
														String optText = '';
														bool optCorrect = false;
														if (opt is Map<String, dynamic>) {
															optText = (opt['text'] as String?) ?? '';
															optCorrect = opt['isCorrect'] == true;
														} else if (opt is String) {
															optText = opt;
														}
														Color bg = Colors.grey.shade50;
														Color txt = Colors.grey.shade800;
														BorderSide border = BorderSide.none;
														if (optCorrect) {
															bg = const Color(0xFFE8F5E9);
															txt = Colors.green.shade800;
															border = BorderSide(color: Colors.green.shade400);
														} else if (optIndex == selectedIndex && !isCorrectAnswer) {
															bg = const Color(0xFFFFEBEE);
															txt = Colors.red.shade800;
															border = BorderSide(color: Colors.red.shade400);
														}
														return Container(
															margin: const EdgeInsets.only(bottom: 6),
															padding: const EdgeInsets.symmetric(
																horizontal: 12,
																vertical: 8,
															),
															decoration: BoxDecoration(
																color: bg,
																borderRadius: BorderRadius.circular(8),
																border: Border.fromBorderSide(border),
															),
															child: Text(
																optText,
																style: TextStyle(fontSize: 13, color: txt),
															),
														);
													}),
													const SizedBox(height: 6),
													Container(
														padding: const EdgeInsets.all(8),
														decoration: BoxDecoration(
															color: const Color(0xFFE3F2FD),
															borderRadius: BorderRadius.circular(8),
														),
														child: Text(
															(question['explanation'] as String?) ??
																'Esta es la respuesta correcta.',
															style: const TextStyle(
																fontSize: 12,
																color: Color(0xFF0D47A1),
															),
														),
													),
											],
										),
									);
								},
								),
							),
							SizedBox(
								width: double.infinity,
								child: ElevatedButton(
													onPressed: () => Navigator.of(context).pop(),
													style: ElevatedButton.styleFrom(
														backgroundColor: AppColors.primary,
														padding: const EdgeInsets.symmetric(vertical: 14),
														shape: RoundedRectangleBorder(
															borderRadius: BorderRadius.circular(12),
														),
													),
									child: const Text(
										'Continuar explorando',
										style: TextStyle(
											color: Colors.white,
											fontSize: 16,
											fontWeight: FontWeight.bold,
										),
									),
								),
							),
						],
					),
				),
			);
		}

		final currentQuestion = _currentQuestion;
		final totalQuestions = _questions.length;
		final currentNumber = totalQuestions == 0
				? 0
				: (_currentQuestionIndex + 1).clamp(1, totalQuestions);
		final progress = totalQuestions == 0
				? 0.0
				: currentNumber / totalQuestions;

		return Scaffold(
			backgroundColor: Colors.white,
			appBar: AppBar(
				elevation: 0,
				backgroundColor: Colors.white,
				foregroundColor: Colors.black,
				centerTitle: true,
				title: Column(
					children: [
						Text(
							'Quiz - ${widget.monument.name}',
							style: const TextStyle(
								fontSize: 16,
								fontWeight: FontWeight.bold,
							),
						),
						const SizedBox(height: 2),
						Text(
							totalQuestions == 0
									? 'Sin preguntas'
									: 'Pregunta $currentNumber de $totalQuestions',
							style: const TextStyle(fontSize: 12, color: Colors.grey),
						),
					],
				),
				actions: const [
					Padding(
						padding: EdgeInsets.only(right: 16.0),
						child: Icon(Icons.access_time, color: Colors.orange),
					),
				],
			),
			body: _isLoading
					? const Center(child: CircularProgressIndicator())
					: Padding(
						padding: const EdgeInsets.all(16.0),
						child: Column(
							crossAxisAlignment: CrossAxisAlignment.start,
							children: [
								ClipRRect(
									borderRadius: BorderRadius.circular(999),
									child: LinearProgressIndicator(
										value: progress,
										minHeight: 6,
										backgroundColor: Colors.grey.shade200,
										valueColor: const AlwaysStoppedAnimation(AppColors.primary),
									),
								),
								const SizedBox(height: 12),
								Row(
									mainAxisAlignment: MainAxisAlignment.spaceBetween,
									children: [
										Text(
											'Puntuación: $_score',
											style: const TextStyle(fontSize: 12, color: Colors.grey),
										),
										Text(
											'$_maxScore pts máximo',
											style: const TextStyle(fontSize: 12, color: Colors.grey),
										),
									],
								),
								const SizedBox(height: 24),
								if (currentQuestion != null)
									Container(
										padding: const EdgeInsets.all(16),
										decoration: BoxDecoration(
											color: Colors.white,
											borderRadius: BorderRadius.circular(16),
											boxShadow: [
												BoxShadow(
													color: Colors.black.withOpacity(0.05),
													blurRadius: 10,
													offset: const Offset(0, 4),
												),
											],
										),
										child: Row(
											crossAxisAlignment: CrossAxisAlignment.start,
											children: [
												Expanded(
													child: Text(
															(currentQuestion['questionText'] as String?) ??
																(currentQuestion['text'] as String? ?? ''),
														style: const TextStyle(
															fontSize: 16,
															fontWeight: FontWeight.bold,
														),
													),
												),
												const SizedBox(width: 8),
												Container(
													padding: const EdgeInsets.symmetric(
														horizontal: 10,
														vertical: 4,
													),
													decoration: BoxDecoration(
														color: AppColors.highlight,
														borderRadius: BorderRadius.circular(999),
													),
													child: Text(
														'${currentQuestion['points'] ?? 0} pts',
														style: const TextStyle(
															fontSize: 12,
															color: AppColors.primary,
															fontWeight: FontWeight.bold,
														),
													),
												),
											],
										),
									),
								const SizedBox(height: 16),
								Expanded(
									child: Column(
										mainAxisSize: MainAxisSize.max,
										children: [
											Expanded(
												child: ListView.builder(
													itemCount:
														(currentQuestion?['options'] as List<dynamic>? ?? const []).length,
													itemBuilder: (context, index) {
														final options =
															(currentQuestion?['options'] as List<dynamic>? ?? const []);
														final opt = index < options.length ? options[index] : null;
														String text = '';
														bool isCorrect = false;
														if (opt is Map<String, dynamic>) {
															text = (opt['text'] as String?) ?? '';
															isCorrect = opt['isCorrect'] == true;
														} else if (opt is String) {
															text = opt;
														}
														return GestureDetector(
															onTap: () => _onSelectOption(index),
															child: _QuizOption(
																text: text,
																isSelected: _selectedOptionIndex == index,
																showFeedback: _showFeedback,
																isCorrect: isCorrect,
																isUserChoice: _selectedOptionIndex == index,
															),
														);
													},
												),
											),
											AnimatedOpacity(
												duration: const Duration(milliseconds: 300),
												opacity: _showFeedback && currentQuestion != null ? 1.0 : 0.0,
												child: _showFeedback && currentQuestion != null
														? Container(
															margin: const EdgeInsets.only(bottom: 16, top: 4),
															padding: const EdgeInsets.all(12),
															decoration: BoxDecoration(
																color: const Color(0xFFE3F2FD),
																borderRadius: BorderRadius.circular(12),
															),
															child: Row(
																crossAxisAlignment: CrossAxisAlignment.start,
																children: [
																	Container(
																		width: 32,
																		height: 32,
																		decoration: const BoxDecoration(
																			color: Color(0xFF1976D2),
																			shape: BoxShape.circle,
																		),
																		alignment: Alignment.center,
																		child: const Text(
																			'i',
																			style: TextStyle(
																				color: Colors.white,
																				fontWeight: FontWeight.bold,
																			),
																		),
																	),
																	const SizedBox(width: 12),
																	Expanded(
																		child: Column(
																			crossAxisAlignment: CrossAxisAlignment.start,
																			children: [
																				const Text(
																					'Explicación',
																					style: TextStyle(
																						fontWeight: FontWeight.w600,
																						color: Color(0xFF0D47A1),
																					),
																				),
																				const SizedBox(height: 4),
																				Text(
																					(currentQuestion['explanation'] as String?) ??
																						'Esta es la respuesta correcta.',
																					style: const TextStyle(
																						fontSize: 13,
																						color: Color(0xFF0D47A1),
																					),
																				),
																			],
																		),
																	),
																],
															),
														)
													: const SizedBox.shrink(),
												),
										],
									),
								),
								if (!_showFeedback)
									SizedBox(
										width: double.infinity,
										child: ElevatedButton(
											onPressed:
												_isSubmitting || currentQuestion == null
														? null
														: _onNext,
											style: ElevatedButton.styleFrom(
												backgroundColor: AppColors.primary,
												padding:
													const EdgeInsets.symmetric(vertical: 14),
												shape: RoundedRectangleBorder(
													borderRadius: BorderRadius.circular(12),
												),
											),
											child: Text(
												_currentQuestionIndex < _questions.length - 1
													? 'Siguiente Pregunta'
													: 'Finalizar Quiz',
												style: const TextStyle(
													color: Colors.white,
													fontSize: 16,
													fontWeight: FontWeight.bold,
												),
											),
										),
									),
							],
						),
					),
		);
	}
}

class _QuizOption extends StatelessWidget {
	final String text;
	final bool isSelected;
	final bool showFeedback;
	final bool isCorrect;
	final bool isUserChoice;

	const _QuizOption({
		required this.text,
		this.isSelected = false,
		this.showFeedback = false,
		this.isCorrect = false,
		this.isUserChoice = false,
	});

	@override
	Widget build(BuildContext context) {
		Color borderColor = Colors.grey.shade200;
		Color backgroundColor = Colors.white;
		Color textColor = Colors.black87;

		if (showFeedback) {
			if (isCorrect) {
				borderColor = Colors.green;
				backgroundColor = const Color(0xFFE8F5E9);
				textColor = Colors.green.shade800;
			} else if (isUserChoice && !isCorrect) {
				borderColor = Colors.red;
				backgroundColor = const Color(0xFFFFEBEE);
				textColor = Colors.red.shade800;
			}
		} else {
				borderColor =
					isSelected ? AppColors.primary : Colors.grey.shade200;
				backgroundColor =
					isSelected ? AppColors.highlight : Colors.white;
		}

		return Container(
			margin: const EdgeInsets.only(bottom: 12),
			padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
			decoration: BoxDecoration(
				color: backgroundColor,
				borderRadius: BorderRadius.circular(12),
				border: Border.all(color: borderColor),
			),
			child: Text(
				text,
				style: TextStyle(fontSize: 14, color: textColor),
			),
		);
	}
}

