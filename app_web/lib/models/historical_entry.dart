class HistoricalEntry {
  const HistoricalEntry({required this.id, required this.title, required this.description, required this.order});
  final String id;
  final String title;
  final String description;
  final int order;

  factory HistoricalEntry.fromJson(Map<String, dynamic> json) => HistoricalEntry(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? 'Sin título',
    description: json['description'] as String? ?? '',
    order: (json['order'] as num?)?.toInt() ?? 0,
  );
}
