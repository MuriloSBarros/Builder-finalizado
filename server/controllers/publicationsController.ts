import { Response } from 'express';
import { AuthenticatedRequest } from '../config/auth';

export class PublicationsController {
  async getPublications(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantDb = req.db;
      const { search, status } = req.query;

      let whereClause = 'WHERE user_id = $1'; // ISOLAMENTO POR USUÁRIO
      const params: any[] = [req.user.userId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereClause += ` AND (processo ILIKE $${paramCount} OR nome_pesquisado ILIKE $${paramCount} OR vara_comarca ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      if (status && status !== 'all') {
        paramCount++;
        whereClause += ` AND status = $${paramCount}`;
        params.push(status);
      }

      const result = await tenantDb.query(`
        SELECT * FROM \${schema}.publications 
        ${whereClause}
        ORDER BY data_publicacao DESC, created_at DESC
      `, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Get publications error:', error);
      res.status(500).json({ error: 'Erro ao buscar publicações' });
    }
  }

  async getPublicationById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        SELECT * FROM \${schema}.publications 
        WHERE id = $1 AND user_id = $2
      `, [id, req.user.userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Publicação não encontrada' });
      }

      const publication = result.rows[0];

      // Se status é 'nova', mudar automaticamente para 'pendente'
      if (publication.status === 'nova') {
        await tenantDb.query(`
          UPDATE \${schema}.publications 
          SET status = 'pendente', updated_at = NOW()
          WHERE id = $1
        `, [id]);
        
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
      const tenantDb = req.db;

      const result = await tenantDb.query(`
        UPDATE \${schema}.publications 
        SET status = $1, responsavel = $2, updated_at = NOW()
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `, [status, responsavel, id, req.user.userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Publicação não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update publication status error:', error);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  }

  async loadPublications(req: AuthenticatedRequest, res: Response) {
    try {
      // Simular carregamento de publicações de APIs jurídicas
      // Em produção, aqui seria integração com CNJ-DATAJUD, Codilo, JusBrasil
      
      const tenantDb = req.db;
      const mockPublications = [
        {
          data_publicacao: new Date('2024-01-28'),
          processo: '1001234-56.2024.8.26.0100',
          diario: 'Diário de Justiça Eletrônico',
          vara_comarca: '1ª Vara Cível - São Paulo/SP',
          nome_pesquisado: 'João Silva Santos',
          conteudo: 'Intimação para audiência de conciliação...',
          urgencia: 'alta',
        },
        {
          data_publicacao: new Date('2024-01-28'),
          processo: '2001234-56.2024.8.26.0200',
          diario: 'Diário Oficial do Estado',
          vara_comarca: '2ª Vara Criminal - Rio de Janeiro/RJ',
          nome_pesquisado: 'Maria Oliveira Costa',
          conteudo: 'Sentença publicada nos autos...',
          urgencia: 'media',
        },
      ];

      const insertedPublications = [];
      for (const pub of mockPublications) {
        const result = await tenantDb.query(`
          INSERT INTO \${schema}.publications (
            user_id, data_publicacao, processo, diario, vara_comarca, nome_pesquisado,
            status, conteudo, urgencia, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'nova', $7, $8, NOW(), NOW()
          ) RETURNING *
        `, [
          req.user.userId,
          pub.data_publicacao,
          pub.processo,
          pub.diario,
          pub.vara_comarca,
          pub.nome_pesquisado,
          pub.conteudo,
          pub.urgencia,
        ]);

        insertedPublications.push(result.rows[0]);
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

      // Simular consulta de processos
      // Em produção, aqui seria integração com APIs jurídicas
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
        {
          id: '2',
          numero: 'PROJ-2025-002',
          cliente: 'LUIZ ANSELMO',
          vara: '2ª Vara Trabalhista - São Paulo/SP',
          status: 'Aguardando Documentos',
          ultimaMovimentacao: 'Solicitação de documentos complementares',
          dataUltimaMovimentacao: new Date('2025-01-20'),
          advogado: `${oabNumber}/${oabState}`,
          tipo: 'Revisão Contratual',
          valor: 'R$ 28.500,00',
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