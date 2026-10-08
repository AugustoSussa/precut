import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/sessao_service.dart';
import '../widgets/app_drawer.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<SessaoService>().usuario;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meu perfil'),
      ),
      drawer: const AppDrawer(),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 48,
                backgroundColor:
                    Theme.of(context).colorScheme.primaryContainer,
                child: Icon(
                  Icons.person_outline,
                  size: 64,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                usuario?.nome ?? 'Usuário',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                usuario?.email ?? 'E-mail indisponível',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              const Divider(),
              const ListTile(
                leading: Icon(Icons.inventory_2_outlined),
                title: Text('Sistema de produtos'),
                subtitle: Text(
                  'Gerenciamento de produtos cadastrados',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}