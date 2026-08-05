import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../models/monument.dart';
import '../../services/public_api.dart';
import '../monument/monument_detail_page.dart';

class ExplorePage extends StatefulWidget {
  const ExplorePage({
    super.key,
    required this.api,
    this.onLogout,
    this.userName,
  });

  final PublicApi api;
  final VoidCallback? onLogout;
  final String? userName;

  @override
  State<ExplorePage> createState() => _ExplorePageState();
}

class _ExplorePageState extends State<ExplorePage> {
  final _searchController = TextEditingController();
  late Future<List<Monument>> _monuments = widget.api.getMonuments();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _search() => setState(() => _monuments = widget.api.getMonuments(search: _searchController.text));

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xff8c3b1f),
          foregroundColor: Colors.white,
          title: const Row(
            children: [
              Icon(Icons.account_balance, color: Colors.white),
              SizedBox(width: 8),
              Text('HistoriAR Web'),
            ],
          ),
          actions: [
            TextButton.icon(
              onPressed: _mobileArNotice,
              icon: const Icon(Icons.view_in_ar_outlined, color: Colors.white),
              label: const Text('AR en móvil', style: TextStyle(color: Colors.white)),
            ),
            if (widget.userName != null) ...[
              const SizedBox(width: 8),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Row(
                    children: [
                      const Icon(Icons.person_outline, size: 20, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(
                        widget.userName!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            if (widget.onLogout != null) ...[
              IconButton(
                tooltip: 'Cerrar Sesión',
                icon: const Icon(Icons.logout, color: Colors.white),
                onPressed: widget.onLogout,
              ),
            ],
            const SizedBox(width: 12),
          ],
        ),
        body: FutureBuilder<List<Monument>>(
          future: _monuments,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _ErrorState(
                message: snapshot.error.toString(),
                onRetry: _search,
              );
            }
            return Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: (_) => _search(),
                    decoration: InputDecoration(
                      labelText: 'Buscar monumentos',
                      hintText: 'Nombre o distrito',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.search),
                        onPressed: _search,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: _ExploreContent(
                    monuments: snapshot.data ?? const [],
                    api: widget.api,
                  ),
                ),
              ],
            );
          },
        ),
      );

  void _mobileArNotice() => ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Para realizar tours presenciales o realidad aumentada, usa la app móvil de HistoriAR.',
          ),
        ),
      );
}

class _ExploreContent extends StatelessWidget {
  const _ExploreContent({required this.monuments, required this.api});
  final List<Monument> monuments;
  final PublicApi api;

  @override
  Widget build(BuildContext context) {
    if (monuments.isEmpty) {
      return const Center(child: Text('No se encontraron monumentos publicados.'));
    }
    final map = FlutterMap(
      options: MapOptions(
        initialCenter: monuments.first.position,
        initialZoom: 12,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'pe.historiar.web',
        ),
        MarkerLayer(
          markers: monuments
              .map(
                (item) => Marker(
                  point: item.position,
                  width: 44,
                  height: 44,
                  child: Tooltip(
                    message: item.name,
                    child: GestureDetector(
                      onTap: () => _openMonument(context, item),
                      child: const Icon(
                        Icons.location_on,
                        color: Color(0xff8c3b1f),
                        size: 36,
                      ),
                    ),
                  ),
                ),
              )
              .toList(growable: false),
        ),
        const SimpleAttributionWidget(
          source: Text('© OpenStreetMap contributors'),
        ),
      ],
    );
    final list = ListView.separated(
      itemCount: monuments.length,
      separatorBuilder: (_, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = monuments[index];
        return ListTile(
          leading: item.imageUrl == null
              ? const CircleAvatar(child: Icon(Icons.account_balance))
              : CircleAvatar(backgroundImage: NetworkImage(item.imageUrl!)),
          title: Text(item.name),
          subtitle: Text(
            [item.district, item.culture].whereType<String>().join(' · '),
          ),
          trailing: item.model3dUrl == null
              ? null
              : const Icon(Icons.view_in_ar_outlined),
          onTap: () => _openMonument(context, item),
        );
      },
    );
    return LayoutBuilder(
      builder: (context, constraints) => constraints.maxWidth >= 900
          ? Row(
              children: [
                Expanded(flex: 3, child: map),
                Expanded(flex: 2, child: list),
              ],
            )
          : Column(
              children: [
                Expanded(flex: 3, child: map),
                Expanded(flex: 2, child: list),
              ],
            ),
    );
  }

  void _openMonument(BuildContext context, Monument monument) =>
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => MonumentDetailPage(monument: monument, api: api),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48),
            const SizedBox(height: 12),
            const Text('No pudimos cargar HistoriAR.'),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(message, textAlign: TextAlign.center),
            ),
            FilledButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      );
}
