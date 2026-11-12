"""Testes HTTP reais do Precut com TestClient, sem rede externa nem banco de produção."""


def entrar(cliente, email="ana@ifg.edu.br"):
    cadastro = cliente.post("/usuarios/", json={
        "nome": "Pessoa de Teste", "email": email,
        "senha": "segredo123", "aceite_privacidade": True,
    })
    assert cadastro.status_code == 201, cadastro.text
    resposta = cliente.post("/usuarios/login", data={
        "username": email, "password": "segredo123",
    })
    assert resposta.status_code == 200, resposta.text
    return {"Authorization": "Bearer " + resposta.json()["access_token"]}


def test_criar_projeto_devolve_201_e_titulo(cliente):
    ana = entrar(cliente)
    resposta = cliente.post("/projetos/", json={"titulo": "Vídeo de teste"}, headers=ana)
    assert resposta.status_code == 201
    assert resposta.json()["titulo"] == "Vídeo de teste"


def test_sem_token_a_api_recusa(cliente):
    assert cliente.get("/projetos/").status_code == 401


def test_bruno_nao_ve_projetos_da_ana(cliente):
    ana = entrar(cliente, "ana@ifg.edu.br")
    bruno = entrar(cliente, "bruno@ifg.edu.br")
    cliente.post("/projetos/", json={"titulo": "Projeto reservado"}, headers=ana)
    assert len(cliente.get("/projetos/", headers=ana).json()) == 1
    assert cliente.get("/projetos/", headers=bruno).json() == []


def test_consultar_projeto_proprio(cliente):
    ana = entrar(cliente)
    criado = cliente.post("/projetos/", json={"titulo": "Meu vídeo"}, headers=ana).json()
    resposta = cliente.get(f"/projetos/{criado['id']}", headers=ana)
    assert resposta.status_code == 200
    assert resposta.json()["titulo"] == "Meu vídeo"


def test_excluir_projeto_remove_da_lista(cliente):
    ana = entrar(cliente)
    criado = cliente.post("/projetos/", json={"titulo": "Apagar"}, headers=ana).json()
    resposta = cliente.delete(f"/projetos/{criado['id']}", headers=ana)
    assert resposta.status_code == 204
    assert cliente.get("/projetos/", headers=ana).json() == []


def test_projeto_inexistente_devolve_404(cliente):
    ana = entrar(cliente)
    assert cliente.get("/projetos/999999", headers=ana).status_code == 404


def test_email_duplicado_devolve_409(cliente):
    entrar(cliente)
    resposta = cliente.post("/usuarios/", json={
        "nome": "Outra Pessoa", "email": "ana@ifg.edu.br",
        "senha": "outrasenha123", "aceite_privacidade": True,
    })
    assert resposta.status_code == 409


def test_senha_incorreta_devolve_401(cliente):
    entrar(cliente)
    resposta = cliente.post("/usuarios/login", data={
        "username": "ana@ifg.edu.br", "password": "senha-errada",
    })
    assert resposta.status_code == 401


def test_sem_aceite_de_privacidade_recusa_cadastro(cliente):
    resposta = cliente.post("/usuarios/", json={
        "nome": "Sem Aceite", "email": "sem@ifg.edu.br",
        "senha": "segredo123", "aceite_privacidade": False,
    })
    assert resposta.status_code == 422


def test_bruno_nao_consulta_projeto_da_ana(cliente):
    ana = entrar(cliente, "ana@ifg.edu.br")
    bruno = entrar(cliente, "bruno@ifg.edu.br")
    criado = cliente.post("/projetos/", json={"titulo": "Privado"}, headers=ana).json()
    assert cliente.get(f"/projetos/{criado['id']}", headers=bruno).status_code == 403


def test_bruno_nao_exclui_projeto_da_ana(cliente):
    ana = entrar(cliente, "ana@ifg.edu.br")
    bruno = entrar(cliente, "bruno@ifg.edu.br")
    criado = cliente.post("/projetos/", json={"titulo": "Privado"}, headers=ana).json()
    assert cliente.delete(f"/projetos/{criado['id']}", headers=bruno).status_code == 403
    assert cliente.get(f"/projetos/{criado['id']}", headers=ana).status_code == 200
