import 'package:app_movil/services/session_storage_service.dart';

class MemorySecureKeyValueStore implements SecureKeyValueStore {
  MemorySecureKeyValueStore([Map<String, String>? initialValues])
    : values = {...?initialValues};

  final Map<String, String> values;

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }
}
