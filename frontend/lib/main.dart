import 'package:flutter/material.dart';

import 'repositories/usuario_repository.dart';
import 'routes.dart';
import 'screens/cadastro_screen.dart';
import 'screens/inicio_screen.dart';
import 'screens/login_screen.dart';
import 'services/sessao_service.dart';

// Monta as dependências do aplicativo e configura a navegação.
void main() {
  final sessao = SessaoService(
    UsuarioRepository(),
  );

  runApp(
    BibliotecaApp(sessao: sessao),
  );
}

class BibliotecaApp extends StatelessWidget {
  const BibliotecaApp({
    super.key,
    required this.sessao,
  });

  final SessaoService sessao;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Produtos',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
      ),
      initialRoute: AppRoutes.login,
      routes: {
        AppRoutes.login: (context) =>
            LoginScreen(sessao: sessao),

        AppRoutes.cadastro: (context) =>
            const CadastroScreen(),

        AppRoutes.inicio: (context) =>
            InicioScreen(sessao: sessao),
      },
    );
  }
}