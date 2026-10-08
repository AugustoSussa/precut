import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../routes.dart';
import '../services/sessao_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController email = TextEditingController();
  final TextEditingController senha = TextEditingController();

  bool carregando = false;
  String? erro;

  Future<void> entrar() async {
    if (carregando) return;

    setState(() {
      carregando = true;
      erro = null;
    });

    try {
      await context.read<SessaoService>().entrar(
            email.text.trim(),
            senha.text,
          );

      if (!mounted) return;

      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.inicio,
        (rota) => false,
      );
    } on ErroDeLogin catch (e) {
      if (!mounted) return;

      setState(() {
        erro = e.mensagem;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        erro = 'Ocorreu um erro inesperado ao entrar.';
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
            constraints: const BoxConstraints(maxWidth: 400),
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
                    style: const TextStyle(color: Colors.red),
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: carregando ? null : entrar,
                  child: Text(
                    carregando ? 'Entrando...' : 'Entrar',
                  ),
                ),
                const SizedBox(height: 8),
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