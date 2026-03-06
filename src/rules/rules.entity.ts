import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Rule document — persisted to `rules` collection.
 * Each rule belongs to a site (referenced by siteId).
 */
@Schema({ collection: 'rules', timestamps: true })
export class RuleDocument {
  @Prop({ required: true, index: true })
  siteId: string;

  @Prop({ required: true })
  id: string;

  @Prop()
  description?: string;

  @Prop({ type: Number })
  priority?: number;

  @Prop({ type: Object, default: {} })
  conditions: Record<string, string>;

  @Prop({ type: [String], default: [] })
  dataSources: string[];

  @Prop({ required: true })
  variantId: string;

  @Prop({ required: true })
  headline: string;

  @Prop({ type: Object })
  flags?: Record<string, boolean>;
}

export const RuleSchema = SchemaFactory.createForClass(RuleDocument);

// Compound unique index: one rule ID per site
RuleSchema.index({ siteId: 1, id: 1 }, { unique: true });

export type RuleDoc = HydratedDocument<RuleDocument>;
