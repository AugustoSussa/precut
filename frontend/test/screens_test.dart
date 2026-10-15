
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:frontend/main.dart';
import 'package:frontend/repositories/usuario_repository.dart';
import 'package:frontend/routes.dart';
import 'package:frontend/screens/cadastro_screen.dart';
import 'package:frontend/screens/inicio_screen.dart';
import 'package:frontend/screens/login_screen.dart';
import 'package:frontend/screens/perfil_screen.dart';
import 'package:frontend/services/sessao_service.dart';

int pedidos = 0;

// Simula a API FastAPI e o armazenamento local do dispositivo.
SessaoService sessaoDeMentira({
  Map<String, Object> guardado = const {},
}) {
  SharedPreferences.setMockInitialValues(guardado);

  final contas = <String, Map<String, String>>{
    'ana@exemplo.com': {
      'nome': 'Ana',
      'senha': 'segredo123',
    },
  };

  final cliente = MockClient((pedido) async {
    pedidos++;

    // Cadastro de usuário.
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

    // Login OAuth2.
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

    // Recupera o usuário autenticado.
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

// Inicia o aplicativo com uma sessão simulada.
Widget appDeMentira(SessaoService sessao) {
  return ChangeNotifierProvider<SessaoService>.value(
    value: sessao,
    child: const ProdutosApp(),
  );
}

// Preenche os campos de login.
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

// Abre o menu lateral.
Future<void> abrirOMenu(WidgetTester tester) async {
  await tester.tap(find.byIcon(Icons.menu));
  await tester.pumpAndSettle();
}

// Preenche o formulário de cadastro.
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

// Consulta o token salvo no SharedPreferences.
Future<String?> tokenGuardado() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('token');
}

// Confere a mensagem de erro do cadastro.
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
    'a tela de login possui e-mail, senha e botão Entrar',
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
    'a tela de cadastro possui nome, e-mail e senha',
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
    'login correto abre a tela inicial',
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
    'login incorreto apresenta mensagem de erro',
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

      expect(find.byType(CadastroScreen), findsOneWidget);
    },
  );

  testWidgets(
    'cadastro correto cria usuário e abre o início',
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
    'cadastro com e-mail repetido mostra erro',
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
    'Já tenho conta retorna ao login',
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
    'rota protegida impede acesso sem autenticação',
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
    'menu lateral mostra os dados do usuário',
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
    'logout limpa a sessão, o token e a navegação',
    (tester) async {
      final sessao = sessaoDeMentira();

      await tester.pumpWidget(appDeMentira(sessao));
      await preencherEEntrar(tester, 'segredo123');

      expect(
        await tokenGuardado(),
        'token-de-ana@exemplo.com',
      );

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
      expect(await tokenGuardado(), isNull);
    },
  );

  testWidgets(
    'sessão restaurada abre diretamente a tela inicial',
    (tester) async {
      final sessao = sessaoDeMentira(
        guardado: {
          'token': 'token-de-ana@exemplo.com',
        },
      );

      await sessao.restaurar();

      await tester.pumpWidget(appDeMentira(sessao));

      expect(find.byType(InicioScreen), findsOneWidget);
      expect(find.text('Olá, Ana!'), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
    },
  );

  testWidgets(
    'Provider atualiza a tela quando a sessão muda',
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
    'campos vazios são recusados sem chamar a API',
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
    'entrar e sair atualizam a sessão e notificam ouvintes',
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
      expect(avisos, 1);

      await sessao.sair();

      expect(sessao.logado, isFalse);
      expect(sessao.usuario, isNull);
      expect(avisos, 2);
    },
  );

  test(
    'cadastro cria a conta e autentica automaticamente',
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
    'service trata erros HTTP 409 e 422',
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
      expect(await tokenGuardado(), isNull);
    },
  );

  test(
    'login salva o token no dispositivo',
    () async {
      final sessao = sessaoDeMentira();

      await sessao.entrar(
        'ana@exemplo.com',
        'segredo123',
      );

      expect(
        await tokenGuardado(),
        'token-de-ana@exemplo.com',
      );
    },
  );

  test(
    'restaurar recupera a sessão salva',
    () async {
      final sessao = sessaoDeMentira(
        guardado: {
          'token': 'token-de-ana@exemplo.com',
        },
      );

      pedidos = 0;

      await sessao.restaurar();

      expect(sessao.logado, isTrue);
      expect(sessao.usuario?.nome, 'Ana');
      expect(pedidos, 1);
    },
  );

  test(
    'restaurar sem token não chama a API',
    () async {
      final sessao = sessaoDeMentira();
      pedidos = 0;

      await sessao.restaurar();

      expect(sessao.logado, isFalse);
      expect(pedidos, 0);
    },
  );

  test(
    'restaurar remove token expirado',
    () async {
      final sessao = sessaoDeMentira(
        guardado: {
          'token': 'token-vencido',
        },
      );

      await sessao.restaurar();

      expect(sessao.logado, isFalse);
      expect(await tokenGuardado(), isNull);
    },
  );

  test(
    'logout remove o token salvo',
    () async {
      final sessao = sessaoDeMentira(
        guardado: {
          'token': 'token-de-ana@exemplo.com',
        },
      );

      await sessao.restaurar();

      expect(sessao.logado, isTrue);

      await sessao.sair();

      expect(sessao.logado, isFalse);
      expect(await tokenGuardado(), isNull);
    },
  );
}