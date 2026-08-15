import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../contexts/auth_state.dart';
import '../services/auth_service.dart';
import '../services/session_storage_service.dart';
import '../services/user_service.dart';
import '../styles/app_colors.dart';
import '../styles/app_tokens.dart';
import '../widgets/app_motion.dart';
import 'main_scaffold.dart';
import 'terms_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final _authService = AuthService();
  final _userService = UserService();
  final _sessionStorage = SessionStorageService();
  bool _isLoading = false;
  int _selectedTabIndex = 0;

  final _loginFormKey = GlobalKey<FormState>();
  final _loginEmailController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  bool _loginObscure = true;
  bool _termsRead = false;
  bool _termsAccepted = false;

  final _registerFormKey = GlobalKey<FormState>();
  final _registerNameController = TextEditingController();
  final _registerEmailController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  final _registerConfirmPasswordController = TextEditingController();

  bool _registerObscure = true;
  bool _registerConfirmObscure = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_handleTabChange);
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    _loginEmailController.dispose();
    _loginPasswordController.dispose();
    _registerNameController.dispose();
    _registerEmailController.dispose();
    _registerPasswordController.dispose();
    _registerConfirmPasswordController.dispose();
    super.dispose();
  }

  void _handleTabChange() {
    if (_tabController.indexIsChanging ||
        _selectedTabIndex == _tabController.index) {
      return;
    }
    setState(() => _selectedTabIndex = _tabController.index);
  }

  void _goToApp() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => MainScaffold(token: authState.token)),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _handleLogin() async {
    if (!_loginFormKey.currentState!.validate()) return;

    final email = _loginEmailController.text.trim();
    final password = _loginPasswordController.text.trim();

    setState(() => _isLoading = true);
    try {
      final token = await _authService.login(email: email, password: password);
      await _sessionStorage.saveToken(token);

      try {
        final me = await _userService.getMyProfile(token);
        await _sessionStorage.saveUserId(me.id);
      } catch (_) {
        // Si falla obtener el perfil, igual continuamos con token
      }
      _goToApp();
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRegister() async {
    if (!_termsAccepted) {
      _showError('Para registrarte, acepta los Términos y Condiciones.');
      return;
    }
    if (!_registerFormKey.currentState!.validate()) return;

    final name = _registerNameController.text.trim();
    final email = _registerEmailController.text.trim();
    final password = _registerPasswordController.text.trim();

    setState(() => _isLoading = true);
    try {
      await _authService.register(
        name: name,
        email: email,
        password: password,
        termsAccepted: _termsAccepted,
      );
      _showError('Cuenta creada, ahora inicia sesión');
      _tabController.animateTo(0);
    } catch (e) {
      final errorMsg = e.toString().replaceFirst('Exception: ', '');
      _showError(errorMsg);
      if (errorMsg.contains('ya está registrado') ||
          errorMsg.contains('ya existe')) {
        _tabController.animateTo(0);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleGoogleAuth({required bool isRegister}) async {
    if (isRegister && !_termsAccepted) {
      _showError('Para registrarte, acepta los Términos y Condiciones.');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final token = await _authService.loginWithGoogle(
        isRegister: isRegister,
        termsAccepted: isRegister && _termsAccepted,
      );
      await _sessionStorage.saveToken(token);

      try {
        final me = await _userService.getMyProfile(token);
        await _sessionStorage.saveUserId(me.id);
      } catch (_) {
        // Continuar si falla obtener el perfil secundario
      }
      _goToApp();
    } catch (e) {
      if (!e.toString().contains('cancelado')) {
        final errorMsg = e.toString().replaceFirst('Exception: ', '');
        _showError(errorMsg);
        if (isRegister &&
            (errorMsg.contains('ya está registrado') ||
                errorMsg.contains('ya existe'))) {
          _tabController.animateTo(0);
        }
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.sizeOf(context);
    final compact = size.width < 360 || size.height < 700;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: EdgeInsets.symmetric(
              horizontal: compact ? 16 : 24,
              vertical: compact ? 20 : 32,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Avatar con iniciales y sombra
                  Semantics(
                    image: true,
                    label: 'Logo de HistoriAR',
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.24),
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: CircleAvatar(
                        radius: compact ? 48 : 58,
                        backgroundColor: AppColors.primary,
                        child: Padding(
                          padding: EdgeInsets.all(compact ? 16 : 18),
                          child: Image.asset(
                            'assets/icon/icon.png',
                            fit: BoxFit.contain,
                            excludeFromSemantics: true,
                          ),
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: compact ? AppSpacing.lg : AppSpacing.xxl),
                  const Text(
                    'Bienvenido a HistoriAR',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Explora las Huacas de Santa Anita',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF999999),
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  SizedBox(height: compact ? AppSpacing.lg : AppSpacing.xxl),

                  // Tabs Iniciar sesión / Registrarse
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      labelColor: AppColors.primary,
                      labelStyle: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      unselectedLabelColor: const Color(0xFF999999),
                      unselectedLabelStyle: const TextStyle(
                        fontWeight: FontWeight.w500,
                        fontSize: 14,
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      tabs: const [
                        Tab(text: 'Iniciar Sesión'),
                        Tab(text: 'Registrarse'),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  AppFadeSwitcher(
                    child: KeyedSubtree(
                      key: ValueKey(_selectedTabIndex),
                      child: _selectedTabIndex == 0
                          ? _buildLoginForm(theme)
                          : _buildRegisterForm(theme),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm(ThemeData theme) {
    return Form(
      key: _loginFormKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Iniciar Sesión',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ingresa tus credenciales para continuar',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          _fieldLabel('Correo electrónico'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _loginEmailController,
            decoration: _inputDecoration('tu@ejemplo.com'),
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'El correo es obligatorio';
              }
              if (!RegExp(
                r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
              ).hasMatch(value!)) {
                return 'Correo inválido';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          _fieldLabel('Contraseña'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _loginPasswordController,
            decoration: _inputDecoration('••••••••').copyWith(
              suffixIcon: IconButton(
                icon: Icon(
                  _loginObscure ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () => setState(() => _loginObscure = !_loginObscure),
                tooltip: _loginObscure
                    ? 'Mostrar contraseña'
                    : 'Ocultar contraseña',
              ),
            ),
            obscureText: _loginObscure,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            onFieldSubmitted: (_) {
              if (!_isLoading) _handleLogin();
            },
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'La contraseña es obligatoria';
              }
              if (value!.length < 9 || !RegExp(r'^[A-Za-z0-9]+$').hasMatch(value)) {
                return 'Usa al menos 9 caracteres, solo letras y números';
              }
              return null;
            },
          ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
                shadowColor: AppColors.primary.withValues(alpha: 0.4),
              ),
              onPressed: _isLoading ? null : _handleLogin,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Iniciar Sesión',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'o continuar con',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                side: const BorderSide(color: Color(0xFFE8E8E8), width: 1.5),
              ),
              onPressed: _isLoading
                  ? null
                  : () => _handleGoogleAuth(isRegister: false),
              icon: Image.network(
                'https://developers.google.com/static/identity/images/g-logo.png',
                height: 20,
                errorBuilder: (context, error, stackTrace) =>
                    const Icon(Icons.g_mobiledata, size: 24, color: Colors.red),
              ),
              label: const Text(
                'Iniciar sesión con Google',
                style: TextStyle(
                  color: Colors.black87,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRegisterForm(ThemeData theme) {
    return Form(
      key: _registerFormKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Crear Cuenta',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Únete a la comunidad HistoriAR',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 16),
          _fieldLabel('Nombre'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _registerNameController,
            decoration: _inputDecoration('Tu nombre completo'),
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.name],
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'El nombre es obligatorio';
              }
              if (value!.length < 3) {
                return 'El nombre debe tener al menos 3 caracteres';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          _fieldLabel('Correo electrónico'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _registerEmailController,
            decoration: _inputDecoration('tu@ejemplo.com'),
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'El correo es obligatorio';
              }
              if (!RegExp(
                r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
              ).hasMatch(value!)) {
                return 'Correo inválido';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          _fieldLabel('Contraseña'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _registerPasswordController,
            decoration: _inputDecoration('••••••••').copyWith(
              suffixIcon: IconButton(
                icon: Icon(
                  _registerObscure ? Icons.visibility_off : Icons.visibility,
                ),
                onPressed: () =>
                    setState(() => _registerObscure = !_registerObscure),
                tooltip: _registerObscure
                    ? 'Mostrar contraseña'
                    : 'Ocultar contraseña',
              ),
            ),
            obscureText: _registerObscure,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.newPassword],
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'La contraseña es obligatoria';
              }
              if (value!.length < 9 || !RegExp(r'^[A-Za-z0-9]+$').hasMatch(value)) {
                return 'Usa al menos 9 caracteres, solo letras y números';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          _fieldLabel('Confirmar contraseña'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _registerConfirmPasswordController,
            decoration: _inputDecoration('••••••••').copyWith(
              suffixIcon: IconButton(
                icon: Icon(
                  _registerConfirmObscure
                      ? Icons.visibility_off
                      : Icons.visibility,
                ),
                onPressed: () => setState(
                  () => _registerConfirmObscure = !_registerConfirmObscure,
                ),
                tooltip: _registerConfirmObscure
                    ? 'Mostrar contraseña'
                    : 'Ocultar contraseña',
              ),
            ),
            obscureText: _registerConfirmObscure,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.newPassword],
            onFieldSubmitted: (_) {
              if (!_isLoading) _handleRegister();
            },
            validator: (value) {
              if (value?.isEmpty ?? true) {
                return 'Debe confirmar la contraseña';
              }
              if (value != _registerPasswordController.text) {
                return 'Las contraseñas no coinciden';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Checkbox(
                value: _termsAccepted,
                onChanged: _termsRead
                    ? (value) {
                        setState(() => _termsAccepted = value ?? false);
                      }
                    : (value) {
                        _showError(
                          'Por favor, haz clic y lee los Términos y Condiciones antes de aceptar.',
                        );
                      },
                activeColor: AppColors.primary,
              ),
              Expanded(
                child: RichText(
                  text: TextSpan(
                    text: 'He leído y acepto los ',
                    style: const TextStyle(color: Colors.black87, fontSize: 13),
                    children: [
                      TextSpan(
                        text: 'Términos y condiciones',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          decoration: TextDecoration.underline,
                        ),
                        recognizer: TapGestureRecognizer()
                          ..onTap = () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    const TermsScreen(initialTabIndex: 0),
                              ),
                            );
                            setState(() {
                              _termsRead = true;
                            });
                          },
                      ),
                      const TextSpan(text: ' y la '),
                      TextSpan(
                        text: 'Política de Privacidad',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          decoration: TextDecoration.underline,
                        ),
                        recognizer: TapGestureRecognizer()
                          ..onTap = () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    const TermsScreen(initialTabIndex: 1),
                              ),
                            );
                            setState(() {
                              _termsRead = true;
                            });
                          },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 4,
                shadowColor: AppColors.primary.withValues(alpha: 0.4),
              ),
              onPressed: _isLoading ? null : _handleRegister,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Crear Cuenta',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: Divider(color: Colors.grey.shade300)),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'o continuar con',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
              Expanded(child: Divider(color: Colors.grey.shade300)),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                side: const BorderSide(color: Color(0xFFE8E8E8), width: 1.5),
              ),
              onPressed: _isLoading
                  ? null
                  : () => _handleGoogleAuth(isRegister: true),
              icon: Image.network(
                'https://developers.google.com/static/identity/images/g-logo.png',
                height: 20,
                errorBuilder: (context, error, stackTrace) =>
                    const Icon(Icons.g_mobiledata, size: 24, color: Colors.red),
              ),
              label: const Text(
                'Registrarse con Google',
                style: TextStyle(
                  color: Colors.black87,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        color: Color(0xFFCCCCCC),
        fontSize: 14,
        fontWeight: FontWeight.w400,
      ),
      filled: true,
      fillColor: const Color(0xFFFAFAFA),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE8E8E8), width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFFF3B30), width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFFF3B30), width: 2),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        text,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    );
  }
}
