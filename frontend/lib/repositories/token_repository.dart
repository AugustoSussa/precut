
import 'package:shared_preferences/shared_preferences.dart';

class TokenRepository {
  static const String _chave = 'token';

  // Recupera o token salvo no dispositivo.
  Future<String?> ler() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_chave);
  }

  // Salva o token após o login.
  Future<void> salvar(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_chave, token);
  }

  // Remove o token quando o usuário sai.
  Future<void> apagar() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chave);
  }
}