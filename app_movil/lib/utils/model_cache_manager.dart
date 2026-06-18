import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class ModelCacheInfo {
  final String localUri;
  final String absolutePath;
  final String relativeFileName;

  ModelCacheInfo(this.localUri, this.absolutePath, this.relativeFileName);
}

class ModelCacheManager {
  static final Map<String, Future<ModelCacheInfo?>> _inFlight = {};

  static Future<ModelCacheInfo?> getCachedModel(String url, String monumentId) {
    final String canonicalSource;
    try {
      canonicalSource = _canonicalSource(url);
    } catch (_) {
      return Future.value(null);
    }

    final cacheKey = '$monumentId|$canonicalSource';
    final existingOperation = _inFlight[cacheKey];
    if (existingOperation != null) return existingOperation;

    final operation = _loadOrDownload(url, monumentId);
    _inFlight[cacheKey] = operation;
    return operation.whenComplete(() {
      if (identical(_inFlight[cacheKey], operation)) {
        _inFlight.remove(cacheKey);
      }
    });
  }

  static Future<ModelCacheInfo?> _loadOrDownload(
    String url,
    String monumentId,
  ) async {
    try {
      final docDir = await getApplicationDocumentsDirectory();
      final safeId = monumentId.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final fileName = 'monument_$safeId.glb';
      final file = File('${docDir.path}/$fileName');
      final metadataFile = File('${file.path}.metadata.json');
      final canonicalSource = _canonicalSource(url);

      if (await _isValidCachedFile(file, metadataFile, canonicalSource)) {
        return _cacheInfo(file, fileName);
      }

      await _deleteIfExists(file);
      await _deleteIfExists(metadataFile);

      final response = await http
          .get(Uri.parse(url))
          .timeout(const Duration(seconds: 30));
      if (response.statusCode != 200 || !hasGlbHeader(response.bodyBytes)) {
        return null;
      }

      final temporaryFile = File('${file.path}.download');
      await temporaryFile.writeAsBytes(response.bodyBytes, flush: true);
      if (!await _isValidGlbFile(temporaryFile)) {
        await _deleteIfExists(temporaryFile);
        return null;
      }

      await _deleteIfExists(file);
      await temporaryFile.rename(file.path);
      await metadataFile.writeAsString(
        jsonEncode({'source': canonicalSource, 'length': await file.length()}),
        flush: true,
      );

      return _cacheInfo(file, fileName);
    } catch (_) {
      return null;
    }
  }

  static Future<bool> _isValidCachedFile(
    File file,
    File metadataFile,
    String canonicalSource,
  ) async {
    if (!await _isValidGlbFile(file)) return false;

    if (!await metadataFile.exists()) {
      await metadataFile.writeAsString(
        jsonEncode({'source': canonicalSource, 'length': await file.length()}),
        flush: true,
      );
      return true;
    }

    try {
      final metadata =
          jsonDecode(await metadataFile.readAsString()) as Map<String, dynamic>;
      return metadata['source'] == canonicalSource &&
          metadata['length'] == await file.length();
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _isValidGlbFile(File file) async {
    if (!await file.exists() || await file.length() < 12) return false;
    final bytes = await file
        .openRead(0, 4)
        .fold<List<int>>(<int>[], (buffer, chunk) => buffer..addAll(chunk));
    return hasGlbHeader(bytes);
  }

  static bool hasGlbHeader(List<int> bytes) {
    return bytes.length >= 4 &&
        bytes[0] == 0x67 &&
        bytes[1] == 0x6C &&
        bytes[2] == 0x54 &&
        bytes[3] == 0x46;
  }

  static String _canonicalSource(String url) {
    final uri = Uri.parse(url);
    return uri.replace(query: null, fragment: null).toString();
  }

  static ModelCacheInfo _cacheInfo(File file, String fileName) {
    return ModelCacheInfo(file.uri.toString(), file.path, fileName);
  }

  static Future<void> _deleteIfExists(File file) async {
    if (await file.exists()) {
      await file.delete();
    }
  }
}
