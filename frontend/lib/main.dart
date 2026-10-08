import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'repositories/usuario_repository.dart';
import 'routes.dart';
import 'screens/cadastro_screen.dart';
import 'screens/inicio_screen.dart';
import 'screens/login_screen.dart';
import 'services/sessao_service.dart';
import 'widgets/rota_protegida.dart';

// Registra a sessão no topo do aplicativo para que
// todas as telas possam acessá-la através do Provider.
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => SessaoService(
        UsuarioRepository(),
      ),
      child: const ProdutosApp(),
    ),
  );
}

class ProdutosApp extends StatelessWidget {
  const ProdutosApp({super.key});

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
        AppRoutes.login: (context) => const LoginScreen(),
        AppRoutes.cadastro: (context) => const CadastroScreen(),
        AppRoutes.inicio: (context) => const RotaProtegida(
              tela: InicioScreen(),
            ),
      },
    );
  }
}