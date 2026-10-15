
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
import 'package:frontend/services/sessao_service.dart';

int pedidos = 0;

// Simula a API FastAPI sem precisar iniciar o backend.
SessaoService sessaoDeMentira() {
  final contas = <String, Map<String, String>>{
    'ana@exemplo.com': {
      'nome': 'Ana',
      'senha': 'segredo123',
    },
  };

  final cliente = MockClient((pedido) async {
    pedidos++;

    // Cadastro
    if (pedido.url.path == '/usuarios/' &&
        pedido.method == 'POST') {
      final dados = jsonDecode(pedido.body);

      if (contas.containsKey(dados['email'])) {
        return http.Response(
          jsonEncode({
            'detail': 'Já existe uma conta com este e-mail',
          }),
          409,
        );
      }

      if ((dados['senha'] as String).length < 6) {
        return http.Response(
          jsonEncode({
            'detail': [
              {
                'loc': ['body', 'senha'],
                'msg': 'String should have at least 6 characters',
              },
            ],
          }),
          422,
        );
      }

      contas[dados['email']] = {
        'nome': dados['nome'],
        'senha': dados['senha'],
      };

      return http.Response(
        jsonEncode({
          'id': 2,
          'nome': dados['nome'],
          'email': dados['email'],
        }),
        201,
      );
    }

    // Login OAuth2: username e password.
    if (pedido.url.path == '/usuarios/login' &&
        pedido.method == 'POST') {
      final email = pedido.bodyFields['username'];
      final senha = pedido.bodyFields['password'];

      if (contas[email]?['senha'] == senha) {
        return http.Response(
          jsonEncode({
            'access_token': 'token-de-$email',
            'token_type': 'bearer',
          }),
          200,
        );
      }

      return http.Response(
        jsonEncode({
          'detail': 'E-mail ou senha incorretos',
        }),
        401,
      );
    }

    // Usuário autenticado.
    if (pedido.url.path == '/usuarios/eu' &&
        pedido.method == 'GET') {
      final email =
          (pedido.headers['Authorization'] ?? '')
              .replaceFirst('Bearer token-de-', '');

      if (contas.containsKey(email)) {
        return http.Response(
          jsonEncode({
            'id': 1,
            'nome': contas[email]!['nome'],
            'email': email,
          }),
          200,
        );
      }
    }

    return http.Response(
      jsonEncode({
        'detail': 'Token inválido ou vencido',
      }),
      401,
    );
  });

  return SessaoService(
    UsuarioRepository(cliente: cliente),
  );
}

// Inicia o aplicativo com a sessão simulada.
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

Future<void> preencherECadastrar(
  WidgetTester tester,
  String email,
  String senha,
) async {
  await tester.tap(find.text('Criar uma conta'));
  await tester.pumpAndSettle();

  await tester.enterText(
    find.byType(TextField).at(0),
    'Bia',
  );

  await tester.enterText(
    find.byType(TextField).at(1),
    email,
  );

  await tester.enterText(
    find.byType(TextField).at(2),
    senha,
  );

  await tester.tap(
    find.widgetWithText(ElevatedButton, 'Cadastrar'),
  );

  await tester.pumpAndSettle();
}

Matcher recusadoCom(String frase) {
  return throwsA(
    isA<ErroDeCadastro>().having(
      (e) => e.mensagem,
      'mensagem',
      frase,
    ),
  );
}

void main() {
  testWidgets(
    'a tela de login tem e-mail, senha e botão Entrar',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      expect(find.byType(TextField), findsNWidgets(2));

      expect(
        find.widgetWithText(ElevatedButton, 'Entrar'),
        findsOneWidget,
      );

      expect(
        find.text('Criar uma conta'),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'a tela de cadastro tem nome, e-mail e senha',
    (tester) async {
      final sessao = sessaoDeMentira();

      await tester.pumpWidget(
        ChangeNotifierProvider<SessaoService>.value(
          value: sessao,
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
    'com a senha certa abre a tela inicial',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await preencherEEntrar(tester, 'segredo123');

      expect(find.byType(InicioScreen), findsOneWidget);
      expect(find.text('Olá, Ana!'), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
    },
  );

  testWidgets(
    'com a senha errada mostra o erro',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await preencherEEntrar(tester, 'senha-errada');

      expect(
        find.text('E-mail ou senha incorretos'),
        findsOneWidget,
      );

      expect(find.byType(LoginScreen), findsOneWidget);
    },
  );

  testWidgets(
    'o link Criar uma conta abre o cadastro',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await tester.tap(find.text('Criar uma conta'));
      await tester.pumpAndSettle();

      expect(
        find.byType(CadastroScreen),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'cadastrar cria a conta e abre a tela inicial',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await preencherECadastrar(
        tester,
        'bia@exemplo.com',
        'segredo456',
      );

      expect(find.byType(InicioScreen), findsOneWidget);
      expect(find.text('Olá, Bia!'), findsOneWidget);
      expect(find.byType(CadastroScreen), findsNothing);
    },
  );

  testWidgets(
    'e-mail repetido mostra o erro no cadastro',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await preencherECadastrar(
        tester,
        'ana@exemplo.com',
        'segredo456',
      );

      expect(
        find.text('Já existe uma conta com este e-mail'),
        findsOneWidget,
      );

      expect(find.byType(CadastroScreen), findsOneWidget);
      expect(find.byType(InicioScreen), findsNothing);
    },
  );

  testWidgets(
    'Já tenho conta volta ao login',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await tester.tap(find.text('Criar uma conta'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Já tenho conta'));
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsOneWidget);
      expect(find.byType(CadastroScreen), findsNothing);
    },
  );

  testWidgets(
    'rota protegida impede acesso sem login',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      Navigator.of(
        tester.element(find.byType(LoginScreen)),
      ).pushNamed(AppRoutes.inicio);

      await tester.pumpAndSettle();

      expect(find.byType(InicioScreen), findsNothing);
      expect(find.byType(LoginScreen), findsOneWidget);
    },
  );

  testWidgets(
    'o menu mostra os dados do usuário',
    (tester) async {
      await tester.pumpWidget(
        appDeMentira(sessaoDeMentira()),
      );

      await preencherEEntrar(tester, 'segredo123');
      await abrirOMenu(tester);

      final menu = find.byType(Drawer);

      expect(
        find.descendant(
          of: menu,
          matching: find.text('Ana'),
        ),
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
        find.descendant(
          of: menu,
          matching: find.text('Perfil'),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(PerfilScreen), findsOneWidget);
    },
  );

  testWidgets(
    'sair volta ao login e apaga a sessão',
    (tester) async {
      final sessao = sessaoDeMentira();

      await tester.pumpWidget(
        appDeMentira(sessao),
      );

      await preencherEEntrar(tester, 'segredo123');

      await abrirOMenu(tester);

      await tester.tap(find.text('Sair'));
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsOneWidget);

      expect(
        Navigator.of(
          tester.element(find.byType(LoginScreen)),
        ).canPop(),
        isFalse,
      );

      expect(sessao.logado, isFalse);
      expect(sessao.token, isNull);
      expect(sessao.usuario, isNull);
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

                return Text(nome ?? 'ninguém');
              },
            ),
          ),
        ),
      );

      expect(find.text('ninguém'), findsOneWidget);

      await sessao.entrar(
        'ana@exemplo.com',
        'segredo123',
      );

      await tester.pump();

      expect(find.text('Ana'), findsOneWidget);
    },
  );

  test(
    'o service recusa campos vazios sem chamar a API',
    () async {
      final sessao = sessaoDeMentira();

      pedidos = 0;

      await expectLater(
        sessao.entrar('', ''),
        throwsA(isA<ErroDeLogin>()),
      );

      await expectLater(
        sessao.cadastrar('', '', ''),
        recusadoCom(
          'Preencha o nome, o e-mail e a senha',
        ),
      );

      expect(pedidos, 0);
      expect(sessao.logado, isFalse);
    },
  );

  test(
    'entrar muda a sessão e notifica os ouvintes',
    () async {
      final sessao = sessaoDeMentira();
      var avisos = 0;

      sessao.addListener(() => avisos++);

      await sessao.entrar(
        'ana@exemplo.com',
        'segredo123',
      );

      expect(
        sessao.token,
        'token-de-ana@exemplo.com',
      );

      expect(sessao.usuario?.nome, 'Ana');
      expect(sessao.logado, isTrue);
      expect(avisos, 1);
    },
  );

  test(
    'cadastrar cria a conta e já faz login',
    () async {
      final sessao = sessaoDeMentira();

      await sessao.cadastrar(
        'Bia',
        'bia@exemplo.com',
        'segredo456',
      );

      expect(sessao.logado, isTrue);
      expect(sessao.usuario?.nome, 'Bia');

      expect(
        sessao.token,
        'token-de-bia@exemplo.com',
      );
    },
  );

  test(
    'o service trata e-mail repetido e senha inválida',
    () async {
      final sessao = sessaoDeMentira();

      await expectLater(
        sessao.cadastrar(
          'Ana',
          'ana@exemplo.com',
          'segredo123',
        ),
        recusadoCom(
          'Já existe uma conta com este e-mail',
        ),
      );

      await expectLater(
        sessao.cadastrar(
          'Bia',
          'bia@exemplo.com',
          '123',
        ),
        recusadoCom(
          'senha: String should have at least 6 characters',
        ),
      );

      expect(sessao.logado, isFalse);
    },
  );
}