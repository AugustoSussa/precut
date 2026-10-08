import 'package:flutter/material.dart';

import '../screens/login_screen.dart';
import '../services/sessao_service.dart';

// Protege telas que exigem autenticação.
// Com sessão válida, exibe a tela solicitada.
// Sem sessão, direciona o usuário para o login.
class RotaProtegida extends StatelessWidget {
  const RotaProtegida({
    super.key,
    required this.sessao,
    required this.tela,
  });

  final SessaoService sessao;
  final Widget tela;

  @override
  Widget build(BuildContext context) {
    if (sessao.token == null) {
      return LoginScreen(sessao: sessao);
    }

    return tela;
  }
}