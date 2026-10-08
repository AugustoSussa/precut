import 'package:flutter/foundation.dart';

import '../models/usuario.dart';
import '../repositories/usuario_repository.dart';

// Erro de autenticação com mensagem para a tela exibir.
class ErroDeLogin implements Exception {
  ErroDeLogin(this.mensagem);

  final String mensagem;
}

// Camada de negócio responsável pela autenticação e pela sessão.
// Não conhece telas nem executa requisições HTTP diretamente.
class SessaoService extends ChangeNotifier {
  SessaoService(this.repositorio);

  final UsuarioRepository repositorio;

  String? token;
  Usuario? usuario;

  // Indica se existe um token na sessão.
  bool get logado => token != null;

  // Autentica o usuário e carrega seus dados.
  Future<void> entrar(String email, String senha) async {
    if (email.trim().isEmpty || senha.isEmpty) {
      throw ErroDeLogin('Preencha o e-mail e a senha.');
    }

    String? recebido;

    try {
      recebido = await repositorio.entrar(
        email.trim(),
        senha,
      );
    } catch (_) {
      throw ErroDeLogin(
        'Não consegui falar com a API. Verifique se o servidor está rodando.',
      );
    }

    if (recebido == null) {
      throw ErroDeLogin('E-mail ou senha incorretos.');
    }

    Usuario? quem;

    try {
      quem = await repositorio.quemSouEu(recebido);
    } catch (_) {
      throw ErroDeLogin(
        'Não foi possível carregar os dados do usuário.',
      );
    }

    // Atualiza a sessão somente após carregar os dados.
    token = recebido;
    usuario = quem;

    notifyListeners();
  }

  // Encerra a sessão atual.
  void sair() {
    token = null;
    usuario = null;

    notifyListeners();
  }
}
