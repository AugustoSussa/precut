# V6 — resumo para entrega do TCC

Implementado: MP3, importação/exportação SRT, relatório TXT, temas por IA, edição aprovada pelo usuário e aceite no cadastro. Os endpoints de arquivo e edição exigem JWT e conferem o dono do projeto. Novas colunas SQLite são adicionadas automaticamente.

**Teste rápido:** 1) criar conta aceitando o aviso; 2) criar projeto; 3) carregar MP4/MP3 ou importar SRT; 4) analisar; 5) baixar SRT e TXT; 6) editar headline, salvar e recarregar; 7) pedir alternativa ao chat e aprovar após conferência; 8) testar acesso não autorizado com outro usuário. Anotar resultados/tempos para a monografia.

**Validação realizada neste ambiente:** 12 testes unitários; endpoints HTTP simulados de cadastro, login, importação SRT, análise com IA substituta (sem chamada real), exportação e edição. Frontend verificado sintaticamente; build completo do Next.js e Whisper MP3 real NÃO executados. A implementação não é garantia de RNFs de desempenho e disponibilidade.
