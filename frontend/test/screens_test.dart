import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';

import 'package:frontend/main.dart';
import 'package:frontend/repositories/usuario_repository.dart';
import 'package:frontend/routes.dart';
import 'package:frontend/screens/cadastro_screen.dart';
import 'package:frontend/screens/inicio_screen.dart';
import 'package:frontend/screens/login_screen.dart';
import 'package:frontend/services/sessao_service.dart';

int pedidos = 0;

/// Simula a API de autenticação sem precisar iniciar o servidor.
SessaoService criarSessaoDeTeste() {
  final cliente = MockClient((pedido) async {
    pedidos++;

    if (pedido.url.path == '/usuarios/login') {
      if (pedido.bodyFields['password'] == 'segredo123') {
        return http.Response(
          jsonEncode({
            'access_token': 'token-de-teste',
            'token_type': 'bearer',
          }),
          200,
        );
      }

      return http.Response(
        jsonEncode({'detail': 'E-mail ou senha incorretos'}),
        401,
      );
    }

    if (pedido.url.path == '/usuarios/eu' &&
        pedido.headers['Authorization'] == 'Bearer token-de-teste') {
      return http.Response(
        jsonEncode({
          'id': 1,
          'nome': 'Ana',
          'email': 'ana@exemplo.com',
        }),
        200,
      );
    }

    return http.Response(
      jsonEncode({'detail': 'Não autenticado'}),
      401,
    );
  });

  return SessaoService(
    UsuarioRepository(cliente: cliente),
  );
}

/// Cria o aplicativo com uma sessão de teste já existente.
Widget criarAppDeTeste(SessaoService sessao) {
  return ChangeNotifierProvider<SessaoService>.value(
    value: sessao,
    child: const ProdutosApp(),
  );
}

/// Preenche o formulário e tenta entrar.
Future<void> preencherFormularioDeLogin(
  WidgetTester tester,
  String senha,
) async {
  await tester.enterText(
    find.byType(TextField).at(0),
    'ana@exemplo.com',
  );

  await tester.enterText(
    find.byType(TextField).at(1),
    senha,
  );

  await tester.tap(
    find.widgetWithText(ElevatedButton, 'Entrar'),
  );

  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    pedidos = 0;
  });

  group('Tela de login', () {
    testWidgets(
      'exibe os campos de e-mail, senha e o botão Entrar',
      (tester) async {
        await tester.pumpWidget(
          criarAppDeTeste(criarSessaoDeTeste()),
        );

        expect(find.byType(TextField), findsNWidgets(2));
        expect(
          find.widgetWithText(ElevatedButton, 'Entrar'),
          findsOneWidget,
        );
        expect(find.text('Criar uma conta'), findsOneWidget);
      },
    );

    testWidgets(
      'login bem-sucedido abre a tela inicial',
      (tester) async {
        await tester.pumpWidget(
          criarAppDeTeste(criarSessaoDeTeste()),
        );

        await preencherFormularioDeLogin(tester, 'segredo123');

        expect(find.byType(InicioScreen), findsOneWidget);
        expect(find.text('Olá, Ana!'), findsOneWidget);
        expect(find.byType(LoginScreen), findsNothing);
      },
    );

    testWidgets(
      'senha incorreta mantém o usuário na tela de login',
      (tester) async {
        await tester.pumpWidget(
          criarAppDeTeste(criarSessaoDeTeste()),
        );

        await preencherFormularioDeLogin(tester, 'senha-errada');

        expect(
          find.text('E-mail ou senha incorretos'),
          findsOneWidget,
        );
        expect(find.byType(LoginScreen), findsOneWidget);
      },
    );

    testWidgets(
      'o botão Criar uma conta abre o cadastro',
      (tester) async {
        await tester.pumpWidget(
          criarAppDeTeste(criarSessaoDeTeste()),
        );

        await tester.tap(find.text('Criar uma conta'));
        await tester.pumpAndSettle();

        expect(find.byType(CadastroScreen), findsOneWidget);
      },
    );
  });

  group('Sessão do usuário', () {
    test(
      'campos vazios são rejeitados sem chamar a API',
      () async {
        final sessao = criarSessaoDeTeste();

        await expectLater(
          sessao.entrar('', ''),
          throwsA(isA<ErroDeLogin>()),
        );

        expect(pedidos, 0);
        expect(sessao.logado, isFalse);
      },
    );

    test(
      'entrar e sair atualizam a sessão e notificam os ouvintes',
      () async {
        final sessao = criarSessaoDeTeste();
        var notificacoes = 0;

        sessao.addListener(() {
          notificacoes++;
        });

        await sessao.entrar(
          'ana@exemplo.com',
          'segredo123',
        );

        expect(sessao.token, 'token-de-teste');
        expect(sessao.usuario?.nome, 'Ana');
        expect(sessao.logado, isTrue);
        expect(notificacoes, 1);

        sessao.sair();

        expect(sessao.logado, isFalse);
        expect(sessao.usuario, isNull);
        expect(notificacoes, 2);
      },
    );

    testWidgets(
      'Provider atualiza a interface quando a sessão muda',
      (tester) async {
        final sessao = criarSessaoDeTeste();

        await tester.pumpWidget(
          ChangeNotifierProvider<SessaoService>.value(
            value: sessao,
            child: MaterialApp(
              home: Builder(
                builder: (context) {
                  final nome =
                      context.watch<SessaoService>().usuario?.nome;

                  return Text(nome ?? 'Ninguém conectado');
                },
              ),
            ),
          ),
        );

        expect(find.text('Ninguém conectado'), findsOneWidget);

        await sessao.entrar(
          'ana@exemplo.com',
          'segredo123',
        );

        await tester.pump();

        expect(find.text('Ana'), findsOneWidget);
      },
    );
  });
}