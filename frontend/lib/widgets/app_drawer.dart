import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../routes.dart';
import '../services/sessao_service.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final sessao = context.watch<SessaoService>();
    final usuario = sessao.usuario;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary,
            ),
            accountName: Text(
              usuario?.nome ?? 'Usuário',
            ),
            accountEmail: Text(
              usuario?.email ?? '',
            ),
            currentAccountPicture: const CircleAvatar(
              child: Icon(Icons.person, size: 36),
            ),
          ),

          ListTile(
            leading: const Icon(Icons.home_outlined),
            title: const Text('Início'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(
                context,
                AppRoutes.inicio,
              );
            },
          ),

          ListTile(
            leading: const Icon(Icons.inventory_2_outlined),
            title: const Text('Produtos'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(
                context,
                AppRoutes.produtos,
              );
            },
          ),

          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Perfil'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushReplacementNamed(
                context,
                AppRoutes.perfil,
              );
            },
          ),

          const Divider(),

          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sair'),
            onTap: () {
              context.read<SessaoService>().sair();

              Navigator.pushNamedAndRemoveUntil(
                context,
                AppRoutes.login,
                (rota) => false,
              );
            },
          ),
        ],
      ),
    );
  }
}