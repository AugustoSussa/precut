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
import 'package:frontend/screens/perfil_screen.dart';
import 'package:frontend/screens/produtos_screen.dart';
import 'package:frontend/services/sessao_service.dart';

int pedidos = 0;

SessaoService sessaoDeMentira() {
  final cliente = MockClient((pedido) async {
    pedidos++;

    if (pedido.url.path == '/usuarios/login') {
      if (pedido.bodyFields['password'] == 'segredo123') {
        return http.Response(
          jsonEncode({
            'access_token': 'token-da-ana',
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
        pedido.headers['Authorization'] == 'Bearer token-da-ana') {
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

Widget appDeMentira(SessaoService sessao) {
  return ChangeNotifierProvider<SessaoService>.value(
    value: sessao,
    child: const ProdutosApp(),
  );
}

Future<void> preencherEEntrar(
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

Future<void> abrirOMenu(WidgetTester tester) async {
  await tester.tap(find.byIcon(Icons.menu));
  await tester.pumpAndSettle();
}

void main() {
  setUp(() {
    pedidos = 0;
  });

  testWidgets(
    'a tela de login tem e-mail, senha e o botão Entrar',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));

      expect(find.byType(TextField), findsNWidgets(2));
      expect(
        find.widgetWithText(ElevatedButton, 'Entrar'),
        findsOneWidget,
      );
      expect(find.text('Criar uma conta'), findsOneWidget);
    },
  );

  testWidgets(
    'a tela de cadastro tem nome, e-mail e senha',
    (tester) async {
      await tester.pumpWidget(
        ChangeNotifierProvider<SessaoService>(
          create: (_) => sessaoDeMentira(),
          child: const MaterialApp(
            home: CadastroScreen(),
          ),
        ),
      );

      expect(find.byType(TextField), findsNWidgets(3));
      expect(
        find.widgetWithText(ElevatedButton, 'Cadastrar'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'com a senha certa, abre a tela inicial',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));

      await preencherEEntrar(tester, 'segredo123');

      expect(find.byType(InicioScreen), findsOneWidget);
      expect(find.text('Olá, Ana!'), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
    },
  );

  testWidgets(
    'com a senha errada, continua no login e mostra o erro',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));

      await preencherEEntrar(tester, 'senha-errada');

      expect(
        find.text('E-mail ou senha incorretos'),
        findsOneWidget,
      );
      expect(find.byType(LoginScreen), findsOneWidget);
    },
  );

  testWidgets(
    'Criar uma conta abre a tela de cadastro',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));

      await tester.tap(find.text('Criar uma conta'));
      await tester.pumpAndSettle();

      expect(find.byType(CadastroScreen), findsOneWidget);
    },
  );

  testWidgets(
    'sem sessão, a rota protegida não exibe a tela inicial',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));

      Navigator.of(
        tester.element(find.byType(LoginScreen)),
      ).pushNamed(AppRoutes.inicio);

      await tester.pumpAndSettle();

      expect(find.byType(InicioScreen), findsNothing);
      expect(find.byType(LoginScreen), findsOneWidget);
    },
  );

  testWidgets(
    'o menu mostra o usuário e permite abrir o perfil',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));
      await preencherEEntrar(tester, 'segredo123');

      await abrirOMenu(tester);

      final menu = find.byType(Drawer);

      expect(
        find.descendant(of: menu, matching: find.text('Ana')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: menu,
          matching: find.text('ana@exemplo.com'),
        ),
        findsOneWidget,
      );

      await tester.tap(
        find.descendant(of: menu, matching: find.text('Perfil')),
      );
      await tester.pumpAndSettle();

      expect(find.byType(PerfilScreen), findsOneWidget);

      await abrirOMenu(tester);

      expect(
        find.descendant(
          of: find.byType(Drawer),
          matching: find.text('Ana'),
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'o menu abre a tela de produtos',
    (tester) async {
      await tester.pumpWidget(appDeMentira(sessaoDeMentira()));
      await preencherEEntrar(tester, 'segredo123');

      await abrirOMenu(tester);

      await tester.tap(
        find.descendant(
          of: find.byType(Drawer),
          matching: find.text('Produtos'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ProdutosScreen), findsOneWidget);
    },
  );

  testWidgets(
    'sair volta ao login e limpa a sessão',
    (tester) async {
      final sessao = sessaoDeMentira();

      await tester.pumpWidget(appDeMentira(sessao));
      await preencherEEntrar(tester, 'segredo123');

      await tester.tap(find.text('Ver produtos'));
      await tester.pumpAndSettle();

      expect(find.byType(ProdutosScreen), findsOneWidget);

      await abrirOMenu(tester);
      await tester.tap(find.text('Sair'));
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(ProdutosScreen), findsNothing);
      expect(
        Navigator.of(
          tester.element(find.byType(LoginScreen)),
        ).canPop(),
        isFalse,
      );
      expect(sessao.logado, isFalse);
    },
  );

  testWidgets(
    'o Provider atualiza a tela quando a sessão muda',
    (tester) async {
      final sessao = sessaoDeMentira();

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

      await sessao.entrar('ana@exemplo.com', 'segredo123');
      await tester.pump();

      expect(find.text('Ana'), findsOneWidget);
    },
  );

  test(
    'o service recusa campos vazios sem chamar a API',
    () async {
      final sessao = sessaoDeMentira();

      await expectLater(
        sessao.entrar('', ''),
        throwsA(isA<ErroDeLogin>()),
      );

      expect(pedidos, 0);
      expect(sessao.logado, isFalse);
    },
  );

  test(
    'entrar e sair alteram a sessão e notificam os ouvintes',
    () async {
      final sessao = sessaoDeMentira();
      var avisos = 0;

      sessao.addListener(() => avisos++);

      await sessao.entrar('ana@exemplo.com', 'segredo123');

      expect(sessao.token, 'token-da-ana');
      expect(sessao.usuario?.nome, 'Ana');
      expect(avisos, 1);

      sessao.sair();

      expect(sessao.logado, isFalse);
      expect(sessao.usuario, isNull);
      expect(avisos, 2);
    },
  );
}