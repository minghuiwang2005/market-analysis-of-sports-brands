export type ProductLevel = "spu" | "sku";
export type ProductFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "select"
  | "multiselect";

export interface ModelFieldDto {
  id: string;
  level: ProductLevel;
  key: string;
  label: string;
  type: ProductFieldType;
  required: boolean;
  isUnique: boolean;
  options: string[];
  searchable: boolean;
  showInList: boolean;
  sortOrder: number;
  isSystem: boolean;
  archivedAt: string | null;
}

export interface FieldDisplayValue {
  key: string;
  label: string;
  type: ProductFieldType;
  value: unknown;
}

export interface SkuSummaryDto {
  id: string;
  skuCode: string;
  name: string;
  createdAt: string;
}

export interface SpuListItemDto {
  id: string;
  spuCode: string;
  name: string;
  brand: string;
  updatedAt: string;
  archivedAt: string | null;
  values: Record<string, unknown>;
  skuCount: number;
  latestSkus: SkuSummaryDto[];
}

export interface SkuDetailDto extends SkuSummaryDto {
  spuId: string;
  spuCode: string;
  spuName: string;
  updatedAt: string;
  archivedAt: string | null;
  archivedWithSpu: boolean;
  values: Record<string, unknown>;
  fields: FieldDisplayValue[];
}

export interface SpuDetailDto extends SpuListItemDto {
  fields: FieldDisplayValue[];
  skus: SkuDetailDto[];
}

export interface SpuInput {
  spuCode: string;
  name: string;
  brand: string;
  values: Record<string, unknown>;
}

export interface SkuInput {
  skuCode: string;
  name: string;
  values: Record<string, unknown>;
}
