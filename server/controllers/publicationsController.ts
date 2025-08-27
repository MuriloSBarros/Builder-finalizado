import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class PublicationsController {
  async getPublications(req: AuthenticatedRequest, res: Response) {
    try {
      const { search, status } = req.query;

      let options: any = {
        eq: { user_id: req.user.userId }, // USER isolation
        order: { column: 'data_publicacao', ascending: false }
      };

      // Apply status filter
      if (status && status !== 'all') {
        options.eq.status = status;
      }

      const { rows: publications } = await db.query('publications', options);

      // Filter by search term (client-side for now)
      let filteredPublications = publications;
      if (search) {
        const searchTerm = search.toString().toLowerCase();
        filteredPublications = publications.filter((pub: any) =>
          pub.processo.toLowerCase().includes(searchTerm) ||
          pub.nome_pesquisado.toLowerCase().includes(searchTerm) ||
          pub.vara_comarca.toLowerCase().includes(searchTerm)
        );
      }

      res.json(filteredPublications);
    } catch (error) {
      console.error('Get publications error:', error);
      res.status(500).json({ error: 'Erro ao buscar publicações' });
    }
  }

  async getPublicationById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const { rows: publications } = await db.query('publications', {
        eq: { id, user_id: req.user.userId }
      });

      if (publications.length === 0) {
        return res.status(404).json({ error: 'Publicação não encontrada' });
      }

      const publication = publications[0];

      // Auto-update status from 'nova' to 'pendente'
      if (publication.status === 'nova') {
        await db.update('publications', id, {
          status: 'pendente',
          updated_at: new Date().toISOString(),
        });
        publication.status = 'pendente';
      }

      res.json(publication);
    } catch (error) {
      console.error('Get publication by id error:', error);
      res.status(500).json({ error: 'Erro ao buscar publicação' });
    }
  }

  async updatePublicationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, responsavel } = req.body;

      const publication = await db.update('publications', id, {
        status,
        responsavel,
        updated_at: new Date().toISOString(),
      });

      res.json(publication);
    } catch (error) {
      console.error('Update publication status error:', error);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  }

  async loadPublications(req: AuthenticatedRequest, res: Response) {
    try {
      // Simulate loading publications from legal APIs
      const mockPublications = [
        {
          user_id: req.user.userId,
          tenant_id: req.tenantId,
          data_publicacao: new Date('2024-01-28'),
          processo: '1001234-56.2024.8.26.0100',
          diario: 'Diário de Justiça Eletrônico',
          vara_comarca: '1ª Vara Cível - São Paulo/SP',
          nome_pesquisado: 'João Silva Santos',
          status: 'nova',
          conteudo: 'Intimação para audiência de conciliação...',
          urgencia: 'alta',
        },
        {
          user_id: req.user.userId,
          tenant_id: req.tenantId,
          data_publicacao: new Date('2024-01-28'),
          processo: '2001234-56.2024.8.26.0200',
          diario: 'Diário Oficial do Estado',
          vara_comarca: '2ª Vara Criminal - Rio de Janeiro/RJ',
          nome_pesquisado: 'Maria Oliveira Costa',
          status: 'nova',
          conteudo: 'Sentença publicada nos autos...',
          urgencia: 'media',
        },
      ];

      const insertedPublications = [];
      for (const pub of mockPublications) {
        const publication = await db.insert('publications', pub);
        insertedPublications.push(publication);
      }

      res.json({
        message: `${insertedPublications.length} publicações carregadas com sucesso`,
        publications: insertedPublications,
      });
    } catch (error) {
      console.error('Load publications error:', error);
      res.status(500).json({ error: 'Erro ao carregar publicações' });
    }
  }

  async searchProcesses(req: AuthenticatedRequest, res: Response) {
    try {
      const { oabNumber, oabState } = req.query;

      if (!oabNumber || !oabState) {
        return res.status(400).json({ error: 'Número da OAB e estado são obrigatórios' });
      }

      // Mock search results
      const mockResults = [
        {
          id: '1',
          numero: 'PROJ-2025-001',
          cliente: 'LUAN SANTOS MELO',
          vara: '1ª Vara Cível - São Paulo/SP',
          status: 'Em Andamento',
          ultimaMovimentacao: 'Análise documental em progresso',
          dataUltimaMovimentacao: new Date('2025-01-21'),
          advogado: `${oabNumber}/${oabState}`,
          tipo: 'Ação Trabalhista',
          valor: 'R$ 45.000,00',
        },
      ];

      res.json(mockResults);
    } catch (error) {
      console.error('Search processes error:', error);
      res.status(500).json({ error: 'Erro ao consultar processos' });
    }
  }
}

export const publicationsController = new PublicationsController();