import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../routes.dart';
import '../services/sessao_service.dart';

// Protege telas que exigem autenticação.
// O watch reconstrói o widget quando a sessão muda.
class RotaProtegida extends StatelessWidget {
  const RotaProtegida({
    super.key,
    required this.tela,
  });

  final Widget tela;

  @override
  Widget build(BuildContext context) {
    final logado = context.watch<SessaoService>().logado;

    if (!logado) {
      return const _LoginNecessario();
    }

    return tela;
  }
}

class _LoginNecessario extends StatelessWidget {
  const _LoginNecessario();

  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!context.mounted) return;

      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.login,
        (rota) => false,
      );
    });

    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}