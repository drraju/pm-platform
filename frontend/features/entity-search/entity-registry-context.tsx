"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import type { EntityProvider, EntityRegistry } from "@/lib/entities";
import type {
  EntityPresentationCatalog,
  PresentableEntityProvider,
} from "./entity-presentation";

type EntityRegistryContextValue = {
  presentationCatalog: EntityPresentationCatalog;
  registry: EntityRegistry;
};

const EntityRegistryContext = createContext<EntityRegistryContextValue | null>(
  null,
);

export function EntityRegistryProvider({
  children,
  presentationCatalog,
  registry,
}: {
  children: React.ReactNode;
  presentationCatalog: EntityPresentationCatalog;
  registry: EntityRegistry;
}) {
  const value = useMemo(
    () => ({ presentationCatalog, registry }),
    [presentationCatalog, registry],
  );

  return (
    <EntityRegistryContext.Provider value={value}>
      {children}
    </EntityRegistryContext.Provider>
  );
}

export function useEntityProvider(provider: EntityProvider) {
  const context = useContext(EntityRegistryContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    const { presentationCatalog, registry } = context;
    registry.registerProvider(provider);
    presentationCatalog.registerProvider(
      provider as PresentableEntityProvider,
    );
    return () => {
      registry.unregisterProvider(provider.id);
      presentationCatalog.unregisterProvider(provider.id);
    };
  }, [context, provider]);
}
