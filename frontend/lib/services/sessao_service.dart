
import 'package:flutter/foundation.dart';

import '../models/usuario.dart';
import '../repositories/token_repository.dart';
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
  SessaoService(
    this.repositorio, {
    TokenRepository? tokens,
  }) : tokens = tokens ?? TokenRepository();

  final UsuarioRepository repositorio;
  final TokenRepository tokens;

  String? token;
  Usuario? usuario;

  bool get logado => token != null && usuario != null;

  // Realiza o login e salva o token no dispositivo.
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

      // Persiste o token antes de confirmar o login.
      await tokens.salvar(recebido);

      token = recebido;
      usuario = quem;

      notifyListeners();
    } on ErroDeLogin {
      rethrow;
    } on RecusaDaApi catch (e) {
      throw ErroDeLogin(e.mensagem);
    } catch (e) {
      throw ErroDeLogin(
        'Não foi possível concluir o login. Verifique a conexão com a API.',
      );
    }
  }

  // Cadastra o usuário e realiza o login automaticamente.
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
        'Não foi possível realizar o cadastro. Verifique a conexão com a API.',
      );
    }
  }

  // Recupera a sessão salva quando o aplicativo é iniciado.
  Future<void> restaurar() async {
    String? guardado;

    try {
      guardado = await tokens.ler();

      if (guardado == null || guardado.isEmpty) {
        return;
      }

      final quem = await repositorio.quemSouEu(guardado);

      token = guardado;
      usuario = quem;

      notifyListeners();
    } on RecusaDaApi {
      // Token expirado ou inválido.
      token = null;
      usuario = null;

      try {
        await tokens.apagar();
      } catch (_) {
        // Falha no armazenamento local.
      }

      notifyListeners();
    } catch (e) {
      // Se a API estiver indisponível, o token permanece salvo.
      // A sessão poderá ser restaurada na próxima inicialização.
    }
  }

  // Encerra a sessão e remove o token armazenado.
  Future<void> sair() async {
    token = null;
    usuario = null;

    notifyListeners();

    await tokens.apagar();
  }
}