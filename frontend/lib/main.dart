
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'repositories/token_repository.dart';
import 'repositories/usuario_repository.dart';
import 'routes.dart';
import 'screens/cadastro_screen.dart';
import 'screens/inicio_screen.dart';
import 'screens/login_screen.dart';
import 'screens/perfil_screen.dart';
import 'screens/produto_screen.dart';
import 'services/sessao_service.dart';
import 'widgets/rota_protegida.dart';

// Inicializa o Flutter e restaura a sessão salva.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final sessao = SessaoService(
    UsuarioRepository(),
    tokens: TokenRepository(),
  );

  // Verifica se existe um token salvo e ainda válido.
  await sessao.restaurar();

  runApp(
    ChangeNotifierProvider<SessaoService>.value(
      value: sessao,
      child: const ProdutosApp(),
    ),
  );
}

class ProdutosApp extends StatelessWidget {
  const ProdutosApp({super.key});

  @override
  Widget build(BuildContext context) {
    final logado = context.watch<SessaoService>().logado;

    return MaterialApp(
      title: 'Gerenciamento de Produtos',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
      ),

      // Se a sessão foi restaurada, abre o início.
      // Caso contrário, abre a tela de login.
      initialRoute: logado
          ? AppRoutes.inicio
          : AppRoutes.login,

      routes: {
        AppRoutes.login: (context) => const LoginScreen(),

        AppRoutes.cadastro: (context) => const CadastroScreen(),

        AppRoutes.inicio: (context) => const RotaProtegida(
          tela: InicioScreen(),
        ),

        AppRoutes.produtos: (context) => const RotaProtegida(
          tela: ProdutoScreen(),
        ),

        AppRoutes.perfil: (context) => const RotaProtegida(
          tela: PerfilScreen(),
        ),
      },
    );
  }
}