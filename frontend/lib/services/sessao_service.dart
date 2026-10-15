import 'package:flutter/foundation.dart';

import '../models/usuario.dart';
import '../repositories/usuario_repository.dart';

class ErroDeLogin implements Exception {
  ErroDeLogin(this.mensagem);

  final String mensagem;
}

class ErroDeCadastro implements Exception {
  ErroDeCadastro(this.mensagem);

  final String mensagem;
}

class SessaoService extends ChangeNotifier {
  SessaoService(this.repositorio);

  final UsuarioRepository repositorio;

  String? token;
  Usuario? usuario;

  bool get logado => token != null && usuario != null;

  Future<void> entrar(String email, String senha) async {
    email = email.trim();

    if (email.isEmpty || senha.trim().isEmpty) {
      throw ErroDeLogin('Preencha o e-mail e a senha');
    }

    try {
      final recebido = await repositorio.entrar(email, senha);

      if (recebido == null) {
        throw ErroDeLogin('E-mail ou senha incorretos');
      }

      final quem = await repositorio.quemSouEu(recebido);

      token = recebido;
      usuario = quem;

      notifyListeners();
    } on ErroDeLogin {
      rethrow;
    } on RecusaDaApi catch (e) {
      throw ErroDeLogin(e.mensagem);
    } catch (e) {
      throw ErroDeLogin(
        'Não consegui falar com a API. Verifique se o servidor está rodando.',
      );
    }
  }

  Future<void> cadastrar(
    String nome,
    String email,
    String senha,
  ) async {
    nome = nome.trim();
    email = email.trim();

    if (nome.isEmpty || email.isEmpty || senha.trim().isEmpty) {
      throw ErroDeCadastro(
        'Preencha o nome, o e-mail e a senha',
      );
    }

    try {
      await repositorio.cadastrar(nome, email, senha);

      await entrar(email, senha);
    } on RecusaDaApi catch (e) {
      if (e.status == 409) {
        throw ErroDeCadastro(
          'Já existe uma conta com este e-mail',
        );
      }

      throw ErroDeCadastro(e.mensagem);
    } on ErroDeLogin {
      throw ErroDeCadastro(
        'Conta criada, mas não consegui entrar. Tente pelo login.',
      );
    } on ErroDeCadastro {
      rethrow;
    } catch (e) {
      throw ErroDeCadastro(
        'Não consegui falar com a API. Verifique se o servidor está rodando.',
      );
    }
  }

  void sair() {
    token = null;
    usuario = null;

    notifyListeners();
  }
}