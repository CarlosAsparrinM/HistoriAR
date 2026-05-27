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
  /// Descarga un modelo 3D desde una URL y lo guarda en la carpeta de documentos de la app.
  /// Retorna la ruta local del archivo y el nombre de archivo relativo.
  static Future<ModelCacheInfo?> getCachedModel(String url, String monumentId) async {
    try {
      // Obtener el directorio de documentos de la aplicación
      final docDir = await getApplicationDocumentsDirectory();
      
      // Crear un nombre de archivo único para este modelo
      final fileName = 'monument_$monumentId.glb';
      final file = File('${docDir.path}/$fileName');

      // Si el archivo ya existe en caché, retornarlo inmediatamente
      if (await file.exists()) {
        return ModelCacheInfo('file://${file.path}', file.path, fileName);
      }

      // Si no existe, lo descargamos
      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        // Guardar los bytes en el archivo
        await file.writeAsBytes(response.bodyBytes);
        return ModelCacheInfo('file://${file.path}', file.path, fileName);
      } else {
        return null; // Falló la descarga
      }
    } catch (e) {
      return null;
    }
  }
}
