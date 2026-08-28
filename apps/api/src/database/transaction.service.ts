import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute operations inside a single database transaction.
   * Leverages TypeORM transaction execution.
   */
  async run<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
    isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
  ): Promise<T> {
    if (isolationLevel) {
      return this.dataSource.transaction(isolationLevel, operation);
    }
    return this.dataSource.transaction(operation);
  }
}
