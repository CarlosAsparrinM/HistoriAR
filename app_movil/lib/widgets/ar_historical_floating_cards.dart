import 'package:flutter/material.dart';

import '../models/historical_data.dart';
import '../styles/app_colors.dart';
import 'tts_play_button.dart';

const double _compactWidthBreakpoint = 380;
const double _compactCardWidth = 108;
const double _regularCardWidth = 116;
const double _compactCardHeight = 76;
const double _regularCardHeight = 80;
const double _carouselHeight = 176;

class ArHistoricalFloatingCards extends StatelessWidget {
  final List<HistoricalData> items;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final ValueChanged<HistoricalData> onTap;
  final bool hitTestOnly;

  const ArHistoricalFloatingCards({
    super.key,
    required this.items,
    required this.onTap,
    this.isLoading = false,
    this.errorMessage,
    this.onRetry,
    this.hitTestOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    if (hitTestOnly && items.isEmpty) return const SizedBox.shrink();
    if (hitTestOnly) {
      return _buildCardsLayout(isInvisibleTouchLayer: true);
    }

    if (isLoading) {
      return const _FloatingStatusCard(
        icon: Icons.auto_stories_outlined,
        label: 'Cargando fichas...',
      );
    }

    if (errorMessage != null) {
      return _FloatingStatusCard(
        icon: Icons.warning_amber_rounded,
        label: 'No se pudieron cargar las fichas',
        onTap: onRetry,
      );
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return _buildCardsLayout(isInvisibleTouchLayer: false);
  }

  Widget _buildCardsLayout({required bool isInvisibleTouchLayer}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isCompact = constraints.maxWidth < _compactWidthBreakpoint;
        final cardSize = Size(
          isCompact ? _compactCardWidth : _regularCardWidth,
          isCompact ? _compactCardHeight : _regularCardHeight,
        );

        return SizedBox(
          height: isCompact ? 210 : 220,
          child: _CalloutStack(
            items: items,
            cardSize: cardSize,
            focus: Offset(constraints.maxWidth / 2, isCompact ? 154 : 160),
            placements: _buildPlacements(
              constraints.maxWidth,
              items.take(3).length,
              cardSize,
            ),
            isInvisibleTouchLayer: isInvisibleTouchLayer,
            onTap: onTap,
          ),
        );
      },
    );
  }

  List<_CalloutPlacement> _buildPlacements(
    double width,
    int count,
    Size cardSize,
  ) {
    final cardWidth = cardSize.width;
    final safeWidth = width <= 0 ? 360.0 : width;
    final horizontalPadding = safeWidth < _compactWidthBreakpoint ? 14.0 : 22.0;
    final centerLeft = (safeWidth - cardWidth) / 2;
    final rightLeft = safeWidth - cardWidth - horizontalPadding;

    if (count == 1) {
      return [_CalloutPlacement(left: centerLeft, top: 16)];
    }

    if (count == 2) {
      return [
        _CalloutPlacement(left: horizontalPadding, top: 66),
        _CalloutPlacement(left: rightLeft, top: 18),
      ];
    }

    return [
      _CalloutPlacement(left: horizontalPadding, top: 82),
      _CalloutPlacement(left: centerLeft, top: 4),
      _CalloutPlacement(left: rightLeft, top: 82),
    ];
  }
}

class ArHistoricalCarouselCards extends StatefulWidget {
  final List<HistoricalData> items;
  final bool isLoading;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final ValueChanged<HistoricalData> onTap;

  const ArHistoricalCarouselCards({
    super.key,
    required this.items,
    required this.onTap,
    this.isLoading = false,
    this.errorMessage,
    this.onRetry,
  });

  @override
  State<ArHistoricalCarouselCards> createState() =>
      _ArHistoricalCarouselCardsState();
}

class _ArHistoricalCarouselCardsState extends State<ArHistoricalCarouselCards> {
  late final PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.84);
  }

  @override
  void didUpdateWidget(covariant ArHistoricalCarouselCards oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_currentPage >= widget.items.length && widget.items.isNotEmpty) {
      _currentPage = widget.items.length - 1;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(_currentPage);
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return const _FloatingStatusCard(
        icon: Icons.auto_stories_outlined,
        label: 'Cargando fichas...',
      );
    }

    if (widget.errorMessage != null) {
      return _FloatingStatusCard(
        icon: Icons.warning_amber_rounded,
        label: 'No se pudieron cargar las fichas',
        onTap: widget.onRetry,
      );
    }

    if (widget.items.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: _carouselHeight,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 0, 22, 8),
            child: Row(
              children: [
                const Icon(
                  Icons.auto_stories_outlined,
                  color: AppColors.primary,
                  size: 18,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Fichas historicas',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Text(
                  '${_currentPage + 1}/${widget.items.length}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              itemCount: widget.items.length,
              onPageChanged: (index) => setState(() => _currentPage = index),
              itemBuilder: (context, index) {
                return AnimatedPadding(
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOutCubic,
                  padding: EdgeInsets.fromLTRB(
                    index == 0 ? 6 : 8,
                    0,
                    index == widget.items.length - 1 ? 6 : 8,
                    0,
                  ),
                  child: _HistoricalCarouselCard(
                    item: widget.items[index],
                    onTap: () => widget.onTap(widget.items[index]),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          _CarouselDots(count: widget.items.length, activeIndex: _currentPage),
        ],
      ),
    );
  }
}

class _HistoricalCarouselCard extends StatelessWidget {
  final HistoricalData item;
  final VoidCallback onTap;

  const _HistoricalCarouselCard({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final imageUrl = (item.imageUrl ?? '').trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.42),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(19),
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (imageUrl.isNotEmpty)
                  Image.network(
                    imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const _ImagePlaceholder(),
                  )
                else
                  const _ImagePlaceholder(),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.08),
                        Colors.black.withValues(alpha: 0.1),
                        Colors.black.withValues(alpha: 0.84),
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: 14,
                  right: 48,
                  bottom: 14,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        item.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          height: 1.08,
                          shadows: [
                            Shadow(
                              color: Colors.black87,
                              blurRadius: 8,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Toca para ver informacion',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  right: 14,
                  bottom: 16,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.primary,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.28),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.arrow_forward_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CarouselDots extends StatelessWidget {
  final int count;
  final int activeIndex;

  const _CarouselDots({required this.count, required this.activeIndex});

  @override
  Widget build(BuildContext context) {
    if (count <= 1) return const SizedBox(height: 6);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (index) {
        final isActive = index == activeIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: isActive ? 18 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary
                : Colors.white.withValues(alpha: 0.34),
            borderRadius: BorderRadius.circular(999),
          ),
        );
      }),
    );
  }
}

class _CalloutStack extends StatelessWidget {
  final List<HistoricalData> items;
  final Size cardSize;
  final Offset focus;
  final List<_CalloutPlacement> placements;
  final ValueChanged<HistoricalData> onTap;
  final bool isInvisibleTouchLayer;

  const _CalloutStack({
    required this.items,
    required this.cardSize,
    required this.focus,
    required this.placements,
    required this.isInvisibleTouchLayer,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final visibleItems = items.take(3).toList();

    return Stack(
      clipBehavior: Clip.none,
      children: [
        if (!isInvisibleTouchLayer) ...[
          Positioned.fill(
            child: CustomPaint(
              painter: _CalloutConnectorPainter(
                focus: focus,
                cardCenters: placements
                    .map(
                      (placement) => Offset(
                        placement.left + cardSize.width / 2,
                        placement.top + cardSize.height + 2,
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
          Positioned(
            left: focus.dx - 14,
            top: focus.dy - 14,
            child: const _ModelFocusPin(),
          ),
        ],
        for (var i = 0; i < visibleItems.length; i++)
          Positioned(
            left: placements[i].left,
            top: placements[i].top,
            child: Opacity(
              opacity: isInvisibleTouchLayer ? 0.01 : 1,
              child: _FloatingHistoricalCard(
                item: visibleItems[i],
                size: cardSize,
                onTap: () => onTap(visibleItems[i]),
              ),
            ),
          ),
        if (!isInvisibleTouchLayer && items.length > visibleItems.length)
          Positioned(
            right: 16,
            top: focus.dy + 28,
            child: _MoreItemsBadge(count: items.length - visibleItems.length),
          ),
      ],
    );
  }
}

class _CalloutPlacement {
  final double left;
  final double top;

  const _CalloutPlacement({required this.left, required this.top});
}

Future<void> showHistoricalDataDetailSheet(
  BuildContext context,
  HistoricalData data,
) async {
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.black,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
    ),
    builder: (sheetContext) {
      return DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.64,
        minChildSize: 0.42,
        maxChildSize: 0.92,
        builder: (sheetContext, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          data.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      TtsPlayButton(
                        text: '${data.title}. ${data.description ?? ""}',
                        color: Colors.white,
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(sheetContext).pop(),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _DetailImage(imageUrl: data.imageUrl),
                  if ((data.description ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      data.description!.trim(),
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                        height: 1.45,
                      ),
                    ),
                  ],
                  if ((data.discoveryInfo ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _DetailSection(
                      title: 'Descubrimiento',
                      child: Text(
                        data.discoveryInfo!.trim(),
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 13,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                  if (data.activities.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _DetailSection(
                      title: 'Actividades',
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: data.activities
                            .map((activity) => _InfoChip(label: activity))
                            .toList(),
                      ),
                    ),
                  ],
                  if (data.sources.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _DetailSection(
                      title: 'Fuentes',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: data.sources
                            .map(
                              (source) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      '- ',
                                      style: TextStyle(color: Colors.white54),
                                    ),
                                    Expanded(
                                      child: Text(
                                        source,
                                        style: const TextStyle(
                                          color: Colors.white70,
                                          fontSize: 12,
                                          height: 1.35,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      );
    },
  );
}

class _FloatingHistoricalCard extends StatelessWidget {
  final HistoricalData item;
  final Size size;
  final VoidCallback onTap;

  const _FloatingHistoricalCard({
    required this.item,
    required this.size,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = (item.imageUrl ?? '').trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          width: size.width,
          height: size.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.34),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (imageUrl.isNotEmpty)
                Image.network(
                  imageUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const _ImagePlaceholder(),
                )
              else
                const _ImagePlaceholder(),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Colors.black87],
                  ),
                ),
              ),
              Positioned(
                left: 10,
                right: 10,
                bottom: 8,
                child: Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModelFocusPin extends StatelessWidget {
  const _ModelFocusPin();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.primary.withValues(alpha: 0.22),
        border: Border.all(color: Colors.white70, width: 1),
      ),
      alignment: Alignment.center,
      child: Container(
        width: 12,
        height: 12,
        decoration: const BoxDecoration(
          shape: BoxShape.circle,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

class _MoreItemsBadge extends StatelessWidget {
  final int count;

  const _MoreItemsBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.38)),
      ),
      child: Text(
        '+$count fichas',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _CalloutConnectorPainter extends CustomPainter {
  final Offset focus;
  final List<Offset> cardCenters;

  const _CalloutConnectorPainter({
    required this.focus,
    required this.cardCenters,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.5)
      ..strokeWidth = 1.1
      ..style = PaintingStyle.stroke;
    final glowPaint = Paint()
      ..color = AppColors.primary.withValues(alpha: 0.14)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (final center in cardCenters) {
      final path = Path()
        ..moveTo(center.dx, center.dy)
        ..quadraticBezierTo(
          (center.dx + focus.dx) / 2,
          center.dy + 26,
          focus.dx,
          focus.dy,
        );

      canvas.drawPath(path, glowPaint);
      canvas.drawPath(path, linePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _CalloutConnectorPainter oldDelegate) {
    return oldDelegate.focus != focus || oldDelegate.cardCenters != cardCenters;
  }
}

class _FloatingStatusCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  const _FloatingStatusCard({
    required this.icon,
    required this.label,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Material(
          color: Colors.black.withValues(alpha: 0.76),
          borderRadius: BorderRadius.circular(999),
          child: InkWell(
            borderRadius: BorderRadius.circular(999),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, color: AppColors.primary, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (onTap != null) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.refresh, color: Colors.white70, size: 16),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailImage extends StatelessWidget {
  final String? imageUrl;

  const _DetailImage({this.imageUrl});

  @override
  Widget build(BuildContext context) {
    final url = (imageUrl ?? '').trim();
    if (url.isEmpty) return const SizedBox.shrink();

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Image.network(
        url,
        width: double.infinity,
        height: 210,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
      ),
    );
  }
}

class _DetailSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _DetailSection({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;

  const _InfoChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.28)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  const _ImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primary.withValues(alpha: 0.18),
      alignment: Alignment.center,
      child: Icon(
        Icons.auto_stories_outlined,
        color: Colors.white.withValues(alpha: 0.72),
        size: 32,
      ),
    );
  }
}
