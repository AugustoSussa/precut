import 'package:flutter/material.dart';

import '../routes.dart';
import '../services/sessao_service.dart';

// A tela recebe as ações do usuário e delega a autenticação
// ao SessaoService.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.sessao,
  });

  final SessaoService sessao;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController();
  final senha = TextEditingController();

  bool carregando = false;
  String? erro;

  Future<void> entrar() async {
    if (email.text.trim().isEmpty || senha.text.isEmpty) {
      setState(() {
        erro = 'Informe o e-mail e a senha.';
      });
      return;
    }

    setState(() {
      carregando = true;
      erro = null;
    });

    try {
      await widget.sessao.entrar(
        email.text.trim(),
        senha.text,
      );

      if (!mounted) return;

      Navigator.pushReplacementNamed(
        context,
        AppRoutes.inicio,
      );
    } on ErroDeLogin catch (e) {
      if (!mounted) return;

      setState(() {
        erro = e.mensagem;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        erro = 'Não foi possível entrar. Tente novamente.';
      });
    } finally {
      if (mounted) {
        setState(() {
          carregando = false;
        });
      }
    }
  }

  @override
  void dispose() {
    email.dispose();
    senha.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Produtos'),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(
              maxWidth: 400,
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.inventory_2_outlined,
                  size: 72,
                ),
                const SizedBox(height: 8),
                const Text(
                  'Entrar',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Acesse sua conta para gerenciar seus produtos.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: email,
                  enabled: !carregando,
                  decoration: const InputDecoration(
                    labelText: 'E-mail',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: senha,
                  enabled: !carregando,
                  decoration: const InputDecoration(
                    labelText: 'Senha',
                    border: OutlineInputBorder(),
                  ),
                  obscureText: true,
                  onSubmitted: (_) {
                    if (!carregando) entrar();
                  },
                ),
                if (erro != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    erro!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.red,
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: carregando ? null : entrar,
                  child: carregando
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Entrar'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    // Recuperação de senha ainda não implementada.
                  },
                  child: const Text('Esqueci a senha'),
                ),
                TextButton(
                  onPressed: carregando
                      ? null
                      : () {
                          Navigator.pushNamed(
                            context,
                            AppRoutes.cadastro,
                          );
                        },
                  child: const Text('Criar uma conta'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}