"""
Diagnóstico de autenticação do Précut
Execute com: python debug_auth.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

print("=" * 50)
print("DIAGNÓSTICO PRÉCUT AUTH")
print("=" * 50)

# 1. Verifica banco
from pathlib import Path
db_path = Path("precut.db")
if db_path.exists():
    print(f"✅ Banco encontrado: {db_path} ({db_path.stat().st_size} bytes)")
else:
    print("❌ Banco NÃO encontrado — nenhum usuário cadastrado!")
    print("   → Cadastre uma conta nova pelo frontend")
    sys.exit(1)

# 2. Lista usuários
from app.database import SessionLocal
from app.usuarios.models import Usuario

db = SessionLocal()
usuarios = db.query(Usuario).all()
print(f"\n📋 Usuários no banco: {len(usuarios)}")
for u in usuarios:
    print(f"   ID={u.id}  email={u.email}  nome={u.nome}")

if not usuarios:
    print("   ❌ Nenhum usuário! Cadastre uma conta pelo frontend primeiro.")
    db.close()
    sys.exit(1)

# 3. Testa senha de um usuário
email_teste = input("\n Digite o e-mail para testar a senha: ").strip()
senha_teste = input(" Digite a senha: ").strip()

from app.seguranca import conferir_senha
u = db.query(Usuario).filter(Usuario.email == email_teste).first()
if not u:
    print(f"❌ Usuário '{email_teste}' não encontrado no banco")
else:
    ok = conferir_senha(senha_teste, u.senha_hash)
    if ok:
        print(f"✅ Senha correta! Login vai funcionar.")
        from app.seguranca import criar_token
        token = criar_token(u.id)
        print(f"   Token gerado: {token[:40]}...")
    else:
        print(f"❌ Senha INCORRETA para {email_teste}")

db.close()
