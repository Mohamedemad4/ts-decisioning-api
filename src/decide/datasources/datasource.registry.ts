import { Injectable } from '@nestjs/common';
import { BuiltinDataSource } from './datasource.types';
import { visitorSegmentsSource } from './visitor-segments.source';
import { geoEnrichmentSource } from './geo-enrichment.source';

@Injectable()
export class DataSourceRegistry {
  private sources = new Map<string, BuiltinDataSource>();

  constructor() {
    this.register(visitorSegmentsSource);
    this.register(geoEnrichmentSource);
  }

  register(source: BuiltinDataSource) {
    this.sources.set(source.id, source);
  }

  get(id: string): BuiltinDataSource | undefined {
    return this.sources.get(id);
  }

  getAll(): BuiltinDataSource[] {
    return Array.from(this.sources.values());
  }
}
