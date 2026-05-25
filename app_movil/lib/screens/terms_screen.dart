import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../styles/app_colors.dart';

class TermsScreen extends StatelessWidget {
  final int initialTabIndex;

  const TermsScreen({super.key, this.initialTabIndex = 0});

  Future<String> _loadAsset(String path) async {
    return await rootBundle.loadString(path);
  }

  Widget _buildMarkdownTab(String assetPath) {
    return FutureBuilder<String>(
      future: _loadAsset(assetPath),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return const Center(child: Text('Error al cargar el documento.'));
        }
        return Markdown(
          data: snapshot.data ?? '',
          styleSheet: MarkdownStyleSheet(
            h1: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
            h2: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            p: const TextStyle(fontSize: 14, color: Colors.black87),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      initialIndex: initialTabIndex,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Legales'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
          bottom: const TabBar(
            labelColor: AppColors.primary,
            unselectedLabelColor: Colors.grey,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Términos y Condiciones'),
              Tab(text: 'Política de Privacidad'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildMarkdownTab('assets/docs/TERMS_AND_CONDITIONS.md'),
            _buildMarkdownTab('assets/docs/PRIVACY_POLICY.md'),
          ],
        ),
      ),
    );
  }
}
