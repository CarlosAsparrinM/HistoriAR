import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../models/historical_data.dart';
import '../styles/app_colors.dart';

class ArHistoricalCardModelFactory {
  const ArHistoricalCardModelFactory();

  static const int textureWidth = 512;
  static const int textureHeight = 320;

  Future<String> buildCardModel(HistoricalData data) async {
    final directory = await _cardsDirectory();
    final signature = _stableHash(
      'v3|${data.id}|${data.title}|${data.imageUrl ?? ''}|${data.updatedAt.toIso8601String()}',
    );
    final file = File('${directory.path}/historical_card_$signature.glb');

    if (await file.exists()) {
      final length = await file.length();
      if (length > 0) return file.path;
    }

    final textureBytes = await _renderTexture(data);
    final glbBytes = _buildTexturedPlaneGlb(textureBytes);
    await file.writeAsBytes(glbBytes, flush: true);
    return file.path;
  }

  Future<Directory> _cardsDirectory() async {
    final baseDirectory = await getApplicationDocumentsDirectory();
    final directory = Directory('${baseDirectory.path}/ar_historical_cards');
    if (!await directory.exists()) {
      await directory.create(recursive: true);
    }
    return directory;
  }

  Future<Uint8List> _renderTexture(HistoricalData data) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    const size = Size(512, 320);
    final rect = Offset.zero & size;

    final image = await _loadNetworkImage(data.imageUrl);
    if (image != null) {
      paintImage(canvas: canvas, rect: rect, image: image, fit: BoxFit.cover);
    } else {
      _paintPlaceholder(canvas, rect);
    }

    final overlayPaint = Paint()
      ..shader = ui.Gradient.linear(
        Offset(0, size.height * 0.35),
        Offset(0, size.height),
        [
          Colors.transparent,
          Colors.black.withValues(alpha: 0.36),
          Colors.black.withValues(alpha: 0.78),
        ],
        [0, 0.45, 1],
      );
    canvas.drawRect(rect, overlayPaint);

    final borderPaint = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8;
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect.deflate(4), const Radius.circular(24)),
      borderPaint,
    );

    final title = data.title.trim().isEmpty ? 'Ficha historica' : data.title;
    final textPainter = TextPainter(
      text: TextSpan(
        text: title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 44,
          height: 1.02,
          fontWeight: FontWeight.w800,
          shadows: [
            Shadow(color: Colors.black87, blurRadius: 10, offset: Offset(0, 2)),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 3,
      ellipsis: '...',
    )..layout(maxWidth: size.width - 48);

    textPainter.paint(
      canvas,
      Offset(24, size.height - 28 - textPainter.height),
    );

    final picture = recorder.endRecording();
    final textureImage = await picture.toImage(textureWidth, textureHeight);
    final byteData = await textureImage.toByteData(
      format: ui.ImageByteFormat.png,
    );

    image?.dispose();
    textureImage.dispose();
    picture.dispose();

    if (byteData == null) {
      throw const FileSystemException('No se pudo crear textura para AR');
    }

    return byteData.buffer.asUint8List();
  }

  Future<ui.Image?> _loadNetworkImage(String? imageUrl) async {
    final uri = Uri.tryParse((imageUrl ?? '').trim());
    if (uri == null || !uri.hasScheme) return null;

    try {
      final response = await http.get(uri).timeout(const Duration(seconds: 6));
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return null;
      }
      if (response.bodyBytes.isEmpty || response.bodyBytes.length > 3000000) {
        return null;
      }

      final codec = await ui.instantiateImageCodec(response.bodyBytes);
      final frame = await codec.getNextFrame();
      return frame.image;
    } catch (_) {
      return null;
    }
  }

  void _paintPlaceholder(Canvas canvas, Rect rect) {
    final backgroundPaint = Paint()
      ..shader = ui.Gradient.linear(rect.topLeft, rect.bottomRight, [
        AppColors.primary.withValues(alpha: 0.78),
        const Color(0xFF201A16),
        Colors.black,
      ]);
    canvas.drawRect(rect, backgroundPaint);

    final circlePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.13)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(rect.center.translate(-110, -36), 86, circlePaint);
    canvas.drawCircle(rect.center.translate(126, 72), 120, circlePaint);

    final iconPainter = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(Icons.auto_stories_outlined.codePoint),
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.8),
          fontSize: 92,
          fontFamily: Icons.auto_stories_outlined.fontFamily,
          package: Icons.auto_stories_outlined.fontPackage,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    iconPainter.paint(
      canvas,
      rect.center - Offset(iconPainter.width / 2, iconPainter.height / 2 + 20),
    );
  }

  Uint8List _buildTexturedPlaneGlb(Uint8List pngBytes) {
    final binary = _BinaryWriter();

    final positionsOffset = binary.length;
    const halfWidth = 0.66;
    const halfHeight = 0.42;
    const thickness = 0.004;
    for (final value in const <double>[
      -halfWidth,
      -halfHeight,
      thickness,
      halfWidth,
      -halfHeight,
      thickness,
      halfWidth,
      halfHeight,
      thickness,
      -halfWidth,
      halfHeight,
      thickness,
      -halfWidth,
      -halfHeight,
      -thickness,
      halfWidth,
      -halfHeight,
      -thickness,
      halfWidth,
      halfHeight,
      -thickness,
      -halfWidth,
      halfHeight,
      -thickness,
    ]) {
      binary.writeFloat32(value);
    }
    binary.align4();

    final normalsOffset = binary.length;
    for (var i = 0; i < 4; i++) {
      binary
        ..writeFloat32(0)
        ..writeFloat32(0)
        ..writeFloat32(1);
    }
    for (var i = 0; i < 4; i++) {
      binary
        ..writeFloat32(0)
        ..writeFloat32(0)
        ..writeFloat32(-1);
    }
    binary.align4();

    final texCoordsOffset = binary.length;
    for (final value in const <double>[
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      0,
      1,
      0,
      0,
      1,
      0,
    ]) {
      binary.writeFloat32(value);
    }
    binary.align4();

    final indicesOffset = binary.length;
    for (final value in const <int>[0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]) {
      binary.writeUint16(value);
    }
    binary.align4();

    final imageOffset = binary.length;
    binary.writeBytes(pngBytes);
    binary.align4();

    final binaryLength = binary.length;
    final gltf = <String, Object?>{
      'asset': {'version': '2.0', 'generator': 'HistoriAR'},
      'scene': 0,
      'scenes': [
        {
          'nodes': [0],
        },
      ],
      'nodes': [
        {'mesh': 0},
      ],
      'meshes': [
        {
          'primitives': [
            {
              'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2},
              'indices': 3,
              'material': 0,
            },
          ],
        },
      ],
      'materials': [
        {
          'pbrMetallicRoughness': {
            'baseColorTexture': {'index': 0},
            'baseColorFactor': [1, 1, 1, 1],
            'metallicFactor': 0,
            'roughnessFactor': 0.82,
          },
          'emissiveTexture': {'index': 0},
          'emissiveFactor': [0.85, 0.85, 0.85],
        },
      ],
      'textures': [
        {'sampler': 0, 'source': 0},
      ],
      'samplers': [
        {'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071},
      ],
      'images': [
        {'bufferView': 4, 'mimeType': 'image/png'},
      ],
      'buffers': [
        {'byteLength': binaryLength},
      ],
      'bufferViews': [
        {'buffer': 0, 'byteOffset': positionsOffset, 'byteLength': 96},
        {'buffer': 0, 'byteOffset': normalsOffset, 'byteLength': 96},
        {'buffer': 0, 'byteOffset': texCoordsOffset, 'byteLength': 64},
        {
          'buffer': 0,
          'byteOffset': indicesOffset,
          'byteLength': 24,
          'target': 34963,
        },
        {'buffer': 0, 'byteOffset': imageOffset, 'byteLength': pngBytes.length},
      ],
      'accessors': [
        {
          'bufferView': 0,
          'componentType': 5126,
          'count': 8,
          'type': 'VEC3',
          'min': [-halfWidth, -halfHeight, -thickness],
          'max': [halfWidth, halfHeight, thickness],
        },
        {'bufferView': 1, 'componentType': 5126, 'count': 8, 'type': 'VEC3'},
        {'bufferView': 2, 'componentType': 5126, 'count': 8, 'type': 'VEC2'},
        {'bufferView': 3, 'componentType': 5123, 'count': 12, 'type': 'SCALAR'},
      ],
    };

    return _packGlb(gltf, binary.toBytes());
  }

  Uint8List _packGlb(Map<String, Object?> gltf, Uint8List binChunk) {
    final jsonBytes = utf8.encode(jsonEncode(gltf));
    final paddedJson = _paddedBytes(jsonBytes, 0x20);
    final paddedBin = _paddedBytes(binChunk, 0x00);
    final totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length;

    final bytes = BytesBuilder(copy: false);
    bytes.add(_uint32Bytes(0x46546C67));
    bytes.add(_uint32Bytes(2));
    bytes.add(_uint32Bytes(totalLength));
    bytes.add(_uint32Bytes(paddedJson.length));
    bytes.add(_uint32Bytes(0x4E4F534A));
    bytes.add(paddedJson);
    bytes.add(_uint32Bytes(paddedBin.length));
    bytes.add(_uint32Bytes(0x004E4942));
    bytes.add(paddedBin);
    return bytes.toBytes();
  }

  Uint8List _paddedBytes(List<int> source, int padding) {
    final remainder = source.length % 4;
    if (remainder == 0) return Uint8List.fromList(source);
    return Uint8List.fromList([
      ...source,
      ...List<int>.filled(4 - remainder, padding),
    ]);
  }

  Uint8List _uint32Bytes(int value) {
    final data = ByteData(4)..setUint32(0, value, Endian.little);
    return data.buffer.asUint8List();
  }

  String _stableHash(String value) {
    const int fnvPrime = 0x01000193;
    var hash = 0x811C9DC5;
    for (final unit in utf8.encode(value)) {
      hash ^= unit;
      hash = (hash * fnvPrime) & 0xFFFFFFFF;
    }
    return hash.toRadixString(16).padLeft(8, '0');
  }
}

class _BinaryWriter {
  final BytesBuilder _builder = BytesBuilder(copy: false);

  int get length => _builder.length;

  void writeFloat32(double value) {
    final data = ByteData(4)..setFloat32(0, value, Endian.little);
    _builder.add(data.buffer.asUint8List());
  }

  void writeUint16(int value) {
    final data = ByteData(2)..setUint16(0, value, Endian.little);
    _builder.add(data.buffer.asUint8List());
  }

  void writeBytes(List<int> bytes) {
    _builder.add(bytes);
  }

  void align4() {
    final remainder = length % 4;
    if (remainder == 0) return;
    _builder.add(List<int>.filled(4 - remainder, 0));
  }

  Uint8List toBytes() => _builder.toBytes();
}
