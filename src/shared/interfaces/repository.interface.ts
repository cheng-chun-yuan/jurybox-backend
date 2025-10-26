/**
 * Repository Base Interface
 * Common methods for all repositories
 */

export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>
  findAll(filters?: Record<string, any>): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: ID, data: Partial<T>): Promise<T>
  delete(id: ID): Promise<void>
}

export interface IPaginatedRepository<T, ID = string> extends IRepository<T, ID> {
  findPaginated(
    page: number,
    limit: number,
    filters?: Record<string, any>
  ): Promise<{
    data: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }>
}
