import 'package:flutter/material.dart';

import '../models/usuario.dart';
import '../routes.dart';
import '../services/sessao_service.dart';

// Tela inicial do sistema.
// Consulta o usuário autenticado através do serviço de sessão.
class InicioScreen extends StatefulWidget {
  const InicioScreen({
    super.key,
    required this.sessao,
  });

  final SessaoService sessao;

  @override
  State<InicioScreen> createState() => _InicioScreenState();
}

class _InicioScreenState extends State<InicioScreen> {
  Usuario? usuario;
  bool carregando = true;

  @override
  void initState() {
    super.initState();
    carregar();
  }

  Future<void> carregar() async {
    final quem = await widget.sessao.usuarioLogado();

    if (!mounted) return;

    setState(() {
      usuario = quem;
      carregando = false;
    });
  }

  void sair() {
    widget.sessao.sair();

    Navigator.pushNamedAndRemoveUntil(
      context,
      AppRoutes.login,
      (rota) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Produtos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sair',
            onPressed: sair,
          ),
        ],
      ),
      body: carregando
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : usuario == null
              ? const Center(
                  child: Text(
                    'Não foi possível carregar os dados do usuário.',
                  ),
                )
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.inventory_2_outlined,
                        size: 48,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Olá, ${usuario!.nome}!',
                        style: Theme.of(context)
                            .textTheme
                            .headlineMedium
                            ?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(usuario!.email),
                      const SizedBox(height: 32),
                      Text(
                        'Gerenciamento de produtos',
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Aqui ficará o catálogo de produtos, '
                        'com opções para consultar, cadastrar, '
                        'editar e excluir registros.',
                      ),
                      const Spacer(),
                      const Center(
                        child: Text(
                          'Sessão autenticada.',
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}