import 'package:shared_preferences/shared_preferences.dart';

class QuizStateService {
  static const String _completedQuizzesKey = 'completed_quizzes_list';

  Future<void> markQuizAsCompleted(String monumentId) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> completed = prefs.getStringList(_completedQuizzesKey) ?? [];
    if (!completed.contains(monumentId)) {
      completed.add(monumentId);
      await prefs.setStringList(_completedQuizzesKey, completed);
    }
  }

  Future<bool> hasCompletedQuiz(String monumentId) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> completed = prefs.getStringList(_completedQuizzesKey) ?? [];
    return completed.contains(monumentId);
  }

  Future<void> reactivateAllQuizzes() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_completedQuizzesKey);
  }
}
