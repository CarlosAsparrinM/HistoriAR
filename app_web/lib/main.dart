import 'package:flutter/material.dart';
import 'features/explore/explore_page.dart';
import 'services/public_api.dart';

void main() => runApp(HistoriarWeb(api: PublicApi()));

class HistoriarWeb extends StatelessWidget {
  const HistoriarWeb({super.key, required this.api});
  final PublicApi api;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'HistoriAR',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff8c3b1f))),
    home: ExplorePage(api: api),
  );
}
