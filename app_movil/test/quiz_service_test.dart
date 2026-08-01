import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:app_movil/services/quiz_service.dart';

void main() {
  setUp(() {
    dotenv.loadFromString(envString: 'API_BASE_URL=http://localhost:4000\n');
  });

  test('returns null when a monument has no quiz', () async {
    final service = QuizService(
      client: MockClient(
        (_) async => http.Response(jsonEncode({'items': []}), 200),
      ),
    );

    final result = await service.getQuizForMonument(
      monumentId: 'monument-1',
      token: 'token',
    );

    expect(result, isNull);
  });

  test('submits answers and time spent', () async {
    late Map<String, dynamic> requestBody;
    final service = QuizService(
      client: MockClient((request) async {
        requestBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(jsonEncode({'score': 1}), 200);
      }),
    );

    final result = await service.submitQuizAttempt(
      quizId: 'quiz-1',
      answers: const [
        {'questionId': 'question-1', 'answer': 'A'},
      ],
      timeSpent: const Duration(seconds: 25),
      token: 'token',
    );

    expect(requestBody['timeSpent'], 25);
    expect(requestBody['answers'], hasLength(1));
    expect(result['score'], 1);
  });
}
