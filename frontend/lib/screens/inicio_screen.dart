import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../routes.dart';
import '../services/sessao_service.dart';
import '../widgets/app_drawer.dart';

class InicioScreen extends StatelessWidget {
  const InicioScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final usuario = context.watch<SessaoService>().usuario;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Início'),
      ),
      drawer: const AppDrawer(),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.waving_hand_outlined,
                size: 56,
              ),
              const SizedBox(height: 16),
              Text(
                'Olá, ${usuario?.nome ?? 'Usuário'}!',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                usuario?.email ?? '',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      AppRoutes.produtos,
                    );
                  },
                  icon: const Icon(Icons.inventory_2_outlined),
                  label: const Text('Ver produtos'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}