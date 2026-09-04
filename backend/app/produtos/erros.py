class ErroDeProduto(Exception):
    """Qualquer recusa relacionada ao produto."""


class ProdutoNaoEncontrado(ErroDeProduto):
    """Pediram um produto que nao esta no catalogo."""


class NomeJaCadastrado(ErroDeProduto):
    """Ja existe um produto com esse nome no catalogo."""


class CampoNaoEditavel(ErroDeProduto):
    """Tentaram editar pelo catalogo um campo que nao deve ser alterado."""