import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import 'session_storage_service.dart';
import 'visits_service.dart';

enum VisitExperienceType { ar, model3d }

class PendingVisit {
  final String clientVisitId;
  final String userId;
  final String monumentId;
  final String? tourId;
  final int durationMinutes;
  final VisitExperienceType experienceType;

  const PendingVisit({
    required this.clientVisitId,
    required this.userId,
    required this.monumentId,
    required this.durationMinutes,
    required this.experienceType,
    this.tourId,
  });

  factory PendingVisit.create({
    required String userId,
    required String monumentId,
    required int durationMinutes,
    required VisitExperienceType experienceType,
    String? tourId,
  }) {
    final random = Random.secure().nextInt(1 << 32);
    return PendingVisit(
      clientVisitId:
          '${DateTime.now().microsecondsSinceEpoch}-${random.toRadixString(16)}',
      userId: userId,
      monumentId: monumentId,
      tourId: tourId,
      durationMinutes: durationMinutes,
      experienceType: experienceType,
    );
  }

  factory PendingVisit.fromJson(Map<String, dynamic> json) {
    return PendingVisit(
      clientVisitId: json['clientVisitId'] as String,
      userId: json['userId'] as String,
      monumentId: json['monumentId'] as String,
      tourId: json['tourId'] as String?,
      durationMinutes: (json['durationMinutes'] as num).toInt(),
      experienceType: VisitExperienceType.values.firstWhere(
        (value) => value.name == json['experienceType'],
        orElse: () => VisitExperienceType.model3d,
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'clientVisitId': clientVisitId,
    'userId': userId,
    'monumentId': monumentId,
    'tourId': tourId,
    'durationMinutes': durationMinutes,
    'experienceType': experienceType.name,
  };
}

class PendingVisitsService {
  PendingVisitsService({
    VisitsService? visitsService,
    SessionStorageService? sessionStorage,
  }) : _visitsService = visitsService ?? const VisitsService(),
       _sessionStorage = sessionStorage ?? SessionStorageService();

  final VisitsService _visitsService;
  final SessionStorageService _sessionStorage;
  Future<void>? _syncOperation;

  Future<void> enqueue(PendingVisit visit) async {
    final pending = await _load();
    if (pending.any((item) => item.clientVisitId == visit.clientVisitId)) {
      return;
    }

    pending.add(visit);
    await _save(pending);
  }

  Future<void> sync() {
    final activeSync = _syncOperation;
    if (activeSync != null) return activeSync;

    final operation = _performSync();
    _syncOperation = operation;
    return operation.whenComplete(() {
      if (identical(_syncOperation, operation)) {
        _syncOperation = null;
      }
    });
  }

  Future<void> _performSync() async {
    final pending = await _load();
    if (pending.isEmpty) return;

    final token = await _sessionStorage.readToken();
    final currentUserId = await _sessionStorage.readUserId();
    if (token == null || currentUserId == null) return;

    final remaining = <PendingVisit>[];
    for (final visit in pending) {
      if (visit.userId != currentUserId) {
        continue;
      }

      try {
        await _visitsService.registerVisit(
          userId: visit.userId,
          monumentId: visit.monumentId,
          token: token,
          tourId: visit.tourId,
          durationMinutes: visit.durationMinutes,
          clientVisitId: visit.clientVisitId,
          experienceType: visit.experienceType.name,
        );
      } catch (_) {
        remaining.add(visit);
      }
    }

    await _save(remaining);
  }

  Future<List<PendingVisit>> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = prefs.getString(SessionStorageService.pendingVisitsKey);
    if (encoded == null || encoded.isEmpty) return [];

    try {
      final decoded = jsonDecode(encoded);
      if (decoded is! List) return [];
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(PendingVisit.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _save(List<PendingVisit> visits) async {
    final prefs = await SharedPreferences.getInstance();
    if (visits.isEmpty) {
      await prefs.remove(SessionStorageService.pendingVisitsKey);
      return;
    }

    await prefs.setString(
      SessionStorageService.pendingVisitsKey,
      jsonEncode(visits.map((visit) => visit.toJson()).toList()),
    );
  }
}
