export class ProviderCapabilities {
  constructor(
    public readonly supportsConnection: boolean,
    public readonly supportsAuthentication: boolean,
    public readonly supportsResourceListing: boolean,
    public readonly supportsResourceRead: boolean,
    public readonly supportsSearch: boolean,
    public readonly supportsWebhooks: boolean,
    public readonly supportsSynchronization: boolean,
  ) {}

  static placeholder(): ProviderCapabilities {
    return new ProviderCapabilities(
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
  }
}
