export type SearchableEntity = {
  category: string;
  icon?: string;
  id: string;
  keywords?: readonly string[];
  navigationTarget: string;
  subtitle?: string;
  title: string;
};

export type EntityProviderContext = {
  pathname: string;
  permissionKeys: readonly string[];
  projectId?: string;
};

export interface EntityProvider {
  readonly id: string;
  getEntities(context: EntityProviderContext): readonly SearchableEntity[];
}
