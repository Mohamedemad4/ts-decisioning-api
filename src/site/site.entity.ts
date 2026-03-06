import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Embedded subdocument for data source definitions on a site.
 */
@Schema({ _id: false })
export class DataSourceDefinitionDoc {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true, enum: ['BUILTIN'] })
  type: string;

  @Prop({ required: true })
  builtinId: string;

  @Prop({ type: Object, default: {} })
  params: Record<string, string>;

  @Prop({ required: true })
  requiresMarketingConsent: boolean;

  @Prop({ default: false })
  cache: boolean;
}

export const DataSourceDefinitionSchema = SchemaFactory.createForClass(DataSourceDefinitionDoc);

/**
 * Site document — persisted to `sites` collection.
 */
@Schema({ collection: 'sites', timestamps: true })
export class SiteDocument {
  @Prop({ required: true, unique: true, index: true })
  siteId: string;

  @Prop({ required: true, default: 'v1' })
  configVersion: string;

  @Prop({ required: true, enum: ['PRIORITY', 'SPECIFICITY'] })
  ruleEvalMode: string;

  @Prop({ type: [DataSourceDefinitionSchema], default: [] })
  dataSources: DataSourceDefinitionDoc[];
}

export const SiteSchema = SchemaFactory.createForClass(SiteDocument);
export type SiteDoc = HydratedDocument<SiteDocument>;
