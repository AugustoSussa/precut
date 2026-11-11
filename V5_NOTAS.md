# Précut V5 — Análise organizada e Research Instagram

## O que mudou
- Análise IA organizada em Visão geral, Cortes / Reels, Próximos vídeos e Research.
- Novas análises geram headline, hook, Big Idea e descrição individuais para cada corte sugerido. Os cortes são ancorados aos timestamps existentes.
- Research pesquisa apenas posts/reels Instagram com URLs diretas citadas pela pesquisa web. URLs de anúncios, guias e páginas genéricas são ignoradas.
- Quando não existem links diretos válidos, mostra uma explicação em vez de preencher o acervo com links irrelevantes.
- Ideias de vídeos futuros aparecem apenas na seção Próximos vídeos.

## Limitações importantes
- Web search não oferece um ranking confiável dos vídeos mais virais do Instagram. Os cards representam relevância temática e não viralização comprovada.
- Thumbnails e métricas do Instagram não estão integradas; podem exigir uma fonte autorizada ou permissões da Meta.
- Reprocesse os vídeos anteriormente analisados para gerar metadados específicos dos cortes; a operação pode consumir créditos da API. O processamento substitui a análise anterior e limpa o histórico do chat desse projeto. Faça backup se precisar conservar esses dados.
- Não houve teste ponta a ponta com chave OpenAI nem build Next.js neste ambiente (dependências npm não disponíveis offline).

## Atualização
1. Faça backup do projeto anterior incluindo `backend/.env`, `backend/precut.db` e `backend/uploads`.
2. Substitua backend e frontend pelos desta V5.
3. Restaure apenas arquivos de configuração/dados pessoais, não substitua o código V5 por arquivos antigos.
4. Execute backend e frontend normalmente. `OPENAI_SEARCH_MODEL=gpt-4o` é configurável em `backend/.env`.
5. Para testar a pesquisa, clique em Research > Buscar com IA. Pesquisa web tem cobrança por uso.

## Testes
`cd backend && python -m unittest discover -s tests -v`
